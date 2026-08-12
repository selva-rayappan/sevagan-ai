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
  });

  describe('answerPostCallback()', () => {
    it('acknowledges Plivo\'s post-hangup callback on the same path instead of 404ing', () => {
      const xml = controller.answerPostCallback({ CallUUID: 'call-1', CallStatus: 'completed' });
      expect(xml).toContain('<Response>');
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
  });
});
