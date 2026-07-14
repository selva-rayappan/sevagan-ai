import { AuditService } from './audit.service';

const mockCreate = jest.fn();
const mockFindMany = jest.fn();
const mockCount = jest.fn();

const mockPrisma = {
  auditLog: { create: mockCreate, findMany: mockFindMany, count: mockCount },
} as any;

describe('AuditService', () => {
  let service: AuditService;

  beforeEach(() => {
    service = new AuditService(mockPrisma);
    jest.clearAllMocks();
  });

  describe('log()', () => {
    it('writes an audit log entry', async () => {
      mockCreate.mockResolvedValue({ id: 'log-1' });

      await service.log({
        actorId: 'admin-1',
        actorType: 'ADMIN_USER',
        action: 'LOGIN',
        entityType: 'AdminUser',
        entityId: 'admin-1',
      });

      expect(mockCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({ actorId: 'admin-1', action: 'LOGIN', entityType: 'AdminUser' }),
      });
    });

    it('passes metadata through to the create call', async () => {
      mockCreate.mockResolvedValue({ id: 'log-1' });

      await service.log({
        action: 'CREATE_TECHNICIAN',
        entityType: 'Technician',
        metadata: { name: 'Kumar' },
      });

      expect(mockCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({ metadata: { name: 'Kumar' } }),
      });
    });

    it('swallows database errors instead of throwing', async () => {
      mockCreate.mockRejectedValue(new Error('connection lost'));

      await expect(
        service.log({ action: 'LOGIN', entityType: 'AdminUser' }),
      ).resolves.toBeUndefined();
    });
  });

  describe('list()', () => {
    it('applies default pagination with no filters', async () => {
      mockFindMany.mockResolvedValue([]);
      mockCount.mockResolvedValue(0);

      const result = await service.list({});

      expect(result).toEqual({ logs: [], total: 0 });
      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: {}, skip: 0, take: 20 }),
      );
    });

    it('filters by entityType and actorId, and paginates', async () => {
      const logs = [{ id: 'log-1' }];
      mockFindMany.mockResolvedValue(logs);
      mockCount.mockResolvedValue(1);

      const result = await service.list({ entityType: 'Technician', actorId: 'admin-1', page: 2, limit: 10 });

      expect(result).toEqual({ logs, total: 1 });
      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { entityType: 'Technician', actorId: 'admin-1' },
          skip: 10,
          take: 10,
        }),
      );
    });
  });
});
