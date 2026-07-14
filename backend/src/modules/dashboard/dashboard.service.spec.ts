import { DashboardService } from './dashboard.service';

const mockJobCount = jest.fn();
const mockCommissionAggregate = jest.fn();
const mockTechnicianCount = jest.fn();
const mockSettlementCount = jest.fn();
const mockDisputeCount = jest.fn();

const mockPrisma = {
  job: { count: mockJobCount },
  jobCommission: { aggregate: mockCommissionAggregate },
  technician: { count: mockTechnicianCount },
  technicianSettlement: { count: mockSettlementCount },
  dispute: { count: mockDisputeCount },
} as any;

describe('DashboardService', () => {
  let service: DashboardService;

  beforeEach(() => {
    service = new DashboardService(mockPrisma);
    jest.clearAllMocks();
  });

  describe('getKpis()', () => {
    it('aggregates all KPI figures', async () => {
      mockJobCount
        .mockResolvedValueOnce(5) // jobsToday
        .mockResolvedValueOnce(50) // totalJobs
        .mockResolvedValueOnce(30); // completedJobs
      mockCommissionAggregate
        .mockResolvedValueOnce({ _sum: { jobAmount: 5000 } }) // revenueToday
        .mockResolvedValueOnce({ _sum: { commissionAmount: 250 } }); // commissionToday
      mockTechnicianCount.mockResolvedValue(8);
      mockSettlementCount.mockResolvedValue(3);
      mockDisputeCount.mockResolvedValue(1);

      const result = await service.getKpis();

      expect(result).toEqual({
        jobsToday: 5,
        revenueToday: 5000,
        commissionEarned: 250,
        activeTechnicians: 8,
        pendingSettlements: 3,
        openDisputes: 1,
        totalJobs: 50,
        completedJobs: 30,
      });
    });

    it('defaults revenue and commission to 0 when there is no data yet', async () => {
      mockJobCount.mockResolvedValue(0);
      mockCommissionAggregate.mockResolvedValue({ _sum: { jobAmount: null, commissionAmount: null } });
      mockTechnicianCount.mockResolvedValue(0);
      mockSettlementCount.mockResolvedValue(0);
      mockDisputeCount.mockResolvedValue(0);

      const result = await service.getKpis();

      expect(result.revenueToday).toBe(0);
      expect(result.commissionEarned).toBe(0);
    });
  });
});
