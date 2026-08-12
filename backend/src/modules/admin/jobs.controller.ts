import { Body, ConflictException, Controller, Get, Inject, Logger, Param, Post, Query, UseInterceptors, Version } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { JobStatus, Language, PaymentMode, TechnicianStatus } from '../../domain/enums';
import { AssignmentEngineService } from '../assignment-engine/assignment-engine.service';
import { CommissionService } from '../commission/commission.service';
import { InvoiceService } from '../invoice/invoice.service';
import { PaymentService } from '../payment/payment.service';
import {
  WHATSAPP_PROVIDER,
  WhatsAppProvider,
} from '../../infrastructure/messaging/whatsapp.provider.interface';
import { TranslationService } from '../../infrastructure/i18n/translation.service';
import { CurrentUser, CurrentUserPayload } from '../auth/current-user.decorator';
import { AuditService } from '../../infrastructure/audit/audit.service';
import { AuditInterceptor } from '../../common/interceptors/audit.interceptor';
import { MessageTrailService } from '../../infrastructure/messaging/message-trail.service';
import { CompleteJobDto, ManualAssignDto } from './dto/jobs.dto';

const COMPLETABLE_STATUSES: string[] = [JobStatus.ASSIGNED, JobStatus.ACCEPTED, JobStatus.IN_PROGRESS];

@UseInterceptors(AuditInterceptor)
@Controller('admin/jobs')
export class JobsAdminController {
  private readonly logger = new Logger(JobsAdminController.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly assignmentEngine: AssignmentEngineService,
    private readonly auditService: AuditService,
    private readonly messageTrailService: MessageTrailService,
    private readonly commissionService: CommissionService,
    private readonly invoiceService: InvoiceService,
    private readonly paymentService: PaymentService,
    private readonly translation: TranslationService,
    @Inject(WHATSAPP_PROVIDER) private readonly whatsapp: WhatsAppProvider,
  ) {}

