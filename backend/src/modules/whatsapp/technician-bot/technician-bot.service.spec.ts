import { Test, TestingModule } from '@nestjs/testing';
import { TechnicianBotService } from './technician-bot.service';
import { WHATSAPP_PROVIDER } from '../../../infrastructure/messaging/whatsapp.provider.interface';
import { TranslationService } from '../../../infrastructure/i18n/translation.service';
import { TechnicianSessionService } from './technician-session.service';
import { TechnicianSession, TechnicianConversationState } from './technician-session.types';
import { TechniciansRepository } from '../../technicians/technicians.repository';
import { AssignmentsRepository } from '../../assignments/assignments.repository';
import { JobsService } from '../../jobs/jobs.service';
import { CustomersRepository } from '../../customers/customers.repository';
// MVP: commission not applied/displayed — see technician-bot.service.ts.
// import { CommissionService } from '../../commission/commission.service';
import { ConversationStateService } from '../conversation/conversation-state.service';
import { MinioService } from '../../../infrastructure/storage/minio.service';
import { Language, JobStatus, TechnicianStatus, PaymentMode } from '../../../domain/enums';
import { InboundWhatsAppMessage } from '../../../infrastructure/messaging/types/inbound-message.types';
import { AssignmentEngineService } from '../../assignment-engine/assignment-engine.service';

// ─── Mock factories ───────────────────────────────────────────────────────────

const mockSendText = jest.fn().mockResolvedValue(undefined);
const mockSendInteractiveButtons = jest.fn().mockResolvedValue(undefined);
const mockMarkAsRead = jest.fn().mockResolvedValue(undefined);
const mockDownloadMedia = jest.fn();

const mockWhatsApp = {
  sendText: mockSendText,
  sendInteractiveButtons: mockSendInteractiveButtons,
  markAsRead: mockMarkAsRead,
  downloadMedia: mockDownloadMedia,
};

const mockGetSession = jest.fn();
const mockSaveSession = jest.fn().mockResolvedValue(undefined);
const mockCreateNewSession = jest.fn();

const mockTechSessionService = {
  getSession: mockGetSession,
  saveSession: mockSaveSession,
  createNewSession: mockCreateNewSession,
};

const mockUpdateTechStatus = jest.fn().mockResolvedValue(undefined);
const mockTechniciansRepository = {
  updateStatus: mockUpdateTechStatus,
};

const mockFindByJobId = jest.fn();
const mockAcceptAssignment = jest.fn();
const mockDeleteById = jest.fn();
const mockAssignmentsRepository = {
  findByJobId: mockFindByJobId,
  accept: mockAcceptAssignment,
  deleteById: mockDeleteById,
};

const mockFindWithDetails = jest.fn();
const mockUpdateStatus = jest.fn();
const mockSetCompletion = jest.fn();
const mockAppendPhotoUrl = jest.fn().mockResolvedValue(undefined);
const mockFindByTechnicianId = jest.fn();
const mockJobsService = {
  findWithDetails: mockFindWithDetails,
  updateStatus: mockUpdateStatus,
  setCompletion: mockSetCompletion,
  appendPhotoUrl: mockAppendPhotoUrl,
  findByTechnicianId: mockFindByTechnicianId,
};

const mockCustomersRepository = {};

// MVP: commission not applied/displayed — see technician-bot.service.ts.
// const mockCalculateCommission = jest.fn().mockResolvedValue({ commissionAmount: 0, technicianAmount: 500 });
// const mockCommissionService = {
//   calculateCommission: mockCalculateCommission,
// };

const mockGetCustomerSession = jest.fn();
const mockSaveCustomerSession = jest.fn().mockResolvedValue(undefined);
const mockCreateCustomerSession = jest.fn();
const mockCustomerSessionService = {
  getSession: mockGetCustomerSession,
  saveSession: mockSaveCustomerSession,
  createNewSession: mockCreateCustomerSession,
};

const mockUploadFile = jest.fn();
const mockMinioService = {
  uploadFile: mockUploadFile,
};

