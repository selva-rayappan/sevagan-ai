import { AuditLogsController } from './audit-logs.controller';

const mockList = jest.fn();
const mockAuditService = { list: mockList } as any;

describe('AuditLogsController', () => {
  let controller: AuditLogsController;

  beforeEach(() => {
    controller = new AuditLogsController(mockAuditService);
    jest.clearAllMocks();
  });

  describe('list()', () => {
    it('applies default pagination when no filters given', async () => {
      const result = { logs: [], total: 0 };
      mockList.mockResolvedValue(result);

      const response = await controller.list();

      expect(response).toBe(result);
      expect(mockList).toHaveBeenCalledWith({ entityType: undefined, actorId: undefined, page: 1, limit: 20 });
    });

    it('passes through entityType, actorId, and pagination filters', async () => {
      mockList.mockResolvedValue({ logs: [], total: 0 });

      await controller.list('Technician', 'admin-1', '2', '10');

      expect(mockList).toHaveBeenCalledWith({ entityType: 'Technician', actorId: 'admin-1', page: 2, limit: 10 });
    });
  });
});
