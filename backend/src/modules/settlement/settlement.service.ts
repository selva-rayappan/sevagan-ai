import { Injectable, Logger } from '@nestjs/common';
import { TechnicianSettlement } from '@prisma/client';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { SettlementStatus } from '../../domain/enums';

@Injectable()
export class SettlementService {
  private readonly logger = new Logger(SettlementService.name);

  constructor(private readonly prisma: PrismaService) {}

  async generateSettlementForTechnician(
    technicianId: string,
    periodStart: Date,
    periodEnd: Date,
  ): Promise<TechnicianSettlement> {
    const commissions = await this.prisma.jobCommission.findMany({
      where: {
        createdAt: { gte: periodStart, lte: periodEnd },
        job: {
          assignment: { technicianId },
          status: 'COMPLETED',
        },
      },
    });

    const grossAmount = commissions.reduce((sum, c) => sum + Number(c.jobAmount), 0);
    const commissionAmount = commissions.reduce((sum, c) => sum + Number(c.commissionAmount), 0);
    const netAmount = commissions.reduce((sum, c) => sum + Number(c.technicianAmount), 0);

    const settlement = await this.prisma.technicianSettlement.create({
      data: {
        technicianId,
        grossAmount,
        commissionAmount,
        netAmount,
        status: 'PENDING',
      },
    });

    this.logger.log(
      `Settlement generated for technician ${technicianId}: ${commissions.length} jobs, gross=${grossAmount}, net=${netAmount}`,
    );

    return settlement;
  }

  async markSettlementPaid(settlementId: string): Promise<TechnicianSettlement> {
    const settlement = await this.prisma.technicianSettlement.update({
      where: { id: settlementId },
      data: { status: 'PAID', paidAt: new Date() },
    });

    this.logger.log(`Settlement ${settlementId} marked PAID`);
    return settlement;
  }

  async listSettlements(
    technicianId?: string,
    status?: SettlementStatus,
  ): Promise<TechnicianSettlement[]> {
    return this.prisma.technicianSettlement.findMany({
      where: {
        ...(technicianId ? { technicianId } : {}),
        ...(status ? { status: status as any } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
