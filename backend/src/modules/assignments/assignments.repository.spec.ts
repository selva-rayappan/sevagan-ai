import { AssignmentsRepository } from './assignments.repository';

const mockCreate = jest.fn();
const mockFindUnique = jest.fn();
const mockFindMany = jest.fn();
const mockUpdate = jest.fn();
const mockDelete = jest.fn();

const mockPrisma = {
  assignment: {
    create: mockCreate,
    findUnique: mockFindUnique,
    findMany: mockFindMany,
    update: mockUpdate,
    delete: mockDelete,
  },
} as any;

describe('AssignmentsRepository', () => {
  let repo: AssignmentsRepository;

  beforeEach(() => {
    repo = new AssignmentsRepository(mockPrisma);
    jest.clearAllMocks();
  });

  describe('create()', () => {
    it('creates an assignment', async () => {
      const assignment = { id: 'a-1', jobId: 'job-1', technicianId: 't-1' };
      mockCreate.mockResolvedValue(assignment);

      const result = await repo.create({ jobId: 'job-1', technicianId: 't-1' });

      expect(result).toBe(assignment);
      expect(mockCreate).toHaveBeenCalledWith({ data: { jobId: 'job-1', technicianId: 't-1' } });
    });
  });

  describe('findByJobId()', () => {
    it('finds assignment by jobId', async () => {
      const assignment = { id: 'a-1', jobId: 'job-1' };
      mockFindUnique.mockResolvedValue(assignment);

      const result = await repo.findByJobId('job-1');

      expect(result).toBe(assignment);
      expect(mockFindUnique).toHaveBeenCalledWith({ where: { jobId: 'job-1' } });
    });

    it('returns null when not found', async () => {
      mockFindUnique.mockResolvedValue(null);
      const result = await repo.findByJobId('job-999');
      expect(result).toBeNull();
    });
  });

  describe('findById()', () => {
    it('finds assignment by id', async () => {
      const assignment = { id: 'a-1', jobId: 'job-1' };
      mockFindUnique.mockResolvedValue(assignment);

      const result = await repo.findById('a-1');
      expect(result).toBe(assignment);
    });
  });

  describe('accept()', () => {
    it('sets acceptedAt to now', async () => {
      const updated = { id: 'a-1', acceptedAt: new Date() };
      mockUpdate.mockResolvedValue(updated);

      const result = await repo.accept('a-1');

      expect(result).toBe(updated);
      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: 'a-1' },
        data: { acceptedAt: expect.any(Date) },
      });
    });
  });

  describe('deleteById()', () => {
    it('deletes an assignment by id', async () => {
      mockDelete.mockResolvedValue({});

      await repo.deleteById('a-1');

      expect(mockDelete).toHaveBeenCalledWith({ where: { id: 'a-1' } });
    });
  });

  describe('findByTechnicianId()', () => {
    it('returns assignments for a technician ordered by date', async () => {
      const assignments = [
        { id: 'a-2', technicianId: 't-1', assignedAt: new Date() },
        { id: 'a-1', technicianId: 't-1', assignedAt: new Date(Date.now() - 86400000) },
      ];
      mockFindMany.mockResolvedValue(assignments);

      const result = await repo.findByTechnicianId('t-1');

      expect(result).toBe(assignments);
      expect(mockFindMany).toHaveBeenCalledWith({
        where: { technicianId: 't-1' },
        orderBy: { assignedAt: 'desc' },
      });
    });
  });
});
