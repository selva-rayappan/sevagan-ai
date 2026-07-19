import { InvoiceService } from './invoice.service';
import { Language } from '../../domain/enums';

const mockFindUniqueJob = jest.fn();
const mockPrisma = { job: { findUnique: mockFindUniqueJob } } as any;

const mockFindByJobId = jest.fn();
const mockCreate = jest.fn();
const mockSetPdfUrl = jest.fn();
const mockUpdateStatus = jest.fn();
const mockFindById = jest.fn();
const mockInvoiceRepository = {
  findByJobId: mockFindByJobId,
  create: mockCreate,
  setPdfUrl: mockSetPdfUrl,
  updateStatus: mockUpdateStatus,
  findById: mockFindById,
} as any;

const mockGenerateInvoicePdf = jest.fn();
const mockPdfGenerator = { generateInvoicePdf: mockGenerateInvoicePdf } as any;

const mockUploadFile = jest.fn();
const mockDownloadFile = jest.fn();
const mockMinioService = {
  uploadFile: mockUploadFile,
  downloadFile: mockDownloadFile,
} as any;

const mockConfigGet = jest.fn().mockReturnValue('http://localhost:3001');
const mockConfigService = { get: mockConfigGet } as any;

const mockIncr = jest.fn();
const mockExpire = jest.fn();
const mockRedisService = {
  getClient: () => ({ incr: mockIncr, expire: mockExpire }),
} as any;

const mockTranslate = jest.fn().mockReturnValue('Invoice sent');
const mockTranslationService = { translate: mockTranslate } as any;

const mockSendDocument = jest.fn();
const mockWhatsApp = { sendDocument: mockSendDocument } as any;

const makeJob = (overrides = {}): any => ({
  id: 'job-1',
  jobNumber: 'JOB-20260630-0001',
  jobAmount: 1000,
  paymentMode: 'CASH',
  location: 'Virudhunagar',
  customer: { name: 'Rajesh', phone: '919876543210', language: 'EN' },
  serviceCategory: { name: 'Electrical' },
  assignment: { technician: { name: 'Kumar' } },
  // MVP: commission not displayed on invoices — see invoice.service.ts.
  commission: { commissionAmount: 20, technicianAmount: 980 },
  ...overrides,
});

