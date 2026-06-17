import { DisputesRepository } from './disputes.repository';

const mockCreate = jest.fn();

const mockPrisma = {
  dispute: { create: mockCreate },
} as any;

describe('DisputesRepository', () => {
  let repo: DisputesRepository;

  beforeEach(() => {
    repo = new DisputesRepository(mockPrisma);
    jest.clearAllMocks();
  });

  describe('create()', () => {
    it('creates a dispute with OPEN status (default) and correct amounts', async () => {
      const fakeDispute = {
        id: 'dispute-1',
        jobId: 'job-1',
        customerAmount: 1000,
        technicianAmount: 1200,
        status: 'OPEN',
      };
      mockCreate.mockResolvedValue(fakeDispute);

      const result = await repo.create('job-1', 1000, 1200);

      expect(result).toBe(fakeDispute);
      expect(mockCreate).toHaveBeenCalledWith({
        data: {
          jobId: 'job-1',
          customerAmount: 1000,
          technicianAmount: 1200,
        },
      });
    });
  });
});
