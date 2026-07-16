import { Test, TestingModule } from '@nestjs/testing';
import { AssignmentEngineService } from './assignment-engine.service';
import { WHATSAPP_PROVIDER } from '../../infrastructure/messaging/whatsapp.provider.interface';
import { TranslationService } from '../../infrastructure/i18n/translation.service';
import { RedisService } from '../../infrastructure/cache/redis.service';
import { AssignmentsRepository } from '../assignments/assignments.repository';
import { JobsService } from '../jobs/jobs.service';
import { TechniciansRepository } from '../technicians/technicians.repository';
import { CustomersRepository } from '../customers/customers.repository';
import { TechnicianSessionService } from '../whatsapp/technician-bot/technician-session.service';
import { JobStatus, TechnicianStatus, Language } from '../../domain/enums';
import { TechnicianConversationState } from '../whatsapp/technician-bot/technician-session.types';

const mockJob = {
  id: 'job-1',
  jobNumber: 'JOB-20260615-0001',
  serviceCategoryId: 'cat-1',
  location: 'Main Street, Allampatti',
  description: 'Requested time: Tomorrow 10 AM',
  serviceCategory: { id: 'cat-1', name: 'AC Service' },
  customer: { id: 'cust-1', phone: '919876543210', name: 'Ravi', language: Language.EN },
  assignment: null,
};

const mockTechnician = {
  id: 'tech-1',
  name: 'Kumar',
  phone: '919876543211',
  language: Language.EN,
  status: TechnicianStatus.AVAILABLE,
  trustScore: 95,
  rating: 4.8,
};

