import { AuthController } from './auth.controller';

const mockLogin = jest.fn();
const mockRefreshToken = jest.fn();
const mockLogout = jest.fn();
const mockAuthService = { login: mockLogin, refreshToken: mockRefreshToken, logout: mockLogout } as any;

const mockGet = jest.fn().mockReturnValue('development');
const mockConfigService = { get: mockGet } as any;

const makeRes = () => {
  const res: any = {};
  res.cookie = jest.fn().mockReturnValue(res);
  res.clearCookie = jest.fn().mockReturnValue(res);
  return res;
};

describe('AuthController', () => {
  let controller: AuthController;

  beforeEach(() => {
    controller = new AuthController(mockAuthService, mockConfigService);
    jest.clearAllMocks();
    mockGet.mockReturnValue('development');
  });

  describe('login()', () => {
    it('delegates to AuthService.login, sets the refresh cookie, and returns only the access token', async () => {
      mockLogin.mockResolvedValue({ accessToken: 'a', refreshToken: 'r' });
      const res = makeRes();

      const result = await controller.login({ email: 'admin@sevagan.in', password: 'secret' }, res);

      expect(mockLogin).toHaveBeenCalledWith('admin@sevagan.in', 'secret');
      expect(result).toEqual({ accessToken: 'a' });
      expect(res.cookie).toHaveBeenCalledWith(
        'refreshToken',
        'r',
        expect.objectContaining({ httpOnly: true, sameSite: 'strict', path: '/api/v1/auth' }),
      );
    });
  });

  describe('refresh()', () => {
    it('reads the refresh token from the cookie and rotates it', async () => {
      mockRefreshToken.mockResolvedValue({ accessToken: 'a2', refreshToken: 'r2' });
      const req: any = { cookies: { refreshToken: 'old-token' } };
      const res = makeRes();

      const result = await controller.refresh(req, res);

      expect(mockRefreshToken).toHaveBeenCalledWith('old-token');
      expect(result).toEqual({ accessToken: 'a2' });
      expect(res.cookie).toHaveBeenCalledWith('refreshToken', 'r2', expect.any(Object));
    });

    it('throws when no refresh cookie is present', async () => {
      const req: any = { cookies: {} };
      const res = makeRes();

      await expect(controller.refresh(req, res)).rejects.toThrow('Missing refresh token');
      expect(mockRefreshToken).not.toHaveBeenCalled();
    });
  });

  describe('logout()', () => {
    it('revokes the caller tokenVersion and clears the refresh cookie', async () => {
      const res = makeRes();

      const result = await controller.logout({ id: 'admin-1' } as any, res);

      expect(mockLogout).toHaveBeenCalledWith('admin-1');
      expect(res.clearCookie).toHaveBeenCalledWith('refreshToken', { path: '/api/v1/auth' });
      expect(result).toEqual({ message: 'Logged out' });
    });
  });

  describe('me()', () => {
    it('returns the authenticated user', () => {
      const user = { id: 'admin-1', email: 'admin@sevagan.in', role: 'ADMIN', name: 'Admin' };

      expect(controller.me(user)).toBe(user);
    });
  });
});
