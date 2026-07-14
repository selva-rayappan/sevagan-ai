import { Inject, Injectable, Logger } from '@nestjs/common';
import { Customer } from '@prisma/client';
import { TranslationService } from '../../../infrastructure/i18n/translation.service';
import {
  WHATSAPP_PROVIDER,
  WhatsAppProvider,
} from '../../../infrastructure/messaging/whatsapp.provider.interface';
import { InboundWhatsAppMessage } from '../../../infrastructure/messaging/types/inbound-message.types';
import { Language, JobStatus, TechnicianStatus } from '../../../domain/enums';
import { CustomersRepository } from '../../customers/customers.repository';
import { JobsService } from '../../jobs/jobs.service';
import { ServiceCategoriesRepository } from '../../service-categories/service-categories.repository';
import { TechniciansRepository } from '../../technicians/technicians.repository';
import { CommissionService } from '../../commission/commission.service';
import { RatingsRepository } from '../../ratings/ratings.repository';
import { DisputesRepository } from '../../disputes/disputes.repository';
import { TrustScoreService, TrustEvent } from '../../trust-score/trust-score.service';
import { ConversationStateService } from '../conversation/conversation-state.service';
import { ConversationSession, ConversationState } from '../conversation/conversation-state.types';
import { TechnicianSessionService } from '../technician-bot/technician-session.service';
import { AssignmentEngineService } from '../../assignment-engine/assignment-engine.service';
import { InvoiceService } from '../../invoice/invoice.service';
import { PaymentService } from '../../payment/payment.service';
import { IntentClassifierService, Intent } from '../../ai-dispatcher/intent-classifier.service';
import { CategoryMapperService } from '../../ai-dispatcher/category-mapper.service';
import { LanguageDetectorService } from '../../ai-dispatcher/language-detector.service';

const SERVICE_MENU: Record<string, string> = {
  '1': 'Electrical',
  '2': 'Plumbing',
  '3': 'AC Service',
  '4': 'Carpentry',
  '5': 'Painting',
  '6': 'Appliance Repair',
  '7': 'RO Service',
  '8': 'CCTV Installation',
};

@Injectable()
export class CustomerBotService {
  private readonly logger = new Logger(CustomerBotService.name);

  constructor(
    @Inject(WHATSAPP_PROVIDER) private readonly whatsapp: WhatsAppProvider,
    private readonly conversationState: ConversationStateService,
    private readonly customersRepository: CustomersRepository,
    private readonly jobsService: JobsService,
    private readonly categoriesRepository: ServiceCategoriesRepository,
    private readonly techniciansRepository: TechniciansRepository,
    private readonly commissionService: CommissionService,
    private readonly ratingsRepository: RatingsRepository,
    private readonly disputesRepository: DisputesRepository,
    private readonly trustScoreService: TrustScoreService,
    private readonly technicianSessionService: TechnicianSessionService,
    private readonly assignmentEngine: AssignmentEngineService,
    private readonly invoiceService: InvoiceService,
    private readonly paymentService: PaymentService,
    private readonly intentClassifier: IntentClassifierService,
    private readonly categoryMapper: CategoryMapperService,
    private readonly languageDetector: LanguageDetectorService,
    private readonly translation: TranslationService,
  ) {}

  async handleMessage(message: InboundWhatsAppMessage, senderName: string): Promise<void> {
    const { from } = message;

    await this.whatsapp.markAsRead(message.id).catch((err) => {
      this.logger.warn(`markAsRead failed for ${message.id}: ${err.message}`);
    });

    const customer = await this.customersRepository.upsert(from, senderName);
    let session = await this.conversationState.getSession(from);

    if (!session) {
      session = this.conversationState.createNewSession(from, customer.language as Language);
    } else {
      session.language = customer.language as Language;
    }

    const text = this.extractText(message);

    const commandHandled = await this.handleCommand(text, session, customer);
    if (commandHandled) {
      await this.conversationState.saveSession(session);
      return;
    }

    await this.routeByState(session, message, text, customer);
    await this.conversationState.saveSession(session);
  }

