import { Injectable, Logger } from '@nestjs/common';
import { CommissionRule } from '@prisma/client';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { CommissionType, PaymentMode } from '../../domain/enums';

export interface CreateCommissionRuleData {
  paymentMode: PaymentMode;
  commissionType: CommissionType;
  commissionValue: number;
}

@Injectable()
export class CommissionRuleRepository {
  private readonly logger = new Logger(CommissionRuleRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  async getActiveRule(paymentMode: PaymentMode): Promise<CommissionRule | null> {
    return this.prisma.commissionRule.findFirst({
      where: { paymentMode: paymentMode as any, active: true },
      orderBy: { effectiveFrom: 'desc' },
    });
  }

  async createRule(data: CreateCommissionRuleData): Promise<CommissionRule> {
    const deactivated = await this.prisma.commissionRule.updateMany({
      where: { paymentMode: data.paymentMode as any, active: true },
      data: { active: false },
    });

    this.logger.log(
      `Deactivated ${deactivated.count} rule(s) for ${data.paymentMode} — creating new rule`,
    );

    const rule = await this.prisma.commissionRule.create({
      data: {
        paymentMode: data.paymentMode as any,
        commissionType: data.commissionType as any,
        commissionValue: data.commissionValue,
        active: true,
      },
    });

    this.logger.log(
      `Commission rule created: ${data.paymentMode} ${data.commissionType} ${data.commissionValue}`,
    );

    return rule;
  }

  async listRules(): Promise<CommissionRule[]> {
    return this.prisma.commissionRule.findMany({
      orderBy: [{ paymentMode: 'asc' }, { effectiveFrom: 'desc' }],
    });
  }
}