describe('AssignmentEngineService', () => {
  let service: AssignmentEngineService;
  let mockWhatsapp: any;
  let mockTranslation: any;
  let mockRedis: any;
  let mockAssignmentsRepo: any;
  let mockJobsService: any;
  let mockTechniciansRepo: any;
  let mockCustomersRepo: any;
  let mockTechSessionService: any;

  beforeEach(async () => {
    mockWhatsapp = {
      sendText: jest.fn().mockResolvedValue(undefined),
      sendInteractiveButtons: jest.fn().mockResolvedValue(undefined),
    };
    mockTranslation = { translate: jest.fn((key: string) => key) };
    mockRedis = {
      getJson: jest.fn().mockResolvedValue(null),
      setJson: jest.fn().mockResolvedValue(undefined),
    };
    mockAssignmentsRepo = { create: jest.fn().mockResolvedValue({ id: 'asgn-1' }) };
    mockJobsService = {
      findWithDetails: jest.fn().mockResolvedValue(mockJob),
      updateStatus: jest.fn().mockResolvedValue(undefined),
    };
    mockTechniciansRepo = {
      findBestAvailable: jest.fn().mockResolvedValue(mockTechnician),
      findById: jest.fn().mockResolvedValue(mockTechnician),
      updateStatus: jest.fn().mockResolvedValue(undefined),
    };
    mockCustomersRepo = {
      findByPhone: jest.fn().mockResolvedValue(mockJob.customer),
    };
    mockTechSessionService = {
      getSession: jest.fn().mockResolvedValue(null),
      createNewSession: jest.fn().mockReturnValue({
        state: TechnicianConversationState.IDLE,
        phone: '919876543211',
        language: Language.EN,
        updatedAt: new Date().toISOString(),
      }),
      saveSession: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AssignmentEngineService,
        { provide: WHATSAPP_PROVIDER, useValue: mockWhatsapp },
        { provide: TranslationService, useValue: mockTranslation },
        { provide: RedisService, useValue: mockRedis },
        { provide: AssignmentsRepository, useValue: mockAssignmentsRepo },
        { provide: JobsService, useValue: mockJobsService },
        { provide: TechniciansRepository, useValue: mockTechniciansRepo },
        { provide: CustomersRepository, useValue: mockCustomersRepo },
        { provide: TechnicianSessionService, useValue: mockTechSessionService },
      ],
    }).compile();

    service = module.get<AssignmentEngineService>(AssignmentEngineService);
  });

  describe('tryAssignJob', () => {
    it('assigns job to best available technician', async () => {
      await service.tryAssignJob('job-1', '919876543210');

      expect(mockAssignmentsRepo.create).toHaveBeenCalledWith({
        jobId: 'job-1',
        technicianId: 'tech-1',
      });
      expect(mockJobsService.updateStatus).toHaveBeenCalledWith('job-1', JobStatus.ASSIGNED);
      expect(mockTechniciansRepo.updateStatus).toHaveBeenCalledWith('tech-1', TechnicianStatus.BUSY);
      expect(mockTechSessionService.saveSession).toHaveBeenCalled();
      expect(mockWhatsapp.sendInteractiveButtons).toHaveBeenCalledWith(
        expect.objectContaining({ to: '919876543211' }),
      );
    });

    it('sets tech session to JOB_OFFER_PENDING with correct fields', async () => {
      let savedSession: any;
      mockTechSessionService.saveSession.mockImplementation((s: any) => {
        savedSession = s;
        return Promise.resolve();
      });

      await service.tryAssignJob('job-1', '919876543210');

      expect(savedSession.state).toBe(TechnicianConversationState.JOB_OFFER_PENDING);
      expect(savedSession.activeJobId).toBe('job-1');
      expect(savedSession.activeJobNumber).toBe('JOB-20260615-0001');
      expect(savedSession.customerPhone).toBe('919876543210');
      expect(savedSession.offerExpiresAt).toBeDefined();
    });

    it('notifies customer when no technician is available', async () => {
      mockTechniciansRepo.findBestAvailable.mockResolvedValue(null);

      await service.tryAssignJob('job-1', '919876543210');

      expect(mockAssignmentsRepo.create).not.toHaveBeenCalled();
      expect(mockWhatsapp.sendText).toHaveBeenCalledWith(
        expect.objectContaining({ to: '919876543210' }),
      );
    });

    it('passes excluded technician IDs from Redis', async () => {
      mockRedis.getJson.mockResolvedValue(['tech-excluded']);

      await service.tryAssignJob('job-1', '919876543210');

      expect(mockTechniciansRepo.findBestAvailable).toHaveBeenCalledWith(
        'cat-1',
        'Main Street, Allampatti',
        ['tech-excluded'],
      );
    });

    it('returns early if job not found', async () => {
      mockJobsService.findWithDetails.mockResolvedValue(null);

      await service.tryAssignJob('job-1', '919876543210');

      expect(mockAssignmentsRepo.create).not.toHaveBeenCalled();
    });
  });

  describe('manualAssign', () => {
    it('assigns the job to the specified technician', async () => {
      await service.manualAssign('job-1', 'tech-1');

      expect(mockTechniciansRepo.findById).toHaveBeenCalledWith('tech-1');
      expect(mockAssignmentsRepo.create).toHaveBeenCalledWith({
        jobId: 'job-1',
        technicianId: 'tech-1',
      });
      expect(mockJobsService.updateStatus).toHaveBeenCalledWith('job-1', JobStatus.ASSIGNED);
      expect(mockTechniciansRepo.updateStatus).toHaveBeenCalledWith('tech-1', TechnicianStatus.BUSY);
      expect(mockWhatsapp.sendInteractiveButtons).toHaveBeenCalledWith(
        expect.objectContaining({ to: '919876543211' }),
      );
    });

    it('throws if the job is not found', async () => {
      mockJobsService.findWithDetails.mockResolvedValue(null);

      await expect(service.manualAssign('job-1', 'tech-1')).rejects.toThrow('job-1');
    });

    it('throws if the technician is not found', async () => {
      mockTechniciansRepo.findById.mockResolvedValue(null);

      await expect(service.manualAssign('job-1', 'tech-1')).rejects.toThrow('tech-1');
    });
  });

  describe('triggerReassignment', () => {
    it('triggers re-assignment when below max rejections', async () => {
      mockRedis.getJson.mockResolvedValue(['tech-other']);

      await service.triggerReassignment('job-1', 'tech-1');

      expect(mockRedis.setJson).toHaveBeenCalled();
      expect(mockAssignmentsRepo.create).toHaveBeenCalled();
    });

    it('notifies customer when max rejections reached', async () => {
      mockRedis.getJson.mockResolvedValue(['tech-a', 'tech-b']);

      await service.triggerReassignment('job-1', 'tech-c');

      expect(mockAssignmentsRepo.create).not.toHaveBeenCalled();
      expect(mockWhatsapp.sendText).toHaveBeenCalledWith(
        expect.objectContaining({ to: mockJob.customer.phone }),
      );
    });

    it('does not add duplicate technician ID to rejection list', async () => {
      mockRedis.getJson.mockResolvedValue(['tech-1']);

      await service.triggerReassignment('job-1', 'tech-1');

      const setCall = mockRedis.setJson.mock.calls[0];
      const savedList: string[] = setCall[1];
      expect(savedList.filter((id) => id === 'tech-1').length).toBe(1);
    });
  });
});
