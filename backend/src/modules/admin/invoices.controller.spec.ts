import { PATH_METADATA } from '@nestjs/common/constants';
import { InvoicesController } from './invoices.controller';

const mockFindAll = jest.fn();
const mockFindById = jest.fn();
const mockInvoiceRepository = { findAll: mockFindAll, findById: mockFindById } as any;

const mockGetInvoicePdfBuffer = jest.fn();
const mockInvoiceService = { getInvoicePdfBuffer: mockGetInvoicePdfBuffer } as any;

const mockFindByInvoiceId = jest.fn();
const mockPaymentRepository = { findByInvoiceId: mockFindByInvoiceId } as any;

const mockConfirmPayment = jest.fn();
const mockPaymentService = { confirmPayment: mockConfirmPayment } as any;

const mockUpdateStatus = jest.fn();

const mockAuditLog = jest.fn().mockResolvedValue(undefined);
const mockAuditService = { log: mockAuditLog } as any;
const mockUser = { id: 'admin-1', email: 'admin@sevagan.in', role: 'ADMIN', name: 'Admin' };

const makeResponse = (): any => ({
  status: jest.fn().mockReturnThis(),
  json: jest.fn().mockReturnThis(),
  set: jest.fn().mockReturnThis(),
  send: jest.fn().mockReturnThis(),
});

describe('InvoicesController', () => {
  let controller: InvoicesController;

  beforeEach(() => {
    controller = new InvoicesController(
      { ...mockInvoiceRepository, updateStatus: mockUpdateStatus },
      mockInvoiceService,
      mockPaymentRepository,
      mockPaymentService,
      mockAuditService,
    );
    jest.clearAllMocks();
  });

  it('mounts under the bare admin path, not a manually-duplicated api/v1 prefix', () => {
    // main.ts already applies setGlobalPrefix('api') + URI versioning ('v1'), so a
    // @Controller() path must never include 'api/v1' itself or routes double-prefix
    // to /api/v1/api/v1/... (regression: this controller previously did exactly that).
    expect(Reflect.getMetadata(PATH_METADATA, InvoicesController)).toBe('admin/invoices');
  });

  describe('list()', () => {
    it('passes filters and pagination through to the repository', async () => {
      mockFindAll.mockResolvedValue({ invoices: [], total: 0 });

      const result = await controller.list('PAID', '2', '10');

      expect(result).toEqual({ invoices: [], total: 0 });
      expect(mockFindAll).toHaveBeenCalledWith({ status: 'PAID', page: 2, limit: 10 });
    });

    it('defaults page and limit when not provided', async () => {
      mockFindAll.mockResolvedValue({ invoices: [], total: 0 });

      await controller.list();

      expect(mockFindAll).toHaveBeenCalledWith({ status: undefined, page: 1, limit: 20 });
    });
  });

  describe('detail()', () => {
    it('returns the invoice by id', async () => {
      const invoice = { id: 'inv-1' };
      mockFindById.mockResolvedValue(invoice);

      const result = await controller.detail('inv-1');

      expect(result).toBe(invoice);
    });
  });

  describe('downloadPdf()', () => {
    it('streams the PDF bytes directly when found', async () => {
      const buffer = Buffer.from('%PDF-fake');
      mockGetInvoicePdfBuffer.mockResolvedValue({ buffer, invoiceNumber: 'INV-1' });
      const res = makeResponse();

      await controller.downloadPdf('inv-1', res);

      expect(res.set).toHaveBeenCalledWith(
        expect.objectContaining({
          'Content-Type': 'application/pdf',
          'Content-Disposition': 'attachment; filename="INV-1.pdf"',
        }),
      );
      expect(res.send).toHaveBeenCalledWith(buffer);
    });

    it('returns 404 when no PDF exists', async () => {
      mockGetInvoicePdfBuffer.mockResolvedValue(null);
      const res = makeResponse();

      await controller.downloadPdf('inv-1', res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'Invoice PDF not found' });
    });
  });

  describe('confirmPayment()', () => {
    it('confirms the payment and marks the invoice PAID', async () => {
      mockFindByInvoiceId.mockResolvedValue({ id: 'pay-1' });
      const confirmed = { id: 'pay-1', status: 'COMPLETED' };
      mockConfirmPayment.mockResolvedValue(confirmed);

      const result = await controller.confirmPayment('inv-1', mockUser);

      expect(result).toBe(confirmed);
      expect(mockConfirmPayment).toHaveBeenCalledWith('pay-1');
      expect(mockUpdateStatus).toHaveBeenCalledWith('inv-1', 'PAID');
      expect(mockAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({ actorId: 'admin-1', action: 'CONFIRM_PAYMENT', entityId: 'inv-1' }),
      );
    });

    it('returns a message when no payment record exists', async () => {
      mockFindByInvoiceId.mockResolvedValue(null);

      const result = await controller.confirmPayment('inv-1', mockUser);

      expect(result).toEqual({ message: 'No payment record found for this invoice' });
      expect(mockConfirmPayment).not.toHaveBeenCalled();
    });
  });
});