  private async handleCommand(
    text: string,
    session: ConversationSession,
    customer: Customer,
  ): Promise<boolean> {
    const upper = text.toUpperCase().trim();
    const { language } = session;

    if (upper === 'HELP' || upper === 'உதவி') {
      await this.whatsapp.sendText({
        to: session.phone,
        text: this.translation.translate('customer.help', language),
      });
      return true;
    }

    const trackMatch = upper.match(/^TRACK\s+(JOB-[\w-]+)$/);
    if (trackMatch) {
      await this.handleTrackCommand(session.phone, trackMatch[1], language);
      return true;
    }

    const cancelMatch = upper.match(/^CANCEL\s+(JOB-[\w-]+)$/);
    if (cancelMatch) {
      await this.handleCancelCommand(session.phone, cancelMatch[1], language, customer.id);
      return true;
    }

    return this.tryAiDispatch(session, text, customer);
  }

  /**
   * Free-text fallback for IDLE/AWAITING_SERVICE: answers FAQs, resolves TRACK/CANCEL
   * phrased in natural language, and matches a service category from free text.
   * Numeric input is left untouched so the numbered menus always take priority.
   */
  private async tryAiDispatch(
    session: ConversationSession,
    text: string,
    customer: Customer,
  ): Promise<boolean> {
    const trimmed = text.trim();
    if (
      ![ConversationState.IDLE, ConversationState.AWAITING_SERVICE].includes(session.state) ||
      trimmed.length < 2 ||
      /^\d+$/.test(trimmed)
    ) {
      return false;
    }

    try {
      const detectedLanguage = await this.languageDetector.detectLanguage(trimmed);
      const result = await this.intentClassifier.classifyIntent(trimmed, detectedLanguage);

      switch (result.intent) {
        case Intent.FAQ_HOURS:
          await this.whatsapp.sendText({ to: session.phone, text: this.translation.translate('faq.hours', session.language) });
          return true;
        case Intent.FAQ_PRICING:
          await this.whatsapp.sendText({ to: session.phone, text: this.translation.translate('faq.pricing', session.language) });
          return true;
        case Intent.FAQ_COVERAGE:
          await this.whatsapp.sendText({ to: session.phone, text: this.translation.translate('faq.coverage', session.language) });
          return true;
        case Intent.TRACK_JOB:
          if (!result.extractedJobNumber) return false;
          await this.handleTrackCommand(session.phone, result.extractedJobNumber, session.language);
          return true;
        case Intent.CANCEL_JOB:
          if (!result.extractedJobNumber) return false;
          await this.handleCancelCommand(session.phone, result.extractedJobNumber, session.language, customer.id);
          return true;
        case Intent.REQUEST_SERVICE:
          if (session.state !== ConversationState.AWAITING_SERVICE) return false;
          return this.tryAiServiceMatch(session, trimmed);
        default:
          return false;
      }
    } catch (err) {
      this.logger.warn(`AI dispatch failed, falling back to standard flow: ${(err as Error).message}`);
      return false;
    }
  }

  private async tryAiServiceMatch(session: ConversationSession, text: string): Promise<boolean> {
    const match = await this.categoryMapper.mapToCategory(text);
    if (!match || match.confidence < 0.6) {
      return false;
    }

    session.selectedCategoryId = match.categoryId;
    session.selectedCategoryName = match.categoryName;
    session.state = ConversationState.AWAITING_LOCATION;

    await this.whatsapp.sendText({
      to: session.phone,
      text: this.translation.translate('customer.ask_location', session.language),
    });
    return true;
  }

  private async routeByState(
    session: ConversationSession,
    message: InboundWhatsAppMessage,
    text: string,
    customer: Customer,
  ): Promise<void> {
    switch (session.state) {
      case ConversationState.IDLE:
        await this.handleIdle(session);
        break;
      case ConversationState.AWAITING_LANGUAGE:
        await this.handleLanguageSelection(session, text, customer);
        break;
      case ConversationState.AWAITING_SERVICE:
        await this.handleServiceSelection(session, text);
        break;
      case ConversationState.AWAITING_LOCATION:
        await this.handleLocation(session, message, text);
        break;
      case ConversationState.AWAITING_TIME:
        await this.handleTime(session, text, customer);
        break;
      case ConversationState.AWAITING_AMOUNT_CONFIRMATION:
        await this.handleAmountConfirmation(session, text);
        break;
      case ConversationState.AWAITING_RATING:
        await this.handleRating(session, text);
        break;
      default:
        await this.handleIdle(session);
    }
  }

