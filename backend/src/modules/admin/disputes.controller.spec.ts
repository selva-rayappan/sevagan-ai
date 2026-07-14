import { DisputesAdminController } from './disputes.controller';
import { DisputeStatus } from '../../domain/enums';

const mockFindMany = jest.fn();
const mockFindUniqueOrThrow = jest.fn();
const mockUpdate = jest.fn();

const mockPrisma = {
  dispute: {
    findMany: mockFindMany,
    findUniqueOrThrow: mockFindUniqueOrThrow,
    update: mockUpdate,
  },
} as any;

const mockAuditLog = jest.fn().mockResolvedValue(undefined);
const mockAuditService = { log: mockAuditLog } as any;
const mockUser = { id: 'admin-1', email: 'admin@sevagan.in', role: 'ADMIN', name: 'Admin' };

describe('DisputesAdminController', () => {
  let controller: DisputesAdminController;

  beforeEach(() => {
    controller = new DisputesAdminController(mockPrisma, mockAuditService);
    jest.clearAllMocks();
  });

  describe('list()', () => {
    it('returns all disputes when no status filter is given', async () => {
      const disputes = [{ id: 'dis-1' }];
      mockFindMany.mockResolvedValue(disputes);

      const result = await controller.list();

      expect(result).toBe(disputes);
      expect(mockFindMany).toHaveBeenCalledWith(expect.objectContaining({ where: undefined }));
    });

    it('filters by status when provided', async () => {
      mockFindMany.mockResolvedValue([]);

      await controller.list('OPEN');

      expect(mockFindMany).toHaveBeenCalledWith(expect.objectContaining({ where: { status: 'OPEN' } }));
    });
  });

  describe('findOne()', () => {
    it('returns a dispute with job details', async () => {
      const dispute = { id: 'dis-1' };
      mockFindUniqueOrThrow.mockResolvedValue(dispute);

      const result = await controller.findOne('dis-1');

      expect(result).toBe(dispute);
    });
  });

  describe('resolve()', () => {
    it('marks the dispute RESOLVED with notes and a resolvedAt timestamp', async () => {
      const resolved = { id: 'dis-1', status: 'RESOLVED' };
      mockUpdate.mockResolvedValue(resolved);

      const result = await controller.resolve('dis-1', { notes: 'Refunded customer' }, mockUser);

      expect(result).toBe(resolved);
      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: 'dis-1' },
        data: {
          status: DisputeStatus.RESOLVED,
          notes: 'Refunded customer',
          resolvedAt: expect.any(Date),
        },
      });
      expect(mockAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({ actorId: 'admin-1', action: 'RESOLVE_DISPUTE', entityId: 'dis-1' }),
      );
    });
  });
});
