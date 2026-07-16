import { ServiceCategoriesRepository } from './service-categories.repository';

const mockFindMany = jest.fn();
const mockFindUnique = jest.fn();

const mockPrisma = {
  serviceCategory: {
    findMany: mockFindMany,
    findUnique: mockFindUnique,
  },
} as any;

describe('ServiceCategoriesRepository', () => {
  let repo: ServiceCategoriesRepository;

  beforeEach(() => {
    repo = new ServiceCategoriesRepository(mockPrisma);
    jest.clearAllMocks();
  });

  describe('findAll()', () => {
    it('returns all categories ordered by name', async () => {
      const categories = [
        { id: 'cat-1', name: 'AC Service', active: true },
        { id: 'cat-2', name: 'Electrical', active: true },
      ];
      mockFindMany.mockResolvedValue(categories);

      const result = await repo.findAll();

      expect(result).toBe(categories);
      expect(mockFindMany).toHaveBeenCalledWith({ orderBy: { name: 'asc' } });
    });
  });

  describe('findActive()', () => {
    it('returns only active categories', async () => {
      const active = [{ id: 'cat-1', name: 'Electrical', active: true }];
      mockFindMany.mockResolvedValue(active);

      const result = await repo.findActive();

      expect(result).toBe(active);
      expect(mockFindMany).toHaveBeenCalledWith({
        where: { active: true },
        orderBy: { createdAt: 'asc' },
      });
    });
  });

  describe('findByName()', () => {
    it('returns category when found', async () => {
      const cat = { id: 'cat-1', name: 'Electrical', active: true };
      mockFindUnique.mockResolvedValue(cat);

      const result = await repo.findByName('Electrical');

      expect(result).toBe(cat);
      expect(mockFindUnique).toHaveBeenCalledWith({ where: { name: 'Electrical' } });
    });

    it('returns null when not found', async () => {
      mockFindUnique.mockResolvedValue(null);

      const result = await repo.findByName('Unknown');
      expect(result).toBeNull();
    });
  });

  describe('findById()', () => {
    it('returns category by id', async () => {
      const cat = { id: 'cat-1', name: 'Electrical', active: true };
      mockFindUnique.mockResolvedValue(cat);

      const result = await repo.findById('cat-1');
      expect(result).toBe(cat);
      expect(mockFindUnique).toHaveBeenCalledWith({ where: { id: 'cat-1' } });
    });
  });
});
