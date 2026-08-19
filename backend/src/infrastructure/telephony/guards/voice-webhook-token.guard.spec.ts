import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { VoiceWebhookTokenGuard } from './voice-webhook-token.guard';

const buildContext = (overrides: { token?: string; expectedToken?: string; nodeEnv?: string }) => {
  const { token, expectedToken = 'test-secret', nodeEnv = 'production' } = overrides;

  const mockConfigService = {
    get: (key: string, def = '') => {
      if (key === 'voice.webhookToken') return expectedToken;
      if (key === 'nodeEnv') return nodeEnv;
      return def;
    },
  } as unknown as ConfigService;

  const mockRequest = { query: { token }, path: '/api/v1/voice/answer' };
  const mockExecutionContext = {
    switchToHttp: () => ({ getRequest: () => mockRequest }),
  } as any;

  return { guard: new VoiceWebhookTokenGuard(mockConfigService), context: mockExecutionContext };
};

describe('VoiceWebhookTokenGuard', () => {
  it('returns true for a matching token', () => {
    const { guard, context } = buildContext({ token: 'test-secret' });
    expect(guard.canActivate(context)).toBe(true);
  });

  it('throws UnauthorizedException for a mismatched token', () => {
    const { guard, context } = buildContext({ token: 'wrong-token' });
    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });

  it('throws UnauthorizedException when token is missing', () => {
    const { guard, context } = buildContext({});
    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });

  // A 401 here otherwise leaves zero trace (HttpExceptionFilter only logs
  // 500s) — see 2026-08-19 incident where a rejected voice callback was
  // undiagnosable after the fact.
  it('logs a warning with the request path on a length/missing mismatch', () => {
    const { guard, context } = buildContext({});
    const warnSpy = jest.spyOn((guard as any).logger, 'warn').mockImplementation();

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('/api/v1/voice/answer'));
  });

  it('logs a warning on a same-length but wrong token', () => {
    const { guard, context } = buildContext({ token: 'wrong-token' }); // same length (11) as 'test-secret'
    const warnSpy = jest.spyOn((guard as any).logger, 'warn').mockImplementation();

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('mismatch'));
  });

  it('returns true in development mode when no token is configured', () => {
    const { guard, context } = buildContext({ expectedToken: '', nodeEnv: 'development' });
    expect(guard.canActivate(context)).toBe(true);
  });

  it('throws in production mode when no token is configured', () => {
    const { guard, context } = buildContext({ expectedToken: '', nodeEnv: 'production' });
    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });
});
