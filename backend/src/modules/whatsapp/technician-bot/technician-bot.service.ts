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
        case TechnicianConversationState.AWAITING_PAYMENT_AMOUNT:
          await this.handleAwaitingPaymentAmountState(session, text, technician);
          break;
        case TechnicianConversationState.AWAITING_COMPLETION:
          await this.handleAwaitingCompletionState(session, technician.phone);
          break;
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

    const serviceKey = this.categoryNameToKey(
      (job as any).serviceCategory?.name ?? '',
    );
    const serviceLabel = this.translation.translate(`service.${serviceKey}`, session.language);
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

    const serviceKey = this.categoryNameToKey(job.serviceCategory.name);
    const serviceLabel = this.translation.translate(`service.${serviceKey}`, session.language);

    await this.whatsapp.sendInteractiveButtons({
      to: technician.phone,
      body: this.translation.translate('technician.job_accepted', session.language, {
        jobNumber: job.jobNumber,
        customerName: job.customer.name ?? 'Customer',
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

    const _ = serviceLabel; // suppress unused var
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

      await this.whatsapp.sendInteractiveButtons({
        to: technician.phone,
        body: this.translation.translate('technician.job_started', session.language, {
          jobNumber: session.activeJobNumber ?? '',
        }),
        buttons: [
          { id: '1', title: this.translation.translate('technician.complete_cash_button', session.language) },
          { id: '2', title: this.translation.translate('technician.complete_upi_button', session.language) },
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
    const isCompleteCash = normalized === '1' || normalized === 'complete cash' || normalized === 'complete_cash';
    const isCompleteUpi = normalized === '2' || normalized === 'complete upi' || normalized === 'complete_upi';

    if (isCompleteCash || isCompleteUpi) {
      session.pendingPaymentMode = isCompleteCash ? 'CASH' : 'UPI';
      session.state = TechnicianConversationState.AWAITING_PAYMENT_AMOUNT;
      await this.whatsapp.sendText({
        to: technician.phone,
        text: this.translation.translate('technician.ask_completion_amount', session.language),
      });
      return;
    }

    // Power-user fallback: COMPLETE <amount> <CASH|UPI> in one message
    const completeMatch = text.toUpperCase().trim().match(/^COMPLETE\s+(\d+(?:\.\d{1,2})?)\s+(CASH|UPI)$/);
    if (completeMatch) {
      const amount = parseFloat(completeMatch[1]);
      const paymentMode = completeMatch[2] as keyof typeof PaymentMode;
      await this.handleCompleteCommand(session, amount, PaymentMode[paymentMode], technician);
      return;
    }

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

  private async handleCompleteCommand(
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
    await this.handleCompleteCommand(session, amount, PaymentMode[paymentMode], technician);
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

    const serviceKey = this.categoryNameToKey(job.serviceCategory.name);
    const serviceLabel = this.translation.translate(`service.${serviceKey}`, session.language);
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
        return `${i + 1}. ${j.jobNumber} — ${j.serviceCategory.name} — ${statusLabel}`;
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
    return '';
  }

  private categoryNameToKey(name: string): string {
    return name.toLowerCase().replace(/\s+/g, '_');
  }

  private extractScheduledTime(description?: string | null): string {
    if (!description) return 'ASAP';
    const match = description.match(/^Requested time:\s*(.+?)(?:\s*\|.*)?$/m);
    return match?.[1]?.trim() ?? 'ASAP';
  }
}
