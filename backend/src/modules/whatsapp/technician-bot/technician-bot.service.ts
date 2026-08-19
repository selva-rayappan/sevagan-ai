import { Inject, Injectable, Logger } from '@nestjs/common';
import { Technician, Job, Customer } from '@prisma/client';
import { TranslationService } from '../../../infrastructure/i18n/translation.service';
import {
  WHATSAPP_PROVIDER,
  WhatsAppProvider,
} from '../../../infrastructure/messaging/whatsapp.provider.interface';
import { InboundWhatsAppMessage } from '../../../infrastructure/messaging/types/inbound-message.types';
import { MinioService } from '../../../infrastructure/storage/minio.service';
import { Language, JobStatus, TechnicianStatus, PaymentMode } from '../../../domain/enums';
import { TechniciansRepository } from '../../technicians/technicians.repository';
import { AssignmentsRepository } from '../../assignments/assignments.repository';
import { JobsService } from '../../jobs/jobs.service';
import { CustomersRepository } from '../../customers/customers.repository';
// MVP: commission not applied/displayed during technician onboarding period — see handleCompleteCommand.
// import { CommissionService } from '../../commission/commission.service';
import { ConversationStateService } from '../conversation/conversation-state.service';
import { ConversationState } from '../conversation/conversation-state.types';
import { TechnicianSessionService } from './technician-session.service';
import { TechnicianSession, TechnicianConversationState } from './technician-session.types';
import { AssignmentEngineService } from '../../assignment-engine/assignment-engine.service';
import { PaymentModeSettingsRepository } from '../../payment-mode-settings/payment-mode-settings.repository';
import { getServiceCategoryLabel } from '../../../common/utils/service-category.utils';

const OFFER_TTL_MS = 15 * 60 * 1000; // 15 minutes

@Injectable()
export class TechnicianBotService {
  private readonly logger = new Logger(TechnicianBotService.name);

  constructor(
    @Inject(WHATSAPP_PROVIDER) private readonly whatsapp: WhatsAppProvider,
    private readonly techSessionService: TechnicianSessionService,
    private readonly techniciansRepository: TechniciansRepository,
    private readonly assignmentsRepository: AssignmentsRepository,
    private readonly jobsService: JobsService,
    private readonly customersRepository: CustomersRepository,
    // MVP: commission not applied/displayed during technician onboarding period.
    // private readonly commissionService: CommissionService,
    private readonly customerSessionService: ConversationStateService,
    private readonly minioService: MinioService,
    private readonly translation: TranslationService,
    private readonly assignmentEngine: AssignmentEngineService,
    private readonly paymentModeSettingsRepo: PaymentModeSettingsRepository,
  ) {}

  async handleMessage(message: InboundWhatsAppMessage, _senderName: string, technician: Technician): Promise<void> {
    await this.whatsapp.markAsRead(message.id).catch((err) => {
      this.logger.warn(`markAsRead failed for ${message.id}: ${err.message}`);
    });

    let session = await this.techSessionService.getSession(technician.phone);
    if (!session) {
      session = this.techSessionService.createNewSession(technician.phone, technician.language as Language);
    } else {
      session.language = technician.language as Language;
    }

    const text = this.extractText(message);
    const upper = text.toUpperCase().trim();

    // Global commands (any state)
    if (upper === 'HELP' || upper === 'உதவி') {
      await this.whatsapp.sendText({
        to: technician.phone,
        text: this.translation.translate('technician.help', session.language),
      });
      await this.techSessionService.saveSession(session);
      return;
    }

    if (upper === 'STATUS' || upper === 'நிலை') {
      await this.handleStatusCommand(session, technician.phone);
      await this.techSessionService.saveSession(session);
      return;
    }

    if (upper === 'JOBS' || upper === 'வேலைகள்') {
      await this.handleJobsCommand(session, technician.id);
      await this.techSessionService.saveSession(session);
      return;
    }

    // Route by state
    try {
      switch (session.state) {
        case TechnicianConversationState.IDLE:
          await this.handleIdleState(session, technician.phone);
          break;
        case TechnicianConversationState.JOB_OFFER_PENDING:
          await this.handleOfferResponse(session, text, technician);
          break;
        case TechnicianConversationState.JOB_ACCEPTED:
          await this.handleAcceptedState(session, text, technician);
          break;
        case TechnicianConversationState.JOB_IN_PROGRESS:
          await this.handleInProgressState(session, message, text, technician);
          break;
        // MVP: both states below are currently unreachable — the "enter the
        // amount" step that used to transition into them is paused; see
        // handleCompleteCommand() for the revival note. Left wired here
        // (rather than deleted) so re-enabling that step is a pure uncomment.
        // case TechnicianConversationState.AWAITING_PAYMENT_AMOUNT:
        //   await this.handleAwaitingPaymentAmountState(session, text, technician);
        //   break;
        // case TechnicianConversationState.AWAITING_COMPLETION:
        //   await this.handleAwaitingCompletionState(session, technician.phone);
        //   break;
        default:
          await this.handleIdleState(session, technician.phone);
      }
    } catch (err) {
      // A failed outbound WhatsApp send must not strand the technician on
      // their previous state — persist whatever the handler already mutated.
      this.logger.error(
        `state routing failed for ${technician.phone}: ${(err as Error).message}`,
        (err as Error).stack,
      );
    } finally {
      await this.techSessionService.saveSession(session);
    }
  }

