import { Test, TestingModule } from '@nestjs/testing';
import { CustomerIdleNudgeService } from './customer-idle-nudge.service';
import { RedisService } from '../../../infrastructure/cache/redis.service';
import { TranslationService } from '../../../infrastructure/i18n/translation.service';
import { WHATSAPP_PROVIDER } from '../../../infrastructure/messaging/whatsapp.provider.interface';
import { ConversationStateService } from '../conversation/conversation-state.service';
import { ConversationState } from '../conversation/conversation-state.types';
import { Language } from '../../../domain/enums';

const mockScan = jest.fn();
const mockGet = jest.fn();
const mockGetClient = jest.fn(() => ({ scan: mockScan, get: mockGet }));
const mockRedisService = { getClient: mockGetClient };

const mockSaveSession = jest.fn().mockResolvedValue(undefined);
const mockConversationState = { saveSession: mockSaveSession };

const mockSendText = jest.fn().mockResolvedValue(undefined);
const mockWhatsApp = { sendText: mockSendText };

const NOW = new Date('2026-07-20T13:00:00.000Z');
const minutesAgo = (n: number) => new Date(NOW.getTime() - n * 60_000).toISOString();

const baseSession = (overrides: Record<string, unknown> = {}) => ({
  state: ConversationState.AWAITING_LOCATION,
  phone: '919876543210',
  language: Language.EN,
  updatedAt: minutesAgo(20),
  lastCustomerMessageAt: minutesAgo(20),
  ...overrides,
});

