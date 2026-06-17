import { CommissionService } from './commission.service';
import { PaymentMode, CommissionType } from '../../domain/enums';

const mockGetActiveRule = jest.fn();
const mockFindUniqueJob = jest.fn();
const mockCreateCommission = jest.fn();

const mockCommissionRuleRepository = {
  getActiveRule: mockGetActiveRule,
} as any;

const mockPrisma = {
  job: { findUnique: mockFindUniqueJob },
  jobCommission: { create: mockCreateCommission },
} as any;

function flatRule(value: number) {
  return {
    commissionType: CommissionType.FLAT,
    commissionValue: value,
  };
}

function percentageRule(value: number) {
  return {
    commissionType: CommissionType.PERCENTAGE,
    commissionValue: value,
  };
}

describe('CommissionService', () => {
  let service: CommissionService;

  beforeEach(() => {
    service = new CommissionService(mockPrisma, mockCommissionRuleRepository);
    jest.clearAllMocks();
  });

  describe('calculateCommission()', () => {
    it('applies FLAT rule: CASH ₹1000 with flat ₹20 → commission ₹20, net ₹980', async () => {
      mockGetActiveRule.mockResolvedValue(flatRule(20));

      const result = await service.calculateCommission(1000, PaymentMode.CASH);

      expect(result.commissionAmount).toBe(20);
      expect(result.technicianAmount).toBe(980);
    });

    it('applies PERCENTAGE rule: UPI ₹1000 with 5% → commission ₹50, net ₹950', async () => {
      mockGetActiveRule.mockResolvedValue(percentageRule(5));

      const result = await service.calculateCommission(1000, PaymentMode.UPI);

      expect(result.commissionAmount).toBe(50);
      expect(result.technicianAmount).toBe(950);
    });

    it('rounds PERCENTAGE correctly for fractional amounts', async () => {
      mockGetActiveRule.mockResolvedValue(percentageRule(5));

      const result = await service.calculateCommission(333, PaymentMode.UPI);

      expect(result.commissionAmount).toBe(16.65);
      expect(result.technicianAmount).toBe(316.35);
    });

    it('returns zero commission and full amount when no active rule exists', async () => {
      mockGetActiveRule.mockResolvedValue(null);

      const result = await service.calculateCommission(1000, PaymentMode.CASH);

      expect(result.commissionAmount).toBe(0);
      expect(result.technicianAmount).toBe(1000);
    });

    it('passes the correct paymentMode to the rule repository', async () => {
      mockGetActiveRule.mockResolvedValue(flatRule(20));

      await service.calculateCommission(500, PaymentMode.UPI);

      expect(mockGetActiveRule).toHaveBeenCalledWith(PaymentMode.UPI);
    });
  });

  describe('recordCommission()', () => {
    it('calculates and persists a commission record for a completed job', async () => {
      mockGetActiveRule.mockResolvedValue(flatRule(20));
      mockFindUniqueJob.mockResolvedValue({
        id: 'job-1',
        jobAmount: 1000,
        paymentMode: 'CASH',
      });
      const fakeCommission = { id: 'comm-1', jobId: 'job-1', commissionAmount: 20 };
      mockCreateCommission.mockResolvedValue(fakeCommission);

      const result = await service.recordCommission('job-1');

      expect(result).toBe(fakeCommission);
      expect(mockCreateCommission).toHaveBeenCalledWith({
        data: expect.objectContaining({
          jobId: 'job-1',
          jobAmount: 1000,
          commissionAmount: 20,
          technicianAmount: 980,
          paymentMode: 'CASH',
        }),
      });
    });

    it('throws when the job has no amount set', async () => {
      mockFindUniqueJob.mockResolvedValue({ id: 'job-1', jobAmount: null, paymentMode: 'CASH' });

      await expect(service.recordCommission('job-1')).rejects.toThrow(
        'Job job-1 is missing amount or paymentMode',
      );
    });

    it('throws when the job has no paymentMode set', async () => {
      mockFindUniqueJob.mockResolvedValue({ id: 'job-1', jobAmount: 1000, paymentMode: null });

      await expect(service.recordCommission('job-1')).rejects.toThrow(
        'Job job-1 is missing amount or paymentMode',
      );
    });
  });
});
