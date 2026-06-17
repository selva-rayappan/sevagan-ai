import { Inject, Injectable, Logger } from '@nestjs/common';
import { Language, JobStatus, TechnicianStatus } from '../../domain/enums';
import {
  WHATSAPP_PROVIDER,
  WhatsAppProvider,
} from '../../infrastructure/messaging/whatsapp.provider.interface';
import { TranslationService } from '../../infrastructure/i18n/translation.service';
import { RedisService } from '../../infrastructure/cache/redis.service';
import { AssignmentsRepository } from '../assignments/assignments.repository';
import { JobsService } from '../jobs/jobs.service';
import { JobWithDetails } from '../jobs/jobs.repository';
import { TechniciansRepository } from '../technicians/technicians.repository';
import { CustomersRepository } from '../customers/customers.repository';
import { TechnicianSessionService } from '../whatsapp/technician-bot/technician-session.service';
import { TechnicianConversationState } from '../whatsapp/technician-bot/technician-session.types';

const MAX_REJECTIONS = 3;
const REJECTION_KEY_PREFIX = 'job_rejections:';
const REJECTION_TTL_SECONDS = 86400;
const OFFER_TTL_MS = 15 * 60 * 1000;

@Injectable()
export class AssignmentEngineService {
  private readonly logger = new Logger(AssignmentEngineService.name);

  constructor(
    @Inject(WHATSAPP_PROVIDER) private readonly whatsapp: WhatsAppProvider,
    private readonly translation: TranslationService,
    private readonly redis: RedisService,
    private readonly assignmentsRepository: AssignmentsRepository,
    private readonly jobsService: JobsService,
    private readonly techniciansRepository: TechniciansRepository,
    private readonly customersRepository: CustomersRepository,
    private readonly technicianSessionService: TechnicianSessionService,
  ) {}

  async tryAssignJob(jobId: string, customerPhone: string): Promise<void> {
    const job = await this.jobsService.findWithDetails(jobId);
    if (!job) {
      this.logger.error(`tryAssignJob: job ${jobId} not found`);
      return;
    }

    const excludedIds = await this.getRejectedTechIds(jobId);
    const technician = await this.techniciansRepository.findBestAvailable(
      job.serviceCategoryId,
      job.location,
      excludedIds,
    );

    if (!technician) {
      this.logger.warn(`No technician available for job ${jobId} (excluded: ${excludedIds.length})`);
      const customer = await this.customersRepository.findByPhone(customerPhone);
      if (customer) {
        await this.whatsapp
          .sendText({
            to: customerPhone,
            text: this.translation.translate(
              'customer.no_technician_available',
              customer.language as Language,
            ),
          })
          .catch((err: Error) => {
            this.logger.error(`Failed to notify customer of no technician: ${err.message}`);
          });
      }
      return;
    }

    await this.assignJobToTechnician(job, technician);
  }

  async triggerReassignment(jobId: string, rejectedTechnicianId: string): Promise<void> {
    const count = await this.addRejection(jobId, rejectedTechnicianId);
    this.logger.log(`Job ${jobId}: rejection #${count} from tech ${rejectedTechnicianId}`);

    const job = await this.jobsService.findWithDetails(jobId);
    if (!job) return;

    if (count >= MAX_REJECTIONS) {
      this.logger.warn(`Job ${jobId}: max rejections (${MAX_REJECTIONS}) reached — notifying customer`);
      await this.whatsapp
        .sendText({
          to: job.customer.phone,
          text: this.translation.translate(
            'customer.no_technician_available',
            job.customer.language as Language,
          ),
        })
        .catch((err: Error) => {
          this.logger.error(`Failed to notify customer of assignment failure: ${err.message}`);
        });
      return;
    }

    await this.tryAssignJob(jobId, job.customer.phone);
  }

  private async assignJobToTechnician(job: JobWithDetails, technician: any): Promise<void> {
    await this.assignmentsRepository.create({ jobId: job.id, technicianId: technician.id });
    await this.jobsService.updateStatus(job.id, JobStatus.ASSIGNED);
    await this.techniciansRepository.updateStatus(technician.id, TechnicianStatus.BUSY);

    let session = await this.technicianSessionService.getSession(technician.phone);
    if (!session) {
      session = this.technicianSessionService.createNewSession(technician.phone, technician.language as Language);
    }
    session.state = TechnicianConversationState.JOB_OFFER_PENDING;
    session.activeJobId = job.id;
    session.activeJobNumber = job.jobNumber;
    session.customerPhone = job.customer.phone;
    session.offerExpiresAt = new Date(Date.now() + OFFER_TTL_MS).toISOString();
    await this.technicianSessionService.saveSession(session);

    const lang = technician.language as Language;
    const serviceKey = job.serviceCategory.name.toLowerCase().replace(/\s+/g, '_');
    const serviceLabel = this.translation.translate(`service.${serviceKey}`, lang);
    const scheduledTime = this.extractScheduledTime(job.description);

    await this.whatsapp.sendInteractiveButtons({
      to: technician.phone,
      body: this.translation.translate('technician.job_offer', lang, {
        customerName: job.customer.name ?? 'Customer',
        location: job.location,
        service: serviceLabel,
        scheduledTime,
      }),
      buttons: [
        { id: 'accept_job', title: 'Accept' },
        { id: 'reject_job', title: 'Reject' },
      ],
    });

    this.logger.log(`Job ${job.jobNumber} → tech ${technician.name} (${technician.id})`);
  }

  private async getRejectedTechIds(jobId: string): Promise<string[]> {
    const data = await this.redis.getJson<string[]>(`${REJECTION_KEY_PREFIX}${jobId}`);
    return data ?? [];
  }

  private async addRejection(jobId: string, technicianId: string): Promise<number> {
    const current = await this.getRejectedTechIds(jobId);
    if (!current.includes(technicianId)) {
      current.push(technicianId);
    }
    await this.redis.setJson(`${REJECTION_KEY_PREFIX}${jobId}`, current, REJECTION_TTL_SECONDS);
    return current.length;
  }

  private extractScheduledTime(description?: string | null): string {
    if (!description) return 'ASAP';
    const match = description.match(/^Requested time:\s*(.+?)(?:\s*\|.*)?$/m);
    return match?.[1]?.trim() ?? 'ASAP';
  }
}