  private async handleIdle(session: ConversationSession): Promise<void> {
    session.state = ConversationState.AWAITING_LANGUAGE;
    await this.whatsapp.sendInteractiveButtons({
      to: session.phone,
      body: this.translation.translate('customer.select_language', Language.EN),
      buttons: [
        { id: 'lang_en', title: 'English' },
        { id: 'lang_ta', title: 'தமிழ்' },
      ],
    });
  }

  private async handleLanguageSelection(
    session: ConversationSession,
    text: string,
    customer: Customer,
  ): Promise<void> {
    const normalized = text.trim().toLowerCase();
    const isTamil =
      normalized === '2' ||
      normalized === 'lang_ta' ||
      normalized === 'தமிழ்' ||
      normalized === 'tamil';

    const language = isTamil ? Language.TA : Language.EN;
    session.language = language;

    await this.customersRepository.updateLanguage(customer.id, language);

    await this.whatsapp.sendText({
      to: session.phone,
      text: this.translation.translate('customer.language_set', language),
    });

    await this.showServiceMenu(session);
  }

  private async showServiceMenu(session: ConversationSession): Promise<void> {
    session.state = ConversationState.AWAITING_SERVICE;
    await this.whatsapp.sendText({
      to: session.phone,
      text: this.translation.translate('customer.select_service', session.language),
    });
  }

  private async handleServiceSelection(
    session: ConversationSession,
    text: string,
  ): Promise<void> {
    const categoryName = SERVICE_MENU[text.trim()];

    if (!categoryName) {
      await this.whatsapp.sendText({
        to: session.phone,
        text: this.translation.translate('customer.unknown_command', session.language),
      });
      await this.whatsapp.sendText({
        to: session.phone,
        text: this.translation.translate('customer.select_service', session.language),
      });
      return;
    }

    const category = await this.categoriesRepository.findByName(categoryName);
    if (!category) {
      this.logger.error(`Service category "${categoryName}" not found in DB — seed data may be missing`);
      await this.whatsapp.sendText({
        to: session.phone,
        text: this.translation.translate('customer.unknown_command', session.language),
      });
      return;
    }

    session.selectedCategoryId = category.id;
    session.selectedCategoryName = category.name;
    session.state = ConversationState.AWAITING_LOCATION;

    await this.whatsapp.sendText({
      to: session.phone,
      text: this.translation.translate('customer.ask_location', session.language),
    });
  }

  private async handleLocation(
    session: ConversationSession,
    message: InboundWhatsAppMessage,
    text: string,
  ): Promise<void> {
    let location: string;

    if (message.type === 'location' && message.location) {
      const { latitude, longitude, name, address } = message.location;
      location = name ?? address ?? `${latitude},${longitude}`;
    } else {
      location = text.trim();
    }

    session.location = location;
    session.state = ConversationState.AWAITING_TIME;

    await this.whatsapp.sendText({
      to: session.phone,
      text: this.translation.translate('customer.ask_scheduled_time', session.language),
    });
  }

  private async handleTime(
    session: ConversationSession,
    text: string,
    customer: Customer,
  ): Promise<void> {
    const scheduledTimeText = text.trim();

    const job = await this.jobsService.createJob({
      customerId: customer.id,
      serviceCategoryId: session.selectedCategoryId!,
      location: session.location!,
      scheduledTimeText,
    });

    const serviceKey = this.categoryNameToKey(session.selectedCategoryName!);
    const serviceLabel = this.translation.translate(`service.${serviceKey}`, session.language);

    await this.whatsapp.sendText({
      to: session.phone,
      text: this.translation.translate('customer.job_created', session.language, {
        jobNumber: job.jobNumber,
        service: serviceLabel,
        location: session.location!,
        scheduledTime: scheduledTimeText,
      }),
    });

    session.state = ConversationState.IDLE;
    delete session.selectedCategoryId;
    delete session.selectedCategoryName;
    delete session.location;

    // Trigger auto-assignment asynchronously — customer already got confirmation
    this.assignmentEngine.tryAssignJob(job.id, customer.phone).catch((err: Error) => {
      this.logger.error(`Auto-assignment failed for job ${job.id}: ${err.message}`);
    });
  }