describe('InvoiceService', () => {
  let service: InvoiceService;

  beforeAll(() => {
    // generateInvoiceNumber() derives its date segment from the real system clock
    // (new Date()), so fixtures below hardcode INV-20260630-* — pin the clock or
    // this suite silently breaks every day the date moves past 2026-06-30.
    jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate'] });
    jest.setSystemTime(new Date('2026-06-30T12:00:00Z'));
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    service = new InvoiceService(
      mockInvoiceRepository,
      mockPdfGenerator,
      mockMinioService,
      mockRedisService,
      mockPrisma,
      mockTranslationService,
      mockConfigService,
      mockWhatsApp,
    );
    jest.clearAllMocks();
    mockConfigGet.mockReturnValue('http://localhost:3001');
    mockIncr.mockResolvedValue(1);
    mockExpire.mockResolvedValue(undefined);
    mockGenerateInvoicePdf.mockResolvedValue(Buffer.from('%PDF-fake'));
    mockUploadFile.mockResolvedValue('invoices/INV-20260630-0001.pdf');
    mockSendDocument.mockResolvedValue(undefined);
  });

  describe('generateInvoice()', () => {
    it('throws when the job does not exist', async () => {
      mockFindUniqueJob.mockResolvedValue(null);

      await expect(service.generateInvoice('missing-job')).rejects.toThrow('Job missing-job not found');
    });

    it('returns the existing invoice without regenerating when one already exists', async () => {
      mockFindUniqueJob.mockResolvedValue(makeJob());
      const existing = { id: 'inv-existing', invoiceNumber: 'INV-20260629-0001' };
      mockFindByJobId.mockResolvedValue(existing);

      const result = await service.generateInvoice('job-1');

      expect(result).toBe(existing);
      expect(mockCreate).not.toHaveBeenCalled();
      expect(mockGenerateInvoicePdf).not.toHaveBeenCalled();
    });

    it('creates an invoice, generates a PDF, uploads it, and sends it via WhatsApp', async () => {
      mockFindUniqueJob.mockResolvedValue(makeJob());
      mockFindByJobId.mockResolvedValue(null);
      const created = { id: 'inv-1', invoiceNumber: 'INV-20260630-0001' };
      mockCreate.mockResolvedValue(created);

      const result = await service.generateInvoice('job-1');

      expect(result).toBe(created);
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({ jobId: 'job-1', amount: 1000 }),
      );
      expect(mockGenerateInvoicePdf).toHaveBeenCalledWith(
        expect.objectContaining({
          jobNumber: 'JOB-20260630-0001',
          jobAmount: 1000,
          // MVP: commission not displayed on invoices — see invoice.service.ts.
          // commissionAmount: 20,
          // technicianAmount: 980,
          language: Language.EN,
        }),
      );
      expect(mockUploadFile).toHaveBeenCalledWith(
        'invoices/INV-20260630-0001.pdf',
        expect.any(Buffer),
        'application/pdf',
      );
      expect(mockSetPdfUrl).toHaveBeenCalledWith('inv-1', 'invoices/INV-20260630-0001.pdf');
      expect(mockUpdateStatus).toHaveBeenCalledWith('inv-1', 'SENT');
      expect(mockSendDocument).toHaveBeenCalledWith(
        expect.objectContaining({
          to: '919876543210',
          filename: 'INV-20260630-0001.pdf',
          link: 'http://localhost:3001/api/v1/invoices/inv-1/pdf',
        }),
      );
    });

    // MVP: was 'falls back to job amount and N/A technician when commission or
    // assignment is missing' — the commission-fallback half is inactive while
    // commission is not displayed (see invoice.service.ts); restore
    // `commission: null` to the makeJob() call and the commissionAmount/
    // technicianAmount assertions below once re-enabled.
    it('falls back to N/A technician when assignment is missing', async () => {
      mockFindUniqueJob.mockResolvedValue(makeJob({ assignment: null }));
      mockFindByJobId.mockResolvedValue(null);
      mockCreate.mockResolvedValue({ id: 'inv-1', invoiceNumber: 'INV-20260630-0001' });

      await service.generateInvoice('job-1');

      expect(mockGenerateInvoicePdf).toHaveBeenCalledWith(
        expect.objectContaining({
          technicianName: 'N/A',
          // commissionAmount: 0,
          // technicianAmount: 1000,
        }),
      );
    });

    it('still returns the invoice record when PDF generation fails', async () => {
      mockFindUniqueJob.mockResolvedValue(makeJob());
      mockFindByJobId.mockResolvedValue(null);
      const created = { id: 'inv-1', invoiceNumber: 'INV-20260630-0001' };
      mockCreate.mockResolvedValue(created);
      mockGenerateInvoicePdf.mockRejectedValue(new Error('pdfkit failure'));

      const result = await service.generateInvoice('job-1');

      expect(result).toBe(created);
      expect(mockSendDocument).not.toHaveBeenCalled();
    });
  });

  describe('getInvoicePdfBuffer()', () => {
    it('returns null when invoice has no pdfUrl', async () => {
      mockFindById.mockResolvedValue({ id: 'inv-1', pdfUrl: null });

      const result = await service.getInvoicePdfBuffer('inv-1');

      expect(result).toBeNull();
    });

    it('returns null when invoice does not exist', async () => {
      mockFindById.mockResolvedValue(null);

      const result = await service.getInvoicePdfBuffer('missing');

      expect(result).toBeNull();
    });

    it('returns the PDF bytes fetched directly from MinIO when invoice has a pdfUrl', async () => {
      mockFindById.mockResolvedValue({ id: 'inv-1', invoiceNumber: 'INV-1', pdfUrl: 'invoices/INV-1.pdf' });
      mockDownloadFile.mockResolvedValue(Buffer.from('%PDF-fake'));

      const result = await service.getInvoicePdfBuffer('inv-1');

      expect(result).toEqual({ buffer: Buffer.from('%PDF-fake'), invoiceNumber: 'INV-1' });
      expect(mockDownloadFile).toHaveBeenCalledWith('invoices/INV-1.pdf');
    });
  });
});