describe('CustomerIdleNudgeService', () => {
  let service: CustomerIdleNudgeService;

  beforeEach(async () => {
    jest.clearAllMocks();
    jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate'] });
    jest.setSystemTime(NOW);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustomerIdleNudgeService,
        TranslationService,
        { provide: RedisService, useValue: mockRedisService },
        { provide: ConversationStateService, useValue: mockConversationState },
        { provide: WHATSAPP_PROVIDER, useValue: mockWhatsApp },
      ],
    }).compile();

    service = module.get<CustomerIdleNudgeService>(CustomerIdleNudgeService);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  function mockSingleSession(session: unknown) {
    mockScan.mockResolvedValueOnce(['0', ['conv:919876543210']]);
    mockGet.mockResolvedValueOnce(JSON.stringify(session));
  }

  it('sends the reminder at 15+ minutes idle and persists the flag', async () => {
    mockSingleSession(baseSession());

    await service.checkIdleSessions();

    expect(mockSendText).toHaveBeenCalledWith(
      expect.objectContaining({ to: '919876543210' }),
    );
    expect(mockSaveSession).toHaveBeenCalledWith(
      expect.objectContaining({ idleReminderSentAt: expect.any(String) }),
    );
  });

  it('does not re-send the reminder once already sent', async () => {
    mockSingleSession(baseSession({ idleReminderSentAt: minutesAgo(2) }));

    await service.checkIdleSessions();

    expect(mockSendText).not.toHaveBeenCalled();
    expect(mockSaveSession).not.toHaveBeenCalled();
  });

  it('sends the drop-off message at 30+ minutes and resets the session to IDLE', async () => {
    mockSingleSession(
      baseSession({
        updatedAt: minutesAgo(31),
        lastCustomerMessageAt: minutesAgo(31),
        idleReminderSentAt: minutesAgo(16),
        selectedCategoryId: 'cat-1',
        selectedCategoryName: 'Electrical',
        location: 'Virudhunagar',
        pendingTimeSlots: ['Today, 2 PM - 4 PM'],
      }),
    );

    await service.checkIdleSessions();

    expect(mockSendText).toHaveBeenCalledWith(
      expect.objectContaining({ to: '919876543210' }),
    );
    expect(mockSaveSession).toHaveBeenCalledWith(
      expect.objectContaining({
        state: ConversationState.IDLE,
        idleDropOffSentAt: expect.any(String),
      }),
    );
    const saved = mockSaveSession.mock.calls[0][0];
    expect(saved.selectedCategoryId).toBeUndefined();
    expect(saved.selectedCategoryName).toBeUndefined();
    expect(saved.location).toBeUndefined();
    expect(saved.pendingTimeSlots).toBeUndefined();
  });

  it('sends both reminder and drop-off in the same pass if neither was sent yet and 30+ minutes have passed', async () => {
    mockSingleSession(baseSession({ updatedAt: minutesAgo(40), lastCustomerMessageAt: minutesAgo(40) }));

    await service.checkIdleSessions();

    expect(mockSendText).toHaveBeenCalledTimes(2);
  });

  it('does not re-send the drop-off once already sent', async () => {
    mockSingleSession(
      baseSession({
        updatedAt: minutesAgo(40),
        lastCustomerMessageAt: minutesAgo(40),
        idleReminderSentAt: minutesAgo(25),
        idleDropOffSentAt: minutesAgo(10),
      }),
    );

    await service.checkIdleSessions();

    expect(mockSendText).not.toHaveBeenCalled();
    expect(mockSaveSession).not.toHaveBeenCalled();
  });

  it('does nothing for a session that is not yet idle 15 minutes', async () => {
    mockSingleSession(baseSession({ updatedAt: minutesAgo(5), lastCustomerMessageAt: minutesAgo(5) }));

    await service.checkIdleSessions();

    expect(mockSendText).not.toHaveBeenCalled();
    expect(mockSaveSession).not.toHaveBeenCalled();
  });

  it.each([
    ConversationState.IDLE,
    ConversationState.AWAITING_AMOUNT_CONFIRMATION,
    ConversationState.AWAITING_RATING,
  ])('skips sessions in %s state even when idle', async (state) => {
    mockSingleSession(baseSession({ state, updatedAt: minutesAgo(40), lastCustomerMessageAt: minutesAgo(40) }));

    await service.checkIdleSessions();

    expect(mockSendText).not.toHaveBeenCalled();
  });

  it('falls back to updatedAt when lastCustomerMessageAt is missing (pre-existing sessions)', async () => {
    const session = baseSession({ updatedAt: minutesAgo(20) });
    delete (session as any).lastCustomerMessageAt;
    mockSingleSession(session);

    await service.checkIdleSessions();

    expect(mockSendText).toHaveBeenCalled();
  });

  it('paginates through multiple SCAN cursors', async () => {
    mockScan
      .mockResolvedValueOnce(['42', ['conv:919000000001']])
      .mockResolvedValueOnce(['0', ['conv:919000000002']]);
    mockGet
      .mockResolvedValueOnce(JSON.stringify(baseSession({ phone: '919000000001' })))
      .mockResolvedValueOnce(JSON.stringify(baseSession({ phone: '919000000002' })));

    await service.checkIdleSessions();

    expect(mockScan).toHaveBeenCalledTimes(2);
    expect(mockSendText).toHaveBeenCalledTimes(2);
  });

  it('skips a key with malformed JSON without throwing', async () => {
    mockScan.mockResolvedValueOnce(['0', ['conv:broken']]);
    mockGet.mockResolvedValueOnce('not json');

    await expect(service.checkIdleSessions()).resolves.not.toThrow();
    expect(mockSendText).not.toHaveBeenCalled();
  });

  it('continues processing other sessions when one send fails', async () => {
    mockScan.mockResolvedValueOnce(['0', ['conv:919000000001', 'conv:919000000002']]);
    mockGet
      .mockResolvedValueOnce(JSON.stringify(baseSession({ phone: '919000000001' })))
      .mockResolvedValueOnce(JSON.stringify(baseSession({ phone: '919000000002' })));
    mockSendText.mockRejectedValueOnce(new Error('Meta API error')).mockResolvedValueOnce(undefined);

    await expect(service.checkIdleSessions()).resolves.not.toThrow();

    expect(mockSendText).toHaveBeenCalledTimes(2);
  });

  it('skips a key that resolves to no value (expired between SCAN and GET)', async () => {
    mockScan.mockResolvedValueOnce(['0', ['conv:gone']]);
    mockGet.mockResolvedValueOnce(null);

    await service.checkIdleSessions();

    expect(mockSendText).not.toHaveBeenCalled();
  });
});
