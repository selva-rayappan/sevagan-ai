import { TechniciansRepository } from './technicians.repository';
import { Language, TechnicianStatus } from '../../domain/enums';

const mockFindUnique = jest.fn();
const mockUpdate = jest.fn();

const mockPrisma = {
  technician: {
    findUnique: mockFindUnique,
    update: mockUpdate,
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
});
