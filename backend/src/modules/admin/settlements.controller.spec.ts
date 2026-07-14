import { SettlementsAdminController } from './settlements.controller';
import { SettlementStatus } from '../../domain/enums';

const mockListSettlements = jest.fn();
const mockGenerateSettlementForTechnician = jest.fn();
const mockMarkSettlementPaid = jest.fn();

const mockSettlementService = {
  listSettlements: mockListSettlements,
  generateSettlementForTechnician: mockGenerateSettlementForTechnician,
  markSettlementPaid: mockMarkSettlementPaid,
} as any;

const mockAuditLog = jest.fn().mockResolvedValue(undefined);
const mockAuditService = { log: mockAuditLog } as any;
const mockUser = { id: 'admin-1', email: 'admin@sevagan.in', role: 'ADMIN', name: 'Admin' };

describe('SettlementsAdminController', () => {
  let controller: SettlementsAdminController;

  beforeEach(() => {
    controller = new SettlementsAdminController(mockSettlementService, mockAuditService);
    jest.clearAllMocks();
  });

  describe('list()', () => {
    it('passes through optional technicianId and status filters', async () => {
      const settlements = [{ id: 'settle-1' }];
      mockListSettlements.mockResolvedValue(settlements);

      const result = await controller.list('tech-1', SettlementStatus.PENDING);

      expect(result).toBe(settlements);
      expect(mockListSettlements).toHaveBeenCalledWith('tech-1', SettlementStatus.PENDING);
    });

    it('works with no filters', async () => {
      mockListSettlements.mockResolvedValue([]);

      await controller.list();

      expect(mockListSettlements).toHaveBeenCalledWith(undefined, undefined);
    });
  });

  describe('generate()', () => {
    it('generates a settlement for the given technician and period', async () => {
      const settlement = { id: 'settle-1' };
      mockGenerateSettlementForTechnician.mockResolvedValue(settlement);

      const result = await controller.generate(
        { technicianId: 'tech-1', periodStart: '2026-06-01', periodEnd: '2026-06-30' },
        mockUser,
      );

      expect(result).toBe(settlement);
      expect(mockGenerateSettlementForTechnician).toHaveBeenCalledWith(
        'tech-1',
        new Date('2026-06-01'),
        new Date('2026-06-30'),
      );
      expect(mockAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({ actorId: 'admin-1', action: 'GENERATE_SETTLEMENT', entityId: 'settle-1' }),
      );
    });
  });

  describe('markPaid()', () => {
    it('marks the settlement as paid', async () => {
      const paid = { id: 'settle-1', status: 'PAID' };
      mockMarkSettlementPaid.mockResolvedValue(paid);

      const result = await controller.markPaid('settle-1', mockUser);

      expect(result).toBe(paid);
      expect(mockMarkSettlementPaid).toHaveBeenCalledWith('settle-1');
      expect(mockAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({ actorId: 'admin-1', action: 'MARK_SETTLEMENT_PAID', entityId: 'settle-1' }),
      );
    });
  });
});
