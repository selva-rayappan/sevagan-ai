import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { VoiceWebhookController } from './voice-webhook.controller';
import { TechnicianBotService } from '../technician-bot/technician-bot.service';
import { Language } from '../../../domain/enums';

const mockHandlePhoneCallResponse = jest.fn().mockResolvedValue(undefined);
const mockTechnicianBotService = { handlePhoneCallResponse: mockHandlePhoneCallResponse };

const configValues: Record<string, string> = {
  'voice.audioUrls.jobOfferEn': 'https://sevagan.co.in/audio/job_offer_call_en.mp3',
  'voice.audioUrls.jobOfferTa': 'https://sevagan.co.in/audio/job_offer_call_ta.mp3',
  'voice.audioUrls.acceptedEn': 'https://sevagan.co.in/audio/job_accepted_call_en.mp3',
  'voice.audioUrls.acceptedTa': 'https://sevagan.co.in/audio/job_accepted_call_ta.mp3',
  'voice.audioUrls.rejectedEn': 'https://sevagan.co.in/audio/job_rejected_call_en.mp3',
  'voice.audioUrls.rejectedTa': 'https://sevagan.co.in/audio/job_rejected_call_ta.mp3',
  'voice.webhookToken': 'test-token',
  publicApiUrl: 'https://api.sevagan.co.in',
};
const mockConfigService = { get: (key: string, fallback = '') => configValues[key] ?? fallback };

