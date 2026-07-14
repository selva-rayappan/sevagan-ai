import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../infrastructure/database/prisma.service';

export type ReportPeriod = 'daily' | 'weekly' | 'monthly';

export interface RevenueBucket {
  bucket: string;
  revenue: number;
  commission: number;
  jobCount: number;
}

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async getRevenueReport(period: ReportPeriod): Promise<{ period: ReportPeriod; data: RevenueBucket[] }> {
    const { since, keys } = this.generateBucketRange(period);

    const commissions = await this.prisma.jobCommission.findMany({
      where: { createdAt: { gte: since } },
      select: { createdAt: true, jobAmount: true, commissionAmount: true },
    });

    const buckets = new Map<string, RevenueBucket>(
      keys.map((key) => [key, { bucket: key, revenue: 0, commission: 0, jobCount: 0 }]),
    );

    for (const commission of commissions) {
      const bucket = buckets.get(this.bucketKey(commission.createdAt, period));
      if (!bucket) continue;
      bucket.revenue += Number(commission.jobAmount);
      bucket.commission += Number(commission.commissionAmount);
      bucket.jobCount += 1;
    }

    return { period, data: keys.map((key) => buckets.get(key)!) };
  }

  async getJobsReport(from?: string, to?: string) {
    const where: Prisma.JobWhereInput = {};
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) where.createdAt.lte = new Date(to);
    }

    const [statusGroups, categoryGroups, categories] = await Promise.all([
      this.prisma.job.groupBy({ by: ['status'], where, _count: { _all: true } }),
      this.prisma.job.groupBy({ by: ['serviceCategoryId'], where, _count: { _all: true } }),
      this.prisma.serviceCategory.findMany({ select: { id: true, name: true } }),
    ]);

    const categoryNameById = new Map(categories.map((c) => [c.id, c.name]));

    return {
      byStatus: statusGroups.map((g) => ({ status: g.status, count: g._count._all })),
      byCategory: categoryGroups.map((g) => ({
        category: categoryNameById.get(g.serviceCategoryId) ?? 'Unknown',
        count: g._count._all,
      })),
    };
  }

  async getTechniciansReport() {
    const technicians = await this.prisma.technician.findMany({
      where: { active: true },
      select: {
        id: true,
        name: true,
        phone: true,
        status: true,
        rating: true,
        trustScore: true,
        _count: { select: { assignments: true } },
      },
      orderBy: { trustScore: 'desc' },
    });

    return technicians.map((t) => ({
      id: t.id,
      name: t.name,
      phone: t.phone,
      status: t.status,
      rating: Number(t.rating),
      trustScore: t.trustScore,
      totalJobs: t._count.assignments,
    }));
  }

  private bucketKey(date: Date, period: ReportPeriod): string {
    if (period === 'daily') return date.toISOString().slice(0, 10);
    if (period === 'monthly') return date.toISOString().slice(0, 7);

    // weekly — key on the Monday of that ISO week
    const d = new Date(date);
    const day = d.getUTCDay();
    const diffToMonday = day === 0 ? -6 : 1 - day;
    d.setUTCDate(d.getUTCDate() + diffToMonday);
    return d.toISOString().slice(0, 10);
  }

  private generateBucketRange(period: ReportPeriod): { since: Date; keys: string[] } {
    const now = new Date();

    if (period === 'daily') {
      const since = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 29));
      const keys = Array.from({ length: 30 }, (_, i) => {
        const d = new Date(since);
        d.setUTCDate(d.getUTCDate() + i);
        return this.bucketKey(d, period);
      });
      return { since, keys };
    }

    if (period === 'weekly') {
      const since = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 7 * 11));
      const keys = Array.from({ length: 12 }, (_, i) => {
        const d = new Date(since);
        d.setUTCDate(d.getUTCDate() + i * 7);
        return this.bucketKey(d, period);
      });
      return { since, keys };
    }

    // monthly — last 12 calendar months
    const since = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 11, 1));
    const keys = Array.from({ length: 12 }, (_, i) => {
      const d = new Date(Date.UTC(since.getUTCFullYear(), since.getUTCMonth() + i, 1));
      return this.bucketKey(d, period);
    });
    return { since, keys };
  }
}
