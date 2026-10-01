import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../../../infrastructure/cache/redis.service';
import {
  VOICE_CALL_PROVIDER,
  VoiceCallProvider,
} from '../../../infrastructure/telephony/voice-call.provider.interface';
import {
  WHATSAPP_PROVIDER,
  WhatsAppProvider,
} from '../../../infrastructure/messaging/whatsapp.provider.interface';
import { TranslationService } from '../../../infrastructure/i18n/translation.service';
import { TechniciansRepository } from '../../technicians/technicians.repository';
import { AssignmentEngineService } from '../../assignment-engine/assignment-engine.service';
import { TechnicianSessionService } from './technician-session.service';
import { TechnicianSession, TechnicianConversationState } from './technician-session.types';

const CHECK_INTERVAL_MS = 60_000;
const ESCALATION_AFTER_MS = 60_000;
const SESSION_KEY_PATTERN = 'tech_session:*';
const SCAN_COUNT = 100;
const MAX_ESCALATION_ATTEMPTS = 5;

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
    private readonly translation: TranslationService,
    private readonly techniciansRepository: TechniciansRepository,
    private readonly assignmentEngine: AssignmentEngineService,
    @Inject(VOICE_CALL_PROVIDER) private readonly voiceCall: VoiceCallProvider,
    @Inject(WHATSAPP_PROVIDER) private readonly whatsapp: WhatsAppProvider,
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
    if (!session.offerSentAt) return;

    // Whether or not an escalation call was ever placed, a technician who
    // neither taps a WhatsApp button nor presses a DTMF digit within the full
    // offer window never generates any event that would otherwise trigger
    // reassignment — handleOfferResponse()'s own expiry check only runs when
    // the technician sends something. Found live 2026-10-01: a job sat
    // assigned to a silent technician indefinitely. Check this before the
    // escalation-call logic below — once the offer is gone, there's no point
    // still trying to reach this technician about it.
    if (session.offerExpiresAt && now > new Date(session.offerExpiresAt).getTime()) {
      await this.reassignExpiredOffer(session);
      return;
    }

    if (session.escalationCallSentAt) return;
    if ((session.escalationCallAttempts ?? 0) >= MAX_ESCALATION_ATTEMPTS) return;

    const elapsedMs = now - new Date(session.offerSentAt).getTime();
    if (elapsedMs < ESCALATION_AFTER_MS) return;

    await this.placeEscalationCall(session);
  }

  /**
   * Mirrors the reset TechnicianBotService.handleOfferResponse() performs
   * when a technician messages in *after* their offer already expired — this
   * is the same outcome, just reached proactively instead of reactively, for
   * the technician who never sends anything at all.
   */
  private async reassignExpiredOffer(session: TechnicianSession): Promise<void> {
    const jobId = session.activeJobId;
    if (!jobId) return;

    await this.whatsapp
      .sendText({
        to: session.phone,
        text: this.translation.translate('technician.offer_expired', session.language),
      })
      .catch((err: Error) => {
        this.logger.error(`Failed to notify ${session.phone} of offer expiry: ${err.message}`);
      });

    session.state = TechnicianConversationState.IDLE;
    session.activeJobId = undefined;
    session.activeJobNumber = undefined;
    session.activeAssignmentId = undefined;
    session.customerPhone = undefined;
    session.offerExpiresAt = undefined;
    await this.techSessionService.saveSession(session);

    const technician = await this.techniciansRepository.findByPhone(session.phone);
    if (!technician) {
      this.logger.error(`Cannot reassign job ${jobId}: no technician record for ${session.phone}`);
      return;
    }

    await this.assignmentEngine.triggerReassignment(jobId, technician.id);
  }

  /**
   * WhatsApp accepts the job-offer send synchronously (returns a wamid) but
   * can still fail delivery asynchronously, minutes or seconds later, via the
   * webhook's status callback (e.g. 131047 — technician outside the 24h
   * session window). WebhookController calls this the moment that failure
   * status arrives so the technician gets a call right away instead of
   * waiting out the full 60s timer for a message that will never arrive —
   * see docs/EXECUTION_PLAN.md Phase 3.2 for the incident this fixes.
   */
  async escalateOnDeliveryFailure(phone: string): Promise<void> {
    const session = await this.techSessionService.getSession(phone);
    if (!session) return;
    if (session.state !== TechnicianConversationState.JOB_OFFER_PENDING) return;
    if (!session.offerSentAt || session.escalationCallSentAt) return;
    if ((session.escalationCallAttempts ?? 0) >= MAX_ESCALATION_ATTEMPTS) return;

    await this.placeEscalationCall(session);
  }

  /**
   * A failed placeCall() must still be persisted as an attempt — otherwise a
   * standing provider-side failure (e.g. insufficient Plivo balance) is
   * indistinguishable, on the next poll tick, from "never tried", and
   * checkPendingOffers() retries it every CHECK_INTERVAL_MS forever instead
   * of giving up after MAX_ESCALATION_ATTEMPTS (found live 2026-10-01: a
   * Plivo 402 retried once a minute for over an hour before the account was
   * topped up).
   */
  private async placeEscalationCall(session: TechnicianSession): Promise<void> {
    const token = this.configService.get<string>('voice.webhookToken', '');
    const publicApiUrl = this.configService.get<string>('publicApiUrl', '');
    const answerUrl = `${publicApiUrl}/api/v1/voice/answer?token=${encodeURIComponent(token)}&lang=${session.language}`;

    try {
      await this.voiceCall.placeCall({ to: session.phone, answerUrl });
    } catch (err) {
      session.escalationCallAttempts = (session.escalationCallAttempts ?? 0) + 1;
      await this.techSessionService.saveSession(session);
      if (session.escalationCallAttempts >= MAX_ESCALATION_ATTEMPTS) {
        this.logger.error(
          `Giving up on escalation call to ${session.phone} after ${session.escalationCallAttempts} failed attempts — needs manual follow-up`,
        );
      }
      throw err;
    }

    session.escalationCallSentAt = new Date().toISOString();
    await this.techSessionService.saveSession(session);
  }
}
