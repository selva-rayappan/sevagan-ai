import { BadRequestException, Body, Controller, Get, Param, Patch, UseInterceptors, Version } from '@nestjs/common';
import { PaymentModeSettingsRepository } from '../payment-mode-settings/payment-mode-settings.repository';
import { PaymentMode, AdminRole } from '../../domain/enums';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser, CurrentUserPayload } from '../auth/current-user.decorator';
import { AuditService } from '../../infrastructure/audit/audit.service';
import { AuditInterceptor } from '../../common/interceptors/audit.interceptor';
import { UpdatePaymentModeDto } from './dto/payment-modes.dto';

@UseInterceptors(AuditInterceptor)
@Controller('admin/payment-modes')
export class PaymentModesAdminController {
  constructor(
    private readonly paymentModeSettingsRepo: PaymentModeSettingsRepository,
    private readonly auditService: AuditService,
  ) {}

  @Get()
  @Version('1')
  async list() {
    return this.paymentModeSettingsRepo.listAll();
  }

  @Roles(AdminRole.ADMIN)
  @Patch(':mode')
  @Version('1')
  async update(
    @Param('mode') mode: string,
    @Body() body: UpdatePaymentModeDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    if (!Object.values(PaymentMode).includes(mode as PaymentMode)) {
      throw new BadRequestException(`Unknown payment mode: ${mode}`);
    }
    const paymentMode = mode as PaymentMode;

    const setting = await this.paymentModeSettingsRepo.setEnabled(paymentMode, body.enabled);

    await this.auditService.log({
      actorId: user.id,
      actorType: 'ADMIN_USER',
      action: body.enabled ? 'ENABLE_PAYMENT_MODE' : 'DISABLE_PAYMENT_MODE',
      entityType: 'PaymentModeSetting',
      entityId: paymentMode,
      metadata: { paymentMode, enabled: body.enabled },
    });

    return setting;
  }
}