  @Get()
  @Version('1')
  async list(
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Query('status') status?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const take = parseInt(limit, 10);
    const where: any = {};
    if (status) where.status = status;
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) where.createdAt.lte = new Date(to);
    }
    const [jobs, total] = await Promise.all([
      this.prisma.job.findMany({
        skip,
        take,
        where,
        include: {
          customer: true,
          serviceCategory: true,
          assignment: { include: { technician: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.job.count({ where }),
    ]);
    return { data: jobs, total, page: parseInt(page, 10), limit: take };
  }

  @Get(':id')
  @Version('1')
  async findOne(@Param('id') id: string) {
    return this.prisma.job.findUniqueOrThrow({
      where: { id },
      include: {
        customer: true,
        serviceCategory: true,
        assignment: { include: { technician: true } },
        commission: true,
        rating: true,
        dispute: true,
      },
    });
  }

  @Get(':id/message-trail')
  @Version('1')
  async messageTrail(@Param('id') id: string) {
    await this.prisma.job.findUniqueOrThrow({ where: { id } });
    return this.messageTrailService.listForJob(id);
  }

  @Post(':id/assign')
  @Version('1')
  async manualAssign(@Param('id') id: string, @Body() body: ManualAssignDto, @CurrentUser() user: CurrentUserPayload) {
    await this.prisma.job.findUniqueOrThrow({ where: { id } });

    // Remove any existing assignment and free that technician before assigning the new one
    const existing = await this.prisma.assignment.findUnique({ where: { jobId: id } });
    if (existing) {
      await this.prisma.assignment.delete({ where: { jobId: id } });
      await this.prisma.technician.update({
        where: { id: existing.technicianId },
        data: { status: TechnicianStatus.AVAILABLE as any },
      });
    }

    await this.assignmentEngine.manualAssign(id, body.technicianId);

    await this.auditService.log({
      actorId: user.id,
      actorType: 'ADMIN_USER',
      action: 'MANUAL_ASSIGN_JOB',
      entityType: 'Job',
      entityId: id,
      metadata: { technicianId: body.technicianId },
    });

    return { message: 'Job assigned' };
  }

  @Post(':id/cancel')
  @Version('1')
  async cancel(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    const job = await this.prisma.job.update({ where: { id }, data: { status: JobStatus.CANCELLED as any } });

    await this.auditService.log({
      actorId: user.id,
      actorType: 'ADMIN_USER',
      action: 'CANCEL_JOB',
      entityType: 'Job',
      entityId: id,
    });

    return job;
  }

  // Manual override for when the technician/customer WhatsApp completion
  // handshake doesn't happen (call-in, dispute stuck, bot outage) — skips
  // the customer amount-confirmation step but otherwise triggers the same
  // downstream effects as a confirmed completion: commission, invoice,
  // payment record, and freeing the technician.
  @Post(':id/complete')
  @Version('1')
  async complete(@Param('id') id: string, @Body() body: CompleteJobDto, @CurrentUser() user: CurrentUserPayload) {
    const job = await this.prisma.job.findUniqueOrThrow({
      where: { id },
      include: { customer: true, assignment: { include: { technician: true } } },
    });

    if (!COMPLETABLE_STATUSES.includes(job.status)) {
      throw new ConflictException(`Cannot complete a job with status ${job.status}.`);
    }

    const updated = await this.prisma.job.update({
      where: { id },
      data: { jobAmount: body.amount, paymentMode: body.paymentMode as any, status: JobStatus.COMPLETED as any },
    });

    const technician = job.assignment?.technician;
    if (technician) {
      await this.prisma.technician.update({
        where: { id: technician.id },
        data: { status: TechnicianStatus.AVAILABLE as any },
      });
    }

    await this.commissionService.recordCommission(id).catch((err) => {
      this.logger.error(`Commission record failed for job ${id}: ${(err as Error).message}`);
    });

    await this.recordInvoiceAndPayment(job, body).catch((err) => {
      this.logger.error(`Invoice/payment failed for job ${id}: ${(err as Error).message}`);
    });

    const customerLang = (job.customer.language as Language) ?? Language.EN;
    await this.whatsapp
      .sendText({
        to: job.customer.phone,
        text: this.translation.translate('customer.job_completed_by_admin', customerLang, {
          jobNumber: job.jobNumber,
          amount: body.amount,
          paymentMode: body.paymentMode,
        }),
      })
      .catch((err) => {
        this.logger.error(`Failed to notify customer of admin completion for job ${id}: ${(err as Error).message}`);
      });

    if (technician) {
      const techLang = (technician.language as Language) ?? Language.EN;
      await this.whatsapp
        .sendText({
          to: technician.phone,
          text: this.translation.translate('technician.job_completed_by_admin', techLang, {
            jobNumber: job.jobNumber,
            amount: body.amount,
            paymentMode: body.paymentMode,
          }),
        })
        .catch((err) => {
          this.logger.error(`Failed to notify technician of admin completion for job ${id}: ${(err as Error).message}`);
        });
    }

    await this.auditService.log({
      actorId: user.id,
      actorType: 'ADMIN_USER',
      action: 'COMPLETE_JOB',
      entityType: 'Job',
      entityId: id,
      metadata: { amount: body.amount, paymentMode: body.paymentMode },
    });

    return updated;
  }

  private async recordInvoiceAndPayment(
    job: { id: string; jobNumber: string; customer: { name: string | null; phone: string } },
    body: CompleteJobDto,
  ): Promise<void> {
    const invoice = await this.invoiceService.generateInvoice(job.id);
    if (body.paymentMode === PaymentMode.UPI) {
      await this.paymentService.recordUpiPayment(
        invoice.id,
        body.amount,
        job.jobNumber,
        job.customer.name ?? 'Sevagan Customer',
        job.customer.phone,
      );
    } else {
      await this.paymentService.recordCashPayment(invoice.id, body.amount);
    }
  }
}
