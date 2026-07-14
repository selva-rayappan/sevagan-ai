import { Body, Controller, Get, Param, Post, Query, UseInterceptors, Version } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { JobStatus } from '../../domain/enums';
import { AssignmentEngineService } from '../assignment-engine/assignment-engine.service';
import { CurrentUser, CurrentUserPayload } from '../auth/current-user.decorator';
import { AuditService } from '../../infrastructure/audit/audit.service';
import { AuditInterceptor } from '../../common/interceptors/audit.interceptor';
import { ManualAssignDto } from './dto/jobs.dto';

@UseInterceptors(AuditInterceptor)
@Controller('admin/jobs')
export class JobsAdminController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly assignmentEngine: AssignmentEngineService,
    private readonly auditService: AuditService,
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

  @Post(':id/assign')
  @Version('1')
  async manualAssign(@Param('id') id: string, @Body() body: ManualAssignDto, @CurrentUser() user: CurrentUserPayload) {
    const job = await this.prisma.job.findUniqueOrThrow({
      where: { id },
      include: { customer: true },
    });
    // Remove existing assignment if any
    const existing = await this.prisma.assignment.findUnique({ where: { jobId: id } });
    if (existing) {
      await this.prisma.assignment.delete({ where: { jobId: id } });
    }
    await this.prisma.job.update({ where: { id }, data: { status: JobStatus.NEW as any } });
    await this.assignmentEngine.tryAssignJob(id, job.customer.phone);

    await this.auditService.log({
      actorId: user.id,
      actorType: 'ADMIN_USER',
      action: 'MANUAL_ASSIGN_JOB',
      entityType: 'Job',
      entityId: id,
      metadata: { requestedTechnicianId: body.technicianId },
    });

    return { message: 'Assignment triggered' };
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
}
