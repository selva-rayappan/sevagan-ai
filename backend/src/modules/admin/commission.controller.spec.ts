import { CommissionAdminController } from './commission.controller';
import { PaymentMode, CommissionType } from '../../domain/enums';

const mockListRules = jest.fn();
const mockCreateRule = jest.fn();
const mockCommissionRuleRepo = { listRules: mockListRules, createRule: mockCreateRule } as any;

const mockAuditLog = jest.fn().mockResolvedValue(undefined);
const mockAuditService = { log: mockAuditLog } as any;
const mockUser = { id: 'admin-1', email: 'admin@sevagan.in', role: 'ADMIN', name: 'Admin' };

describe('CommissionAdminController', () => {
  let controller: CommissionAdminController;

  beforeEach(() => {
    controller = new CommissionAdminController(mockCommissionRuleRepo, mockAuditService);
    jest.clearAllMocks();
  });

  describe('list()', () => {
    it('returns all commission rules', async () => {
      const rules = [{ id: 'rule-1' }];
      mockListRules.mockResolvedValue(rules);

      const result = await controller.list();

      expect(result).toBe(rules);
    });
  });

  describe('create()', () => {
    it('creates a commission rule from the request body', async () => {
      const created = { id: 'rule-1' };
      mockCreateRule.mockResolvedValue(created);

      const result = await controller.create(
        { paymentMode: PaymentMode.CASH, commissionType: CommissionType.FLAT, commissionValue: 20 },
        mockUser,
      );

      expect(result).toBe(created);
      expect(mockCreateRule).toHaveBeenCalledWith({
        paymentMode: PaymentMode.CASH,
        commissionType: CommissionType.FLAT,
        commissionValue: 20,
      });
      expect(mockAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({ actorId: 'admin-1', action: 'CREATE_COMMISSION_RULE', entityId: 'rule-1' }),
      );
    });
  });
});
