import { Test, TestingModule } from '@nestjs/testing';
import { CustomerBotService } from './customer-bot.service';
import { WHATSAPP_PROVIDER } from '../../../infrastructure/messaging/whatsapp.provider.interface';
import { TranslationService } from '../../../infrastructure/i18n/translation.service';
import { ConversationStateService } from '../conversation/conversation-state.service';
import { ConversationState, ConversationSession } from '../conversation/conversation-state.types';
import { Language, JobStatus } from '../../../domain/enums';
import { InboundWhatsAppMessage } from '../../../infrastructure/messaging/types/inbound-message.types';
import { CustomersRepository } from '../../customers/customers.repository';
import { JobsService } from '../../jobs/jobs.service';
import { ServiceCategoriesRepository } from '../../service-categories/service-categories.repository';
import { TechniciansRepository } from '../../technicians/technicians.repository';
import { CommissionService } from '../../commission/commission.service';
import { RatingsRepository } from '../../ratings/ratings.repository';
import { DisputesRepository } from '../../disputes/disputes.repository';
import { TrustScoreService } from '../../trust-score/trust-score.service';
import { TechnicianSessionService } from '../technician-bot/technician-session.service';
import { AssignmentEngineService } from '../../assignment-engine/assignment-engine.service';

// ─── Mock factories ──────────────────────────────────────────────────────────

const mockSendText = jest.fn().mockResolvedValue(undefined);
const mockSendInteractiveButtons = jest.fn().mockResolvedValue(undefined);
const mockMarkAsRead = jest.fn().mockResolvedValue(undefined);

const mockWhatsApp = {
  sendText: mockSendText,
  sendInteractiveButtons: mockSendInteractiveButtons,
  sendInteractiveList: jest.fn().mockResolvedValue(undefined),
  sendImage: jest.fn().mockResolvedValue(undefined),
  markAsRead: mockMarkAsRead,
};

const mockGetSession = jest.fn();
const mockSaveSession = jest.fn().mockResolvedValue(undefined);
const mockCreateNewSession = jest.fn();

const mockConversationState = {
  getSession: mockGetSession,
  saveSession: mockSaveSession,
  createNewSession: mockCreateNewSession,
};

const mockUpsert = jest.fn();
const mockUpdateLanguage = jest.fn().mockResolvedValue(undefined);

const mockCustomersRepository = {
  upsert: mockUpsert,
  updateLanguage: mockUpdateLanguage,
};

const mockCreateJob = jest.fn();
const mockFindByJobNumber = jest.fn();
const mockCancelJob = jest.fn();

const mockJobsService = {
  createJob: mockCreateJob,
  findByJobNumber: mockFindByJobNumber,
  cancelJob: mockCancelJob,
};

const mockFindByName = jest.fn();

const mockCategoriesRepository = {
  findByName: mockFindByName,
};

const mockTechniciansRepository = {
  updateStatus: jest.fn().mockResolvedValue(undefined),
  updateRating: jest.fn().mockResolvedValue(undefined),
};

const mockRecordCommission = jest.fn().mockResolvedValue({});
const mockCommissionService = {
  recordCommission: mockRecordCommission,
};

const mockCreateRating = jest.fn().mockResolvedValue({});
const mockGetAverageRating = jest.fn().mockResolvedValue(4.5);
const mockRatingsRepository = {
  create: mockCreateRating,
  getAverageForTechnician: mockGetAverageRating,
};

const mockCreateDispute = jest.fn().mockResolvedValue({});
const mockDisputesRepository = {
  create: mockCreateDispute,
};

const mockApplyTrustEvent = jest.fn().mockResolvedValue(undefined);
const mockTrustScoreService = {
  applyTrustEvent: mockApplyTrustEvent,
};

const mockGetTechSession = jest.fn().mockResolvedValue(null);
const mockClearTechSession = jest.fn().mockResolvedValue(undefined);
const mockTechnicianSessionService = {
  getSession: mockGetTechSession,
  clearSession: mockClearTechSession,
};

