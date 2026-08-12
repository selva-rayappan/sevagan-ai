import { Controller, Get, Post, Query, Body, Header, HttpCode, HttpStatus, Logger, UseGuards, Version } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiExcludeController } from '@nestjs/swagger';
import { Public } from '../../auth/public.decorator';
import { VoiceWebhookTokenGuard } from '../../../infrastructure/telephony/guards/voice-webhook-token.guard';
import { TechnicianBotService } from '../technician-bot/technician-bot.service';
import { Language } from '../../../domain/enums';

const XML_HEADER = 'text/xml';

/**
 * Plivo hits these once the escalation call (TechnicianOfferEscalationService)
 * connects. `answer` returns the XML app telling Plivo what to play/collect;
 * `dtmf` receives the keypress and routes it through the same accept/reject
 * path WhatsApp button replies use — see TechnicianBotService.handlePhoneCallResponse.
 */
@Public()
@ApiExcludeController()
@Controller('voice')
export class VoiceWebhookController {
  private readonly logger = new Logger(VoiceWebhookController.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly technicianBotService: TechnicianBotService,
  ) {}

  @Get('answer')
  @Version('1')
  @UseGuards(VoiceWebhookTokenGuard)
  @Header('Content-Type', XML_HEADER)
  answer(@Query('lang') lang: string): string {
    const audioUrl =
      lang === Language.TA
        ? this.configService.get<string>('voice.audioUrls.jobOfferTa', '')
        : this.configService.get<string>('voice.audioUrls.jobOfferEn', '');

    const token = this.configService.get<string>('voice.webhookToken', '');
    const publicApiUrl = this.configService.get<string>('publicApiUrl', '');
    const actionUrl = `${publicApiUrl}/api/v1/voice/dtmf?token=${encodeURIComponent(token)}`;

    return [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<Response>',
      `  <GetDigits action="${actionUrl}" method="POST" timeout="10" numDigits="1" retries="1">`,
      `    <Play>${audioUrl}</Play>`,
      '  </GetDigits>',
      '  <Hangup/>',
      '</Response>',
    ].join('\n');
  }

  @Post('dtmf')
  @Version('1')
  @HttpCode(HttpStatus.OK)
  @UseGuards(VoiceWebhookTokenGuard)
  @Header('Content-Type', XML_HEADER)
  async dtmf(@Body() body: Record<string, string>): Promise<string> {
    const technicianPhone = body.To;
    const digits = body.Digits;

    if (technicianPhone && digits) {
      await this.technicianBotService.handlePhoneCallResponse(technicianPhone, digits).catch((err: Error) => {
        this.logger.error(`DTMF handling failed for ${technicianPhone}: ${err.message}`, err.stack);
      });
    } else {
      this.logger.warn(`DTMF callback missing To/Digits: ${JSON.stringify(body)}`);
    }

    return '<?xml version="1.0" encoding="UTF-8"?><Response><Hangup/></Response>';
  }
}
