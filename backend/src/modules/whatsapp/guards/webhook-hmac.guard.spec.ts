import * as crypto from 'crypto';
import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WebhookHmacGuard } from './webhook-hmac.guard';

const mockAuditLog = jest.fn().mockResolvedValue(undefined);
const mockAuditService = { log: mockAuditLog } as any;

const buildContext = (overrides: {
  signature?: string;
  rawBody?: Buffer;
  appSecret?: string;
  nodeEnv?: string;
}) => {
  const { signature, rawBody, appSecret = 'test-secret', nodeEnv = 'production' } = overrides;

  const mockConfigService = {
    get: (key: string, def = '') => {
      if (key === 'whatsapp.appSecret') return appSecret;
      if (key === 'nodeEnv') return nodeEnv;
      return def;
    },
  } as unknown as ConfigService;

  const mockRequest = {
    headers: { 'x-hub-signature-256': signature },
    rawBody,
    ip: '127.0.0.1',
    path: '/api/v1/whatsapp/webhook',
  };

  const mockExecutionContext = {
    switchToHttp: () => ({ getRequest: () => mockRequest }),
  } as any;

  return { guard: new WebhookHmacGuard(mockConfigService, mockAuditService), context: mockExecutionContext };
};

const buildSignature = (secret: string, body: Buffer) =>
  `sha256=${crypto.createHmac('sha256', secret).update(body).digest('hex')}`;

describe('WebhookHmacGuard', () => {
  const secret = 'test-secret';
  const body = Buffer.from('{"object":"whatsapp_business_account"}');
  const validSignature = buildSignature(secret, body);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns true for a valid HMAC signature', () => {
    const { guard, context } = buildContext({ signature: validSignature, rawBody: body });
    expect(guard.canActivate(context)).toBe(true);
  });

  it('throws UnauthorizedException for an invalid signature', () => {
    const { guard, context } = buildContext({
      signature: 'sha256=invalidsignature00000000000000000000000000000000000000000000000000',
      rawBody: body,
    });
    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });

  it('logs rejected attempts to the audit log', () => {
    const { guard, context } = buildContext({ rawBody: body });
    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
    expect(mockAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'WEBHOOK_SIGNATURE_REJECTED', entityType: 'WhatsAppWebhook' }),
    );
  });

  it('throws UnauthorizedException when signature is missing', () => {
    const { guard, context } = buildContext({ rawBody: body });
    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });

  it('throws UnauthorizedException when rawBody is missing', () => {
    const { guard, context } = buildContext({ signature: validSignature });
    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });

  it('throws UnauthorizedException when signature length differs from expected', () => {
    const { guard, context } = buildContext({
      signature: 'sha256=short',
      rawBody: body,
    });
    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });

  it('returns true in development mode when appSecret is not set', () => {
    const { guard, context } = buildContext({
      appSecret: '',
      nodeEnv: 'development',
      rawBody: body,
    });
    expect(guard.canActivate(context)).toBe(true);
  });

  it('throws in production mode when appSecret is not set', () => {
    const { guard, context } = buildContext({
      appSecret: '',
      nodeEnv: 'production',
      rawBody: body,
    });
    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });
});
