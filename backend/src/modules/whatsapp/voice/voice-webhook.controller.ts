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
   * (observed live 2026-08-12).
   *
   * BUG (found 2026-08-19, same day as the GET→POST switch): the initial
   * fetch is *not* Event-less as assumed — Plivo tags it `Event: StartApp`.
   * Checking `if (body.Event)` therefore caught both requests, so the real
   * call always got the empty ack instead of the GetDigits/Play XML —
   * confirmed via nginx access logs showing both POSTs got a 59-byte
   * response (the empty ack) instead of the real ~354-byte answer XML, and
   * Plivo's own hangup reason changing from "Invalid Answer XML" to "End Of
   * XML Instructions" (it successfully ran the *empty* response to
   * completion in ~1s — not a fetch/parse failure at all, just the wrong
   * content). Fixed to key off `Event === 'Hangup'` specifically.
   */
  @Post('answer')
  @Version('1')
  @HttpCode(HttpStatus.OK)
  @UseGuards(VoiceWebhookTokenGuard)
  @Header('Content-Type', XML_HEADER)
  answerPost(@Body() body: Record<string, string>, @Query('lang') lang: string): string {
    if (body.Event === 'Hangup') {
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
      `  <GetDigits action="${this.escapeXml(actionUrl)}" method="POST" timeout="35" numDigits="1" retries="1">`,
      `    <Play>${this.escapeXml(audioUrl)}</Play>`,
      '  </GetDigits>',
      '  <Hangup/>',
      '</Response>',
    ].join('\n');
  }

  // Root cause of every "Invalid Answer XML" hangup this whole investigation
  // (2026-08-19): actionUrl's own `?token=...&lang=...` query string was
  // interpolated straight into the action="..." attribute — a bare & is not
  // valid inside XML (must be &amp;). curl and eyeballing the string both
  // looked fine (a bare & displays identically to a human and to non-XML
  // tooling), and nginx correctly reported the exact intended byte count, so
  // "content is byte-correct" was never the same claim as "content is
  // well-formed XML" — that distinction is what got missed for two days.
  private escapeXml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
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
    // Tamil-TTS constraint as the main prompt — pre-recorded, not <Speak>,
    // for everything except the English accept case below.
    const isTa = lang === Language.TA;
    let confirmationVerb: string | undefined;
    if (digits === '1' && !isTa) {
      // Plivo's <Speak> supports English natively (unlike Tamil — same
      // limitation that forced the main prompts to be pre-recorded MP3s) —
      // no audio asset needed for a short acknowledgment.
      confirmationVerb = '  <Speak>Thank you for choosing Sevagan Services</Speak>';
    } else if (digits === '1') {
      confirmationVerb = `  <Play>${this.escapeXml(this.configService.get<string>('voice.audioUrls.acceptedTa', ''))}</Play>`;
    } else if (digits === '2') {
      const rejectedUrl = this.configService.get<string>(
        isTa ? 'voice.audioUrls.rejectedTa' : 'voice.audioUrls.rejectedEn',
        '',
      );
      confirmationVerb = `  <Play>${this.escapeXml(rejectedUrl)}</Play>`;
    }

    return [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<Response>',
      ...(confirmationVerb ? [confirmationVerb] : []),
      '  <Hangup/>',
      '</Response>',
    ].join('\n');
  }
}
