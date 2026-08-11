import { TechniciansAdminController } from './technicians.controller';
import { Language } from '../../domain/enums';

const mockFindMany = jest.fn();
const mockCount = jest.fn();
const mockFindUniqueOrThrow = jest.fn();
const mockFindUnique = jest.fn();
const mockCategoryFindUnique = jest.fn();
const mockSkillCreateMany = jest.fn();
const mockSkillUpsert = jest.fn();
const mockSkillDelete = jest.fn();
const mockJobCommissionAggregate = jest.fn().mockResolvedValue({
  _sum: { technicianAmount: null, commissionAmount: null },
  _count: 0,
});

const mockPrisma = {
  technician: {
    findMany: mockFindMany,
    count: mockCount,
    findUniqueOrThrow: mockFindUniqueOrThrow,
    findUnique: mockFindUnique,
  },
  serviceCategory: {
    findUnique: mockCategoryFindUnique,
  },
  technicianSkill: {
    createMany: mockSkillCreateMany,
    upsert: mockSkillUpsert,
    delete: mockSkillDelete,
  },
  jobCommission: {
    aggregate: mockJobCommissionAggregate,
  },
} as any;

const mockCreate = jest.fn();
const mockUpdate = jest.fn();
const mockTechniciansRepo = { create: mockCreate, update: mockUpdate } as any;

const mockSendTemplate = jest.fn();
const mockSendText = jest.fn();
const mockWhatsApp = { sendTemplate: mockSendTemplate, sendText: mockSendText } as any;

const mockConfigGet = jest.fn((key: string) => {
  if (key === 'whatsapp.templates.technicianWelcome') return 'technician_welcome';
  if (key === 'whatsapp.templates.technicianWelcomeHeaderImage') return 'https://sevagan.co.in/index_files/logo-new.png';
  return undefined;
});
const mockConfigService = { get: mockConfigGet } as any;

const mockAuditLog = jest.fn().mockResolvedValue(undefined);
const mockAuditService = { log: mockAuditLog } as any;
const mockUser = { id: 'admin-1', email: 'admin@sevagan.in', role: 'ADMIN', name: 'Admin' };