  /**
   * Entry point for the escalation call's DTMF response (see
   * VoiceWebhookController) — reuses the same accept/reject/expiry logic as a
   * WhatsApp "1"/"2" button reply, since GetDigits collects the identical values.
   */
  async handlePhoneCallResponse(technicianPhone: string, digit: string): Promise<void> {
    const technician = await this.techniciansRepository.findByPhone(technicianPhone);
    if (!technician) {
      this.logger.warn(`DTMF response from unrecognized phone ${technicianPhone}`);
      return;
    }

    const session = await this.techSessionService.getSession(technician.phone);
    if (!session || session.state !== TechnicianConversationState.JOB_OFFER_PENDING) {
      this.logger.warn(
        `DTMF response for ${technician.phone} but no pending offer (state=${session?.state ?? 'none'})`,
      );
      return;
    }

    try {
      await this.handleOfferResponse(session, digit, technician);
    } finally {
      await this.techSessionService.saveSession(session);
    }
  }

  async sendJobOffer(technician: Technician, job: Job, customer: Customer): Promise<void> {
    let session = await this.techSessionService.getSession(technician.phone);
    if (!session) {
      session = this.techSessionService.createNewSession(technician.phone, technician.language as Language);
    }

    session.state = TechnicianConversationState.JOB_OFFER_PENDING;
    session.activeJobId = job.id;
    session.activeJobNumber = job.jobNumber;
    session.customerPhone = customer.phone;
    session.offerExpiresAt = new Date(Date.now() + OFFER_TTL_MS).toISOString();

    const serviceLabel = getServiceCategoryLabel((job as any).serviceCategory ?? { name: '' }, session.language);
    const scheduledTimeText = this.extractScheduledTime(job.description);

    await this.techSessionService.saveSession(session);

    await this.whatsapp.sendInteractiveButtons({
      to: technician.phone,
      body: this.translation.translate('technician.job_offer', session.language, {
        customerName: customer.name ?? 'Customer',
        location: job.location,
        service: serviceLabel,
        scheduledTime: scheduledTimeText,
      }),
      buttons: [
        { id: 'accept_job', title: this.translation.translate('technician.accept_button', session.language) },
        { id: 'reject_job', title: this.translation.translate('technician.reject_button', session.language) },
      ],
    });
  }

  private async handleIdleState(session: TechnicianSession, phone: string): Promise<void> {
    await this.whatsapp.sendText({
      to: phone,
      text: this.translation.translate('technician.no_active_job', session.language),
    });
  }

