import { JobsAdminController } from './jobs.controller';
import { JobStatus } from '../../domain/enums';

const mockFindMany = jest.fn();
const mockCount = jest.fn();
const mockFindUniqueOrThrow = jest.fn();
const mockUpdate = jest.fn();
const mockTechnicianUpdate = jest.fn();
const mockAssignmentFindUnique = jest.fn();
const mockAssignmentDelete = jest.fn();

const mockPrisma = {
  job: {
    findMany: mockFindMany,
    count: mockCount,
    findUniqueOrThrow: mockFindUniqueOrThrow,
    update: mockUpdate,
  },
  technician: {
    update: mockTechnicianUpdate,
  },
  assignment: {
    findUnique: mockAssignmentFindUnique,
    delete: mockAssignmentDelete,
  },
} as any;

const mockManualAssign = jest.fn();
const mockAssignmentEngine = { manualAssign: mockManualAssign } as any;

const mockAuditLog = jest.fn().mockResolvedValue(undefined);
const mockAuditService = { log: mockAuditLog } as any;
const mockUser = { id: 'admin-1', email: 'admin@sevagan.in', role: 'ADMIN', name: 'Admin' };

describe('JobsAdminController', () => {
  let controller: JobsAdminController;

  beforeEach(() => {
    controller = new JobsAdminController(mockPrisma, mockAssignmentEngine, mockAuditService);
    jest.clearAllMocks();
  });

  describe('list()', () => {
    it('applies default pagination with no filters', async () => {
      mockFindMany.mockResolvedValue([]);
      mockCount.mockResolvedValue(0);

      const result = await controller.list();

      expect(result).toEqual({ data: [], total: 0, page: 1, limit: 20 });
      expect(mockFindMany).toHaveBeenCalledWith(expect.objectContaining({ skip: 0, take: 20, where: {} }));
    });

    it('filters by status and date range', async () => {
      mockFindMany.mockResolvedValue([{ id: 'job-1' }]);
      mockCount.mockResolvedValue(1);

      await controller.list('1', '20', 'COMPLETED', '2026-06-01', '2026-06-30');

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            status: 'COMPLETED',
            createdAt: { gte: new Date('2026-06-01'), lte: new Date('2026-06-30') },
          },
        }),
      );
    });
  });

  describe('findOne()', () => {
    it('returns a job with full details', async () => {
      const job = { id: 'job-1' };
      mockFindUniqueOrThrow.mockResolvedValue(job);

      const result = await controller.findOne('job-1');

      expect(result).toBe(job);
    });
  });

  describe('manualAssign()', () => {
    it('removes an existing assignment, frees the previous technician, and assigns the requested one', async () => {
      mockFindUniqueOrThrow.mockResolvedValue({ id: 'job-1' });
      mockAssignmentFindUnique.mockResolvedValue({ id: 'assign-1', technicianId: 'old-tech' });
      mockAssignmentDelete.mockResolvedValue({});
      mockTechnicianUpdate.mockResolvedValue({});
      mockManualAssign.mockResolvedValue(undefined);

      const result = await controller.manualAssign('job-1', { technicianId: 'tech-1' }, mockUser);

      expect(mockAssignmentDelete).toHaveBeenCalledWith({ where: { jobId: 'job-1' } });
      expect(mockTechnicianUpdate).toHaveBeenCalledWith({
        where: { id: 'old-tech' },
        data: { status: 'AVAILABLE' },
      });
      expect(mockManualAssign).toHaveBeenCalledWith('job-1', 'tech-1');
      expect(result).toEqual({ message: 'Job assigned' });
      expect(mockAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({ actorId: 'admin-1', action: 'MANUAL_ASSIGN_JOB', entityId: 'job-1' }),
      );
    });

    it('skips assignment deletion and technician-freeing when no existing assignment is found', async () => {
      mockFindUniqueOrThrow.mockResolvedValue({ id: 'job-1' });
      mockAssignmentFindUnique.mockResolvedValue(null);
      mockManualAssign.mockResolvedValue(undefined);

      await controller.manualAssign('job-1', { technicianId: 'tech-1' }, mockUser);

      expect(mockAssignmentDelete).not.toHaveBeenCalled();
      expect(mockTechnicianUpdate).not.toHaveBeenCalled();
      expect(mockManualAssign).toHaveBeenCalledWith('job-1', 'tech-1');
    });
  });

  describe('cancel()', () => {
    it('marks the job CANCELLED', async () => {
      const cancelled = { id: 'job-1', status: 'CANCELLED' };
      mockUpdate.mockResolvedValue(cancelled);

      const result = await controller.cancel('job-1', mockUser);

      expect(result).toBe(cancelled);
      expect(mockUpdate).toHaveBeenCalledWith({ where: { id: 'job-1' }, data: { status: JobStatus.CANCELLED } });
      expect(mockAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({ actorId: 'admin-1', action: 'CANCEL_JOB', entityId: 'job-1' }),
      );
    });
  });
});
