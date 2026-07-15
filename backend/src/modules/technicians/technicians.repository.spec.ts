import { TechniciansRepository } from './technicians.repository';
import { Language, TechnicianStatus } from '../../domain/enums';

const mockFindUnique = jest.fn();
const mockUpdate = jest.fn();
const mockFindFirst = jest.fn();
const mockFindMany = jest.fn();
const mockCreate = jest.fn();

const mockPrisma = {
  technician: {
    findUnique: mockFindUnique,
    update: mockUpdate,
    findFirst: mockFindFirst,
    findMany: mockFindMany,
    create: mockCreate,
  },
} as any;

describe('TechniciansRepository', () => {
  let repo: TechniciansRepository;

  beforeEach(() => {
    repo = new TechniciansRepository(mockPrisma);
    jest.clearAllMocks();
  });

  describe('findByPhone()', () => {
    it('returns technician when found', async () => {
      const tech = { id: 't-1', phone: '919111111111' };
      mockFindUnique.mockResolvedValue(tech);

      const result = await repo.findByPhone('919111111111');

      expect(result).toBe(tech);
      expect(mockFindUnique).toHaveBeenCalledWith({ where: { phone: '919111111111' } });
    });

    it('returns null when not found', async () => {
      mockFindUnique.mockResolvedValue(null);
      const result = await repo.findByPhone('000');
      expect(result).toBeNull();
    });

    it('retries with the raw phone when the normalized lookup misses and the formats differ', async () => {
      mockFindUnique
        .mockResolvedValueOnce(null) // normalized lookup
        .mockResolvedValueOnce({ id: 't-1', phone: '+91 98765 43210' }); // raw lookup

      const result = await repo.findByPhone('+91 98765 43210');

      expect(result).toEqual({ id: 't-1', phone: '+91 98765 43210' });
      expect(mockFindUnique).toHaveBeenNthCalledWith(1, { where: { phone: '919876543210' } });
      expect(mockFindUnique).toHaveBeenNthCalledWith(2, { where: { phone: '+91 98765 43210' } });
    });

    it('does not retry when the normalized and raw phone are identical', async () => {
      mockFindUnique.mockResolvedValue(null);

      const result = await repo.findByPhone('919876543210');

      expect(result).toBeNull();
      expect(mockFindUnique).toHaveBeenCalledTimes(1);
    });
  });

  describe('findById()', () => {
    it('returns technician by id', async () => {
      const tech = { id: 't-1', phone: '919111111111' };
      mockFindUnique.mockResolvedValue(tech);

      const result = await repo.findById('t-1');
      expect(result).toBe(tech);
      expect(mockFindUnique).toHaveBeenCalledWith({ where: { id: 't-1' } });
    });
  });

  describe('updateLanguage()', () => {
    it('persists the new language on the technician record', async () => {
      mockUpdate.mockResolvedValue({});

      await repo.updateLanguage('t-1', Language.TA);

      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: 't-1' },
        data: { language: Language.TA },
      });
    });
  });

  describe('updateStatus()', () => {
    it('persists the new status on the technician record', async () => {
      mockUpdate.mockResolvedValue({});

      await repo.updateStatus('t-1', TechnicianStatus.BUSY);

      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: 't-1' },
        data: { status: TechnicianStatus.BUSY },
      });
    });
  });

  describe('updateTrustScore()', () => {
    it('persists the new trust score', async () => {
      mockUpdate.mockResolvedValue({});

      await repo.updateTrustScore('t-1', 85);

      expect(mockUpdate).toHaveBeenCalledWith({ where: { id: 't-1' }, data: { trustScore: 85 } });
    });
  });

  describe('updateRating()', () => {
    it('persists the new rolling rating', async () => {
      mockUpdate.mockResolvedValue({});

      await repo.updateRating('t-1', 4.5);

      expect(mockUpdate).toHaveBeenCalledWith({ where: { id: 't-1' }, data: { rating: 4.5 } });
    });
  });

  describe('findBestAvailable()', () => {
    it('queries by category, availability, and location keyword, excluding given ids', async () => {
      const tech = { id: 't-1' };
      mockFindFirst.mockResolvedValue(tech);

      const result = await repo.findBestAvailable('cat-1', 'Allampatti, Virudhunagar', ['t-2']);

      expect(result).toBe(tech);
      expect(mockFindFirst).toHaveBeenCalledWith({
        where: {
          status: TechnicianStatus.AVAILABLE,
          active: true,
          serviceArea: { contains: 'Virudhunagar', mode: 'insensitive' },
          skills: { some: { categoryId: 'cat-1' } },
          id: { notIn: ['t-2'] },
        },
        orderBy: [{ trustScore: 'desc' }, { rating: 'desc' }],
      });
    });

    it('omits the notIn clause when there are no excluded ids', async () => {
      mockFindFirst.mockResolvedValue(null);

      await repo.findBestAvailable('cat-1', 'Virudhunagar', []);

      expect(mockFindFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.not.objectContaining({ id: expect.anything() }),
        }),
      );
    });

    it('falls back to any available technician with the skill when no area match exists', async () => {
      const fallbackTech = { id: 't-3' };
      mockFindFirst
        .mockResolvedValueOnce(null) // area-scoped query finds nobody
        .mockResolvedValueOnce(fallbackTech); // area-agnostic fallback finds someone

      const result = await repo.findBestAvailable('cat-1', 'Somewhere Unmapped', []);

      expect(result).toBe(fallbackTech);
      expect(mockFindFirst).toHaveBeenCalledTimes(2);
      expect(mockFindFirst).toHaveBeenNthCalledWith(1, expect.objectContaining({
        where: expect.objectContaining({ serviceArea: expect.anything() }),
      }));
      expect(mockFindFirst).toHaveBeenNthCalledWith(2, {
        where: {
          status: TechnicianStatus.AVAILABLE,
          active: true,
          skills: { some: { categoryId: 'cat-1' } },
        },
        orderBy: [{ trustScore: 'desc' }, { rating: 'desc' }],
      });
    });

    it('does not fall back when an area match is found', async () => {
      const tech = { id: 't-1' };
      mockFindFirst.mockResolvedValueOnce(tech);

      await repo.findBestAvailable('cat-1', 'Virudhunagar', []);

      expect(mockFindFirst).toHaveBeenCalledTimes(1);
    });
  });

  describe('findAll()', () => {
    it('filters to active technicians by default', async () => {
      mockFindMany.mockResolvedValue([]);

      await repo.findAll();

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { active: true } }),
      );
    });

    it('returns all technicians when activeOnly is false', async () => {
      mockFindMany.mockResolvedValue([]);

      await repo.findAll(false);

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: undefined }),
      );
    });
  });

  describe('create()', () => {
    it('normalizes the phone number and defaults language to EN', async () => {
      const tech = { id: 't-1' };
      mockCreate.mockResolvedValue(tech);

      const result = await repo.create({ name: 'Kumar', phone: '9876543210', serviceArea: 'Virudhunagar' });

      expect(result).toBe(tech);
      expect(mockCreate).toHaveBeenCalledWith({
        data: {
          name: 'Kumar',
          phone: '919876543210',
          serviceArea: 'Virudhunagar',
          language: Language.EN,
        },
      });
    });

    it('respects an explicit language', async () => {
      mockCreate.mockResolvedValue({ id: 't-1' });

      await repo.create({ name: 'Kumar', phone: '9876543210', serviceArea: 'Virudhunagar', language: Language.TA });

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ language: Language.TA }) }),
      );
    });
  });

  describe('update()', () => {
    it('normalizes the phone number when updating it', async () => {
      const updated = { id: 't-1' };
      mockUpdate.mockResolvedValue(updated);

      const result = await repo.update('t-1', { phone: '9876543210' });

      expect(result).toBe(updated);
      expect(mockUpdate).toHaveBeenCalledWith({ where: { id: 't-1' }, data: { phone: '919876543210' } });
    });

    it('leaves other fields untouched when no phone is given', async () => {
      mockUpdate.mockResolvedValue({ id: 't-1' });

      await repo.update('t-1', { name: 'New Name', active: false });

      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: 't-1' },
        data: { name: 'New Name', active: false },
      });
    });
  });
});
