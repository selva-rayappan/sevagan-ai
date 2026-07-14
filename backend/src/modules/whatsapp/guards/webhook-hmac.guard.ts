import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RawBodyRequest } from '@nestjs/common';
import { Request } from 'express';
import * as crypto from 'crypto';
import { AuditService } from '../../../infrastructure/audit/audit.service';

@Injectable()
export class WebhookHmacGuard implements CanActivate {
  private readonly logger = new Logger(WebhookHmacGuard.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly auditService: AuditService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<RawBodyRequest<Request>>();
    const appSecret = this.configService.get<string>('whatsapp.appSecret', '');
    const nodeEnv = this.configService.get<string>('nodeEnv', 'development');

    // In development without a configured secret, skip HMAC and warn
    if (!appSecret) {
      if (nodeEnv !== 'production') {
        this.logger.warn('WA_APP_SECRET not set — skipping HMAC verification (dev mode only)');
        return true;
      }
      this.reject(request, 'Webhook secret not configured');
    }

    const signature = request.headers['x-hub-signature-256'] as string | undefined;
    const rawBody = request.rawBody;

    if (!signature || !rawBody) {
      this.reject(request, 'Missing webhook signature or body');
    }

    const expected = `sha256=${crypto
      .createHmac('sha256', appSecret)
      .update(rawBody as Buffer)
      .digest('hex')}`;

    // Lengths must match before timingSafeEqual to avoid buffer size mismatch throw
    if ((signature as string).length !== expected.length) {
      this.reject(request, 'Invalid webhook signature');
    }

    const isValid = crypto.timingSafeEqual(
      Buffer.from(signature as string, 'utf8'),
      Buffer.from(expected, 'utf8'),
    );

    if (!isValid) {
      this.reject(request, 'Invalid webhook signature');
    }

    return true;
  }

  private reject(request: RawBodyRequest<Request>, reason: string): never {
    this.auditService.log({
      actorType: 'UNKNOWN',
      action: 'WEBHOOK_SIGNATURE_REJECTED',
      entityType: 'WhatsAppWebhook',
      metadata: { reason, ip: request.ip, path: request.path },
    });
    throw new UnauthorizedException(reason);
  }
}
