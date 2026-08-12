import { JobsAdminController } from './jobs.controller';
import { JobStatus, PaymentMode } from '../../domain/enums';

const mockFindMany = jest.fn();
const mockCount = jest.fn();
const mockFindUniqueOrThrow = jest.fn();
const mockUpdate = jest.fn();
const mockTechnicianUpdate = jest.fn();
const mockAssignmentFindUnique = jest.fn();
const mockAssignmentDelete = jest.fn();

const mockPrisma = {
  job: {
    findMany: mockFindMany,
    count: mockCount,
    findUniqueOrThrow: mockFindUniqueOrThrow,
    update: mockUpdate,
  },
  technician: {
    update: mockTechnicianUpdate,
  },
  assignment: {
    findUnique: mockAssignmentFindUnique,
    delete: mockAssignmentDelete,
  },
} as any;

const mockManualAssign = jest.fn();
const mockAssignmentEngine = { manualAssign: mockManualAssign } as any;

const mockAuditLog = jest.fn().mockResolvedValue(undefined);
const mockAuditService = { log: mockAuditLog } as any;
const mockUser = { id: 'admin-1', email: 'admin@sevagan.in', role: 'ADMIN', name: 'Admin' };

const mockListForJob = jest.fn();
const mockMessageTrailService = { listForJob: mockListForJob } as any;

const mockRecordCommission = jest.fn().mockResolvedValue({});
const mockCommissionService = { recordCommission: mockRecordCommission } as any;

const mockGenerateInvoice = jest.fn().mockResolvedValue({ id: 'invoice-1' });
const mockInvoiceService = { generateInvoice: mockGenerateInvoice } as any;

const mockRecordCashPayment = jest.fn().mockResolvedValue({});
const mockRecordUpiPayment = jest.fn().mockResolvedValue({ paymentLinkUrl: 'https://pay.example/link' });
const mockPaymentService = { recordCashPayment: mockRecordCashPayment, recordUpiPayment: mockRecordUpiPayment } as any;

const mockTranslate = jest.fn().mockReturnValue('translated message');
const mockTranslationService = { translate: mockTranslate } as any;

const mockSendText = jest.fn().mockResolvedValue(undefined);
const mockWhatsapp = { sendText: mockSendText } as any;

