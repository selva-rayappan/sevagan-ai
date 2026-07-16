import { ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ServiceCategoriesAdminController } from './service-categories.controller';

const mockFindMany = jest.fn();
const mockCreate = jest.fn();
const mockUpdate = jest.fn();
const mockDelete = jest.fn();
const mockPrisma = {
  serviceCategory: {
    findMany: mockFindMany,
    create: mockCreate,
    update: mockUpdate,
    delete: mockDelete,
  },
} as any;

const mockAuditLog = jest.fn().mockResolvedValue(undefined);
const mockAuditService = { log: mockAuditLog } as any;
const mockUser = { id: 'admin-1', email: 'admin@sevagan.in', role: 'ADMIN', name: 'Admin' };

describe('ServiceCategoriesAdminController', () => {
  let controller: ServiceCategoriesAdminController;

  beforeEach(() => {
    controller = new ServiceCategoriesAdminController(mockPrisma, mockAuditService);
    jest.clearAllMocks();
  });

  describe('list()', () => {
    it('returns only active categories by default', async () => {
      const categories = [{ id: 'cat-1', name: 'Electrical' }];
      mockFindMany.mockResolvedValue(categories);

      const result = await controller.list();

      expect(result).toBe(categories);
      expect(mockFindMany).toHaveBeenCalledWith({ where: { active: true }, orderBy: { name: 'asc' } });
    });

    it('returns all categories including held ones when all=true', async () => {
      mockFindMany.mockResolvedValue([]);

      await controller.list('true');

      expect(mockFindMany).toHaveBeenCalledWith({ where: undefined, orderBy: { name: 'asc' } });
    });
  });

  describe('create()', () => {
    it('creates a category and logs the audit entry', async () => {
      const category = { id: 'cat-1', name: 'Pest Control' };
      mockCreate.mockResolvedValue(category);

      const result = await controller.create({ name: 'Pest Control' }, mockUser);

      expect(result).toBe(category);
      expect(mockCreate).toHaveBeenCalledWith({
        data: { name: 'Pest Control', description: undefined },
      });
      expect(mockAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({ actorId: 'admin-1', action: 'CREATE_SERVICE_CATEGORY', entityId: 'cat-1' }),
      );
    });
  });

  describe('update()', () => {
    it('updates fields including the active flag for hold/unhold', async () => {
      const category = { id: 'cat-1', active: false };
      mockUpdate.mockResolvedValue(category);

      const result = await controller.update('cat-1', { active: false }, mockUser);

      expect(result).toBe(category);
      expect(mockUpdate).toHaveBeenCalledWith({ where: { id: 'cat-1' }, data: { active: false } });
      expect(mockAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'UPDATE_SERVICE_CATEGORY', entityId: 'cat-1' }),
      );
    });
  });

  describe('remove()', () => {
    it('deletes an unreferenced category', async () => {
      mockDelete.mockResolvedValue({});

      const result = await controller.remove('cat-1', mockUser);

      expect(result).toEqual({ message: 'Service category removed' });
      expect(mockAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'DELETE_SERVICE_CATEGORY', entityId: 'cat-1' }),
      );
    });

    it('throws a ConflictException when the category is still referenced', async () => {
      mockDelete.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('FK violation', { code: 'P2003', clientVersion: '6.19.3' }),
      );

      await expect(controller.remove('cat-1', mockUser)).rejects.toThrow(ConflictException);
      expect(mockAuditLog).not.toHaveBeenCalled();
    });

    it('rethrows unrelated errors', async () => {
      mockDelete.mockRejectedValue(new Error('boom'));

      await expect(controller.remove('cat-1', mockUser)).rejects.toThrow('boom');
    });
  });
});
