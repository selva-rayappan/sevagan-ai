import { Body, Controller, Get, Param, Post, Query, UseInterceptors, Version } from '@nestjs/common';
import { SettlementService } from '../settlement/settlement.service';
import { SettlementStatus, AdminRole } from '../../domain/enums';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser, CurrentUserPayload } from '../auth/current-user.decorator';
import { AuditService } from '../../infrastructure/audit/audit.service';
import { AuditInterceptor } from '../../common/interceptors/audit.interceptor';
import { GenerateSettlementDto } from './dto/settlements.dto';

@UseInterceptors(AuditInterceptor)
@Controller('admin/settlements')
export class SettlementsAdminController {
  constructor(
    private readonly settlementService: SettlementService,
    private readonly auditService: AuditService,
  ) {}

  @Get()
  @Version('1')
  async list(@Query('technicianId') technicianId?: string, @Query('status') status?: string) {
    return this.settlementService.listSettlements(
      technicianId,
      status as SettlementStatus | undefined,
    );
  }

  @Roles(AdminRole.ADMIN)
  @Post('generate')
  @Version('1')
  async generate(@Body() body: GenerateSettlementDto, @CurrentUser() user: CurrentUserPayload) {
    const settlement = await this.settlementService.generateSettlementForTechnician(
      body.technicianId,
      new Date(body.periodStart),
      new Date(body.periodEnd),
    );

    await this.auditService.log({
      actorId: user.id,
      actorType: 'ADMIN_USER',
      action: 'GENERATE_SETTLEMENT',
      entityType: 'TechnicianSettlement',
      entityId: settlement.id,
      metadata: { technicianId: body.technicianId, periodStart: body.periodStart, periodEnd: body.periodEnd },
    });

    return settlement;
  }

  @Roles(AdminRole.ADMIN)
  @Post(':id/pay')
  @Version('1')
  async markPaid(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    const settlement = await this.settlementService.markSettlementPaid(id);

    await this.auditService.log({
      actorId: user.id,
      actorType: 'ADMIN_USER',
      action: 'MARK_SETTLEMENT_PAID',
      entityType: 'TechnicianSettlement',
      entityId: id,
    });

    return settlement;
  }
}
