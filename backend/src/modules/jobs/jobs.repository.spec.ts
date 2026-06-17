import { JobsRepository } from './jobs.repository';
import { JobStatus, PaymentMode } from '../../domain/enums';

const mockCreate = jest.fn();
const mockFindUnique = jest.fn();
const mockFindMany = jest.fn();
const mockUpdate = jest.fn();

const mockPrisma = {
  job: {
    create: mockCreate,
    findUnique: mockFindUnique,
    findMany: mockFindMany,
    update: mockUpdate,
  },
} as any;

describe('JobsRepository', () => {
  let repo: JobsRepository;

  beforeEach(() => {
    repo = new JobsRepository(mockPrisma);
    jest.clearAllMocks();
  });

  describe('create()', () => {
    it('creates a job record in the database', async () => {
      const fakeJob = { id: 'job-1', jobNumber: 'JOB-20260614-0001' };
      mockCreate.mockResolvedValue(fakeJob);

      const result = await repo.create({
        jobNumber: 'JOB-20260614-0001',
        customerId: 'cust-1',
        serviceCategoryId: 'cat-1',
        location: 'Virudhunagar',
      });

      expect(result).toBe(fakeJob);
      expect(mockCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          jobNumber: 'JOB-20260614-0001',
          customerId: 'cust-1',
        }),
      });
    });
  });

  describe('findByJobNumber()', () => {
    it('returns job with category when found', async () => {
      const fakeJob = {
        id: 'job-1',
        jobNumber: 'JOB-20260614-0001',
        serviceCategory: { id: 'cat-1', name: 'Electrical' },
      };
      mockFindUnique.mockResolvedValue(fakeJob);

      const result = await repo.findByJobNumber('JOB-20260614-0001');

      expect(result).toBe(fakeJob);
      expect(mockFindUnique).toHaveBeenCalledWith({
        where: { jobNumber: 'JOB-20260614-0001' },
        include: { serviceCategory: true },
      });
    });

    it('returns null when not found', async () => {
      mockFindUnique.mockResolvedValue(null);

      const result = await repo.findByJobNumber('JOB-00000000-0000');
      expect(result).toBeNull();
    });
  });

  describe('findByCustomerId()', () => {
    it('returns all jobs for a customer ordered by date descending', async () => {
      const jobs = [
        { id: 'job-2', customerId: 'cust-1' },
        { id: 'job-1', customerId: 'cust-1' },
      ];
      mockFindMany.mockResolvedValue(jobs);

      const result = await repo.findByCustomerId('cust-1');

      expect(result).toBe(jobs);
      expect(mockFindMany).toHaveBeenCalledWith({
        where: { customerId: 'cust-1' },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('updateStatus()', () => {
    it('updates the job status', async () => {
      const updatedJob = { id: 'job-1', status: 'CANCELLED' };
      mockUpdate.mockResolvedValue(updatedJob);

      const result = await repo.updateStatus('job-1', JobStatus.CANCELLED);

      expect(result).toBe(updatedJob);
      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: 'job-1' },
        data: { status: JobStatus.CANCELLED },
      });
    });
  });

  describe('findById()', () => {
    it('returns a job by id', async () => {
      const job = { id: 'job-1', jobNumber: 'JOB-20260614-0001' };
      mockFindUnique.mockResolvedValue(job);

      const result = await repo.findById('job-1');

      expect(result).toBe(job);
      expect(mockFindUnique).toHaveBeenCalledWith({ where: { id: 'job-1' } });
    });

    it('returns null when job not found', async () => {
      mockFindUnique.mockResolvedValue(null);
      const result = await repo.findById('nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('findByIdWithDetails()', () => {
    it('returns a job with serviceCategory, customer, and assignment', async () => {
      const jobWithDetails = {
        id: 'job-1',
        jobNumber: 'JOB-20260614-0001',
        serviceCategory: { id: 'cat-1', name: 'Electrical' },
        customer: { id: 'cust-1', phone: '919876543210' },
        assignment: null,
      };
      mockFindUnique.mockResolvedValue(jobWithDetails);

      const result = await repo.findByIdWithDetails('job-1');

      expect(result).toBe(jobWithDetails);
      expect(mockFindUnique).toHaveBeenCalledWith({
        where: { id: 'job-1' },
        include: {
          serviceCategory: true,
          customer: true,
          assignment: { include: { technician: true } },
        },
      });
    });
  });

  describe('findByTechnicianId()', () => {
    it('returns jobs for a technician via the assignment relation', async () => {
      const jobs = [{ id: 'job-1', serviceCategory: { name: 'Electrical' } }];
      mockFindMany.mockResolvedValue(jobs);

      const result = await repo.findByTechnicianId('tech-1', 5);

      expect(result).toBe(jobs);
      expect(mockFindMany).toHaveBeenCalledWith({
        where: { assignment: { technicianId: 'tech-1' } },
        include: { serviceCategory: true },
        orderBy: { createdAt: 'desc' },
        take: 5,
      });
    });

    it('uses the default limit of 5', async () => {
      mockFindMany.mockResolvedValue([]);
      await repo.findByTechnicianId('tech-1');
      expect(mockFindMany).toHaveBeenCalledWith(expect.objectContaining({ take: 5 }));
    });
  });

  describe('setCompletion()', () => {
    it('updates job with amount, paymentMode, and COMPLETED status', async () => {
      const completedJob = { id: 'job-1', status: 'COMPLETED', jobAmount: 500 };
      mockUpdate.mockResolvedValue(completedJob);

      const result = await repo.setCompletion('job-1', 500, PaymentMode.CASH);

      expect(result).toBe(completedJob);
      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: 'job-1' },
        data: {
          jobAmount: 500,
          paymentMode: PaymentMode.CASH,
          status: 'COMPLETED',
        },
      });
    });
  });

  describe('appendDescription()', () => {
    it('appends text to existing description with a newline', async () => {
      mockFindUnique.mockResolvedValue({ description: 'Requested time: Today 4 PM' });
      mockUpdate.mockResolvedValue({});

      await repo.appendDescription('job-1', 'Photo: job-photos/job-1/123.jpeg');

      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: 'job-1' },
        data: { description: 'Requested time: Today 4 PM\nPhoto: job-photos/job-1/123.jpeg' },
      });
    });

    it('sets description directly when current description is null', async () => {
      mockFindUnique.mockResolvedValue({ description: null });
      mockUpdate.mockResolvedValue({});

      await repo.appendDescription('job-1', 'Photo: job-photos/job-1/456.jpeg');

      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: 'job-1' },
        data: { description: 'Photo: job-photos/job-1/456.jpeg' },
      });
    });
  });
});
