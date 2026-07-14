import { Body, Controller, Get, Param, Post, Query, UseInterceptors, Version } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { DisputeStatus, AdminRole } from '../../domain/enums';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser, CurrentUserPayload } from '../auth/current-user.decorator';
import { AuditService } from '../../infrastructure/audit/audit.service';
import { AuditInterceptor } from '../../common/interceptors/audit.interceptor';
import { ResolveDisputeDto } from './dto/disputes.dto';

@UseInterceptors(AuditInterceptor)
@Controller('admin/disputes')
export class DisputesAdminController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  @Get()
  @Version('1')
  async list(@Query('status') status?: string) {
    return this.prisma.dispute.findMany({
      where: status ? { status: status as any } : undefined,
      include: { job: { include: { customer: true, serviceCategory: true, assignment: { include: { technician: true } } } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  @Get(':id')
  @Version('1')
  async findOne(@Param('id') id: string) {
    return this.prisma.dispute.findUniqueOrThrow({
      where: { id },
      include: { job: { include: { customer: true, assignment: { include: { technician: true } } } } },
    });
  }

  @Roles(AdminRole.ADMIN)
  @Post(':id/resolve')
  @Version('1')
  async resolve(@Param('id') id: string, @Body() body: ResolveDisputeDto, @CurrentUser() user: CurrentUserPayload) {
    const dispute = await this.prisma.dispute.update({
      where: { id },
      data: {
        status: DisputeStatus.RESOLVED as any,
        notes: body.notes,
        resolvedAt: new Date(),
      },
    });

    await this.auditService.log({
      actorId: user.id,
      actorType: 'ADMIN_USER',
      action: 'RESOLVE_DISPUTE',
      entityType: 'Dispute',
      entityId: id,
      metadata: { notes: body.notes },
    });

    return dispute;
  }
}
