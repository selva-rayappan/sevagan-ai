import { Module } from '@nestjs/common';
import { PaymentModeSettingsRepository } from './payment-mode-settings.repository';

@Module({
  providers: [PaymentModeSettingsRepository],
  exports: [PaymentModeSettingsRepository],
})
export class PaymentModeSettingsModule {}
