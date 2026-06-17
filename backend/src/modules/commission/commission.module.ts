import { Module } from '@nestjs/common';
import { CommissionRuleRepository } from './commission-rule.repository';
import { CommissionService } from './commission.service';

@Module({
  providers: [CommissionRuleRepository, CommissionService],
  exports: [CommissionRuleRepository, CommissionService],
})
export class CommissionModule {}