  private async handleOfferResponse(
    session: TechnicianSession,
    text: string,
    technician: Technician,
  ): Promise<void> {
    // Check offer expiry
    if (session.offerExpiresAt && new Date() > new Date(session.offerExpiresAt)) {
      const expiredJobId = session.activeJobId!;
      await this.whatsapp.sendText({
        to: technician.phone,
        text: this.translation.translate('technician.offer_expired', session.language),
      });
      session.state = TechnicianConversationState.IDLE;
      session.activeJobId = undefined;
      session.activeJobNumber = undefined;
      session.activeAssignmentId = undefined;
      session.customerPhone = undefined;
      session.offerExpiresAt = undefined;
      // Treat timeout the same as rejection — trigger reassignment
      this.assignmentEngine.triggerReassignment(expiredJobId, technician.id).catch((err: Error) => {
        this.logger.error(`Reassignment after expiry failed for job ${expiredJobId}: ${err.message}`);
      });
      return;
    }

    const normalized = text.trim().toLowerCase();
    const isAccept =
      normalized === '1' || normalized === 'accept_job' || normalized === 'accept' || normalized === 'ஏற்கவும்';
    const isReject =
      normalized === '2' || normalized === 'reject_job' || normalized === 'reject' || normalized === 'மறுக்கவும்';

    if (isAccept) {
      await this.acceptJob(session, technician);
    } else if (isReject) {
      await this.rejectJob(session, technician);
    } else {
      await this.whatsapp.sendText({
        to: technician.phone,
        text: this.translation.translate('technician.unknown_command', session.language),
      });
    }
  }

  private async acceptJob(session: TechnicianSession, technician: Technician): Promise<void> {
    const assignment = session.activeAssignmentId
      ? await this.assignmentsRepository.findByJobId(session.activeJobId!)
      : await this.assignmentsRepository.findByJobId(session.activeJobId!);

    if (assignment) {
      await this.assignmentsRepository.accept(assignment.id);
      session.activeAssignmentId = assignment.id;
    }

    await this.jobsService.updateStatus(session.activeJobId!, JobStatus.ACCEPTED);
    await this.techniciansRepository.updateStatus(technician.id, TechnicianStatus.BUSY);

    const job = await this.jobsService.findWithDetails(session.activeJobId!);
    if (!job) return;

    session.state = TechnicianConversationState.JOB_ACCEPTED;
    session.customerPhone = job.customer.phone;

    await this.whatsapp.sendInteractiveButtons({
      to: technician.phone,
      body: this.translation.translate('technician.job_accepted', session.language, {
        jobNumber: job.jobNumber,
        customerName: job.customer.name ?? 'Customer',
        customerPhone: `+${job.customer.phone}`,
        location: job.location,
        scheduledTime: this.extractScheduledTime(job.description),
      }),
      buttons: [
        { id: '1', title: this.translation.translate('technician.start_button', session.language) },
        { id: '2', title: this.translation.translate('technician.decline_button', session.language) },
      ],
    });

    // Notify customer
    const customerLang = job.customer.language as Language;
    await this.whatsapp.sendText({
      to: job.customer.phone,
      text: this.translation.translate('customer.job_assigned', customerLang, {
        technicianName: technician.name,
        technicianPhone: `+${technician.phone}`,
        scheduledTime: this.extractScheduledTime(job.description),
        jobNumber: job.jobNumber,
      }),
    });

    // Advance customer session
    const customerSession = await this.customerSessionService.getSession(job.customer.phone);
    if (customerSession) {
      customerSession.state = ConversationState.IDLE;
      await this.customerSessionService.saveSession(customerSession);
    }
  }

  private async rejectJob(session: TechnicianSession, technician: Technician): Promise<void> {
    const jobId = session.activeJobId!;
    const assignment = await this.assignmentsRepository.findByJobId(jobId);
    if (assignment) {
      await this.assignmentsRepository.deleteById(assignment.id);
    }

    await this.jobsService.updateStatus(jobId, JobStatus.NEW);

    await this.whatsapp.sendText({
      to: technician.phone,
      text: this.translation.translate('technician.job_rejected', session.language, {
        jobNumber: session.activeJobNumber ?? '',
      }),
    });

    session.state = TechnicianConversationState.IDLE;
    session.activeJobId = undefined;
    session.activeJobNumber = undefined;
    session.activeAssignmentId = undefined;
    session.customerPhone = undefined;
    session.offerExpiresAt = undefined;

    // Trigger reassignment (fire-and-forget)
    this.assignmentEngine.triggerReassignment(jobId, technician.id).catch((err: Error) => {
      this.logger.error(`Reassignment failed for job ${jobId}: ${err.message}`);
    });
  }