const mockAssignmentEngineService = {
  triggerReassignment: jest.fn().mockResolvedValue(undefined),
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const makeTechnician = (overrides = {}): any => ({
  id: 'tech-1',
  phone: '919100000000',
  name: 'Kumar',
  language: Language.EN,
  status: TechnicianStatus.AVAILABLE,
  ...overrides,
});

const makeSession = (overrides: Partial<TechnicianSession> = {}): TechnicianSession => ({
  state: TechnicianConversationState.IDLE,
  phone: '919100000000',
  language: Language.EN,
  updatedAt: new Date().toISOString(),
  ...overrides,
});

const makeTextMessage = (body: string, from = '919100000000'): InboundWhatsAppMessage => ({
  from,
  id: 'msg-001',
  timestamp: '1718000000',
  type: 'text',
  text: { body },
});

const makeButtonReply = (id: string, from = '919100000000'): InboundWhatsAppMessage => ({
  from,
  id: 'msg-002',
  timestamp: '1718000001',
  type: 'interactive',
  interactive: { type: 'button_reply', button_reply: { id, title: id } },
});

const makeImageMessage = (mediaId = 'media-1', from = '919100000000'): InboundWhatsAppMessage => ({
  from,
  id: 'msg-003',
  timestamp: '1718000002',
  type: 'image',
  image: { id: mediaId, mime_type: 'image/jpeg', sha256: 'abc123' },
});

const makeJobWithDetails = (overrides = {}): any => ({
  id: 'job-1',
  jobNumber: 'JOB-20260614-0001',
  location: 'Virudhunagar',
  description: 'Requested time: Today 4 PM',
  status: JobStatus.ACCEPTED,
  serviceCategory: { id: 'cat-1', name: 'Electrical' },
  customer: { id: 'cust-1', phone: '919876543210', name: 'Rajesh', language: Language.EN },
  assignment: null,
  ...overrides,
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('TechnicianBotService', () => {
  let service: TechnicianBotService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TechnicianBotService,
        TranslationService,
        { provide: WHATSAPP_PROVIDER, useValue: mockWhatsApp },
        { provide: TechnicianSessionService, useValue: mockTechSessionService },
        { provide: TechniciansRepository, useValue: mockTechniciansRepository },
        { provide: AssignmentsRepository, useValue: mockAssignmentsRepository },
        { provide: JobsService, useValue: mockJobsService },
        { provide: CustomersRepository, useValue: mockCustomersRepository },
        // MVP: commission not applied/displayed — see technician-bot.service.ts.
        // { provide: CommissionService, useValue: mockCommissionService },
        { provide: ConversationStateService, useValue: mockCustomerSessionService },
        { provide: MinioService, useValue: mockMinioService },
        { provide: AssignmentEngineService, useValue: mockAssignmentEngineService },
      ],
    }).compile();

    service = module.get<TechnicianBotService>(TechnicianBotService);

    jest.clearAllMocks();
    mockMarkAsRead.mockResolvedValue(undefined);
    mockSaveSession.mockResolvedValue(undefined);
    mockSaveCustomerSession.mockResolvedValue(undefined);
  });

  // ─── HELP command ─────────────────────────────────────────────────────────

  describe('HELP global command', () => {
    it('sends help text and saves session without changing state', async () => {
      const session = makeSession({ state: TechnicianConversationState.JOB_ACCEPTED });
      mockGetSession.mockResolvedValue(session);

      await service.handleMessage(makeTextMessage('HELP'), 'Kumar', makeTechnician());

      expect(mockSendText).toHaveBeenCalledWith(
        expect.objectContaining({ to: '919100000000' }),
      );
      expect(mockSaveSession).toHaveBeenCalledWith(
        expect.objectContaining({ state: TechnicianConversationState.JOB_ACCEPTED }),
      );
    });

    it('responds to Tamil help command உதவி', async () => {
      mockGetSession.mockResolvedValue(makeSession());

      await service.handleMessage(makeTextMessage('உதவி'), 'Kumar', makeTechnician());

      expect(mockSendText).toHaveBeenCalled();
    });
  });

  // ─── STATUS command ────────────────────────────────────────────────────────

  describe('STATUS global command', () => {
    it('sends no_active_job when session is IDLE', async () => {
      mockGetSession.mockResolvedValue(makeSession({ state: TechnicianConversationState.IDLE }));

      await service.handleMessage(makeTextMessage('STATUS'), 'Kumar', makeTechnician());

      expect(mockSendText).toHaveBeenCalledWith(
        expect.objectContaining({ to: '919100000000' }),
      );
    });

    it('sends job status when session has an active job', async () => {
      mockGetSession.mockResolvedValue(
        makeSession({
          state: TechnicianConversationState.JOB_IN_PROGRESS,
          activeJobId: 'job-1',
          activeJobNumber: 'JOB-20260614-0001',
        }),
      );
      mockFindWithDetails.mockResolvedValue(makeJobWithDetails());

      await service.handleMessage(makeTextMessage('STATUS'), 'Kumar', makeTechnician());

      expect(mockFindWithDetails).toHaveBeenCalledWith('job-1');
      expect(mockSendText).toHaveBeenCalled();
    });
  });

  // ─── JOBS command ──────────────────────────────────────────────────────────

  describe('JOBS global command', () => {
    it('sends no_active_job when technician has no job history', async () => {
      mockGetSession.mockResolvedValue(makeSession());
      mockFindByTechnicianId.mockResolvedValue([]);

      await service.handleMessage(makeTextMessage('JOBS'), 'Kumar', makeTechnician());

      expect(mockFindByTechnicianId).toHaveBeenCalledWith('tech-1', 5);
      expect(mockSendText).toHaveBeenCalled();
    });

    it('sends formatted job list when technician has history', async () => {
      mockGetSession.mockResolvedValue(makeSession());
      mockFindByTechnicianId.mockResolvedValue([
        { id: 'job-1', jobNumber: 'JOB-20260614-0001', status: JobStatus.COMPLETED, serviceCategory: { name: 'Electrical' } },
        { id: 'job-2', jobNumber: 'JOB-20260614-0002', status: JobStatus.IN_PROGRESS, serviceCategory: { name: 'Plumbing' } },
      ]);

      await service.handleMessage(makeTextMessage('JOBS'), 'Kumar', makeTechnician());

      expect(mockSendText).toHaveBeenCalled();
    });
  });

  // ─── IDLE state ───────────────────────────────────────────────────────────

  describe('IDLE state', () => {
    it('sends no_active_job message', async () => {
      mockGetSession.mockResolvedValue(makeSession({ state: TechnicianConversationState.IDLE }));

      await service.handleMessage(makeTextMessage('Hello'), 'Kumar', makeTechnician());

      expect(mockSendText).toHaveBeenCalledWith(
        expect.objectContaining({ to: '919100000000' }),
      );
    });

    it('creates new session when Redis returns null', async () => {
      mockGetSession.mockResolvedValue(null);
      mockCreateNewSession.mockReturnValue(makeSession());

      await service.handleMessage(makeTextMessage('Hi'), 'Kumar', makeTechnician());

      expect(mockCreateNewSession).toHaveBeenCalledWith('919100000000', Language.EN);
    });
  });

  // ─── JOB_OFFER_PENDING state ──────────────────────────────────────────────

  describe('JOB_OFFER_PENDING state', () => {
    const pendingSession = () =>
      makeSession({
        state: TechnicianConversationState.JOB_OFFER_PENDING,
        activeJobId: 'job-1',
        activeJobNumber: 'JOB-20260614-0001',
        customerPhone: '919876543210',
        offerExpiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // 10 min in future
      });

    it('accepts job on "1" reply', async () => {
      const session = pendingSession();
      mockGetSession.mockResolvedValue(session);
      const assignment = { id: 'assign-1', jobId: 'job-1' };
      mockFindByJobId.mockResolvedValue(assignment);
      mockAcceptAssignment.mockResolvedValue({ ...assignment, acceptedAt: new Date() });
      mockUpdateStatus.mockResolvedValue({ id: 'job-1', status: JobStatus.ACCEPTED });
      mockUpdateTechStatus.mockResolvedValue(undefined);
      mockFindWithDetails.mockResolvedValue(makeJobWithDetails());
      mockGetCustomerSession.mockResolvedValue(null);
      mockCreateCustomerSession.mockReturnValue({
        state: 'IDLE',
        phone: '919876543210',
        language: Language.EN,
        updatedAt: new Date().toISOString(),
      });

      await service.handleMessage(makeTextMessage('1'), 'Kumar', makeTechnician());

      expect(mockAcceptAssignment).toHaveBeenCalledWith('assign-1');
      expect(mockUpdateStatus).toHaveBeenCalledWith('job-1', JobStatus.ACCEPTED);
      expect(mockUpdateTechStatus).toHaveBeenCalledWith('tech-1', TechnicianStatus.BUSY);
      expect(mockSendText).toHaveBeenCalled();
      expect(mockSaveSession).toHaveBeenCalledWith(
        expect.objectContaining({ state: TechnicianConversationState.JOB_ACCEPTED }),
      );
    });

    it('sends the technician name, phone, and job number to the customer on acceptance', async () => {
      const session = pendingSession();
      mockGetSession.mockResolvedValue(session);
      const assignment = { id: 'assign-1', jobId: 'job-1' };
      mockFindByJobId.mockResolvedValue(assignment);
      mockAcceptAssignment.mockResolvedValue({ ...assignment, acceptedAt: new Date() });
      mockUpdateStatus.mockResolvedValue({ id: 'job-1', status: JobStatus.ACCEPTED });
      mockUpdateTechStatus.mockResolvedValue(undefined);
      mockFindWithDetails.mockResolvedValue(makeJobWithDetails());
      mockGetCustomerSession.mockResolvedValue(null);
      mockCreateCustomerSession.mockReturnValue({
        state: 'IDLE',
        phone: '919876543210',
        language: Language.EN,
        updatedAt: new Date().toISOString(),
      });

      await service.handleMessage(makeTextMessage('1'), 'Kumar', makeTechnician({ phone: '919100000000' }));

      expect(mockSendText).toHaveBeenCalledWith(
        expect.objectContaining({
          to: '919876543210',
          text: expect.stringContaining('+919100000000'),
        }),
      );
    });

    it('sends the customer phone number to the technician on acceptance', async () => {
      const session = pendingSession();
      mockGetSession.mockResolvedValue(session);
      const assignment = { id: 'assign-1', jobId: 'job-1' };
      mockFindByJobId.mockResolvedValue(assignment);
      mockAcceptAssignment.mockResolvedValue({ ...assignment, acceptedAt: new Date() });
      mockUpdateStatus.mockResolvedValue({ id: 'job-1', status: JobStatus.ACCEPTED });
      mockUpdateTechStatus.mockResolvedValue(undefined);
      mockFindWithDetails.mockResolvedValue(
        makeJobWithDetails({ customer: { id: 'cust-1', phone: '919876543210', name: 'Rajesh', language: Language.EN } }),
      );
      mockGetCustomerSession.mockResolvedValue(null);
      mockCreateCustomerSession.mockReturnValue({
        state: 'IDLE',
        phone: '919876543210',
        language: Language.EN,
        updatedAt: new Date().toISOString(),
      });

      await service.handleMessage(makeTextMessage('1'), 'Kumar', makeTechnician());

      expect(mockSendInteractiveButtons).toHaveBeenCalledWith(
        expect.objectContaining({
          to: '919100000000',
          body: expect.stringContaining('+919876543210'),
        }),
      );
    });

    it('still persists the advanced state when the outbound WhatsApp send fails', async () => {
      const session = pendingSession();
      mockGetSession.mockResolvedValue(session);
      const assignment = { id: 'assign-1', jobId: 'job-1' };
      mockFindByJobId.mockResolvedValue(assignment);
      mockAcceptAssignment.mockResolvedValue({ ...assignment, acceptedAt: new Date() });
      mockUpdateStatus.mockResolvedValue({ id: 'job-1', status: JobStatus.ACCEPTED });
      mockUpdateTechStatus.mockResolvedValue(undefined);
      mockFindWithDetails.mockResolvedValue(makeJobWithDetails());
      mockGetCustomerSession.mockResolvedValue(null);
      mockCreateCustomerSession.mockReturnValue({
        state: 'IDLE',
        phone: '919876543210',
        language: Language.EN,
        updatedAt: new Date().toISOString(),
      });
      mockSendText.mockRejectedValueOnce(new Error('Meta API error'));

      await service.handleMessage(makeTextMessage('1'), 'Kumar', makeTechnician());

      expect(mockSaveSession).toHaveBeenCalledWith(
        expect.objectContaining({ state: TechnicianConversationState.JOB_ACCEPTED }),
      );
    });

    it('accepts job via accept_job button reply', async () => {
      const session = pendingSession();
      mockGetSession.mockResolvedValue(session);
      mockFindByJobId.mockResolvedValue({ id: 'assign-1', jobId: 'job-1' });
      mockAcceptAssignment.mockResolvedValue({});
      mockUpdateStatus.mockResolvedValue({});
      mockUpdateTechStatus.mockResolvedValue(undefined);
      mockFindWithDetails.mockResolvedValue(makeJobWithDetails());
      mockGetCustomerSession.mockResolvedValue(null);
      mockCreateCustomerSession.mockReturnValue({
        state: 'IDLE', phone: '919876543210', language: Language.EN, updatedAt: new Date().toISOString(),
      });

      await service.handleMessage(makeButtonReply('accept_job'), 'Kumar', makeTechnician());

      expect(mockAcceptAssignment).toHaveBeenCalled();
    });

    it('rejects job on "2" reply', async () => {
      const session = pendingSession();
      mockGetSession.mockResolvedValue(session);
      const assignment = { id: 'assign-1', jobId: 'job-1' };
      mockFindByJobId.mockResolvedValue(assignment);
      mockDeleteById.mockResolvedValue(undefined);
      mockUpdateStatus.mockResolvedValue({});

      await service.handleMessage(makeTextMessage('2'), 'Kumar', makeTechnician());

      expect(mockDeleteById).toHaveBeenCalledWith('assign-1');
      expect(mockUpdateStatus).toHaveBeenCalledWith('job-1', JobStatus.NEW);
      expect(mockSaveSession).toHaveBeenCalledWith(
        expect.objectContaining({ state: TechnicianConversationState.IDLE }),
      );
    });

    it('sends unknown_command for unrecognized reply', async () => {
      mockGetSession.mockResolvedValue(pendingSession());

      await service.handleMessage(makeTextMessage('maybe'), 'Kumar', makeTechnician());

      expect(mockSendText).toHaveBeenCalledWith(
        expect.objectContaining({ to: '919100000000' }),
      );
      expect(mockAcceptAssignment).not.toHaveBeenCalled();
      expect(mockDeleteById).not.toHaveBeenCalled();
    });

    it('resets to IDLE and sends offer_expired when offer TTL has elapsed', async () => {
      mockGetSession.mockResolvedValue(
        makeSession({
          state: TechnicianConversationState.JOB_OFFER_PENDING,
          activeJobId: 'job-1',
          offerExpiresAt: new Date(Date.now() - 1000).toISOString(), // 1 second in past
        }),
      );

      await service.handleMessage(makeTextMessage('1'), 'Kumar', makeTechnician());

      expect(mockSaveSession).toHaveBeenCalledWith(
        expect.objectContaining({ state: TechnicianConversationState.IDLE }),
      );
      expect(mockAcceptAssignment).not.toHaveBeenCalled();
    });
  });

  // ─── JOB_ACCEPTED state ───────────────────────────────────────────────────

  describe('JOB_ACCEPTED state', () => {
    const acceptedSession = (customerPhone = '919876543210') =>
      makeSession({
        state: TechnicianConversationState.JOB_ACCEPTED,
        activeJobId: 'job-1',
        activeJobNumber: 'JOB-20260614-0001',
        customerPhone,
      });

    it('transitions to JOB_IN_PROGRESS on START command', async () => {
      mockGetSession.mockResolvedValue(acceptedSession());
      mockUpdateStatus.mockResolvedValue({ id: 'job-1', status: JobStatus.IN_PROGRESS });
      mockFindWithDetails.mockResolvedValue(makeJobWithDetails());

      await service.handleMessage(makeTextMessage('START'), 'Kumar', makeTechnician());

      expect(mockUpdateStatus).toHaveBeenCalledWith('job-1', JobStatus.IN_PROGRESS);
      expect(mockSaveSession).toHaveBeenCalledWith(
        expect.objectContaining({ state: TechnicianConversationState.JOB_IN_PROGRESS }),
      );
      expect(mockSendText).toHaveBeenCalled();
    });

    it('transitions to JOB_IN_PROGRESS on "1" reply', async () => {
      mockGetSession.mockResolvedValue(acceptedSession());
      mockUpdateStatus.mockResolvedValue({ id: 'job-1', status: JobStatus.IN_PROGRESS });
      mockFindWithDetails.mockResolvedValue(makeJobWithDetails());

      await service.handleMessage(makeTextMessage('1'), 'Kumar', makeTechnician());

      expect(mockUpdateStatus).toHaveBeenCalledWith('job-1', JobStatus.IN_PROGRESS);
      expect(mockSaveSession).toHaveBeenCalledWith(
        expect.objectContaining({ state: TechnicianConversationState.JOB_IN_PROGRESS }),
      );
    });

    it('declines on "2" reply: frees the technician, resets the job, and reassigns', async () => {
      mockGetSession.mockResolvedValue(acceptedSession());
      mockFindByJobId.mockResolvedValue({ id: 'assign-1', jobId: 'job-1' });
      mockDeleteById.mockResolvedValue(undefined);
      mockUpdateStatus.mockResolvedValue({});
      mockUpdateTechStatus.mockResolvedValue(undefined);

      await service.handleMessage(makeTextMessage('2'), 'Kumar', makeTechnician());

      expect(mockDeleteById).toHaveBeenCalledWith('assign-1');
      expect(mockUpdateStatus).toHaveBeenCalledWith('job-1', JobStatus.NEW);
      expect(mockUpdateTechStatus).toHaveBeenCalledWith('tech-1', TechnicianStatus.AVAILABLE);
      expect(mockAssignmentEngineService.triggerReassignment).toHaveBeenCalledWith('job-1', 'tech-1');
      expect(mockSaveSession).toHaveBeenCalledWith(
        expect.objectContaining({ state: TechnicianConversationState.IDLE }),
      );
    });

    it('declines on the word "decline" too', async () => {
      mockGetSession.mockResolvedValue(acceptedSession());
      mockFindByJobId.mockResolvedValue({ id: 'assign-1', jobId: 'job-1' });

      await service.handleMessage(makeTextMessage('decline'), 'Kumar', makeTechnician());

      expect(mockDeleteById).toHaveBeenCalledWith('assign-1');
    });

    it('sends unknown_command for non-START text', async () => {
      mockGetSession.mockResolvedValue(acceptedSession());

      await service.handleMessage(makeTextMessage('RANDOM'), 'Kumar', makeTechnician());

      expect(mockUpdateStatus).not.toHaveBeenCalled();
      expect(mockSendText).toHaveBeenCalled();
    });
  });

  // ─── JOB_IN_PROGRESS state ────────────────────────────────────────────────

  describe('JOB_IN_PROGRESS state', () => {
    const inProgressSession = () =>
      makeSession({
        state: TechnicianConversationState.JOB_IN_PROGRESS,
        activeJobId: 'job-1',
        activeJobNumber: 'JOB-20260614-0001',
        customerPhone: '919876543210',
      });

    it('uploads photo and appends URL to job description', async () => {
      mockGetSession.mockResolvedValue(inProgressSession());
      mockDownloadMedia.mockResolvedValue(Buffer.from('fake-image-data'));
      mockUploadFile.mockResolvedValue('job-photos/job-1/12345.jpeg');
      mockAppendPhotoUrl.mockResolvedValue(undefined);

      await service.handleMessage(makeImageMessage(), 'Kumar', makeTechnician());

      expect(mockDownloadMedia).toHaveBeenCalledWith('media-1');
      expect(mockUploadFile).toHaveBeenCalledWith(
        expect.stringContaining('job-photos/job-1/'),
        expect.any(Buffer),
        'image/jpeg',
      );
      expect(mockAppendPhotoUrl).toHaveBeenCalledWith('job-1', 'job-photos/job-1/12345.jpeg');
      expect(mockSendText).toHaveBeenCalledWith(
        expect.objectContaining({ to: '919100000000' }),
      );
    });

    it('sends unknown_command when photo upload fails', async () => {
      mockGetSession.mockResolvedValue(inProgressSession());
      mockDownloadMedia.mockRejectedValue(new Error('Network error'));

      await service.handleMessage(makeImageMessage(), 'Kumar', makeTechnician());

      expect(mockSendText).toHaveBeenCalledWith(
        expect.objectContaining({ to: '919100000000' }),
      );
    });

    it('executes COMPLETE command and notifies both parties', async () => {
      mockGetSession.mockResolvedValue(inProgressSession());
      const completedJob = { id: 'job-1', jobNumber: 'JOB-20260614-0001', status: JobStatus.COMPLETED };
      mockSetCompletion.mockResolvedValue(completedJob);
      mockFindWithDetails.mockResolvedValue(makeJobWithDetails({ status: JobStatus.COMPLETED }));
      mockGetCustomerSession.mockResolvedValue(null);
      mockCreateCustomerSession.mockReturnValue({
        state: 'IDLE', phone: '919876543210', language: Language.EN, updatedAt: new Date().toISOString(),
      });

      await service.handleMessage(makeTextMessage('COMPLETE 500 CASH'), 'Kumar', makeTechnician());

      expect(mockSetCompletion).toHaveBeenCalledWith('job-1', 500, PaymentMode.CASH);
      // one text to technician (job_completed), one interactive buttons to customer (confirm_amount)
      expect(mockSendText).toHaveBeenCalledTimes(1);
      expect(mockSendInteractiveButtons).toHaveBeenCalledWith(
        expect.objectContaining({ to: '919876543210' }),
      );
      expect(mockSaveSession).toHaveBeenCalledWith(
        expect.objectContaining({ state: TechnicianConversationState.AWAITING_COMPLETION }),
      );
    });

    it('executes COMPLETE with decimal amount', async () => {
      mockGetSession.mockResolvedValue(inProgressSession());
      mockSetCompletion.mockResolvedValue({ id: 'job-1' });
      mockFindWithDetails.mockResolvedValue(makeJobWithDetails());
      mockGetCustomerSession.mockResolvedValue(null);
      mockCreateCustomerSession.mockReturnValue({
        state: 'IDLE', phone: '919876543210', language: Language.EN, updatedAt: new Date().toISOString(),
      });

      await service.handleMessage(makeTextMessage('COMPLETE 750.50 UPI'), 'Kumar', makeTechnician());

      expect(mockSetCompletion).toHaveBeenCalledWith('job-1', 750.5, PaymentMode.UPI);
    });

    it('sends unknown_command for text that is not COMPLETE and not image', async () => {
      mockGetSession.mockResolvedValue(inProgressSession());

      await service.handleMessage(makeTextMessage('DONE'), 'Kumar', makeTechnician());

      expect(mockSetCompletion).not.toHaveBeenCalled();
      expect(mockSendText).toHaveBeenCalled();
    });

    it('"1" reply asks for the amount and records CASH as the pending mode', async () => {
      mockGetSession.mockResolvedValue(inProgressSession());

      await service.handleMessage(makeTextMessage('1'), 'Kumar', makeTechnician());

      expect(mockSetCompletion).not.toHaveBeenCalled();
      expect(mockSaveSession).toHaveBeenCalledWith(
        expect.objectContaining({
          state: TechnicianConversationState.AWAITING_PAYMENT_AMOUNT,
          pendingPaymentMode: 'CASH',
        }),
      );
    });

    it('"2" reply asks for the amount and records UPI as the pending mode', async () => {
      mockGetSession.mockResolvedValue(inProgressSession());

      await service.handleMessage(makeTextMessage('2'), 'Kumar', makeTechnician());

      expect(mockSaveSession).toHaveBeenCalledWith(
        expect.objectContaining({
          state: TechnicianConversationState.AWAITING_PAYMENT_AMOUNT,
          pendingPaymentMode: 'UPI',
        }),
      );
    });
  });

  // ─── AWAITING_PAYMENT_AMOUNT state ────────────────────────────────────────

  describe('AWAITING_PAYMENT_AMOUNT state', () => {
    const awaitingAmountSession = (pendingPaymentMode: 'CASH' | 'UPI' = 'CASH') =>
      makeSession({
        state: TechnicianConversationState.AWAITING_PAYMENT_AMOUNT,
        activeJobId: 'job-1',
        activeJobNumber: 'JOB-20260614-0001',
        customerPhone: '919876543210',
        pendingPaymentMode,
      });

    it('completes the job with the pending mode once a valid amount is entered', async () => {
      mockGetSession.mockResolvedValue(awaitingAmountSession('UPI'));
      mockSetCompletion.mockResolvedValue({ id: 'job-1' });
      mockFindWithDetails.mockResolvedValue(makeJobWithDetails());
      mockGetCustomerSession.mockResolvedValue(null);
      mockCreateCustomerSession.mockReturnValue({
        state: 'IDLE', phone: '919876543210', language: Language.EN, updatedAt: new Date().toISOString(),
      });

      await service.handleMessage(makeTextMessage('1500'), 'Kumar', makeTechnician());

      expect(mockSetCompletion).toHaveBeenCalledWith('job-1', 1500, PaymentMode.UPI);
      expect(mockSaveSession).toHaveBeenCalledWith(
        expect.objectContaining({ state: TechnicianConversationState.AWAITING_COMPLETION }),
      );
    });

    it('accepts a decimal amount', async () => {
      mockGetSession.mockResolvedValue(awaitingAmountSession('CASH'));
      mockSetCompletion.mockResolvedValue({ id: 'job-1' });
      mockFindWithDetails.mockResolvedValue(makeJobWithDetails());
      mockGetCustomerSession.mockResolvedValue(null);
      mockCreateCustomerSession.mockReturnValue({
        state: 'IDLE', phone: '919876543210', language: Language.EN, updatedAt: new Date().toISOString(),
      });

      await service.handleMessage(makeTextMessage('750.50'), 'Kumar', makeTechnician());

      expect(mockSetCompletion).toHaveBeenCalledWith('job-1', 750.5, PaymentMode.CASH);
    });

    it('re-prompts without completing when the reply is not a valid number', async () => {
      mockGetSession.mockResolvedValue(awaitingAmountSession('CASH'));

      await service.handleMessage(makeTextMessage('not a number'), 'Kumar', makeTechnician());

      expect(mockSetCompletion).not.toHaveBeenCalled();
      expect(mockSendText).toHaveBeenCalledWith(
        expect.objectContaining({ to: '919100000000' }),
      );
    });

    it('re-prompts on a non-positive amount', async () => {
      mockGetSession.mockResolvedValue(awaitingAmountSession('CASH'));

      await service.handleMessage(makeTextMessage('0'), 'Kumar', makeTechnician());

      expect(mockSetCompletion).not.toHaveBeenCalled();
    });
  });

  // ─── AWAITING_COMPLETION state ────────────────────────────────────────────

  describe('AWAITING_COMPLETION state', () => {
    it('sends status_awaiting_confirmation for any message', async () => {
      mockGetSession.mockResolvedValue(
        makeSession({
          state: TechnicianConversationState.AWAITING_COMPLETION,
          activeJobId: 'job-1',
          activeJobNumber: 'JOB-20260614-0001',
        }),
      );

      await service.handleMessage(makeTextMessage('Hello'), 'Kumar', makeTechnician());

      expect(mockSendText).toHaveBeenCalledWith(
        expect.objectContaining({ to: '919100000000' }),
      );
    });
  });

  // ─── sendJobOffer ─────────────────────────────────────────────────────────

  describe('sendJobOffer()', () => {
    it('sends an interactive job offer with accept/reject buttons', async () => {
      const technician = makeTechnician();
      const job = {
        id: 'job-1',
        jobNumber: 'JOB-20260614-0001',
        location: 'Virudhunagar',
        description: 'Requested time: Today 4 PM',
        serviceCategory: { name: 'Electrical' },
      } as any;
      const customer = {
        id: 'cust-1',
        phone: '919876543210',
        name: 'Rajesh',
        language: Language.EN,
      } as any;

      mockGetSession.mockResolvedValue(null);
      mockCreateNewSession.mockReturnValue(makeSession());

      await service.sendJobOffer(technician, job, customer);

      expect(mockSendInteractiveButtons).toHaveBeenCalledWith(
        expect.objectContaining({
          to: '919100000000',
          buttons: expect.arrayContaining([
            expect.objectContaining({ id: 'accept_job' }),
            expect.objectContaining({ id: 'reject_job' }),
          ]),
        }),
      );
      expect(mockSaveSession).toHaveBeenCalledWith(
        expect.objectContaining({ state: TechnicianConversationState.JOB_OFFER_PENDING }),
      );
    });

    it('reuses existing technician session when one exists', async () => {
      const existingSession = makeSession({ state: TechnicianConversationState.IDLE });
      mockGetSession.mockResolvedValue(existingSession);

      const job = {
        id: 'job-2', jobNumber: 'JOB-20260614-0002', location: 'Aruppukkottai',
        description: 'Requested time: ASAP', serviceCategory: { name: 'Plumbing' },
      } as any;
      const customer = { id: 'cust-2', phone: '919111111111', name: 'Muthu', language: Language.TA } as any;

      await service.sendJobOffer(makeTechnician(), job, customer);

      expect(mockCreateNewSession).not.toHaveBeenCalled();
      expect(mockSendInteractiveButtons).toHaveBeenCalled();
    });
  });

  // ─── markAsRead ───────────────────────────────────────────────────────────

  describe('markAsRead()', () => {
    it('calls markAsRead for every inbound message', async () => {
      mockGetSession.mockResolvedValue(makeSession());

      await service.handleMessage(makeTextMessage('HELP'), 'Kumar', makeTechnician());

      expect(mockMarkAsRead).toHaveBeenCalledWith('msg-001');
    });

    it('continues processing even when markAsRead throws', async () => {
      mockGetSession.mockResolvedValue(makeSession());
      mockMarkAsRead.mockRejectedValue(new Error('Network error'));

      await expect(
        service.handleMessage(makeTextMessage('HELP'), 'Kumar', makeTechnician()),
      ).resolves.not.toThrow();
    });
  });
});
