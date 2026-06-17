import { Body, Controller, Get, Post, Version } from '@nestjs/common';
import { CommissionRuleRepository } from '../commission/commission-rule.repository';
import { PaymentMode, CommissionType } from '../../domain/enums';

@Controller('admin/commission-rules')
export class CommissionAdminController {
  constructor(private readonly commissionRuleRepo: CommissionRuleRepository) {}

  @Get()
  @Version('1')
  async list() {
    return this.commissionRuleRepo.listRules();
  }

  @Post()
  @Version('1')
  async create(
    @Body()
    body: {
      paymentMode: string;
      commissionType: string;
      commissionValue: number;
    },
  ) {
    return this.commissionRuleRepo.createRule({
      paymentMode: body.paymentMode as PaymentMode,
      commissionType: body.commissionType as CommissionType,
      commissionValue: body.commissionValue,
    });
  }
}