describe('TechniciansAdminController', () => {
  let controller: TechniciansAdminController;

  beforeEach(() => {
    controller = new TechniciansAdminController(mockPrisma, mockTechniciansRepo, mockWhatsApp, mockConfigService, mockAuditService);
    jest.clearAllMocks();
    mockConfigGet.mockImplementation((key: string) => {
      if (key === 'whatsapp.templates.technicianWelcome') return 'technician_welcome';
      if (key === 'whatsapp.templates.technicianWelcomeHeaderImage') return 'https://sevagan.co.in/index_files/logo-new.png';
      return undefined;
    });
    mockSendTemplate.mockResolvedValue(undefined);
    mockSendText.mockResolvedValue(undefined);
  });

  describe('list()', () => {
    it('applies default pagination and active-only filter', async () => {
      mockFindMany.mockResolvedValue([]);
      mockCount.mockResolvedValue(0);

      const result = await controller.list();

      expect(result).toEqual({ data: [], total: 0, page: 1, limit: 20 });
      expect(mockFindMany).toHaveBeenCalledWith(expect.objectContaining({ where: { active: true } }));
    });

    it('filters by status when provided', async () => {
      mockFindMany.mockResolvedValue([]);
      mockCount.mockResolvedValue(0);

      await controller.list('1', '20', 'AVAILABLE');

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { active: true, status: 'AVAILABLE' } }),
      );
    });

    it('surfaces deactivated technicians when active=false', async () => {
      mockFindMany.mockResolvedValue([]);
      mockCount.mockResolvedValue(0);

      await controller.list('1', '20', undefined, 'false');

      expect(mockFindMany).toHaveBeenCalledWith(expect.objectContaining({ where: { active: false } }));
    });

    it('omits the active filter entirely when active=all', async () => {
      mockFindMany.mockResolvedValue([]);
      mockCount.mockResolvedValue(0);

      await controller.list('1', '20', undefined, 'all');

      expect(mockFindMany).toHaveBeenCalledWith(expect.objectContaining({ where: {} }));
    });
  });

  describe('create()', () => {
    it('creates a technician, assigns skills, and sends a WhatsApp onboarding message', async () => {
      mockCreate.mockResolvedValue({ id: 'tech-1' });
      mockSkillCreateMany.mockResolvedValue({ count: 1 });
      mockFindUnique.mockResolvedValue({ id: 'tech-1', skills: [] });

      const result = await controller.create(
        {
          name: 'Kumar',
          phone: '919876543210',
          address: 'Virudhunagar',
          serviceArea: 'Virudhunagar',
          language: Language.EN,
          categoryIds: ['cat-1'],
        },
        mockUser,
      );

      expect(mockCreate).toHaveBeenCalledWith({
        name: 'Kumar',
        phone: '919876543210',
        address: 'Virudhunagar',
        aadharNumber: undefined,
        serviceArea: 'Virudhunagar',
        language: Language.EN,
      });
      expect(mockSkillCreateMany).toHaveBeenCalledWith({
        data: [{ technicianId: 'tech-1', categoryId: 'cat-1' }],
        skipDuplicates: true,
      });
      expect(mockCategoryFindUnique).not.toHaveBeenCalled();
      expect(mockSendTemplate).toHaveBeenCalledWith({
        to: '919876543210',
        templateName: 'technician_welcome',
        languageCode: 'en',
        headerImageUrl: 'https://sevagan.co.in/index_files/logo-new.png',
      });
      expect(result).toEqual({ id: 'tech-1', skills: [], welcomeMessageSent: true });
      expect(mockAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          actorId: 'admin-1',
          action: 'CREATE_TECHNICIAN',
          entityId: 'tech-1',
          metadata: expect.objectContaining({ welcomeMessageSent: true }),
        }),
      );
    });

    it('defaults language to EN and skips skill assignment when no categories given', async () => {
      mockCreate.mockResolvedValue({ id: 'tech-1' });
      mockFindUnique.mockResolvedValue({ id: 'tech-1', skills: [] });

      await controller.create({ name: 'Kumar', phone: '919876543210', address: 'Virudhunagar', serviceArea: 'Virudhunagar' }, mockUser);

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({ language: Language.EN }),
      );
      expect(mockSkillCreateMany).not.toHaveBeenCalled();
      expect(mockCategoryFindUnique).not.toHaveBeenCalled();
    });

    it('still creates the technician but reports the failure when the WhatsApp welcome template fails', async () => {
      mockCreate.mockResolvedValue({ id: 'tech-1' });
      mockFindUnique.mockResolvedValue({ id: 'tech-1', skills: [] });
      mockSendTemplate.mockRejectedValue(new Error('WhatsApp API down'));

      const result = await controller.create({ name: 'Kumar', phone: '919876543210', address: 'Virudhunagar', serviceArea: 'Virudhunagar' }, mockUser);

      expect(result).toEqual({ id: 'tech-1', skills: [], welcomeMessageSent: false });
      expect(mockAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({ metadata: expect.objectContaining({ welcomeMessageSent: false }) }),
      );
    });
  });

  describe('findOne()', () => {
    it('returns a technician with skills, recent assignments, and job stats', async () => {
      const technician = { id: 'tech-1', createdAt: new Date('2026-01-01') };
      mockFindUniqueOrThrow.mockResolvedValue(technician);
      mockJobCommissionAggregate.mockResolvedValueOnce({
        _sum: { technicianAmount: 4500, commissionAmount: 500 },
        _count: 6,
      });

      const result = await controller.findOne('tech-1');

      expect(mockJobCommissionAggregate).toHaveBeenCalledWith({
        where: { job: { assignment: { technicianId: 'tech-1' } } },
        _sum: { technicianAmount: true, commissionAmount: true },
        _count: true,
      });
      expect(result).toEqual({
        ...technician,
        totalJobs: 6,
        totalEarnings: 4500,
        totalCommission: 500,
      });
    });

    it('defaults earnings/commission to 0 when the technician has no completed jobs', async () => {
      mockFindUniqueOrThrow.mockResolvedValue({ id: 'tech-1' });

      const result = await controller.findOne('tech-1');

      expect(result).toEqual(
        expect.objectContaining({ totalJobs: 0, totalEarnings: 0, totalCommission: 0 }),
      );
    });
  });

  describe('update()', () => {
    it('delegates to the repository update method', async () => {
      const updated = { id: 'tech-1', name: 'New Name' };
      mockUpdate.mockResolvedValue(updated);

      const result = await controller.update('tech-1', { name: 'New Name' }, mockUser);

      expect(result).toBe(updated);
      expect(mockUpdate).toHaveBeenCalledWith('tech-1', { name: 'New Name' });
      expect(mockAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({ actorId: 'admin-1', action: 'UPDATE_TECHNICIAN', entityId: 'tech-1' }),
      );
    });
  });

  describe('sendMessage()', () => {
    it('sends a free-form WhatsApp message to the technician and audits it', async () => {
      mockFindUniqueOrThrow.mockResolvedValue({ id: 'tech-1', phone: '919876543210' });

      const result = await controller.sendMessage('tech-1', { message: 'Please call the office.' }, mockUser);

      expect(mockSendText).toHaveBeenCalledWith({ to: '919876543210', text: 'Please call the office.' });
      expect(result).toEqual({ sent: true, error: undefined });
      expect(mockAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          actorId: 'admin-1',
          action: 'SEND_TECHNICIAN_MESSAGE',
          entityId: 'tech-1',
          metadata: { message: 'Please call the office.', sent: true },
        }),
      );
    });

    it('reports failure instead of throwing when the message cannot be delivered', async () => {
      mockFindUniqueOrThrow.mockResolvedValue({ id: 'tech-1', phone: '919876543210' });
      mockSendText.mockRejectedValue(new Error('(#131047) Re-engagement message'));

      const result = await controller.sendMessage('tech-1', { message: 'Hello' }, mockUser);

      expect(result).toEqual({ sent: false, error: '(#131047) Re-engagement message' });
      expect(mockAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({ metadata: { message: 'Hello', sent: false } }),
      );
    });
  });

  describe('addSkill()', () => {
    it('upserts a technician skill', async () => {
      const skill = { technicianId: 'tech-1', categoryId: 'cat-1' };
      mockSkillUpsert.mockResolvedValue(skill);

      const result = await controller.addSkill('tech-1', { categoryId: 'cat-1' });

      expect(result).toBe(skill);
      expect(mockSkillUpsert).toHaveBeenCalledWith({
        where: { technicianId_categoryId: { technicianId: 'tech-1', categoryId: 'cat-1' } },
        create: { technicianId: 'tech-1', categoryId: 'cat-1' },
        update: {},
      });
    });
  });

  describe('removeSkill()', () => {
    it('deletes the technician skill and returns a confirmation', async () => {
      mockSkillDelete.mockResolvedValue({});

      const result = await controller.removeSkill('tech-1', 'cat-1');

      expect(result).toEqual({ deleted: true });
      expect(mockSkillDelete).toHaveBeenCalledWith({
        where: { technicianId_categoryId: { technicianId: 'tech-1', categoryId: 'cat-1' } },
      });
    });
  });
});
