import { ExecutionContext } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';

const mockGetAllAndOverride = jest.fn();
const mockReflector = { getAllAndOverride: mockGetAllAndOverride } as any;

const makeContext = (): ExecutionContext =>
  ({
    getHandler: jest.fn(),
    getClass: jest.fn(),
  }) as any;

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let parentCanActivate: jest.SpyInstance;

  beforeEach(() => {
    guard = new JwtAuthGuard(mockReflector);
    jest.clearAllMocks();
    parentCanActivate = jest
      .spyOn(Object.getPrototypeOf(JwtAuthGuard.prototype), 'canActivate')
      .mockReturnValue(true);
  });

  afterEach(() => {
    parentCanActivate.mockRestore();
  });

  it('allows the request through without invoking Passport when the route is @Public()', () => {
    mockGetAllAndOverride.mockReturnValue(true);

    const result = guard.canActivate(makeContext());

    expect(result).toBe(true);
    expect(parentCanActivate).not.toHaveBeenCalled();
  });

  it('delegates to the Passport JWT strategy when the route is not public', () => {
    mockGetAllAndOverride.mockReturnValue(false);

    const result = guard.canActivate(makeContext());

    expect(result).toBe(true);
    expect(parentCanActivate).toHaveBeenCalledTimes(1);
  });

  it('delegates to the Passport JWT strategy when no public metadata is set', () => {
    mockGetAllAndOverride.mockReturnValue(undefined);

    guard.canActivate(makeContext());

    expect(parentCanActivate).toHaveBeenCalledTimes(1);
  });
});