  private async handleAcceptedState(
    session: TechnicianSession,
    text: string,
    technician: Technician,
  ): Promise<void> {
    const normalized = text.trim().toLowerCase();
    const isStart = normalized === '1' || normalized === 'start';
    const isDecline = normalized === '2' || normalized === 'decline';

    if (isStart) {
      await this.jobsService.updateStatus(session.activeJobId!, JobStatus.IN_PROGRESS);
      session.state = TechnicianConversationState.JOB_IN_PROGRESS;

      // MVP: Cash/UPI payment-mode selection paused along with the "enter
      // the amount" step it fed into — see handleCompleteCommand() below for
      // the revival note. A single Complete button replaces it for now.
      // const enabledModes = await this.paymentModeSettingsRepo.listEnabled();
      // const buttons = [
      //   enabledModes.includes(PaymentMode.CASH) &&
      //     { id: '1', title: this.translation.translate('technician.complete_cash_button', session.language) },
      //   enabledModes.includes(PaymentMode.UPI) &&
      //     { id: '2', title: this.translation.translate('technician.complete_upi_button', session.language) },
      // ].filter((b): b is { id: string; title: string } => Boolean(b));

      await this.whatsapp.sendInteractiveButtons({
        to: technician.phone,
        body: this.translation.translate('technician.job_started', session.language, {
          jobNumber: session.activeJobNumber ?? '',
        }),
        buttons: [
          { id: '1', title: this.translation.translate('technician.complete_button', session.language) },
        ],
      });

      // Notify customer
      if (session.customerPhone) {
        const job = await this.jobsService.findWithDetails(session.activeJobId!);
        const customerLang = job?.customer.language as Language ?? Language.EN;
        await this.whatsapp.sendText({
          to: session.customerPhone,
          text: this.translation.translate('customer.job_started', customerLang, {
            technicianName: technician.name,
            jobNumber: session.activeJobNumber ?? '',
          }),
        });
      }
    } else if (isDecline) {
      await this.declineAfterAccept(session, technician);
    } else {
      await this.whatsapp.sendText({
        to: technician.phone,
        text: this.translation.translate('technician.unknown_command', session.language),
      });
    }
  }

  /**
   * Backing out after already accepting (as opposed to rejecting the initial
   * offer) additionally needs to free the technician back up — acceptJob()
   * already marked them BUSY.
   */
  private async declineAfterAccept(session: TechnicianSession, technician: Technician): Promise<void> {
    const jobId = session.activeJobId!;
    const assignment = await this.assignmentsRepository.findByJobId(jobId);
    if (assignment) {
      await this.assignmentsRepository.deleteById(assignment.id);
    }

    await this.jobsService.updateStatus(jobId, JobStatus.NEW);
    await this.techniciansRepository.updateStatus(technician.id, TechnicianStatus.AVAILABLE);

    await this.whatsapp.sendText({
      to: technician.phone,
      text: this.translation.translate('technician.job_rejected', session.language, {
        jobNumber: session.activeJobNumber ?? '',
      }),
    });

    session.state = TechnicianConversationState.IDLE;
    session.activeJobId = undefined;
    session.activeJobNumber = undefined;
    session.activeAssignmentId = undefined;
    session.customerPhone = undefined;
    session.offerExpiresAt = undefined;

    this.assignmentEngine.triggerReassignment(jobId, technician.id).catch((err: Error) => {
      this.logger.error(`Reassignment after post-accept decline failed for job ${jobId}: ${err.message}`);
    });
  }

