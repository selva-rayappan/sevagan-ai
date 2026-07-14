import { Body, Controller, Get, Post, UseInterceptors, Version } from '@nestjs/common';
import { CommissionRuleRepository } from '../commission/commission-rule.repository';
import { AdminRole } from '../../domain/enums';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser, CurrentUserPayload } from '../auth/current-user.decorator';
import { AuditService } from '../../infrastructure/audit/audit.service';
import { AuditInterceptor } from '../../common/interceptors/audit.interceptor';
import { CreateCommissionRuleDto } from './dto/commission.dto';

@UseInterceptors(AuditInterceptor)
@Controller('admin/commission-rules')
export class CommissionAdminController {
  constructor(
    private readonly commissionRuleRepo: CommissionRuleRepository,
    private readonly auditService: AuditService,
  ) {}

  @Get()
  @Version('1')
  async list() {
    return this.commissionRuleRepo.listRules();
  }

  @Roles(AdminRole.ADMIN)
  @Post()
  @Version('1')
  async create(@Body() body: CreateCommissionRuleDto, @CurrentUser() user: CurrentUserPayload) {
    const rule = await this.commissionRuleRepo.createRule({
      paymentMode: body.paymentMode,
      commissionType: body.commissionType,
      commissionValue: body.commissionValue,
    });

    await this.auditService.log({
      actorId: user.id,
      actorType: 'ADMIN_USER',
      action: 'CREATE_COMMISSION_RULE',
      entityType: 'CommissionRule',
      entityId: rule.id,
      metadata: { paymentMode: body.paymentMode, commissionType: body.commissionType, commissionValue: body.commissionValue },
    });

    return rule;
  }
}
