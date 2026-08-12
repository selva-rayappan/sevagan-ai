import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../../../infrastructure/cache/redis.service';
import {
  VOICE_CALL_PROVIDER,
  VoiceCallProvider,
} from '../../../infrastructure/telephony/voice-call.provider.interface';
import { TechnicianSessionService } from './technician-session.service';
import { TechnicianSession, TechnicianConversationState } from './technician-session.types';

const CHECK_INTERVAL_MS = 60_000;
const ESCALATION_AFTER_MS = 60_000;
const SESSION_KEY_PATTERN = 'tech_session:*';
const SCAN_COUNT = 100;

/**
 * Places an automated voice call to a technician who hasn't responded to a
 * job offer within 1 minute — same "poll Redis session timestamps" shape as
 * CustomerIdleNudgeService, applied to the technician-offer side instead.
 * Since the check interval is also 60s, the call can fire anywhere from 1 to
 * ~2 minutes after the offer depending on poll timing — same granularity
 * tradeoff CustomerIdleNudgeService already accepts at its own thresholds.
 */
@Injectable()
export class TechnicianOfferEscalationService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TechnicianOfferEscalationService.name);
  private timer?: ReturnType<typeof setInterval>;

  constructor(
    private readonly redis: RedisService,
    private readonly techSessionService: TechnicianSessionService,
    private readonly configService: ConfigService,
    @Inject(VOICE_CALL_PROVIDER) private readonly voiceCall: VoiceCallProvider,
  ) {}

  onModuleInit(): void {
    this.timer = setInterval(() => {
      this.checkPendingOffers().catch((err: Error) => {
        this.logger.error(`Offer escalation check failed: ${err.message}`, err.stack);
      });
    }, CHECK_INTERVAL_MS);
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  async checkPendingOffers(): Promise<void> {
    const client = this.redis.getClient();
    const now = Date.now();
    let cursor = '0';

    do {
      const [nextCursor, keys] = await client.scan(cursor, 'MATCH', SESSION_KEY_PATTERN, 'COUNT', SCAN_COUNT);
      cursor = nextCursor;

      for (const key of keys) {
        const raw = await client.get(key);
        if (!raw) continue;

        let session: TechnicianSession;
        try {
          session = JSON.parse(raw) as TechnicianSession;
        } catch {
          continue;
        }

        await this.processSession(session, now).catch((err: Error) => {
          this.logger.error(`Offer escalation call failed for ${session.phone}: ${err.message}`);
        });
      }
    } while (cursor !== '0');
  }

  private async processSession(session: TechnicianSession, now: number): Promise<void> {
    if (session.state !== TechnicianConversationState.JOB_OFFER_PENDING) return;
    if (!session.offerSentAt || session.escalationCallSentAt) return;

    const elapsedMs = now - new Date(session.offerSentAt).getTime();
    if (elapsedMs < ESCALATION_AFTER_MS) return;

    const token = this.configService.get<string>('voice.webhookToken', '');
    const publicApiUrl = this.configService.get<string>('publicApiUrl', '');
    const answerUrl = `${publicApiUrl}/api/v1/voice/answer?token=${encodeURIComponent(token)}&lang=${session.language}`;

    await this.voiceCall.placeCall({ to: session.phone, answerUrl });
    session.escalationCallSentAt = new Date().toISOString();
    await this.techSessionService.saveSession(session);
  }
}
