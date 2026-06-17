import { Injectable, Logger } from '@nestjs/common';
import { JobCommission } from '@prisma/client';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { PaymentMode } from '../../domain/enums';
import { CommissionRuleRepository } from './commission-rule.repository';

export interface CommissionResult {
  commissionAmount: number;
  technicianAmount: number;
}

@Injectable()
export class CommissionService {
  private readonly logger = new Logger(CommissionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly commissionRuleRepository: CommissionRuleRepository,
  ) {}

  async calculateCommission(jobAmount: number, paymentMode: PaymentMode): Promise<CommissionResult> {
    const rule = await this.commissionRuleRepository.getActiveRule(paymentMode);

    if (!rule) {
      this.logger.warn(`No active commission rule for ${paymentMode} — defaulting to zero commission`);
      return { commissionAmount: 0, technicianAmount: jobAmount };
    }

    const ruleValue = Number(rule.commissionValue);
    const commissionAmount =
      rule.commissionType === 'FLAT'
        ? ruleValue
        : Math.round((jobAmount * ruleValue) / 100 * 100) / 100;

    const technicianAmount = Math.round((jobAmount - commissionAmount) * 100) / 100;
    return { commissionAmount, technicianAmount };
  }

  async recordCommission(jobId: string): Promise<JobCommission> {
    const job = await this.prisma.job.findUnique({ where: { id: jobId } });

    if (!job?.jobAmount || !job?.paymentMode) {
      throw new Error(`Job ${jobId} is missing amount or paymentMode — cannot record commission`);
    }

    const jobAmount = Number(job.jobAmount);
    const paymentMode = job.paymentMode as PaymentMode;
    const { commissionAmount, technicianAmount } = await this.calculateCommission(jobAmount, paymentMode);

    const commission = await this.prisma.jobCommission.create({
      data: {
        jobId,
        jobAmount,
        commissionAmount,
        technicianAmount,
        paymentMode: paymentMode as any,
      },
    });

    this.logger.log(
      `Commission recorded for job ${jobId}: gross=${jobAmount} commission=${commissionAmount} net=${technicianAmount}`,
    );

    return commission;
  }
}
