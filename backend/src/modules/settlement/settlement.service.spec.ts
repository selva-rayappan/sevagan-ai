import { NotFoundException } from '@nestjs/common';
import { SettlementService } from './settlement.service';
import { SettlementStatus } from '../../domain/enums';

const mockFindManyCommissions = jest.fn();
const mockCreateSettlement = jest.fn();
const mockUpdateSettlement = jest.fn();
const mockFindManySettlements = jest.fn();
const mockFindUniqueTechnician = jest.fn();

const mockPrisma = {
  jobCommission: { findMany: mockFindManyCommissions },
  technicianSettlement: {
    create: mockCreateSettlement,
    update: mockUpdateSettlement,
    findMany: mockFindManySettlements,
  },
  technician: { findUnique: mockFindUniqueTechnician },
} as any;

describe('SettlementService', () => {
  let service: SettlementService;
  const periodStart = new Date('2026-06-01');
  const periodEnd = new Date('2026-06-30');

  beforeEach(() => {
    service = new SettlementService(mockPrisma);
    jest.clearAllMocks();
    mockFindUniqueTechnician.mockResolvedValue({ id: 'tech-1', name: 'Kumar' });
  });

  describe('generateSettlementForTechnician()', () => {
    it('aggregates job commissions and creates a PENDING settlement', async () => {
      mockFindManyCommissions.mockResolvedValue([
        { jobAmount: 1000, commissionAmount: 20, technicianAmount: 980 },
        { jobAmount: 500, commissionAmount: 10, technicianAmount: 490 },
      ]);
      const fakeSettlement = { id: 'settle-1', netAmount: 1470, status: 'PENDING' };
      mockCreateSettlement.mockResolvedValue(fakeSettlement);

      const result = await service.generateSettlementForTechnician('tech-1', periodStart, periodEnd);

      expect(result).toBe(fakeSettlement);
      expect(mockCreateSettlement).toHaveBeenCalledWith({
        data: expect.objectContaining({
          technicianId: 'tech-1',
          grossAmount: 1500,
          commissionAmount: 30,
          netAmount: 1470,
          status: 'PENDING',
        }),
      });
    });

    it('creates a zero settlement when no commissions exist in the period', async () => {
      mockFindManyCommissions.mockResolvedValue([]);
      const zeroSettlement = { id: 'settle-zero', netAmount: 0, status: 'PENDING' };
      mockCreateSettlement.mockResolvedValue(zeroSettlement);

      const result = await service.generateSettlementForTechnician('tech-1', periodStart, periodEnd);

      expect(result).toBe(zeroSettlement);
      expect(mockCreateSettlement).toHaveBeenCalledWith({
        data: expect.objectContaining({ grossAmount: 0, commissionAmount: 0, netAmount: 0 }),
      });
    });

    it('filters commissions by technicianId and period', async () => {
      mockFindManyCommissions.mockResolvedValue([]);
      mockCreateSettlement.mockResolvedValue({ id: 's-1' });

      await service.generateSettlementForTechnician('tech-1', periodStart, periodEnd);

      expect(mockFindManyCommissions).toHaveBeenCalledWith({
        where: {
          createdAt: { gte: periodStart, lte: periodEnd },
          job: {
            assignment: { technicianId: 'tech-1' },
            status: 'COMPLETED',
          },
        },
      });
    });

    it('throws NotFoundException if the technician does not exist', async () => {
      mockFindUniqueTechnician.mockResolvedValue(null);
      await expect(
        service.generateSettlementForTechnician('invalid-tech', periodStart, periodEnd)
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('markSettlementPaid()', () => {
    it('updates the settlement status to PAID and sets paidAt', async () => {
      const paidSettlement = { id: 'settle-1', status: 'PAID', paidAt: new Date() };
      mockUpdateSettlement.mockResolvedValue(paidSettlement);

      const result = await service.markSettlementPaid('settle-1');

      expect(result).toBe(paidSettlement);
      expect(mockUpdateSettlement).toHaveBeenCalledWith({
        where: { id: 'settle-1' },
        data: expect.objectContaining({ status: 'PAID', paidAt: expect.any(Date) }),
      });
    });
  });

  describe('listSettlements()', () => {
    it('returns settlements ordered by createdAt desc with no filters', async () => {
      const settlements = [{ id: 's-1' }, { id: 's-2' }];
      mockFindManySettlements.mockResolvedValue(settlements);

      const result = await service.listSettlements();

      expect(result).toBe(settlements);
      expect(mockFindManySettlements).toHaveBeenCalledWith({
        where: {},
        orderBy: { createdAt: 'desc' },
      });
    });

    it('filters by technicianId when provided', async () => {
      mockFindManySettlements.mockResolvedValue([]);

      await service.listSettlements('tech-1');

      expect(mockFindManySettlements).toHaveBeenCalledWith({
        where: { technicianId: 'tech-1' },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('filters by status when provided', async () => {
      mockFindManySettlements.mockResolvedValue([]);

      await service.listSettlements(undefined, SettlementStatus.PENDING);

      expect(mockFindManySettlements).toHaveBeenCalledWith({
        where: { status: 'PENDING' },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('combines technicianId and status filters', async () => {
      mockFindManySettlements.mockResolvedValue([]);

      await service.listSettlements('tech-1', SettlementStatus.PAID);

      expect(mockFindManySettlements).toHaveBeenCalledWith({
        where: { technicianId: 'tech-1', status: 'PAID' },
        orderBy: { createdAt: 'desc' },
      });
    });
  });
});
