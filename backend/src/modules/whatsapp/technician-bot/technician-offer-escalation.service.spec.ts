import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { TechnicianOfferEscalationService } from './technician-offer-escalation.service';
import { RedisService } from '../../../infrastructure/cache/redis.service';
import { TechnicianSessionService } from './technician-session.service';
import { TechnicianConversationState } from './technician-session.types';
import { VOICE_CALL_PROVIDER } from '../../../infrastructure/telephony/voice-call.provider.interface';
import { Language } from '../../../domain/enums';

const mockScan = jest.fn();
const mockGet = jest.fn();
const mockGetClient = jest.fn(() => ({ scan: mockScan, get: mockGet }));
const mockRedisService = { getClient: mockGetClient };

const mockSaveSession = jest.fn().mockResolvedValue(undefined);
const mockGetSession = jest.fn();
const mockTechSessionService = { saveSession: mockSaveSession, getSession: mockGetSession };

const mockPlaceCall = jest.fn().mockResolvedValue(undefined);
const mockVoiceCallProvider = { placeCall: mockPlaceCall };

const mockConfigGet = jest.fn((key: string, fallback?: string) => {
  if (key === 'voice.webhookToken') return 'test-token';
  if (key === 'publicApiUrl') return 'https://api.sevagan.co.in';
  return fallback;
});
const mockConfigService = { get: mockConfigGet };

const NOW = new Date('2026-08-12T10:00:00.000Z');
const minutesAgo = (n: number) => new Date(NOW.getTime() - n * 60_000).toISOString();
const secondsAgo = (n: number) => new Date(NOW.getTime() - n * 1_000).toISOString();

const baseSession = (overrides: Record<string, unknown> = {}) => ({
  state: TechnicianConversationState.JOB_OFFER_PENDING,
  phone: '919626191907',
  language: Language.EN,
  activeJobId: 'job-1',
  updatedAt: secondsAgo(90),
  offerSentAt: secondsAgo(90),
  ...overrides,
});

