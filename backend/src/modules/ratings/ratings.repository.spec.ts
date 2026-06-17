import { RatingsRepository } from './ratings.repository';

const mockCreate = jest.fn();
const mockAggregate = jest.fn();

const mockPrisma = {
  rating: {
    create: mockCreate,
    aggregate: mockAggregate,
  },
} as any;

describe('RatingsRepository', () => {
  let repo: RatingsRepository;

  beforeEach(() => {
    repo = new RatingsRepository(mockPrisma);
    jest.clearAllMocks();
  });

  describe('create()', () => {
    it('creates a rating record with correct fields', async () => {
      const fakeRating = {
        id: 'rating-1',
        jobId: 'job-1',
        customerId: 'cust-1',
        technicianId: 'tech-1',
        rating: 5,
      };
      mockCreate.mockResolvedValue(fakeRating);

      const result = await repo.create('job-1', 'cust-1', 'tech-1', 5);

      expect(result).toBe(fakeRating);
      expect(mockCreate).toHaveBeenCalledWith({
        data: {
          jobId: 'job-1',
          customerId: 'cust-1',
          technicianId: 'tech-1',
          rating: 5,
        },
      });
    });
  });

  describe('getAverageForTechnician()', () => {
    it('returns the aggregated average rating', async () => {
      mockAggregate.mockResolvedValue({ _avg: { rating: 4.5 } });

      const result = await repo.getAverageForTechnician('tech-1');

      expect(result).toBe(4.5);
      expect(mockAggregate).toHaveBeenCalledWith({
        where: { technicianId: 'tech-1' },
        _avg: { rating: true },
      });
    });

    it('returns 5.0 as default when technician has no ratings', async () => {
      mockAggregate.mockResolvedValue({ _avg: { rating: null } });

      const result = await repo.getAverageForTechnician('tech-new');

      expect(result).toBe(5.0);
    });
  });
});
