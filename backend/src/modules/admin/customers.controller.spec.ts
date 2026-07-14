import { CustomersAdminController } from './customers.controller';

const mockFindMany = jest.fn();
const mockCount = jest.fn();
const mockFindUniqueOrThrow = jest.fn();
const mockUpdate = jest.fn();

const mockPrisma = {
  customer: {
    findMany: mockFindMany,
    count: mockCount,
    findUniqueOrThrow: mockFindUniqueOrThrow,
    update: mockUpdate,
  },
} as any;

const mockAuditLog = jest.fn().mockResolvedValue(undefined);
const mockAuditService = { log: mockAuditLog } as any;
const mockUser = { id: 'admin-1', email: 'admin@sevagan.in', role: 'ADMIN', name: 'Admin' };

describe('CustomersAdminController', () => {
  let controller: CustomersAdminController;

  beforeEach(() => {
    controller = new CustomersAdminController(mockPrisma, mockAuditService);
    jest.clearAllMocks();
  });

  describe('list()', () => {
    it('applies default pagination', async () => {
      mockFindMany.mockResolvedValue([{ id: 'cust-1' }]);
      mockCount.mockResolvedValue(1);

      const result = await controller.list();

      expect(result).toEqual({ data: [{ id: 'cust-1' }], total: 1, page: 1, limit: 20 });
      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 0, take: 20 }),
      );
    });

    it('computes skip/take from page and limit query params', async () => {
      mockFindMany.mockResolvedValue([]);
      mockCount.mockResolvedValue(0);

      await controller.list('3', '10');

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 20, take: 10 }),
      );
    });
  });

  describe('findOne()', () => {
    it('returns a customer with recent jobs included', async () => {
      const customer = { id: 'cust-1', jobs: [] };
      mockFindUniqueOrThrow.mockResolvedValue(customer);

      const result = await controller.findOne('cust-1');

      expect(result).toBe(customer);
      expect(mockFindUniqueOrThrow).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'cust-1' } }),
      );
    });
  });

  describe('update()', () => {
    it('updates the customer with the given fields', async () => {
      const updated = { id: 'cust-1', name: 'New Name' };
      mockUpdate.mockResolvedValue(updated);

      const result = await controller.update('cust-1', { name: 'New Name' }, mockUser);

      expect(result).toBe(updated);
      expect(mockUpdate).toHaveBeenCalledWith({ where: { id: 'cust-1' }, data: { name: 'New Name' } });
      expect(mockAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({ actorId: 'admin-1', action: 'UPDATE_CUSTOMER', entityId: 'cust-1' }),
      );
    });
  });
});
