import { UnauthorizedException } from '@nestjs/common';
import { JwtStrategy } from './jwt.strategy';

const mockGet = jest.fn().mockReturnValue('test-secret');
const mockConfigService = { get: mockGet } as any;

const mockFindUnique = jest.fn();
const mockPrisma = { adminUser: { findUnique: mockFindUnique } } as any;

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;

  beforeEach(() => {
    strategy = new JwtStrategy(mockConfigService, mockPrisma);
    jest.clearAllMocks();
  });

  describe('validate()', () => {
    it('returns the admin profile when the admin is active and token version matches', async () => {
      mockFindUnique.mockResolvedValue({
        id: 'admin-1',
        email: 'admin@sevagan.in',
        role: 'ADMIN',
        name: 'Admin',
        active: true,
        tokenVersion: 0,
      });

      const result = await strategy.validate({
        sub: 'admin-1',
        email: 'admin@sevagan.in',
        role: 'ADMIN',
        tokenVersion: 0,
      });

      expect(result).toEqual({ id: 'admin-1', email: 'admin@sevagan.in', role: 'ADMIN', name: 'Admin' });
    });

    it('throws UnauthorizedException when the admin no longer exists', async () => {
      mockFindUnique.mockResolvedValue(null);

      await expect(
        strategy.validate({ sub: 'missing', email: 'x@sevagan.in', role: 'ADMIN', tokenVersion: 0 }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when the admin is inactive', async () => {
      mockFindUnique.mockResolvedValue({ id: 'admin-1', active: false, tokenVersion: 0 });

      await expect(
        strategy.validate({ sub: 'admin-1', email: 'admin@sevagan.in', role: 'ADMIN', tokenVersion: 0 }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when the token version has been revoked', async () => {
      mockFindUnique.mockResolvedValue({
        id: 'admin-1',
        email: 'admin@sevagan.in',
        role: 'ADMIN',
        name: 'Admin',
        active: true,
        tokenVersion: 2,
      });

      await expect(
        strategy.validate({ sub: 'admin-1', email: 'admin@sevagan.in', role: 'ADMIN', tokenVersion: 0 }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