describe('JobsAdminController', () => {
  let controller: JobsAdminController;

  beforeEach(() => {
    controller = new JobsAdminController(
      mockPrisma,
      mockAssignmentEngine,
      mockAuditService,
      mockMessageTrailService,
      mockCommissionService,
      mockInvoiceService,
      mockPaymentService,
      mockTranslationService,
      mockWhatsapp,
    );
    jest.clearAllMocks();
    mockRecordCommission.mockResolvedValue({});
    mockGenerateInvoice.mockResolvedValue({ id: 'invoice-1' });
    mockRecordCashPayment.mockResolvedValue({});
    mockRecordUpiPayment.mockResolvedValue({ paymentLinkUrl: 'https://pay.example/link' });
    mockTranslate.mockReturnValue('translated message');
    mockSendText.mockResolvedValue(undefined);
  });

  describe('list()', () => {
    it('applies default pagination with no filters', async () => {
      mockFindMany.mockResolvedValue([]);
      mockCount.mockResolvedValue(0);

      const result = await controller.list();

      expect(result).toEqual({ data: [], total: 0, page: 1, limit: 20 });
      expect(mockFindMany).toHaveBeenCalledWith(expect.objectContaining({ skip: 0, take: 20, where: {} }));
    });

    it('filters by status and date range', async () => {
      mockFindMany.mockResolvedValue([{ id: 'job-1' }]);
      mockCount.mockResolvedValue(1);

      await controller.list('1', '20', 'COMPLETED', '2026-06-01', '2026-06-30');

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            status: 'COMPLETED',
            createdAt: { gte: new Date('2026-06-01'), lte: new Date('2026-06-30') },
          },
        }),
      );
    });
  });

  describe('findOne()', () => {
    it('returns a job with full details', async () => {
      const job = { id: 'job-1' };
      mockFindUniqueOrThrow.mockResolvedValue(job);

      const result = await controller.findOne('job-1');

      expect(result).toBe(job);
    });
  });

  describe('messageTrail()', () => {
    it('returns the trail for an existing job', async () => {
      mockFindUniqueOrThrow.mockResolvedValue({ id: 'job-1' });
      const trail = [{ id: 'msg-1', jobId: 'job-1', direction: 'OUTBOUND' }];
      mockListForJob.mockResolvedValue(trail);

      const result = await controller.messageTrail('job-1');

      expect(mockFindUniqueOrThrow).toHaveBeenCalledWith({ where: { id: 'job-1' } });
      expect(mockListForJob).toHaveBeenCalledWith('job-1');
      expect(result).toBe(trail);
    });

    it('propagates the not-found error for a missing job without listing the trail', async () => {
      mockFindUniqueOrThrow.mockRejectedValue(new Error('not found'));

      await expect(controller.messageTrail('missing')).rejects.toThrow('not found');
      expect(mockListForJob).not.toHaveBeenCalled();
    });
  });

  describe('manualAssign()', () => {
    it('removes an existing assignment, frees the previous technician, and assigns the requested one', async () => {
      mockFindUniqueOrThrow.mockResolvedValue({ id: 'job-1' });
      mockAssignmentFindUnique.mockResolvedValue({ id: 'assign-1', technicianId: 'old-tech' });
      mockAssignmentDelete.mockResolvedValue({});
      mockTechnicianUpdate.mockResolvedValue({});
      mockManualAssign.mockResolvedValue(undefined);

      const result = await controller.manualAssign('job-1', { technicianId: 'tech-1' }, mockUser);

      expect(mockAssignmentDelete).toHaveBeenCalledWith({ where: { jobId: 'job-1' } });
      expect(mockTechnicianUpdate).toHaveBeenCalledWith({
        where: { id: 'old-tech' },
        data: { status: 'AVAILABLE' },
      });
      expect(mockManualAssign).toHaveBeenCalledWith('job-1', 'tech-1');
      expect(result).toEqual({ message: 'Job assigned' });
      expect(mockAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({ actorId: 'admin-1', action: 'MANUAL_ASSIGN_JOB', entityId: 'job-1' }),
      );
    });

    it('skips assignment deletion and technician-freeing when no existing assignment is found', async () => {
      mockFindUniqueOrThrow.mockResolvedValue({ id: 'job-1' });
      mockAssignmentFindUnique.mockResolvedValue(null);
      mockManualAssign.mockResolvedValue(undefined);

      await controller.manualAssign('job-1', { technicianId: 'tech-1' }, mockUser);

      expect(mockAssignmentDelete).not.toHaveBeenCalled();
      expect(mockTechnicianUpdate).not.toHaveBeenCalled();
      expect(mockManualAssign).toHaveBeenCalledWith('job-1', 'tech-1');
    });
  });

  describe('cancel()', () => {
    it('marks the job CANCELLED', async () => {
      const cancelled = { id: 'job-1', status: 'CANCELLED' };
      mockUpdate.mockResolvedValue(cancelled);

      const result = await controller.cancel('job-1', mockUser);

      expect(result).toBe(cancelled);
      expect(mockUpdate).toHaveBeenCalledWith({ where: { id: 'job-1' }, data: { status: JobStatus.CANCELLED } });
      expect(mockAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({ actorId: 'admin-1', action: 'CANCEL_JOB', entityId: 'job-1' }),
      );
    });
  });

  describe('complete()', () => {
    const jobWithAssignment = {
      id: 'job-1',
      jobNumber: 'JOB-20260812-0001',
      status: JobStatus.IN_PROGRESS,
      customer: { name: 'Rajesh', phone: '919876543210', language: 'EN' },
      assignment: { technician: { id: 'tech-1', phone: '919876500011', language: 'EN' } },
    };

    it('completes an in-progress job, records commission and cash payment, and frees the technician', async () => {
      mockFindUniqueOrThrow.mockResolvedValue(jobWithAssignment);
      const completed = { ...jobWithAssignment, status: JobStatus.COMPLETED, jobAmount: 500 };
      mockUpdate.mockResolvedValue(completed);

      const result = await controller.complete('job-1', { amount: 500, paymentMode: PaymentMode.CASH }, mockUser);

      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: 'job-1' },
        data: { jobAmount: 500, paymentMode: PaymentMode.CASH, status: JobStatus.COMPLETED },
      });
      expect(mockTechnicianUpdate).toHaveBeenCalledWith({
        where: { id: 'tech-1' },
        data: { status: 'AVAILABLE' },
      });
      expect(mockRecordCommission).toHaveBeenCalledWith('job-1');
      expect(mockGenerateInvoice).toHaveBeenCalledWith('job-1');
      expect(mockRecordCashPayment).toHaveBeenCalledWith('invoice-1', 500);
      expect(mockRecordUpiPayment).not.toHaveBeenCalled();
      expect(mockSendText).toHaveBeenCalledTimes(2);
      expect(result).toBe(completed);
      expect(mockAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          actorId: 'admin-1',
          action: 'COMPLETE_JOB',
          entityId: 'job-1',
          metadata: { amount: 500, paymentMode: PaymentMode.CASH },
        }),
      );
    });

    it('records a UPI payment instead of cash when paymentMode is UPI', async () => {
      mockFindUniqueOrThrow.mockResolvedValue(jobWithAssignment);
      mockUpdate.mockResolvedValue({ ...jobWithAssignment, status: JobStatus.COMPLETED });

      await controller.complete('job-1', { amount: 750, paymentMode: PaymentMode.UPI }, mockUser);

      expect(mockRecordUpiPayment).toHaveBeenCalledWith('invoice-1', 750, 'JOB-20260812-0001', 'Rajesh', '919876543210');
      expect(mockRecordCashPayment).not.toHaveBeenCalled();
    });

    it('rejects completion for a job that is not in a completable status', async () => {
      mockFindUniqueOrThrow.mockResolvedValue({ ...jobWithAssignment, status: JobStatus.COMPLETED });

      await expect(
        controller.complete('job-1', { amount: 500, paymentMode: PaymentMode.CASH }, mockUser),
      ).rejects.toThrow('Cannot complete a job with status COMPLETED.');

      expect(mockUpdate).not.toHaveBeenCalled();
      expect(mockRecordCommission).not.toHaveBeenCalled();
    });

    it('skips freeing a technician and the technician notification when the job has no assignment', async () => {
      const unassignedJob = { ...jobWithAssignment, assignment: null };
      mockFindUniqueOrThrow.mockResolvedValue(unassignedJob);
      mockUpdate.mockResolvedValue({ ...unassignedJob, status: JobStatus.COMPLETED });

      await controller.complete('job-1', { amount: 500, paymentMode: PaymentMode.CASH }, mockUser);

      expect(mockTechnicianUpdate).not.toHaveBeenCalled();
      expect(mockSendText).toHaveBeenCalledTimes(1);
    });

    it('still completes the job when commission recording fails', async () => {
      mockFindUniqueOrThrow.mockResolvedValue(jobWithAssignment);
      const completed = { ...jobWithAssignment, status: JobStatus.COMPLETED };
      mockUpdate.mockResolvedValue(completed);
      mockRecordCommission.mockRejectedValue(new Error('commission rule missing'));

      const result = await controller.complete('job-1', { amount: 500, paymentMode: PaymentMode.CASH }, mockUser);

      expect(result).toBe(completed);
      expect(mockAuditLog).toHaveBeenCalled();
    });
  });
});