  private async handleTrackCommand(
    phone: string,
    jobNumber: string,
    language: Language,
  ): Promise<void> {
    const job = await this.jobsService.findByJobNumber(jobNumber);

    if (!job) {
      await this.whatsapp.sendText({
        to: phone,
        text: this.translation.translate('customer.unknown_command', language),
      });
      return;
    }

    const serviceKey = this.categoryNameToKey(job.serviceCategory.name);
    const serviceLabel = this.translation.translate(`service.${serviceKey}`, language);
    const statusLabel = this.translation.translate(`job_status.${job.status}`, language);

    await this.whatsapp.sendText({
      to: phone,
      text: this.translation.translate('customer.job_status', language, {
        jobNumber: job.jobNumber,
        service: serviceLabel,
        status: statusLabel,
        location: job.location,
        technicianInfo: '',
      }),
    });
  }

  private async handleCancelCommand(
    phone: string,
    jobNumber: string,
    language: Language,
    customerId: string,
  ): Promise<void> {
    const job = await this.jobsService.findByJobNumber(jobNumber);

    if (!job || job.customerId !== customerId) {
      await this.whatsapp.sendText({
        to: phone,
        text: this.translation.translate('customer.unknown_command', language),
      });
      return;
    }

    const cancellableStatuses: string[] = [JobStatus.NEW, JobStatus.ASSIGNED];
    if (!cancellableStatuses.includes(job.status)) {
      await this.whatsapp.sendText({
        to: phone,
        text: this.translation.translate('customer.unknown_command', language),
      });
      return;
    }

    await this.jobsService.cancelJob(job.id);

    await this.whatsapp.sendText({
      to: phone,
      text: this.translation.translate('customer.job_cancelled', language, {
        jobNumber: job.jobNumber,
      }),
    });
  }

  private extractText(message: InboundWhatsAppMessage): string {
    if (message.type === 'text' && message.text) {
      return message.text.body;
    }
    if (message.type === 'interactive' && message.interactive) {
      if (message.interactive.button_reply) return message.interactive.button_reply.id;
      if (message.interactive.list_reply) return message.interactive.list_reply.id;
    }
    return '';
  }

  private async handleAmountConfirmation(
    session: ConversationSession,
    text: string,
  ): Promise<void> {
    const ctx = session.activeJobContext;
    if (!ctx) {
      session.state = ConversationState.IDLE;
      return;
    }

    const normalized = text.trim();

    if (normalized === '1') {
      await this.commissionService.recordCommission(ctx.jobId).catch((err) => {
        this.logger.error(`Commission record failed for job ${ctx.jobId}: ${err.message}`);
      });

      await this.whatsapp.sendText({
        to: session.phone,
        text: this.translation.translate('customer.amount_confirmed', session.language, {
          technicianName: ctx.technicianName,
        }),
      });
      session.state = ConversationState.AWAITING_RATING;

      // Notify technician and free them up
      await this.notifyTechnicianConfirmed(ctx);

      // Generate invoice and record payment (fire-and-forget)
      this.generateInvoiceAndPayment(ctx, session.phone, session.language).catch((err) => {
        this.logger.error(`Invoice/payment failed for job ${ctx.jobId}: ${(err as Error).message}`);
      });

    } else if (normalized === '2') {
      const amount = parseFloat(ctx.amount);
      await this.disputesRepository.create(ctx.jobId, amount, amount).catch((err) => {
        this.logger.error(`Dispute creation failed for job ${ctx.jobId}: ${err.message}`);
      });

      await this.trustScoreService
        .applyTrustEvent(ctx.technicianId, TrustEvent.AMOUNT_DISPUTED)
        .catch((err) => {
          this.logger.error(`Trust score update failed for technician ${ctx.technicianId}: ${err.message}`);
        });

      await this.whatsapp.sendText({
        to: session.phone,
        text: this.translation.translate('customer.amount_disputed', session.language, {
          jobNumber: ctx.jobNumber,
          customerAmount: ctx.amount,
          technicianAmount: ctx.amount,
        }),
      });
      session.state = ConversationState.IDLE;
      delete session.activeJobContext;

      // Notify technician and free them up
      await this.notifyTechnicianDisputed(ctx);

    } else {
      await this.whatsapp.sendText({
        to: session.phone,
        text: this.translation.translate('customer.confirm_amount', session.language, {
          technicianName: ctx.technicianName,
          amount: ctx.amount,
          paymentMode: this.translation.translate(`payment_mode.${ctx.paymentMode}`, session.language),
        }),
      });
    }
  }