const mockAssignmentEngineService = {
  tryAssignJob: jest.fn().mockResolvedValue(undefined),
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const makeCustomer = (overrides = {}): any => ({
  id: 'cust-1',
  phone: '919876543210',
  name: 'Rajesh',
  language: 'EN',
  ...overrides,
});

const makeSession = (overrides: Partial<ConversationSession> = {}): ConversationSession => ({
  state: ConversationState.IDLE,
  phone: '919876543210',
  language: Language.EN,
  updatedAt: new Date().toISOString(),
  ...overrides,
});

const makeTextMessage = (body: string, from = '919876543210'): InboundWhatsAppMessage => ({
  from,
  id: 'msg-001',
  timestamp: '1718000000',
  type: 'text',
  text: { body },
});

const makeButtonReply = (id: string, from = '919876543210'): InboundWhatsAppMessage => ({
  from,
  id: 'msg-002',
  timestamp: '1718000001',
  type: 'interactive',
  interactive: { type: 'button_reply', button_reply: { id, title: id } },
});

const makeLocationMessage = (from = '919876543210'): InboundWhatsAppMessage => ({
  from,
  id: 'msg-003',
  timestamp: '1718000002',
  type: 'location',
  location: { latitude: 9.9252, longitude: 78.1198, name: 'Virudhunagar' },
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('CustomerBotService', () => {
  let service: CustomerBotService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustomerBotService,
        TranslationService,
        { provide: WHATSAPP_PROVIDER, useValue: mockWhatsApp },
        { provide: ConversationStateService, useValue: mockConversationState },
        { provide: CustomersRepository, useValue: mockCustomersRepository },
        { provide: JobsService, useValue: mockJobsService },
        { provide: ServiceCategoriesRepository, useValue: mockCategoriesRepository },
        { provide: TechniciansRepository, useValue: mockTechniciansRepository },
        { provide: CommissionService, useValue: mockCommissionService },
        { provide: RatingsRepository, useValue: mockRatingsRepository },
        { provide: DisputesRepository, useValue: mockDisputesRepository },
        { provide: TrustScoreService, useValue: mockTrustScoreService },
        { provide: TechnicianSessionService, useValue: mockTechnicianSessionService },
        { provide: AssignmentEngineService, useValue: mockAssignmentEngineService },
      ],
    }).compile();

    service = module.get<CustomerBotService>(CustomerBotService);

    jest.clearAllMocks();
    mockMarkAsRead.mockResolvedValue(undefined);
    mockSaveSession.mockResolvedValue(undefined);
    mockUpdateLanguage.mockResolvedValue(undefined);
  });

  // ─── IDLE state ─────────────────────────────────────────────────────────────

  describe('IDLE state', () => {
    it('shows language selection buttons when session is IDLE', async () => {
      mockUpsert.mockResolvedValue(makeCustomer());
      mockGetSession.mockResolvedValue(makeSession({ state: ConversationState.IDLE }));

      await service.handleMessage(makeTextMessage('Hello'), 'Rajesh');

      expect(mockSendInteractiveButtons).toHaveBeenCalledWith(
        expect.objectContaining({
          to: '919876543210',
          buttons: expect.arrayContaining([
            expect.objectContaining({ id: 'lang_en' }),
            expect.objectContaining({ id: 'lang_ta' }),
          ]),
        }),
      );
      expect(mockSaveSession).toHaveBeenCalledWith(
        expect.objectContaining({ state: ConversationState.AWAITING_LANGUAGE }),
      );
    });

    it('creates a new session when Redis returns null', async () => {
      mockUpsert.mockResolvedValue(makeCustomer());
      mockGetSession.mockResolvedValue(null);
      mockCreateNewSession.mockReturnValue(makeSession({ state: ConversationState.IDLE }));

      await service.handleMessage(makeTextMessage('Hi'), 'Rajesh');

      expect(mockCreateNewSession).toHaveBeenCalledWith('919876543210', Language.EN);
      expect(mockSendInteractiveButtons).toHaveBeenCalled();
    });
  });

  // ─── Language selection ──────────────────────────────────────────────────────

  describe('AWAITING_LANGUAGE state', () => {
    it('sets language to EN when customer replies "1"', async () => {
      mockUpsert.mockResolvedValue(makeCustomer());
      mockGetSession.mockResolvedValue(makeSession({ state: ConversationState.AWAITING_LANGUAGE }));

      await service.handleMessage(makeTextMessage('1'), 'Rajesh');

      expect(mockUpdateLanguage).toHaveBeenCalledWith('cust-1', Language.EN);
      expect(mockSaveSession).toHaveBeenCalledWith(
        expect.objectContaining({ state: ConversationState.AWAITING_SERVICE, language: Language.EN }),
      );
    });

    it('sets language to TA when customer replies "2"', async () => {
      mockUpsert.mockResolvedValue(makeCustomer());
      mockGetSession.mockResolvedValue(makeSession({ state: ConversationState.AWAITING_LANGUAGE }));

      await service.handleMessage(makeTextMessage('2'), 'Rajesh');

      expect(mockUpdateLanguage).toHaveBeenCalledWith('cust-1', Language.TA);
      expect(mockSaveSession).toHaveBeenCalledWith(
        expect.objectContaining({ language: Language.TA }),
      );
    });

    it('sets language to TA when customer taps the lang_ta button', async () => {
      mockUpsert.mockResolvedValue(makeCustomer());
      mockGetSession.mockResolvedValue(makeSession({ state: ConversationState.AWAITING_LANGUAGE }));

      await service.handleMessage(makeButtonReply('lang_ta'), 'Rajesh');

      expect(mockUpdateLanguage).toHaveBeenCalledWith('cust-1', Language.TA);
    });

    it('defaults to EN for unrecognized input', async () => {
      mockUpsert.mockResolvedValue(makeCustomer());
      mockGetSession.mockResolvedValue(makeSession({ state: ConversationState.AWAITING_LANGUAGE }));

      await service.handleMessage(makeTextMessage('xyz'), 'Rajesh');

      expect(mockUpdateLanguage).toHaveBeenCalledWith('cust-1', Language.EN);
    });
  });

  // ─── Service selection ───────────────────────────────────────────────────────

  describe('AWAITING_SERVICE state', () => {
    it('asks for location when customer selects a valid service number', async () => {
      mockUpsert.mockResolvedValue(makeCustomer());
      mockGetSession.mockResolvedValue(makeSession({ state: ConversationState.AWAITING_SERVICE }));
      mockFindByName.mockResolvedValue({ id: 'cat-1', name: 'Electrical' });

      await service.handleMessage(makeTextMessage('1'), 'Rajesh');

      expect(mockFindByName).toHaveBeenCalledWith('Electrical');
      expect(mockSaveSession).toHaveBeenCalledWith(
        expect.objectContaining({
          state: ConversationState.AWAITING_LOCATION,
          selectedCategoryId: 'cat-1',
          selectedCategoryName: 'Electrical',
        }),
      );
    });

    it('sends error + re-shows menu for invalid service number', async () => {
      mockUpsert.mockResolvedValue(makeCustomer());
      mockGetSession.mockResolvedValue(makeSession({ state: ConversationState.AWAITING_SERVICE }));

      await service.handleMessage(makeTextMessage('9'), 'Rajesh');

      expect(mockSendText).toHaveBeenCalledTimes(2);
      expect(mockSaveSession).toHaveBeenCalledWith(
        expect.objectContaining({ state: ConversationState.AWAITING_SERVICE }),
      );
    });

    it('sends error if category not found in DB', async () => {
      mockUpsert.mockResolvedValue(makeCustomer());
      mockGetSession.mockResolvedValue(makeSession({ state: ConversationState.AWAITING_SERVICE }));
      mockFindByName.mockResolvedValue(null);

      await service.handleMessage(makeTextMessage('1'), 'Rajesh');

      expect(mockSendText).toHaveBeenCalledTimes(1);
      expect(mockSaveSession).toHaveBeenCalledWith(
        expect.objectContaining({ state: ConversationState.AWAITING_SERVICE }),
      );
    });
  });

  // ─── Location ───────────────────────────────────────────────────────────────

  describe('AWAITING_LOCATION state', () => {
    it('stores text location and asks for scheduled time', async () => {
      mockUpsert.mockResolvedValue(makeCustomer());
      mockGetSession.mockResolvedValue(
        makeSession({
          state: ConversationState.AWAITING_LOCATION,
          selectedCategoryId: 'cat-1',
          selectedCategoryName: 'Electrical',
        }),
      );

      await service.handleMessage(makeTextMessage('Virudhunagar Town'), 'Rajesh');

      expect(mockSaveSession).toHaveBeenCalledWith(
        expect.objectContaining({
          state: ConversationState.AWAITING_TIME,
          location: 'Virudhunagar Town',
        }),
      );
    });

    it('extracts the name from a WhatsApp location share', async () => {
      mockUpsert.mockResolvedValue(makeCustomer());
      mockGetSession.mockResolvedValue(
        makeSession({
          state: ConversationState.AWAITING_LOCATION,
          selectedCategoryId: 'cat-1',
          selectedCategoryName: 'Electrical',
        }),
      );

      await service.handleMessage(makeLocationMessage(), 'Rajesh');

      expect(mockSaveSession).toHaveBeenCalledWith(
        expect.objectContaining({ location: 'Virudhunagar' }),
      );
    });

    it('falls back to lat,lng when location has no name or address', async () => {
      mockUpsert.mockResolvedValue(makeCustomer());
      mockGetSession.mockResolvedValue(
        makeSession({
          state: ConversationState.AWAITING_LOCATION,
          selectedCategoryId: 'cat-1',
          selectedCategoryName: 'Electrical',
        }),
      );

      const message: InboundWhatsAppMessage = {
        from: '919876543210',
        id: 'msg-004',
        timestamp: '1718000003',
        type: 'location',
        location: { latitude: 9.9252, longitude: 78.1198 },
      };

      await service.handleMessage(message, 'Rajesh');

      expect(mockSaveSession).toHaveBeenCalledWith(
        expect.objectContaining({ location: '9.9252,78.1198' }),
      );
    });
  });

  // ─── Time + job creation ─────────────────────────────────────────────────────

  describe('AWAITING_TIME state', () => {
    it('creates a job and sends confirmation containing the job number', async () => {
      mockUpsert.mockResolvedValue(makeCustomer());
      mockGetSession.mockResolvedValue(
        makeSession({
          state: ConversationState.AWAITING_TIME,
          selectedCategoryId: 'cat-1',
          selectedCategoryName: 'AC Service',
          location: 'Virudhunagar',
        }),
      );
      mockCreateJob.mockResolvedValue({ id: 'job-1', jobNumber: 'JOB-20260614-0001' });

      await service.handleMessage(makeTextMessage('Today 4 PM'), 'Rajesh');

      expect(mockCreateJob).toHaveBeenCalledWith(
        expect.objectContaining({
          customerId: 'cust-1',
          serviceCategoryId: 'cat-1',
          location: 'Virudhunagar',
          scheduledTimeText: 'Today 4 PM',
        }),
      );

      const sentTexts = mockSendText.mock.calls.map((c) => c[0].text as string);
      expect(sentTexts.some((t) => t.includes('JOB-20260614-0001'))).toBe(true);

      expect(mockSaveSession).toHaveBeenCalledWith(
        expect.objectContaining({ state: ConversationState.IDLE }),
      );
    });

    it('clears category and location fields from session after job creation', async () => {
      mockUpsert.mockResolvedValue(makeCustomer());
      mockGetSession.mockResolvedValue(
        makeSession({
          state: ConversationState.AWAITING_TIME,
          selectedCategoryId: 'cat-2',
          selectedCategoryName: 'Plumbing',
          location: 'Sattur',
        }),
      );
      mockCreateJob.mockResolvedValue({ id: 'job-2', jobNumber: 'JOB-20260614-0002' });

      await service.handleMessage(makeTextMessage('Tomorrow 10 AM'), 'Rajesh');

      const saved = mockSaveSession.mock.calls[0][0] as ConversationSession;
      expect(saved.selectedCategoryId).toBeUndefined();
      expect(saved.selectedCategoryName).toBeUndefined();
      expect(saved.location).toBeUndefined();
    });
  });

  // ─── HELP command ────────────────────────────────────────────────────────────

  describe('HELP command', () => {
    it('sends help text from any state without changing the state', async () => {
      mockUpsert.mockResolvedValue(makeCustomer());
      mockGetSession.mockResolvedValue(makeSession({ state: ConversationState.AWAITING_SERVICE }));

      await service.handleMessage(makeTextMessage('HELP'), 'Rajesh');

      expect(mockSendText).toHaveBeenCalledTimes(1);
      expect(mockSaveSession).toHaveBeenCalledWith(
        expect.objectContaining({ state: ConversationState.AWAITING_SERVICE }),
      );
    });

    it('responds to Tamil உதவி command', async () => {
      mockUpsert.mockResolvedValue(makeCustomer({ language: 'TA' }));
      mockGetSession.mockResolvedValue(
        makeSession({ state: ConversationState.AWAITING_SERVICE, language: Language.TA }),
      );

      await service.handleMessage(makeTextMessage('உதவி'), 'Rajesh');

      expect(mockSendText).toHaveBeenCalled();
    });
  });

  // ─── TRACK command ───────────────────────────────────────────────────────────

  describe('TRACK command', () => {
    it('sends job status for a valid job number', async () => {
      mockUpsert.mockResolvedValue(makeCustomer());
      mockGetSession.mockResolvedValue(makeSession({ state: ConversationState.IDLE }));
      mockFindByJobNumber.mockResolvedValue({
        id: 'job-1',
        jobNumber: 'JOB-20260614-0001',
        customerId: 'cust-1',
        status: 'NEW',
        location: 'Virudhunagar',
        serviceCategory: { name: 'Electrical' },
      });

      await service.handleMessage(makeTextMessage('TRACK JOB-20260614-0001'), 'Rajesh');

      expect(mockFindByJobNumber).toHaveBeenCalledWith('JOB-20260614-0001');
      expect(mockSendText).toHaveBeenCalledWith(expect.objectContaining({ to: '919876543210' }));
    });

    it('sends error when job is not found', async () => {
      mockUpsert.mockResolvedValue(makeCustomer());
      mockGetSession.mockResolvedValue(makeSession());
      mockFindByJobNumber.mockResolvedValue(null);

      await service.handleMessage(makeTextMessage('TRACK JOB-00000000-9999'), 'Rajesh');

      expect(mockSendText).toHaveBeenCalledWith(expect.objectContaining({ to: '919876543210' }));
    });
  });

  // ─── CANCEL command ──────────────────────────────────────────────────────────

  describe('CANCEL command', () => {
    it('cancels a NEW job that belongs to the customer', async () => {
      mockUpsert.mockResolvedValue(makeCustomer());
      mockGetSession.mockResolvedValue(makeSession({ state: ConversationState.IDLE }));
      mockFindByJobNumber.mockResolvedValue({
        id: 'job-1',
        jobNumber: 'JOB-20260614-0001',
        customerId: 'cust-1',
        status: JobStatus.NEW,
      });
      mockCancelJob.mockResolvedValue({});

      await service.handleMessage(makeTextMessage('CANCEL JOB-20260614-0001'), 'Rajesh');

      expect(mockCancelJob).toHaveBeenCalledWith('job-1');
      expect(mockSendText).toHaveBeenCalledWith(expect.objectContaining({ to: '919876543210' }));
    });

    it('cancels a job in ASSIGNED status', async () => {
      mockUpsert.mockResolvedValue(makeCustomer());
      mockGetSession.mockResolvedValue(makeSession());
      mockFindByJobNumber.mockResolvedValue({
        id: 'job-2',
        jobNumber: 'JOB-20260614-0002',
        customerId: 'cust-1',
        status: JobStatus.ASSIGNED,
      });
      mockCancelJob.mockResolvedValue({});

      await service.handleMessage(makeTextMessage('CANCEL JOB-20260614-0002'), 'Rajesh');

      expect(mockCancelJob).toHaveBeenCalledWith('job-2');
    });

    it('rejects cancel when job is IN_PROGRESS', async () => {
      mockUpsert.mockResolvedValue(makeCustomer());
      mockGetSession.mockResolvedValue(makeSession());
      mockFindByJobNumber.mockResolvedValue({
        id: 'job-1',
        jobNumber: 'JOB-20260614-0001',
        customerId: 'cust-1',
        status: JobStatus.IN_PROGRESS,
      });

      await service.handleMessage(makeTextMessage('CANCEL JOB-20260614-0001'), 'Rajesh');

      expect(mockCancelJob).not.toHaveBeenCalled();
      expect(mockSendText).toHaveBeenCalled();
    });

    it('rejects cancel when job belongs to a different customer', async () => {
      mockUpsert.mockResolvedValue(makeCustomer({ id: 'cust-1' }));
      mockGetSession.mockResolvedValue(makeSession());
      mockFindByJobNumber.mockResolvedValue({
        id: 'job-1',
        jobNumber: 'JOB-20260614-0001',
        customerId: 'cust-OTHER',
        status: JobStatus.NEW,
      });

      await service.handleMessage(makeTextMessage('CANCEL JOB-20260614-0001'), 'Rajesh');

      expect(mockCancelJob).not.toHaveBeenCalled();
    });

    it('sends error when job is not found for CANCEL', async () => {
      mockUpsert.mockResolvedValue(makeCustomer());
      mockGetSession.mockResolvedValue(makeSession());
      mockFindByJobNumber.mockResolvedValue(null);

      await service.handleMessage(makeTextMessage('CANCEL JOB-00000000-0000'), 'Rajesh');

      expect(mockCancelJob).not.toHaveBeenCalled();
      expect(mockSendText).toHaveBeenCalled();
    });
  });

  // ─── AWAITING_AMOUNT_CONFIRMATION state ─────────────────────────────────────

  describe('AWAITING_AMOUNT_CONFIRMATION state', () => {
    const makeSessionWithCtx = (): ConversationSession =>
      makeSession({
        state: ConversationState.AWAITING_AMOUNT_CONFIRMATION,
        activeJobContext: {
          jobId: 'job-1',
          jobNumber: 'JOB-20260614-0001',
          customerId: 'cust-1',
          technicianId: 'tech-1',
          technicianName: 'Kumar',
          technicianPhone: '919100000000',
          amount: '500',
          paymentMode: 'CASH',
        },
      });

    it('confirms amount and transitions to AWAITING_RATING on reply "1"', async () => {
      mockUpsert.mockResolvedValue(makeCustomer());
      mockGetSession.mockResolvedValue(makeSessionWithCtx());

      await service.handleMessage(makeTextMessage('1'), 'Rajesh');

      expect(mockSendText).toHaveBeenCalledWith(
        expect.objectContaining({ to: '919876543210' }),
      );
      expect(mockSaveSession).toHaveBeenCalledWith(
        expect.objectContaining({ state: ConversationState.AWAITING_RATING }),
      );
    });

    it('disputes amount and transitions to IDLE on reply "2"', async () => {
      mockUpsert.mockResolvedValue(makeCustomer());
      mockGetSession.mockResolvedValue(makeSessionWithCtx());

      await service.handleMessage(makeTextMessage('2'), 'Rajesh');

      expect(mockSendText).toHaveBeenCalledWith(
        expect.objectContaining({ to: '919876543210' }),
      );
      expect(mockSaveSession).toHaveBeenCalledWith(
        expect.objectContaining({ state: ConversationState.IDLE }),
      );
    });

    it('re-prompts for unrecognized reply without changing state', async () => {
      mockUpsert.mockResolvedValue(makeCustomer());
      mockGetSession.mockResolvedValue(makeSessionWithCtx());

      await service.handleMessage(makeTextMessage('maybe'), 'Rajesh');

      expect(mockSendText).toHaveBeenCalled();
      expect(mockSaveSession).toHaveBeenCalledWith(
        expect.objectContaining({ state: ConversationState.AWAITING_AMOUNT_CONFIRMATION }),
      );
    });
  });

  // ─── AWAITING_RATING state ───────────────────────────────────────────────────

  describe('AWAITING_RATING state', () => {
    const makeRatingSession = (): ConversationSession =>
      makeSession({
        state: ConversationState.AWAITING_RATING,
        activeJobContext: {
          jobId: 'job-1',
          jobNumber: 'JOB-20260614-0001',
          customerId: 'cust-1',
          technicianId: 'tech-1',
          technicianName: 'Kumar',
          technicianPhone: '919100000000',
          amount: '500',
          paymentMode: 'CASH',
        },
      });

    it('accepts a valid rating of 5 and transitions to IDLE', async () => {
      mockUpsert.mockResolvedValue(makeCustomer());
      mockGetSession.mockResolvedValue(makeRatingSession());

      await service.handleMessage(makeTextMessage('5'), 'Rajesh');

      expect(mockSendText).toHaveBeenCalledWith(
        expect.objectContaining({ to: '919876543210' }),
      );
      expect(mockSaveSession).toHaveBeenCalledWith(
        expect.objectContaining({ state: ConversationState.IDLE }),
      );
    });

    it('accepts boundary rating of 1', async () => {
      mockUpsert.mockResolvedValue(makeCustomer());
      mockGetSession.mockResolvedValue(makeRatingSession());

      await service.handleMessage(makeTextMessage('1'), 'Rajesh');

      expect(mockSaveSession).toHaveBeenCalledWith(
        expect.objectContaining({ state: ConversationState.IDLE }),
      );
    });

    it('re-prompts for rating outside 1–5 range', async () => {
      mockUpsert.mockResolvedValue(makeCustomer());
      mockGetSession.mockResolvedValue(makeRatingSession());

      await service.handleMessage(makeTextMessage('6'), 'Rajesh');

      expect(mockSendText).toHaveBeenCalled();
      expect(mockSaveSession).toHaveBeenCalledWith(
        expect.objectContaining({ state: ConversationState.AWAITING_RATING }),
      );
    });

    it('re-prompts for non-numeric input', async () => {
      mockUpsert.mockResolvedValue(makeCustomer());
      mockGetSession.mockResolvedValue(makeRatingSession());

      await service.handleMessage(makeTextMessage('great'), 'Rajesh');

      expect(mockSendText).toHaveBeenCalled();
      expect(mockSaveSession).toHaveBeenCalledWith(
        expect.objectContaining({ state: ConversationState.AWAITING_RATING }),
      );
    });
  });

  // ─── markAsRead ──────────────────────────────────────────────────────────────

  describe('markAsRead()', () => {
    it('calls markAsRead for every inbound message', async () => {
      mockUpsert.mockResolvedValue(makeCustomer());
      mockGetSession.mockResolvedValue(makeSession({ state: ConversationState.IDLE }));

      await service.handleMessage(makeTextMessage('Hello'), 'Rajesh');

      expect(mockMarkAsRead).toHaveBeenCalledWith('msg-001');
    });

    it('continues processing even when markAsRead throws', async () => {
      mockUpsert.mockResolvedValue(makeCustomer());
      mockGetSession.mockResolvedValue(makeSession({ state: ConversationState.IDLE }));
      mockMarkAsRead.mockRejectedValue(new Error('Network error'));

      await expect(service.handleMessage(makeTextMessage('Hello'), 'Rajesh')).resolves.not.toThrow();
      expect(mockSendInteractiveButtons).toHaveBeenCalled();
    });
  });
});
