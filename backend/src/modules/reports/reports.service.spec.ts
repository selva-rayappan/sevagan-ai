import { ReportsService } from './reports.service';

const mockCommissionFindMany = jest.fn();
const mockJobGroupBy = jest.fn();
const mockCategoryFindMany = jest.fn();
const mockTechnicianFindMany = jest.fn();

const mockPrisma = {
  jobCommission: { findMany: mockCommissionFindMany },
  job: { groupBy: mockJobGroupBy },
  serviceCategory: { findMany: mockCategoryFindMany },
  technician: { findMany: mockTechnicianFindMany },
} as any;

describe('ReportsService', () => {
  let service: ReportsService;

  beforeEach(() => {
    service = new ReportsService(mockPrisma);
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(new Date('2026-06-30T12:00:00Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('getRevenueReport()', () => {
    it('returns 30 zero-filled daily buckets when there is no data', async () => {
      mockCommissionFindMany.mockResolvedValue([]);

      const result = await service.getRevenueReport('daily');

      expect(result.period).toBe('daily');
      expect(result.data).toHaveLength(30);
      expect(result.data[0]).toEqual({ bucket: expect.any(String), revenue: 0, commission: 0, jobCount: 0 });
      expect(result.data[result.data.length - 1].bucket).toBe('2026-06-30');
    });

    it('sums revenue, commission, and job count into the matching daily bucket', async () => {
      mockCommissionFindMany.mockResolvedValue([
        { createdAt: new Date('2026-06-30T08:00:00Z'), jobAmount: 1000, commissionAmount: 20 },
        { createdAt: new Date('2026-06-30T18:00:00Z'), jobAmount: 500, commissionAmount: 10 },
        { createdAt: new Date('2026-06-29T08:00:00Z'), jobAmount: 2000, commissionAmount: 100 },
      ]);

      const result = await service.getRevenueReport('daily');

      const today = result.data.find((b) => b.bucket === '2026-06-30');
      const yesterday = result.data.find((b) => b.bucket === '2026-06-29');

      expect(today).toEqual({ bucket: '2026-06-30', revenue: 1500, commission: 30, jobCount: 2 });
      expect(yesterday).toEqual({ bucket: '2026-06-29', revenue: 2000, commission: 100, jobCount: 1 });
    });

    it('returns 12 monthly buckets ending in the current month', async () => {
      mockCommissionFindMany.mockResolvedValue([]);

      const result = await service.getRevenueReport('monthly');

      expect(result.data).toHaveLength(12);
      expect(result.data[result.data.length - 1].bucket).toBe('2026-06');
      expect(result.data[0].bucket).toBe('2025-07');
    });

    it('returns 12 weekly buckets keyed on the Monday of each week', async () => {
      mockCommissionFindMany.mockResolvedValue([]);

      const result = await service.getRevenueReport('weekly');

      expect(result.data).toHaveLength(12);
      result.data.forEach((bucket) => {
        const day = new Date(`${bucket.bucket}T00:00:00Z`).getUTCDay();
        expect(day).toBe(1); // Monday
      });
    });

    it('ignores commission records that fall outside the requested period range', async () => {
      mockCommissionFindMany.mockResolvedValue([
        { createdAt: new Date('2020-01-01T00:00:00Z'), jobAmount: 999, commissionAmount: 99 },
      ]);

      const result = await service.getRevenueReport('daily');

      const total = result.data.reduce((sum, b) => sum + b.revenue, 0);
      expect(total).toBe(0);
    });

    it('queries commissions since the start of the requested window', async () => {
      mockCommissionFindMany.mockResolvedValue([]);

      await service.getRevenueReport('daily');

      expect(mockCommissionFindMany).toHaveBeenCalledWith({
        where: { createdAt: { gte: new Date('2026-06-01T00:00:00.000Z') } },
        select: { createdAt: true, jobAmount: true, commissionAmount: true },
      });
    });
  });

  describe('getJobsReport()', () => {
    it('returns counts grouped by status and by category', async () => {
      mockJobGroupBy
        .mockResolvedValueOnce([
          { status: 'COMPLETED', _count: { _all: 12 } },
          { status: 'NEW', _count: { _all: 3 } },
        ])
        .mockResolvedValueOnce([
          { serviceCategoryId: 'cat-1', _count: { _all: 8 } },
          { serviceCategoryId: 'cat-2', _count: { _all: 7 } },
        ]);
      mockCategoryFindMany.mockResolvedValue([
        { id: 'cat-1', name: 'Electrical' },
        { id: 'cat-2', name: 'Plumbing' },
      ]);

      const result = await service.getJobsReport();

      expect(result).toEqual({
        byStatus: [
          { status: 'COMPLETED', count: 12 },
          { status: 'NEW', count: 3 },
        ],
        byCategory: [
          { category: 'Electrical', count: 8 },
          { category: 'Plumbing', count: 7 },
        ],
      });
    });

    it('falls back to "Unknown" for a category that no longer exists', async () => {
      mockJobGroupBy
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ serviceCategoryId: 'deleted-cat', _count: { _all: 2 } }]);
      mockCategoryFindMany.mockResolvedValue([]);

      const result = await service.getJobsReport();

      expect(result.byCategory).toEqual([{ category: 'Unknown', count: 2 }]);
    });

    it('applies from/to date filters to both group-by queries', async () => {
      mockJobGroupBy.mockResolvedValue([]);
      mockCategoryFindMany.mockResolvedValue([]);

      await service.getJobsReport('2026-06-01', '2026-06-30');

      const expectedWhere = { createdAt: { gte: new Date('2026-06-01'), lte: new Date('2026-06-30') } };
      expect(mockJobGroupBy).toHaveBeenNthCalledWith(1, {
        by: ['status'],
        where: expectedWhere,
        _count: { _all: true },
      });
      expect(mockJobGroupBy).toHaveBeenNthCalledWith(2, {
        by: ['serviceCategoryId'],
        where: expectedWhere,
        _count: { _all: true },
      });
    });
  });

  describe('getTechniciansReport()', () => {
    it('returns active technicians ranked by trust score with job counts', async () => {
      mockTechnicianFindMany.mockResolvedValue([
        {
          id: 'tech-1',
          name: 'Kumar',
          phone: '919876543210',
          status: 'AVAILABLE',
          rating: { toString: () => '4.50' } as any,
          trustScore: 97,
          _count: { assignments: 14 },
        },
      ]);

      const result = await service.getTechniciansReport();

      expect(mockTechnicianFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { active: true }, orderBy: { trustScore: 'desc' } }),
      );
      expect(result).toEqual([
        {
          id: 'tech-1',
          name: 'Kumar',
          phone: '919876543210',
          status: 'AVAILABLE',
          rating: 4.5,
          trustScore: 97,
          totalJobs: 14,
        },
      ]);
    });

    it('returns an empty array when there are no active technicians', async () => {
      mockTechnicianFindMany.mockResolvedValue([]);

      const result = await service.getTechniciansReport();

      expect(result).toEqual([]);
    });
  });
});