  private async handleInProgressState(
    session: TechnicianSession,
    message: InboundWhatsAppMessage,
    text: string,
    technician: Technician,
  ): Promise<void> {
    // Photo upload
    if (message.type === 'image' && message.image) {
      await this.handlePhotoUpload(session, message.image.id, message.image.mime_type, technician.phone);
      return;
    }

    const normalized = text.trim().toLowerCase();
    const isComplete = normalized === '1' || normalized === 'complete' || normalized === 'complete_job';

    if (isComplete) {
      await this.handleCompleteCommand(session, technician);
      return;
    }

    // MVP: Cash/UPI + "enter the amount" completion path paused until the
    // commission-based model returns — kept here, commented, for a clean
    // revival alongside the matching notes in handleAcceptedState() above,
    // handleCompleteCommand()/handleAwaitingPaymentAmountState()/
    // handleAwaitingCompletionState() below, and the customer-side
    // amount-confirmation/invoice notes in CustomerBotService.
    // const isCompleteCash = normalized === '1' || normalized === 'complete cash' || normalized === 'complete_cash';
    // const isCompleteUpi = normalized === '2' || normalized === 'complete upi' || normalized === 'complete_upi';
    // if (isCompleteCash || isCompleteUpi) {
    //   const chosenMode = isCompleteCash ? PaymentMode.CASH : PaymentMode.UPI;
    //   if (!(await this.paymentModeSettingsRepo.isEnabled(chosenMode))) {
    //     await this.whatsapp.sendText({
    //       to: technician.phone,
    //       text: this.translation.translate('technician.payment_mode_disabled', session.language),
    //     });
    //     return;
    //   }
    //   session.pendingPaymentMode = isCompleteCash ? 'CASH' : 'UPI';
    //   session.state = TechnicianConversationState.AWAITING_PAYMENT_AMOUNT;
    //   await this.whatsapp.sendText({
    //     to: technician.phone,
    //     text: this.translation.translate('technician.ask_completion_amount', session.language),
    //   });
    //   return;
    // }
    //
    // // Power-user fallback: COMPLETE <amount> <CASH|UPI> in one message
    // const completeMatch = text.toUpperCase().trim().match(/^COMPLETE\s+(\d+(?:\.\d{1,2})?)\s+(CASH|UPI)$/);
    // if (completeMatch) {
    //   const amount = parseFloat(completeMatch[1]);
    //   const paymentMode = completeMatch[2] as keyof typeof PaymentMode;
    //   if (!(await this.paymentModeSettingsRepo.isEnabled(PaymentMode[paymentMode]))) {
    //     await this.whatsapp.sendText({
    //       to: technician.phone,
    //       text: this.translation.translate('technician.payment_mode_disabled', session.language),
    //     });
    //     return;
    //   }
    //   await this.handleCompleteCommand(session, amount, PaymentMode[paymentMode], technician);
    //   return;
    // }

    await this.whatsapp.sendText({
      to: technician.phone,
      text: this.translation.translate('technician.unknown_command', session.language),
    });
  }

  private async handlePhotoUpload(
    session: TechnicianSession,
    mediaId: string,
    mimeType: string,
    techPhone: string,
  ): Promise<void> {
    try {
      const buffer = await this.whatsapp.downloadMedia(mediaId);
      const ext = mimeType.split('/')[1] ?? 'jpg';
      const key = `job-photos/${session.activeJobId}/${Date.now()}.${ext}`;
      const storedKey = await this.minioService.uploadFile(key, buffer, mimeType);

      await this.jobsService.appendPhotoUrl(session.activeJobId!, storedKey);

      await this.whatsapp.sendText({
        to: techPhone,
        text: this.translation.translate('technician.photo_received', session.language, {
          jobNumber: session.activeJobNumber ?? '',
        }),
      });
    } catch (err) {
      this.logger.error(`Photo upload failed for job ${session.activeJobId}: ${(err as Error).message}`);
      await this.whatsapp.sendText({
        to: techPhone,
        text: this.translation.translate('technician.unknown_command', session.language),
      });
    }
  }

