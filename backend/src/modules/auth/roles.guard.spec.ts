import { ForbiddenException } from '@nestjs/common';
import { RolesGuard } from './roles.guard';
import { AdminRole } from '../../domain/enums';

const mockGetAllAndOverride = jest.fn();
const mockReflector = { getAllAndOverride: mockGetAllAndOverride } as any;

const makeContext = (user: { role: AdminRole } | undefined): any => ({
  getHandler: jest.fn(),
  getClass: jest.fn(),
  switchToHttp: () => ({ getRequest: () => ({ user }) }),
});

describe('RolesGuard', () => {
  let guard: RolesGuard;

  beforeEach(() => {
    guard = new RolesGuard(mockReflector);
    jest.clearAllMocks();
  });

  it('allows the request through when the route has no @Roles() metadata', () => {
    mockGetAllAndOverride.mockReturnValue(undefined);

    expect(guard.canActivate(makeContext({ role: AdminRole.OPERATOR }))).toBe(true);
  });

  it('allows the request through when @Roles() is an empty array', () => {
    mockGetAllAndOverride.mockReturnValue([]);

    expect(guard.canActivate(makeContext({ role: AdminRole.OPERATOR }))).toBe(true);
  });

  it('allows the request when the user role is in the required list', () => {
    mockGetAllAndOverride.mockReturnValue([AdminRole.ADMIN]);

    expect(guard.canActivate(makeContext({ role: AdminRole.ADMIN }))).toBe(true);
  });

  it('throws ForbiddenException when the user role is not in the required list', () => {
    mockGetAllAndOverride.mockReturnValue([AdminRole.ADMIN]);

    expect(() => guard.canActivate(makeContext({ role: AdminRole.OPERATOR }))).toThrow(ForbiddenException);
  });

  it('throws ForbiddenException when there is no authenticated user', () => {
    mockGetAllAndOverride.mockReturnValue([AdminRole.ADMIN]);

    expect(() => guard.canActivate(makeContext(undefined))).toThrow(ForbiddenException);
  });
});
