import { ServiceCategoriesAdminController } from './service-categories.controller';

const mockFindMany = jest.fn();
const mockPrisma = { serviceCategory: { findMany: mockFindMany } } as any;

describe('ServiceCategoriesAdminController', () => {
  let controller: ServiceCategoriesAdminController;

  beforeEach(() => {
    controller = new ServiceCategoriesAdminController(mockPrisma);
    jest.clearAllMocks();
  });

  describe('list()', () => {
    it('returns active categories ordered by name', async () => {
      const categories = [{ id: 'cat-1', name: 'Electrical' }];
      mockFindMany.mockResolvedValue(categories);

      const result = await controller.list();

      expect(result).toBe(categories);
      expect(mockFindMany).toHaveBeenCalledWith({ where: { active: true }, orderBy: { name: 'asc' } });
    });
  });
});
