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

  /**
   * Kept for manual testing/curl convenience — PlivoVoiceCallProvider now
   * requests POST (see below), so Plivo itself no longer hits this GET path
   * for a real call.
   */
  @Get('answer')
  @Version('1')
  @UseGuards(VoiceWebhookTokenGuard)
  @Header('Content-Type', XML_HEADER)
  answer(@Query('lang') lang: string): string {
    this.logger.log(`GET /voice/answer — lang=${lang}`);
    return this.buildAnswerXml(lang);
  }

  /**
   * Plivo POSTs here twice per call, both to the exact same URL: once to
   * fetch the initial answer XML (answer_method: 'POST' — switched from GET
   * 2026-08-19 after two of four real calls hung up 1s after answering with
   * "Invalid Answer XML", despite our GET response verifying as valid every
   * time we checked it ourselves), and again afterwards with a default
   * post-hangup status callback when no distinct hangup_url is configured
   * (observed live 2026-08-12). Only the second carries an `Event` field —
   * that's what distinguishes them, since both land on this same route.
   */
  @Post('answer')
  @Version('1')
  @HttpCode(HttpStatus.OK)
  @UseGuards(VoiceWebhookTokenGuard)
  @Header('Content-Type', XML_HEADER)
  answerPost(@Body() body: Record<string, string>, @Query('lang') lang: string): string {
    if (body.Event) {
      this.logger.debug(`Post-call callback on answer path: ${JSON.stringify(body)}`);
      return '<?xml version="1.0" encoding="UTF-8"?><Response></Response>';
    }

    this.logger.log(`POST /voice/answer — lang=${lang}`);
    return this.buildAnswerXml(lang);
  }

  private buildAnswerXml(lang: string): string {
    const audioUrl =
      lang === Language.TA
        ? this.configService.get<string>('voice.audioUrls.jobOfferTa', '')
        : this.configService.get<string>('voice.audioUrls.jobOfferEn', '');

    const token = this.configService.get<string>('voice.webhookToken', '');
    const publicApiUrl = this.configService.get<string>('publicApiUrl', '');
    const actionUrl = `${publicApiUrl}/api/v1/voice/dtmf?token=${encodeURIComponent(token)}&lang=${lang === Language.TA ? Language.TA : Language.EN}`;

    return [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<Response>',
      // timeout runs from when GetDigits starts executing, not from when the
      // nested <Play> finishes — confirmed live 2026-08-12: a 10s timeout cut
      // the 18s EN / 22s TA prompt off mid-sentence, well before the "press 1"
      // instruction. Set well above the longer (TA) prompt plus a real
      // response window.
      `  <GetDigits action="${actionUrl}" method="POST" timeout="35" numDigits="1" retries="1">`,
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
  async dtmf(@Body() body: Record<string, string>, @Query('lang') lang?: string): Promise<string> {
    const technicianPhone = body.To;
    const digits = body.Digits;

    if (technicianPhone && digits) {
      await this.technicianBotService.handlePhoneCallResponse(technicianPhone, digits).catch((err: Error) => {
        this.logger.error(`DTMF handling failed for ${technicianPhone}: ${err.message}`, err.stack);
      });
    } else {
      this.logger.warn(`DTMF callback missing To/Digits: ${JSON.stringify(body)}`);
    }

    // Spoken confirmation, matching the WhatsApp accept/reject tone. Same
    // Tamil-TTS constraint as the main prompt — pre-recorded, not <Speak>.
    const isTa = lang === Language.TA;
    let confirmationUrl: string | undefined;
    if (digits === '1') {
      confirmationUrl = this.configService.get<string>(
        isTa ? 'voice.audioUrls.acceptedTa' : 'voice.audioUrls.acceptedEn',
        '',
      );
    } else if (digits === '2') {
      confirmationUrl = this.configService.get<string>(
        isTa ? 'voice.audioUrls.rejectedTa' : 'voice.audioUrls.rejectedEn',
        '',
      );
    }

    return [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<Response>',
      ...(confirmationUrl ? [`  <Play>${confirmationUrl}</Play>`] : []),
      '  <Hangup/>',
      '</Response>',
    ].join('\n');
  }
}