  private async handleRating(session: ConversationSession, text: string): Promise<void> {
    const ctx = session.activeJobContext;
    if (!ctx) {
      session.state = ConversationState.IDLE;
      return;
    }

    const rating = parseInt(text.trim(), 10);
    if (rating >= 1 && rating <= 5) {
      await this.ratingsRepository
        .create(ctx.jobId, ctx.customerId, ctx.technicianId, rating)
        .catch((err) => {
          this.logger.error(`Rating creation failed for job ${ctx.jobId}: ${err.message}`);
        });

      const avgRating = await this.ratingsRepository
        .getAverageForTechnician(ctx.technicianId)
        .catch(() => rating);
      await this.techniciansRepository.updateRating(ctx.technicianId, avgRating).catch((err) => {
        this.logger.error(`Technician rating update failed: ${err.message}`);
      });

      const trustEvent = rating >= 4 ? TrustEvent.POSITIVE_RATING : rating <= 2 ? TrustEvent.NEGATIVE_RATING : null;
      if (trustEvent) {
        await this.trustScoreService.applyTrustEvent(ctx.technicianId, trustEvent).catch((err) => {
          this.logger.error(`Trust score update after rating failed: ${err.message}`);
        });
      }

      await this.whatsapp.sendText({
        to: session.phone,
        text: this.translation.translate('customer.rating_received', session.language, {
          technicianName: ctx.technicianName,
          rating: String(rating),
          jobNumber: ctx.jobNumber,
        }),
      });
      session.state = ConversationState.IDLE;
      delete session.activeJobContext;
    } else {
      await this.whatsapp.sendText({
        to: session.phone,
        text: this.translation.translate('customer.rate_technician', session.language, {
          technicianName: ctx.technicianName,
        }),
      });
    }
  }

  private async notifyTechnicianConfirmed(ctx: NonNullable<ConversationSession['activeJobContext']>): Promise<void> {
    try {
      const techSession = await this.technicianSessionService.getSession(ctx.technicianPhone);
      const techLang = (techSession?.language ?? Language.EN) as Language;

      await this.whatsapp.sendText({
        to: ctx.technicianPhone,
        text: this.translation.translate('technician.customer_confirmed', techLang, {
          jobNumber: ctx.jobNumber,
        }),
      });

      await this.technicianSessionService.clearSession(ctx.technicianPhone);
      await this.techniciansRepository.updateStatus(ctx.technicianId, TechnicianStatus.AVAILABLE);
    } catch (err) {
      this.logger.error(`Failed to notify technician ${ctx.technicianId} of confirmation: ${(err as Error).message}`);
    }
  }

  private async notifyTechnicianDisputed(ctx: NonNullable<ConversationSession['activeJobContext']>): Promise<void> {
    try {
      const techSession = await this.technicianSessionService.getSession(ctx.technicianPhone);
      const techLang = (techSession?.language ?? Language.EN) as Language;

      await this.whatsapp.sendText({
        to: ctx.technicianPhone,
        text: this.translation.translate('technician.customer_disputed', techLang, {
          jobNumber: ctx.jobNumber,
          technicianAmount: ctx.amount,
          customerAmount: ctx.amount,
        }),
      });

      await this.technicianSessionService.clearSession(ctx.technicianPhone);
      await this.techniciansRepository.updateStatus(ctx.technicianId, TechnicianStatus.AVAILABLE);
    } catch (err) {
      this.logger.error(`Failed to notify technician ${ctx.technicianId} of dispute: ${(err as Error).message}`);
    }
  }

  private categoryNameToKey(name: string): string {
    return name.toLowerCase().replace(/\s+/g, '_');
  }

  private async generateInvoiceAndPayment(
    ctx: NonNullable<ConversationSession['activeJobContext']>,
    customerPhone: string,
    customerLang: Language,
  ): Promise<void> {
    try {
      const invoice = await this.invoiceService.generateInvoice(ctx.jobId);
      const amount = parseFloat(ctx.amount);

      if (ctx.paymentMode === 'UPI') {
        await this.paymentService.recordUpiPayment(invoice.id, amount);

        // Send Razorpay payment link
        const paymentLink = this.paymentService.generatePaymentLink(amount, ctx.jobNumber);
        await this.whatsapp.sendText({
          to: customerPhone,
          text: this.translation.translate('customer.payment_link', customerLang, {
            amount: ctx.amount,
            paymentLink,
          }),
        });
      } else {
        await this.paymentService.recordCashPayment(invoice.id, amount);
      }
    } catch (err) {
      this.logger.error(`generateInvoiceAndPayment failed: ${(err as Error).message}`);
    }
  }
}
