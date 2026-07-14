import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';

jest.mock('bcryptjs');
const mockedBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

const mockFindUnique = jest.fn();
const mockUpdate = jest.fn();
const mockPrisma = { adminUser: { findUnique: mockFindUnique, update: mockUpdate } } as any;

const mockSign = jest.fn();
const mockVerify = jest.fn();
const mockJwtService = { sign: mockSign, verify: mockVerify } as any;

const mockGet = jest.fn();
const mockConfigService = { get: mockGet } as any;

const mockAuditLog = jest.fn().mockResolvedValue(undefined);
const mockAuditService = { log: mockAuditLog } as any;

const makeAdmin = (overrides = {}): any => ({
  id: 'admin-1',
  email: 'admin@sevagan.in',
  passwordHash: 'hashed',
  role: 'ADMIN',
  active: true,
  tokenVersion: 0,
  ...overrides,
});

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(() => {
    service = new AuthService(mockPrisma, mockJwtService, mockConfigService, mockAuditService);
    jest.clearAllMocks();
    mockGet.mockImplementation((key: string, fallback?: string) => fallback);
    mockSign.mockReturnValue('signed-token');
  });

  describe('login()', () => {
    it('returns access and refresh tokens for valid credentials', async () => {
      mockFindUnique.mockResolvedValue(makeAdmin());
      (mockedBcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.login('admin@sevagan.in', 'correct-password');

      expect(result).toEqual({ accessToken: 'signed-token', refreshToken: 'signed-token' });
      expect(mockSign).toHaveBeenCalledTimes(2);
      expect(mockAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({ actorId: 'admin-1', action: 'LOGIN', entityId: 'admin-1' }),
      );
    });

    it('throws UnauthorizedException when the admin does not exist', async () => {
      mockFindUnique.mockResolvedValue(null);

      await expect(service.login('nobody@sevagan.in', 'x')).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when the admin is inactive', async () => {
      mockFindUnique.mockResolvedValue(makeAdmin({ active: false }));

      await expect(service.login('admin@sevagan.in', 'x')).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when the password does not match', async () => {
      mockFindUnique.mockResolvedValue(makeAdmin());
      (mockedBcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.login('admin@sevagan.in', 'wrong-password')).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('refreshToken()', () => {
    it('issues new tokens and rotates tokenVersion for a valid refresh token', async () => {
      mockVerify.mockReturnValue({ sub: 'admin-1', email: 'admin@sevagan.in', role: 'ADMIN', tokenVersion: 0 });
      mockFindUnique.mockResolvedValue(makeAdmin());
      mockUpdate.mockResolvedValue(makeAdmin({ tokenVersion: 1 }));

      const result = await service.refreshToken('valid-refresh-token');

      expect(result).toEqual({ accessToken: 'signed-token', refreshToken: 'signed-token' });
      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: 'admin-1' },
        data: { tokenVersion: { increment: 1 } },
      });
    });

    it('throws UnauthorizedException when the token is invalid', async () => {
      mockVerify.mockImplementation(() => {
        throw new Error('jwt malformed');
      });

      await expect(service.refreshToken('garbage')).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when the admin no longer exists', async () => {
      mockVerify.mockReturnValue({ sub: 'admin-1', email: 'admin@sevagan.in', role: 'ADMIN', tokenVersion: 0 });
      mockFindUnique.mockResolvedValue(null);

      await expect(service.refreshToken('valid-refresh-token')).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when the admin is inactive', async () => {
      mockVerify.mockReturnValue({ sub: 'admin-1', email: 'admin@sevagan.in', role: 'ADMIN', tokenVersion: 0 });
      mockFindUnique.mockResolvedValue(makeAdmin({ active: false }));

      await expect(service.refreshToken('valid-refresh-token')).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when the refresh token has already been rotated', async () => {
      mockVerify.mockReturnValue({ sub: 'admin-1', email: 'admin@sevagan.in', role: 'ADMIN', tokenVersion: 0 });
      mockFindUnique.mockResolvedValue(makeAdmin({ tokenVersion: 1 }));

      await expect(service.refreshToken('stale-refresh-token')).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('logout()', () => {
    it('increments the admin tokenVersion to revoke outstanding tokens', async () => {
      mockUpdate.mockResolvedValue(makeAdmin({ tokenVersion: 1 }));

      await service.logout('admin-1');

      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: 'admin-1' },
        data: { tokenVersion: { increment: 1 } },
      });
    });
  });
});