describe('VoiceWebhookController', () => {
  let controller: VoiceWebhookController;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VoiceWebhookController,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: TechnicianBotService, useValue: mockTechnicianBotService },
      ],
    }).compile();

    controller = module.get<VoiceWebhookController>(VoiceWebhookController);
  });

  describe('answer()', () => {
    it('plays the English prompt when lang=EN', () => {
      const xml = controller.answer(Language.EN);
      expect(xml).toContain('job_offer_call_en.mp3');
      expect(xml).not.toContain('job_offer_call_ta.mp3');
    });

    it('plays the Tamil prompt when lang=TA', () => {
      const xml = controller.answer(Language.TA);
      expect(xml).toContain('job_offer_call_ta.mp3');
    });

    it('defaults to English for an unrecognized/missing lang', () => {
      const xml = controller.answer(undefined as unknown as string);
      expect(xml).toContain('job_offer_call_en.mp3');
    });

    it('points GetDigits action at the DTMF endpoint with the webhook token', () => {
      const xml = controller.answer(Language.EN);
      expect(xml).toContain('https://api.sevagan.co.in/api/v1/voice/dtmf?token=test-token');
      expect(xml).toContain('numDigits="1"');
    });

    it('sets a GetDigits timeout comfortably above either prompt\'s real duration', () => {
      const xml = controller.answer(Language.EN);
      expect(xml).toContain('timeout="35"');
    });

    it('carries the language through to the DTMF action URL', () => {
      const xml = controller.answer(Language.TA);
      expect(xml).toContain('/voice/dtmf?token=test-token&lang=TA');
    });

    // Confirms Plivo's request actually reached the app — the only trace we
    // had of the 2026-08-19 "Invalid Answer XML" incident until this was
    // added was a hangup callback 16s later with no idea what happened.
    it('logs that the request was received, with the language', () => {
      const logSpy = jest.spyOn((controller as any).logger, 'log').mockImplementation();
      controller.answer(Language.TA);
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('TA'));
    });
  });

  describe('answerPost()', () => {
    // Real hangup callback bodies carry Event: 'Hangup' (confirmed live) —
    // that's what distinguishes it from the initial answer POST on this
    // same route.
    it("acknowledges Plivo's post-hangup callback (Event: 'Hangup') instead of 404ing", () => {
      const xml = controller.answerPost({ CallUUID: 'call-1', CallStatus: 'completed', Event: 'Hangup' }, 'EN');
      expect(xml).toBe('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');
    });

    // Regression test for the bug found 2026-08-19: Plivo's *initial* fetch
    // is tagged Event: 'StartApp', not Event-less as first assumed —
    // `if (body.Event)` caught this too, so real calls got the empty ack and
    // hung up silently after ~1s (Plivo's hangup reason changed from
    // "Invalid Answer XML" to "End Of XML Instructions" — it successfully
    // ran the *empty* response to completion, confirmed via nginx access
    // logs showing a 59-byte response instead of the real ~354 bytes).
    it("serves the real GetDigits/Play answer XML for Plivo's Event: 'StartApp' initial fetch", () => {
      const xml = controller.answerPost(
        { CallUUID: 'call-1', To: '919876543210', From: '918031151236', Event: 'StartApp', CallStatus: 'in-progress' },
        'EN',
      );
      expect(xml).toContain('<GetDigits');
      expect(xml).toContain('job_offer_call_en.mp3');
    });

    it('also serves the real answer XML when there is no Event field at all', () => {
      const xml = controller.answerPost({ CallUUID: 'call-1', To: '919876543210', From: '918031151236' }, 'EN');
      expect(xml).toContain('<GetDigits');
      expect(xml).toContain('job_offer_call_en.mp3');
    });

    it('plays the Tamil prompt for the initial POST when lang=TA', () => {
      const xml = controller.answerPost({ CallUUID: 'call-1' }, 'TA');
      expect(xml).toContain('job_offer_call_ta.mp3');
    });

    it('logs that the initial POST answer request was received, with the language', () => {
      const logSpy = jest.spyOn((controller as any).logger, 'log').mockImplementation();
      controller.answerPost({ CallUUID: 'call-1' }, 'TA');
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('TA'));
    });
  });

  describe('dtmf()', () => {
    it('routes the digit and technician phone to TechnicianBotService', async () => {
      await controller.dtmf({ To: '919626191907', Digits: '1', CallUUID: 'call-1' });

      expect(mockHandlePhoneCallResponse).toHaveBeenCalledWith('919626191907', '1');
    });

    it('returns a Hangup XML response', async () => {
      const xml = await controller.dtmf({ To: '919626191907', Digits: '2' });
      expect(xml).toContain('<Hangup/>');
    });

    it('does not call the bot service when To or Digits are missing', async () => {
      await controller.dtmf({ CallUUID: 'call-1' });
      expect(mockHandlePhoneCallResponse).not.toHaveBeenCalled();
    });

    it('still returns Hangup XML even if the bot service call fails', async () => {
      mockHandlePhoneCallResponse.mockRejectedValueOnce(new Error('boom'));
      const xml = await controller.dtmf({ To: '919626191907', Digits: '1' });
      expect(xml).toContain('<Hangup/>');
    });

    it('plays the English "accepted" confirmation on digit 1', async () => {
      const xml = await controller.dtmf({ To: '919626191907', Digits: '1' }, Language.EN);
      expect(xml).toContain('job_accepted_call_en.mp3');
      expect(xml).not.toContain('rejected');
    });

    it('plays the Tamil "accepted" confirmation on digit 1 when lang=TA', async () => {
      const xml = await controller.dtmf({ To: '919626191907', Digits: '1' }, Language.TA);
      expect(xml).toContain('job_accepted_call_ta.mp3');
    });

    it('plays the "rejected" confirmation on digit 2', async () => {
      const xml = await controller.dtmf({ To: '919626191907', Digits: '2' }, Language.EN);
      expect(xml).toContain('job_rejected_call_en.mp3');
    });

    it('plays the Tamil "rejected" confirmation on digit 2 when lang=TA', async () => {
      const xml = await controller.dtmf({ To: '919626191907', Digits: '2' }, Language.TA);
      expect(xml).toContain('job_rejected_call_ta.mp3');
    });

    it('plays no confirmation for a digit other than 1 or 2', async () => {
      const xml = await controller.dtmf({ To: '919626191907', Digits: '5' }, Language.EN);
      expect(xml).not.toContain('<Play>');
      expect(xml).toContain('<Hangup/>');
    });
  });
});
