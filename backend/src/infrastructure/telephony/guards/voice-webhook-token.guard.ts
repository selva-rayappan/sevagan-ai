import { CanActivate, ExecutionContext, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import * as crypto from 'crypto';

/**
 * Plivo's answer/DTMF callbacks carry no signature we verify here (unlike
 * Meta's X-Hub-Signature-256 — see WebhookHmacGuard) — Plivo does support an
 * HMAC scheme (X-Plivo-Signature-V3), but it wasn't implemented pending a
 * closer read of the exact param-concatenation spec. Until then, a shared
 * secret baked into the callback URL's query string is what stands between
 * this endpoint and anyone who guesses the path — enough to stop opportunistic
 * hits, not a substitute for the real HMAC check.
 */
@Injectable()
export class VoiceWebhookTokenGuard implements CanActivate {
  private readonly logger = new Logger(VoiceWebhookTokenGuard.name);

  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const expected = this.configService.get<string>('voice.webhookToken', '');
    const nodeEnv = this.configService.get<string>('nodeEnv', 'development');

    if (!expected) {
      if (nodeEnv !== 'production') {
        this.logger.warn('VOICE_WEBHOOK_TOKEN not set — skipping voice webhook auth (dev mode only)');
        return true;
      }
      throw new UnauthorizedException('Voice webhook token not configured');
    }

    const provided = request.query.token as string | undefined;
    if (!provided || provided.length !== expected.length) {
      throw new UnauthorizedException('Invalid or missing voice webhook token');
    }

    const isValid = crypto.timingSafeEqual(Buffer.from(provided, 'utf8'), Buffer.from(expected, 'utf8'));
    if (!isValid) {
      throw new UnauthorizedException('Invalid or missing voice webhook token');
    }

    return true;
  }
}
