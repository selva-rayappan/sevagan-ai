import { JobsService } from './jobs.service';
import { JobStatus, PaymentMode } from '../../domain/enums';

const mockCreate = jest.fn();
const mockFindByJobNumber = jest.fn();
const mockUpdateStatus = jest.fn();
const mockFindById = jest.fn();
const mockFindByIdWithDetails = jest.fn();
const mockFindByTechnicianId = jest.fn();
const mockSetCompletion = jest.fn();
const mockAppendDescription = jest.fn();

const mockJobsRepository = {
  create: mockCreate,
  findByJobNumber: mockFindByJobNumber,
  updateStatus: mockUpdateStatus,
  findById: mockFindById,
  findByIdWithDetails: mockFindByIdWithDetails,
  findByTechnicianId: mockFindByTechnicianId,
  setCompletion: mockSetCompletion,
  appendDescription: mockAppendDescription,
} as any;

const mockIncr = jest.fn();
const mockExpire = jest.fn();

const mockRedis = {
  getClient: () => ({ incr: mockIncr, expire: mockExpire }),
} as any;

describe('JobsService', () => {
  let service: JobsService;

  beforeEach(() => {
    service = new JobsService(mockJobsRepository, mockRedis);
    jest.clearAllMocks();
  });

  describe('generateJobNumber()', () => {
    it('returns a JOB-YYYYMMDD-NNNN formatted string', async () => {
      mockIncr.mockResolvedValue(1);
      mockExpire.mockResolvedValue(1);

      const jobNumber = await service.generateJobNumber();

      expect(jobNumber).toMatch(/^JOB-\d{8}-\d{4}$/);
      expect(jobNumber).toContain('-0001');
    });

    it('pads the counter to 4 digits', async () => {
      mockIncr.mockResolvedValue(42);
      mockExpire.mockResolvedValue(1);

      const jobNumber = await service.generateJobNumber();
      expect(jobNumber).toContain('-0042');
    });

    it('calls INCR on the daily counter key and sets a 2-day TTL', async () => {
      mockIncr.mockResolvedValue(5);
      mockExpire.mockResolvedValue(1);

      await service.generateJobNumber();

      expect(mockIncr).toHaveBeenCalledWith(expect.stringMatching(/^job_counter:\d{8}$/));
      expect(mockExpire).toHaveBeenCalledWith(expect.stringMatching(/^job_counter:\d{8}$/), 172800);
    });
  });

  describe('createJob()', () => {
    it('generates a job number and delegates to the repository', async () => {
      mockIncr.mockResolvedValue(1);
      mockExpire.mockResolvedValue(1);
      const fakeJob = { id: 'job-1', jobNumber: 'JOB-20260614-0001' };
      mockCreate.mockResolvedValue(fakeJob);

      const result = await service.createJob({
        customerId: 'cust-1',
        serviceCategoryId: 'cat-1',
        location: 'Virudhunagar',
        scheduledTimeText: 'Today 4 PM',
      });

      expect(result).toBe(fakeJob);
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          customerId: 'cust-1',
          serviceCategoryId: 'cat-1',
          location: 'Virudhunagar',
          description: 'Requested time: Today 4 PM',
        }),
      );
    });

    it('appends extra description when provided', async () => {
      mockIncr.mockResolvedValue(2);
      mockExpire.mockResolvedValue(1);
      mockCreate.mockResolvedValue({ id: 'job-2', jobNumber: 'JOB-20260614-0002' });

      await service.createJob({
        customerId: 'cust-1',
        serviceCategoryId: 'cat-1',
        location: 'Sattur',
        scheduledTimeText: 'ASAP',
        description: 'AC not cooling',
      });

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          description: 'Requested time: ASAP | AC not cooling',
        }),
      );
    });
  });

  describe('findByJobNumber()', () => {
    it('delegates to the repository', async () => {
      const fakeJob = { id: 'job-1', jobNumber: 'JOB-20260614-0001', serviceCategory: {} };
      mockFindByJobNumber.mockResolvedValue(fakeJob);

      const result = await service.findByJobNumber('JOB-20260614-0001');

      expect(result).toBe(fakeJob);
      expect(mockFindByJobNumber).toHaveBeenCalledWith('JOB-20260614-0001');
    });

    it('returns null when job does not exist', async () => {
      mockFindByJobNumber.mockResolvedValue(null);

      const result = await service.findByJobNumber('JOB-00000000-9999');
      expect(result).toBeNull();
    });
  });

  describe('cancelJob()', () => {
    it('updates the job status to CANCELLED', async () => {
      const cancelledJob = { id: 'job-1', status: 'CANCELLED' };
      mockUpdateStatus.mockResolvedValue(cancelledJob);

      const result = await service.cancelJob('job-1');

      expect(result).toBe(cancelledJob);
      expect(mockUpdateStatus).toHaveBeenCalledWith('job-1', JobStatus.CANCELLED);
    });
  });

  describe('findById()', () => {
    it('delegates to the repository', async () => {
      const job = { id: 'job-1' };
      mockFindById.mockResolvedValue(job);

      const result = await service.findById('job-1');

      expect(result).toBe(job);
      expect(mockFindById).toHaveBeenCalledWith('job-1');
    });

    it('returns null when job does not exist', async () => {
      mockFindById.mockResolvedValue(null);
      const result = await service.findById('nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('findWithDetails()', () => {
    it('delegates to findByIdWithDetails', async () => {
      const jobWithDetails = {
        id: 'job-1',
        serviceCategory: { name: 'Electrical' },
        customer: { phone: '919876543210' },
        assignment: null,
      };
      mockFindByIdWithDetails.mockResolvedValue(jobWithDetails);

      const result = await service.findWithDetails('job-1');

      expect(result).toBe(jobWithDetails);
      expect(mockFindByIdWithDetails).toHaveBeenCalledWith('job-1');
    });
  });

  describe('findByTechnicianId()', () => {
    it('delegates to the repository with the given limit', async () => {
      const jobs = [{ id: 'job-1', serviceCategory: { name: 'Electrical' } }];
      mockFindByTechnicianId.mockResolvedValue(jobs);

      const result = await service.findByTechnicianId('tech-1', 3);

      expect(result).toBe(jobs);
      expect(mockFindByTechnicianId).toHaveBeenCalledWith('tech-1', 3);
    });
  });

  describe('updateStatus()', () => {
    it('delegates to the repository', async () => {
      const updatedJob = { id: 'job-1', status: JobStatus.IN_PROGRESS };
      mockUpdateStatus.mockResolvedValue(updatedJob);

      const result = await service.updateStatus('job-1', JobStatus.IN_PROGRESS);

      expect(result).toBe(updatedJob);
      expect(mockUpdateStatus).toHaveBeenCalledWith('job-1', JobStatus.IN_PROGRESS);
    });
  });

  describe('setCompletion()', () => {
    it('delegates to the repository with amount and paymentMode', async () => {
      const completedJob = { id: 'job-1', status: JobStatus.COMPLETED, jobAmount: 500 };
      mockSetCompletion.mockResolvedValue(completedJob);

      const result = await service.setCompletion('job-1', 500, PaymentMode.UPI);

      expect(result).toBe(completedJob);
      expect(mockSetCompletion).toHaveBeenCalledWith('job-1', 500, PaymentMode.UPI);
    });
  });

  describe('appendPhotoUrl()', () => {
    it('calls appendDescription with "Photo: {url}" prefix', async () => {
      mockAppendDescription.mockResolvedValue(undefined);

      await service.appendPhotoUrl('job-1', 'job-photos/job-1/123.jpeg');

      expect(mockAppendDescription).toHaveBeenCalledWith('job-1', 'Photo: job-photos/job-1/123.jpeg');
    });
  });
});
