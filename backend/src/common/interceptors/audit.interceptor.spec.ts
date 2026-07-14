import { of } from 'rxjs';
import { AuditInterceptor } from './audit.interceptor';

const mockAuditLog = jest.fn().mockResolvedValue(undefined);
const mockAuditService = { log: mockAuditLog } as any;

const buildContext = (method: string, overrides: Record<string, unknown> = {}) => {
  const request = {
    method,
    user: { id: 'admin-1' },
    params: { id: 'tech-1' },
    query: {},
    route: { path: '/admin/technicians/:id' },
    path: '/api/v1/admin/technicians/tech-1',
    ...overrides,
  };
  return {
    switchToHttp: () => ({ getRequest: () => request }),
    getClass: () => ({ name: 'TechniciansAdminController' }),
  } as any;
};

const nextHandler = (returnValue: unknown = { id: 'tech-1' }) => ({
  handle: () => of(returnValue),
});

describe('AuditInterceptor', () => {
  let interceptor: AuditInterceptor;

  beforeEach(() => {
    interceptor = new AuditInterceptor(mockAuditService);
    jest.clearAllMocks();
  });

  it('logs mutating requests after a successful response', (done) => {
    const context = buildContext('POST');

    interceptor.intercept(context, nextHandler()).subscribe(() => {
      expect(mockAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          actorId: 'admin-1',
          actorType: 'ADMIN_USER',
          action: 'POST /admin/technicians/:id',
          entityType: 'TechniciansAdmin',
        }),
      );
      done();
    });
  });

  it('does not log GET requests', (done) => {
    const context = buildContext('GET');

    interceptor.intercept(context, nextHandler()).subscribe(() => {
      expect(mockAuditLog).not.toHaveBeenCalled();
      done();
    });
  });
});
