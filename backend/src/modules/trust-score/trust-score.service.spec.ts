import { TrustScoreService, TrustEvent } from './trust-score.service';

const mockFindById = jest.fn();
const mockUpdateTrustScore = jest.fn();

const mockTechniciansRepository = {
  findById: mockFindById,
  updateTrustScore: mockUpdateTrustScore,
} as any;

describe('TrustScoreService', () => {
  let service: TrustScoreService;

  beforeEach(() => {
    service = new TrustScoreService(mockTechniciansRepository);
    jest.clearAllMocks();
  });

  describe('applyTrustEvent()', () => {
    it('deducts 5 for AMOUNT_DISPUTED (100 → 95)', async () => {
      mockFindById.mockResolvedValue({ id: 'tech-1', trustScore: 100 });
      mockUpdateTrustScore.mockResolvedValue(undefined);

      await service.applyTrustEvent('tech-1', TrustEvent.AMOUNT_DISPUTED);

      expect(mockUpdateTrustScore).toHaveBeenCalledWith('tech-1', 95);
    });

    it('deducts 10 for MISMATCH_RESOLVED_AGAINST_TECH (80 → 70)', async () => {
      mockFindById.mockResolvedValue({ id: 'tech-1', trustScore: 80 });

      await service.applyTrustEvent('tech-1', TrustEvent.MISMATCH_RESOLVED_AGAINST_TECH);

      expect(mockUpdateTrustScore).toHaveBeenCalledWith('tech-1', 70);
    });

    it('deducts 25 for FRAUD_DETECTED (30 → 5)', async () => {
      mockFindById.mockResolvedValue({ id: 'tech-1', trustScore: 30 });

      await service.applyTrustEvent('tech-1', TrustEvent.FRAUD_DETECTED);

      expect(mockUpdateTrustScore).toHaveBeenCalledWith('tech-1', 5);
    });

    it('adds 2 for POSITIVE_RATING (95 → 97)', async () => {
      mockFindById.mockResolvedValue({ id: 'tech-1', trustScore: 95 });

      await service.applyTrustEvent('tech-1', TrustEvent.POSITIVE_RATING);

      expect(mockUpdateTrustScore).toHaveBeenCalledWith('tech-1', 97);
    });

    it('deducts 3 for NEGATIVE_RATING (10 → 7)', async () => {
      mockFindById.mockResolvedValue({ id: 'tech-1', trustScore: 10 });

      await service.applyTrustEvent('tech-1', TrustEvent.NEGATIVE_RATING);

      expect(mockUpdateTrustScore).toHaveBeenCalledWith('tech-1', 7);
    });

    it('clamps score to 0 — never goes negative (score 3 with FRAUD_DETECTED → 0)', async () => {
      mockFindById.mockResolvedValue({ id: 'tech-1', trustScore: 3 });

      await service.applyTrustEvent('tech-1', TrustEvent.FRAUD_DETECTED);

      expect(mockUpdateTrustScore).toHaveBeenCalledWith('tech-1', 0);
    });

    it('clamps score to 0 when deduction exactly equals score (score 5, AMOUNT_DISPUTED → 0)', async () => {
      mockFindById.mockResolvedValue({ id: 'tech-1', trustScore: 5 });

      await service.applyTrustEvent('tech-1', TrustEvent.AMOUNT_DISPUTED);

      expect(mockUpdateTrustScore).toHaveBeenCalledWith('tech-1', 0);
    });

    it('does not call updateTrustScore when technician is not found', async () => {
      mockFindById.mockResolvedValue(null);

      await service.applyTrustEvent('nonexistent', TrustEvent.AMOUNT_DISPUTED);

      expect(mockUpdateTrustScore).not.toHaveBeenCalled();
    });
  });
});