  /**
   * Simplified completion: marks the job done and frees the technician
   * immediately, with no amount/payment-mode capture and no customer
   * amount-confirmation round trip — see the MVP note below for the full
   * (paused) version and how to revive it.
   */
  private async handleCompleteCommand(session: TechnicianSession, technician: Technician): Promise<void> {
    const job = await this.jobsService.updateStatus(session.activeJobId!, JobStatus.COMPLETED);
    const jobWithDetails = await this.jobsService.findWithDetails(job.id);
    if (!jobWithDetails) return;

    await this.techniciansRepository.updateStatus(technician.id, TechnicianStatus.AVAILABLE);

    await this.whatsapp.sendText({
      to: technician.phone,
      text: this.translation.translate('technician.job_completed_simple', session.language, {
        jobNumber: session.activeJobNumber ?? '',
      }),
    });

    session.state = TechnicianConversationState.IDLE;
    session.activeJobId = undefined;
    session.activeJobNumber = undefined;
    session.activeAssignmentId = undefined;
    session.customerPhone = undefined;
    session.offerExpiresAt = undefined;

    // Notify the customer directly and move them straight into the rating
    // flow — no amount-confirmation step in between (see MVP note below).
    const customer = jobWithDetails.customer;
    const customerLang = customer.language as Language;

    await this.whatsapp.sendText({
      to: customer.phone,
      text: this.translation.translate('customer.job_completed_simple', customerLang, {
        technicianName: technician.name,
      }),
    });

    await this.whatsapp.sendInteractiveList({
      to: customer.phone,
      headerText: this.translation.translate('customer.list_header', customerLang),
      body: this.translation.translate('customer.rate_technician', customerLang, { technicianName: technician.name }),
      buttonText: this.translation.translate('customer.select_button', customerLang),
      sections: [
        {
          title: this.translation.translate('customer.list_header', customerLang),
          rows: [5, 4, 3, 2, 1].map((n) => ({
            id: String(n),
            title: this.translation.translate(`customer.rating_${n}`, customerLang),
          })),
        },
      ],
    });

    let customerSession = await this.customerSessionService.getSession(customer.phone);
    if (!customerSession) {
      customerSession = this.customerSessionService.createNewSession(customer.phone, customerLang);
    }
    customerSession.state = ConversationState.AWAITING_RATING;
    customerSession.activeJobContext = {
      jobId: job.id,
      jobNumber: jobWithDetails.jobNumber,
      customerId: customer.id,
      technicianId: technician.id,
      technicianName: technician.name,
      technicianPhone: technician.phone,
    };
    await this.customerSessionService.saveSession(customerSession);
  }

  // MVP: amount/payment-mode capture and the customer amount-confirmation
  // round trip are paused until the commission-based model returns — kept
  // here, commented, for a clean revival: restore the amount param and the
  // setCompletion()/confirm_amount/AWAITING_AMOUNT_CONFIRMATION block below
  // into handleCompleteCommand() above, then uncomment
  // handleAwaitingPaymentAmountState()/handleAwaitingCompletionState() and
  // their switch cases in handleMessage(), the Cash/UPI branch in
  // handleInProgressState(), and the Cash/UPI buttons in handleAcceptedState().
  // See the matching notes in CustomerBotService for the customer side.
  /*
  private async handleCompleteCommand_withAmount(
    session: TechnicianSession,
    amount: number,
    paymentMode: PaymentMode,
    technician: Technician,
  ): Promise<void> {
    const job = await this.jobsService.setCompletion(session.activeJobId!, amount, paymentMode);
    const jobWithDetails = await this.jobsService.findWithDetails(job.id);
    if (!jobWithDetails) return;

    session.state = TechnicianConversationState.AWAITING_COMPLETION;

    const paymentLabel = this.translation.translate(
      `payment_mode.${paymentMode}`,
      session.language,
    );

    // MVP: commission not applied/displayed during technician onboarding period.
    // Restore after stabilization: inject CommissionService above, then
    // const { commissionAmount, technicianAmount } = await this.commissionService
    //   .calculateCommission(amount, paymentMode)
    //   .catch(() => ({ commissionAmount: 0, technicianAmount: amount }));
    // and pass `commission: String(commissionAmount), netAmount: String(technicianAmount)`
    // into the job_completed translate() call below (see en.json/ta.json git history
    // for the original message text with the Gross/Commission/Net breakdown).

    await this.whatsapp.sendText({
      to: technician.phone,
      text: this.translation.translate('technician.job_completed', session.language, {
        jobNumber: session.activeJobNumber ?? '',
        amount: String(amount),
        paymentMode: paymentLabel,
      }),
    });

    // Send amount confirmation to customer
    const customer = jobWithDetails.customer;
    const customerLang = customer.language as Language;
    const customerPaymentLabel = this.translation.translate(
      `payment_mode.${paymentMode}`,
      customerLang,
    );

    await this.whatsapp.sendInteractiveButtons({
      to: customer.phone,
      body: this.translation.translate('customer.confirm_amount', customerLang, {
        technicianName: technician.name,
        amount: String(amount),
        paymentMode: customerPaymentLabel,
      }),
      buttons: [
        { id: '1', title: this.translation.translate('customer.yes_correct', customerLang) },
        { id: '2', title: this.translation.translate('customer.no_incorrect', customerLang) },
      ],
    });

    // Set customer session to AWAITING_AMOUNT_CONFIRMATION
    let customerSession = await this.customerSessionService.getSession(customer.phone);
    if (!customerSession) {
      customerSession = this.customerSessionService.createNewSession(customer.phone, customerLang);
    }
    customerSession.state = ConversationState.AWAITING_AMOUNT_CONFIRMATION;
    customerSession.activeJobContext = {
      jobId: job.id,
      jobNumber: jobWithDetails.jobNumber,
      customerId: customer.id,
      technicianId: technician.id,
      technicianName: technician.name,
      technicianPhone: technician.phone,
      amount: String(amount),
      paymentMode,
    };
    await this.customerSessionService.saveSession(customerSession);
  }

  private async handleAwaitingPaymentAmountState(
    session: TechnicianSession,
    text: string,
    technician: Technician,
  ): Promise<void> {
    const amount = parseFloat(text.trim());

    if (!session.pendingPaymentMode || isNaN(amount) || amount <= 0) {
      await this.whatsapp.sendText({
        to: technician.phone,
        text: this.translation.translate('technician.ask_completion_amount', session.language),
      });
      return;
    }

    const paymentMode = session.pendingPaymentMode;
    session.pendingPaymentMode = undefined;
    await this.handleCompleteCommand_withAmount(session, amount, PaymentMode[paymentMode], technician);
  }

  private async handleAwaitingCompletionState(
    session: TechnicianSession,
    phone: string,
  ): Promise<void> {
    await this.whatsapp.sendText({
      to: phone,
      text: this.translation.translate('technician.status_awaiting_confirmation', session.language, {
        jobNumber: session.activeJobNumber ?? '',
        amount: '',
        paymentMode: '',
      }),
    });
  }
  */

