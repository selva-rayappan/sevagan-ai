import { CommissionRuleRepository } from './commission-rule.repository';
import { PaymentMode, CommissionType } from '../../domain/enums';

const mockFindFirst = jest.fn();
const mockUpdateMany = jest.fn();
const mockCreate = jest.fn();
const mockFindMany = jest.fn();

const mockPrisma = {
  commissionRule: {
    findFirst: mockFindFirst,
    updateMany: mockUpdateMany,
    create: mockCreate,
    findMany: mockFindMany,
  },
} as any;

describe('CommissionRuleRepository', () => {
  let repo: CommissionRuleRepository;

  beforeEach(() => {
    repo = new CommissionRuleRepository(mockPrisma);
    jest.clearAllMocks();
  });

  describe('getActiveRule()', () => {
    it('returns the active rule for the given payment mode', async () => {
      const rule = { id: 'rule-1', paymentMode: 'CASH', active: true };
      mockFindFirst.mockResolvedValue(rule);

      const result = await repo.getActiveRule(PaymentMode.CASH);

      expect(result).toBe(rule);
      expect(mockFindFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: { paymentMode: 'CASH', active: true } }),
      );
    });

    it('returns null when no active rule exists', async () => {
      mockFindFirst.mockResolvedValue(null);

      const result = await repo.getActiveRule(PaymentMode.UPI);

      expect(result).toBeNull();
    });
  });

  describe('createRule()', () => {
    it('deactivates existing rules before creating a new one', async () => {
      mockUpdateMany.mockResolvedValue({ count: 1 });
      const newRule = { id: 'rule-2', paymentMode: 'CASH', active: true };
      mockCreate.mockResolvedValue(newRule);

      await repo.createRule({
        paymentMode: PaymentMode.CASH,
        commissionType: CommissionType.FLAT,
        commissionValue: 25,
      });

      expect(mockUpdateMany).toHaveBeenCalledWith({
        where: { paymentMode: 'CASH', active: true },
        data: { active: false },
      });
    });

    it('creates and returns the new rule', async () => {
      mockUpdateMany.mockResolvedValue({ count: 0 });
      const newRule = { id: 'rule-2', paymentMode: 'UPI', commissionType: 'PERCENTAGE', commissionValue: 7, active: true };
      mockCreate.mockResolvedValue(newRule);

      const result = await repo.createRule({
        paymentMode: PaymentMode.UPI,
        commissionType: CommissionType.PERCENTAGE,
        commissionValue: 7,
      });

      expect(result).toBe(newRule);
      expect(mockCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          paymentMode: 'UPI',
          commissionType: 'PERCENTAGE',
          commissionValue: 7,
          active: true,
        }),
      });
    });
  });

  describe('listRules()', () => {
    it('returns all rules ordered by paymentMode and effectiveFrom', async () => {
      const rules = [
        { id: 'rule-1', paymentMode: 'CASH' },
        { id: 'rule-2', paymentMode: 'UPI' },
      ];
      mockFindMany.mockResolvedValue(rules);

      const result = await repo.listRules();

      expect(result).toBe(rules);
      expect(mockFindMany).toHaveBeenCalledWith({
        orderBy: [{ paymentMode: 'asc' }, { effectiveFrom: 'desc' }],
      });
    });
  });
});
