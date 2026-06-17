import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { JobStatus, TechnicianStatus, SettlementStatus, DisputeStatus } from '../../domain/enums';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getKpis() {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [
      jobsToday,
      revenueToday,
      commissionToday,
      activeTechnicians,
      pendingSettlements,
      openDisputes,
      totalJobs,
      completedJobs,
    ] = await Promise.all([
      this.prisma.job.count({ where: { createdAt: { gte: todayStart } } }),
      this.prisma.jobCommission.aggregate({
        _sum: { jobAmount: true },
        where: { createdAt: { gte: todayStart } },
      }),
      this.prisma.jobCommission.aggregate({
        _sum: { commissionAmount: true },
        where: { createdAt: { gte: todayStart } },
      }),
      this.prisma.technician.count({ where: { status: TechnicianStatus.BUSY as any, active: true } }),
      this.prisma.technicianSettlement.count({ where: { status: SettlementStatus.PENDING as any } }),
      this.prisma.dispute.count({ where: { status: DisputeStatus.OPEN as any } }),
      this.prisma.job.count(),
      this.prisma.job.count({ where: { status: JobStatus.COMPLETED as any } }),
    ]);

    return {
      jobsToday,
      revenueToday: Number(revenueToday._sum.jobAmount ?? 0),
      commissionEarned: Number(commissionToday._sum.commissionAmount ?? 0),
      activeTechnicians,
      pendingSettlements,
      openDisputes,
      totalJobs,
      completedJobs,
    };
  }
}