  private async handleStatusCommand(session: TechnicianSession, phone: string): Promise<void> {
    if (
      session.state === TechnicianConversationState.IDLE ||
      !session.activeJobId
    ) {
      await this.whatsapp.sendText({
        to: phone,
        text: this.translation.translate('technician.no_active_job', session.language),
      });
      return;
    }

    const job = await this.jobsService.findWithDetails(session.activeJobId);
    if (!job) {
      await this.whatsapp.sendText({
        to: phone,
        text: this.translation.translate('technician.no_active_job', session.language),
      });
      return;
    }

    const serviceLabel = getServiceCategoryLabel(job.serviceCategory, session.language);
    const statusLabel = this.translation.translate(`job_status.${job.status}`, session.language);

    await this.whatsapp.sendText({
      to: phone,
      text: this.translation.translate('customer.job_status', session.language, {
        jobNumber: job.jobNumber,
        service: serviceLabel,
        status: statusLabel,
        location: job.location,
        technicianInfo: '',
      }),
    });
  }

  private async handleJobsCommand(session: TechnicianSession, technicianId: string): Promise<void> {
    const jobs = await this.jobsService.findByTechnicianId(technicianId, 5);

    if (jobs.length === 0) {
      await this.whatsapp.sendText({
        to: session.phone,
        text: this.translation.translate('technician.no_active_job', session.language),
      });
      return;
    }

    const jobList = jobs
      .map((j, i) => {
        const statusLabel = this.translation.translate(`job_status.${j.status}`, session.language);
        const serviceLabel = getServiceCategoryLabel(j.serviceCategory, session.language);
        return `${i + 1}. ${j.jobNumber} — ${serviceLabel} — ${statusLabel}`;
      })
      .join('\n');

    await this.whatsapp.sendText({
      to: session.phone,
      text: this.translation.translate('technician.job_history', session.language, { jobList }),
    });
  }

  private extractText(message: InboundWhatsAppMessage): string {
    if (message.type === 'text' && message.text) return message.text.body;
    if (message.type === 'interactive' && message.interactive) {
      if (message.interactive.button_reply) return message.interactive.button_reply.id;
      if (message.interactive.list_reply) return message.interactive.list_reply.id;
    }
    // A quick-reply tap on an approved template (e.g. technician_job_offer)
    // arrives as type: 'button', not type: 'interactive' — the payload is
    // whatever we bound to that button index at send time.
    if (message.type === 'button' && message.button) return message.button.payload;
    return '';
  }

  private extractScheduledTime(description?: string | null): string {
    if (!description) return 'ASAP';
    const match = description.match(/^Requested time:\s*(.+?)(?:\s*\|.*)?$/m);
    return match?.[1]?.trim() ?? 'ASAP';
  }
}
