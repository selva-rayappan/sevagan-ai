import { MessageTrailService } from './message-trail.service';

const mockSend = jest.fn();

jest.mock('@aws-sdk/client-s3', () => {
  const actual = jest.requireActual('@aws-sdk/client-s3');
  return {
    ...actual,
    S3Client: jest.fn().mockImplementation(() => ({ send: mockSend })),
  };
});

const mockTechnicianFindUnique = jest.fn();
const mockAssignmentFindFirst = jest.fn();
const mockCustomerFindUnique = jest.fn();
const mockJobFindFirst = jest.fn();

const mockPrisma = {
  technician: { findUnique: mockTechnicianFindUnique },
  assignment: { findFirst: mockAssignmentFindFirst },
  customer: { findUnique: mockCustomerFindUnique },
  job: { findFirst: mockJobFindFirst },
} as any;

const CONFIG_VALUES: Record<string, string> = {
  'messageTrail.s3Bucket': 'sevagan-ai',
  'messageTrail.s3Region': 'us-east-1',
};
const mockConfigService = {
  get: jest.fn((key: string, fallback?: string) => CONFIG_VALUES[key] ?? fallback),
} as any;

describe('MessageTrailService', () => {
  let service: MessageTrailService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new MessageTrailService(mockConfigService, mockPrisma);
  });

  describe('record()', () => {
    it('writes the entry under the resolved job prefix when the phone belongs to a technician', async () => {
      mockTechnicianFindUnique.mockResolvedValue({ id: 'tech-1' });
      mockAssignmentFindFirst.mockResolvedValue({ jobId: 'job-1' });
      mockSend.mockResolvedValue({});

      await service.record('919876543210', 'OUTBOUND', 'text', 'Hello');

      expect(mockAssignmentFindFirst).toHaveBeenCalledWith({
        where: { technicianId: 'tech-1' },
        orderBy: { assignedAt: 'desc' },
      });
      const command = mockSend.mock.calls[0][0];
      expect(command.input.Bucket).toBe('sevagan-ai');
      expect(command.input.Key).toContain('message-trails/job/job-1/');
      const body = JSON.parse(command.input.Body);
      expect(body).toMatchObject({ jobId: 'job-1', phone: '919876543210', direction: 'OUTBOUND', summary: 'Hello' });
    });

    it('resolves via the customer when the phone is not a technician', async () => {
      mockTechnicianFindUnique.mockResolvedValue(null);
      mockCustomerFindUnique.mockResolvedValue({ id: 'cust-1' });
      mockJobFindFirst.mockResolvedValue({ id: 'job-2' });
      mockSend.mockResolvedValue({});

      await service.record('919000000000', 'INBOUND', 'text', 'Hi');

      const command = mockSend.mock.calls[0][0];
      expect(command.input.Key).toContain('message-trails/job/job-2/');
    });

    it('falls back to the unassigned prefix when the phone matches no customer or technician', async () => {
      mockTechnicianFindUnique.mockResolvedValue(null);
      mockCustomerFindUnique.mockResolvedValue(null);
      mockSend.mockResolvedValue({});

      await service.record('910000000000', 'INBOUND', 'text', 'Hi');

      const command = mockSend.mock.calls[0][0];
      expect(command.input.Key).toContain('message-trails/unassigned/910000000000/');
    });

    it('swallows S3 errors instead of throwing', async () => {
      mockTechnicianFindUnique.mockResolvedValue(null);
      mockCustomerFindUnique.mockResolvedValue(null);
      mockSend.mockRejectedValue(new Error('S3 down'));

      await expect(service.record('910000000000', 'INBOUND', 'text', 'Hi')).resolves.toBeUndefined();
    });
  });

  describe('listForJob()', () => {
    it('fetches and sorts every object under the job prefix', async () => {
      mockSend
        .mockResolvedValueOnce({ Contents: [{ Key: 'message-trails/job/job-1/b' }, { Key: 'message-trails/job/job-1/a' }] })
        .mockResolvedValueOnce({ Body: { transformToString: async () => JSON.stringify({ timestamp: '2026-01-02T00:00:00Z', id: 'b' }) } })
        .mockResolvedValueOnce({ Body: { transformToString: async () => JSON.stringify({ timestamp: '2026-01-01T00:00:00Z', id: 'a' }) } });

      const result = await service.listForJob('job-1');

      expect(result.map((e) => e.id)).toEqual(['a', 'b']);
    });

    it('returns an empty array when listing fails', async () => {
      mockSend.mockRejectedValue(new Error('S3 down'));

      const result = await service.listForJob('job-1');

      expect(result).toEqual([]);
    });
  });
});