describe('TechnicianOfferEscalationService', () => {
  let service: TechnicianOfferEscalationService;

  beforeEach(async () => {
    jest.clearAllMocks();
    jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate'] });
    jest.setSystemTime(NOW);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TechnicianOfferEscalationService,
        { provide: RedisService, useValue: mockRedisService },
        { provide: TechnicianSessionService, useValue: mockTechSessionService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: VOICE_CALL_PROVIDER, useValue: mockVoiceCallProvider },
      ],
    }).compile();

    service = module.get<TechnicianOfferEscalationService>(TechnicianOfferEscalationService);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  function mockSingleSession(session: unknown) {
    mockScan.mockResolvedValueOnce(['0', ['tech_session:919626191907']]);
    mockGet.mockResolvedValueOnce(JSON.stringify(session));
  }

  it('places a call at 5+ minutes unanswered and persists the flag', async () => {
    mockSingleSession(baseSession());

    await service.checkPendingOffers();

    expect(mockPlaceCall).toHaveBeenCalledWith({
      to: '919626191907',
      answerUrl: 'https://api.sevagan.co.in/api/v1/voice/answer?token=test-token&lang=EN',
    });
    expect(mockSaveSession).toHaveBeenCalledWith(
      expect.objectContaining({ escalationCallSentAt: expect.any(String) }),
    );
  });

  it('builds the answer URL with the technician language', async () => {
    mockSingleSession(baseSession({ language: Language.TA }));

    await service.checkPendingOffers();

    expect(mockPlaceCall).toHaveBeenCalledWith(
      expect.objectContaining({ answerUrl: expect.stringContaining('lang=TA') }),
    );
  });

  it('does not call again once escalationCallSentAt is already set', async () => {
    mockSingleSession(baseSession({ escalationCallSentAt: secondsAgo(10) }));

    await service.checkPendingOffers();

    expect(mockPlaceCall).not.toHaveBeenCalled();
    expect(mockSaveSession).not.toHaveBeenCalled();
  });

  it('does nothing before the 1-minute threshold', async () => {
    mockSingleSession(baseSession({ offerSentAt: secondsAgo(30) }));

    await service.checkPendingOffers();

    expect(mockPlaceCall).not.toHaveBeenCalled();
  });

  it('skips sessions not in JOB_OFFER_PENDING state', async () => {
    mockSingleSession(baseSession({ state: TechnicianConversationState.IDLE }));

    await service.checkPendingOffers();

    expect(mockPlaceCall).not.toHaveBeenCalled();
  });

  it('skips sessions with no offerSentAt (pre-existing sessions before this field existed)', async () => {
    const session = baseSession();
    delete (session as any).offerSentAt;
    mockSingleSession(session);

    await service.checkPendingOffers();

    expect(mockPlaceCall).not.toHaveBeenCalled();
  });

  it('paginates through multiple SCAN cursors', async () => {
    mockScan
      .mockResolvedValueOnce(['42', ['tech_session:919000000001']])
      .mockResolvedValueOnce(['0', ['tech_session:919000000002']]);
    mockGet
      .mockResolvedValueOnce(JSON.stringify(baseSession({ phone: '919000000001' })))
      .mockResolvedValueOnce(JSON.stringify(baseSession({ phone: '919000000002' })));

    await service.checkPendingOffers();

    expect(mockScan).toHaveBeenCalledTimes(2);
    expect(mockPlaceCall).toHaveBeenCalledTimes(2);
  });

  it('skips a key with malformed JSON without throwing', async () => {
    mockScan.mockResolvedValueOnce(['0', ['tech_session:broken']]);
    mockGet.mockResolvedValueOnce('not json');

    await expect(service.checkPendingOffers()).resolves.not.toThrow();
    expect(mockPlaceCall).not.toHaveBeenCalled();
  });

  it('continues processing other sessions when one call fails', async () => {
    mockScan.mockResolvedValueOnce(['0', ['tech_session:919000000001', 'tech_session:919000000002']]);
    mockGet
      .mockResolvedValueOnce(JSON.stringify(baseSession({ phone: '919000000001' })))
      .mockResolvedValueOnce(JSON.stringify(baseSession({ phone: '919000000002' })));
    mockPlaceCall.mockRejectedValueOnce(new Error('Plivo error')).mockResolvedValueOnce(undefined);

    await expect(service.checkPendingOffers()).resolves.not.toThrow();

    expect(mockPlaceCall).toHaveBeenCalledTimes(2);
  });

  it('skips a key that resolves to no value (expired between SCAN and GET)', async () => {
    mockScan.mockResolvedValueOnce(['0', ['tech_session:gone']]);
    mockGet.mockResolvedValueOnce(null);

    await service.checkPendingOffers();

    expect(mockPlaceCall).not.toHaveBeenCalled();
  });

  describe('escalateOnDeliveryFailure()', () => {
    it('places a call immediately, without waiting for the 1-minute threshold', async () => {
      mockGetSession.mockResolvedValue(baseSession({ offerSentAt: secondsAgo(2) }));

      await service.escalateOnDeliveryFailure('919626191907');

      expect(mockPlaceCall).toHaveBeenCalledWith({
        to: '919626191907',
        answerUrl: 'https://api.sevagan.co.in/api/v1/voice/answer?token=test-token&lang=EN',
      });
      expect(mockSaveSession).toHaveBeenCalledWith(
        expect.objectContaining({ escalationCallSentAt: expect.any(String) }),
      );
    });

    it('does nothing when there is no session for the phone', async () => {
      mockGetSession.mockResolvedValue(null);

      await service.escalateOnDeliveryFailure('919000000000');

      expect(mockPlaceCall).not.toHaveBeenCalled();
    });

    it('does nothing when the session is not awaiting a job offer', async () => {
      mockGetSession.mockResolvedValue(baseSession({ state: TechnicianConversationState.IDLE }));

      await service.escalateOnDeliveryFailure('919626191907');

      expect(mockPlaceCall).not.toHaveBeenCalled();
    });

    it('does nothing when a call was already escalated for this offer', async () => {
      mockGetSession.mockResolvedValue(baseSession({ escalationCallSentAt: secondsAgo(5) }));

      await service.escalateOnDeliveryFailure('919626191907');

      expect(mockPlaceCall).not.toHaveBeenCalled();
    });
  });
});
