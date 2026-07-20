import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { RedisService } from '../../../infrastructure/cache/redis.service';
import { TranslationService } from '../../../infrastructure/i18n/translation.service';
import {
  WHATSAPP_PROVIDER,
  WhatsAppProvider,
} from '../../../infrastructure/messaging/whatsapp.provider.interface';
import { ConversationStateService } from '../conversation/conversation-state.service';
import { ConversationSession, ConversationState } from '../conversation/conversation-state.types';

const CHECK_INTERVAL_MS = 60_000;
const REMINDER_AFTER_MS = 15 * 60_000;
const DROP_OFF_AFTER_MS = 30 * 60_000;
const SESSION_KEY_PATTERN = 'conv:*';
const SCAN_COUNT = 100;

// Only nudge customers stuck mid-request — not IDLE (nothing pending) and not
// the post-job states (AWAITING_AMOUNT_CONFIRMATION/AWAITING_RATING), where
// "sorry we couldn't service you" would be confusing since the job already happened.
const NUDGEABLE_STATES = new Set<ConversationState>([
  ConversationState.AWAITING_LANGUAGE,
  ConversationState.AWAITING_SERVICE,
  ConversationState.AWAITING_LOCATION,
  ConversationState.AWAITING_TIME,
]);

@Injectable()
export class CustomerIdleNudgeService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CustomerIdleNudgeService.name);
  private timer?: ReturnType<typeof setInterval>;

  constructor(
    private readonly redis: RedisService,
    private readonly conversationState: ConversationStateService,
    private readonly translation: TranslationService,
    @Inject(WHATSAPP_PROVIDER) private readonly whatsapp: WhatsAppProvider,
  ) {}

  onModuleInit(): void {
    this.timer = setInterval(() => {
      this.checkIdleSessions().catch((err: Error) => {
        this.logger.error(`Idle session check failed: ${err.message}`, err.stack);
      });
    }, CHECK_INTERVAL_MS);
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  async checkIdleSessions(): Promise<void> {
    const client = this.redis.getClient();
    const now = Date.now();
    let cursor = '0';

    do {
      const [nextCursor, keys] = await client.scan(cursor, 'MATCH', SESSION_KEY_PATTERN, 'COUNT', SCAN_COUNT);
      cursor = nextCursor;

      for (const key of keys) {
        const raw = await client.get(key);
        if (!raw) continue;

        let session: ConversationSession;
        try {
          session = JSON.parse(raw) as ConversationSession;
        } catch {
          continue;
        }

        await this.processSession(session, now).catch((err: Error) => {
          this.logger.error(`Idle nudge failed for ${session.phone}: ${err.message}`);
        });
      }
    } while (cursor !== '0');
  }

  private async processSession(session: ConversationSession, now: number): Promise<void> {
    if (!NUDGEABLE_STATES.has(session.state)) return;

    const lastActivity = new Date(session.lastCustomerMessageAt ?? session.updatedAt).getTime();
    const idleMs = now - lastActivity;
    let changed = false;

    if (idleMs >= REMINDER_AFTER_MS && !session.idleReminderSentAt) {
      await this.whatsapp.sendText({
        to: session.phone,
        text: this.translation.translate('customer.idle_reminder', session.language),
      });
      session.idleReminderSentAt = new Date().toISOString();
      changed = true;
    }

    if (idleMs >= DROP_OFF_AFTER_MS && !session.idleDropOffSentAt) {
      await this.whatsapp.sendText({
        to: session.phone,
        text: this.translation.translate('customer.idle_dropoff', session.language),
      });
      session.idleDropOffSentAt = new Date().toISOString();
      session.state = ConversationState.IDLE;
      delete session.selectedCategoryId;
      delete session.selectedCategoryName;
      delete session.location;
      delete session.pendingServiceCategoryIds;
      delete session.pendingTimeSlots;
      changed = true;
    }

    if (changed) {
      await this.conversationState.saveSession(session);
    }
  }
}
