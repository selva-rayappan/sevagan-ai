import { InvoiceRepository } from './invoice.repository';

const mockCreate = jest.fn();
const mockFindUnique = jest.fn();
const mockFindMany = jest.fn();
const mockCount = jest.fn();
const mockUpdate = jest.fn();

const mockPrisma = {
  invoice: {
    create: mockCreate,
    findUnique: mockFindUnique,
    findMany: mockFindMany,
    count: mockCount,
    update: mockUpdate,
  },
} as any;

describe('InvoiceRepository', () => {
  let repository: InvoiceRepository;

  beforeEach(() => {
    repository = new InvoiceRepository(mockPrisma);
    jest.clearAllMocks();
  });

  describe('create()', () => {
    it('creates an invoice with DRAFT status', async () => {
      const invoice = { id: 'inv-1', invoiceNumber: 'INV-20260630-0001' };
      mockCreate.mockResolvedValue(invoice);

      const result = await repository.create({
        invoiceNumber: 'INV-20260630-0001',
        jobId: 'job-1',
        amount: 1000,
      });

      expect(result).toBe(invoice);
      expect(mockCreate).toHaveBeenCalledWith({
        data: {
          invoiceNumber: 'INV-20260630-0001',
          jobId: 'job-1',
          amount: 1000,
          status: 'DRAFT',
        },
      });
    });
  });

  describe('findById()', () => {
    it('fetches an invoice with full job details', async () => {
      const invoice = { id: 'inv-1', job: {} };
      mockFindUnique.mockResolvedValue(invoice);

      const result = await repository.findById('inv-1');

      expect(result).toBe(invoice);
      expect(mockFindUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'inv-1' } }),
      );
    });
  });

  describe('findByJobId()', () => {
    it('returns null when no invoice exists for the job', async () => {
      mockFindUnique.mockResolvedValue(null);

      const result = await repository.findByJobId('job-1');

      expect(result).toBeNull();
      expect(mockFindUnique).toHaveBeenCalledWith({ where: { jobId: 'job-1' } });
    });
  });

  describe('findAll()', () => {
    it('applies default pagination when no filters given', async () => {
      mockFindMany.mockResolvedValue([]);
      mockCount.mockResolvedValue(0);

      const result = await repository.findAll({});

      expect(result).toEqual({ invoices: [], total: 0 });
      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: {}, skip: 0, take: 20 }),
      );
    });

    it('filters by status and date range, and paginates', async () => {
      mockFindMany.mockResolvedValue([{ id: 'inv-1' }]);
      mockCount.mockResolvedValue(1);

      const fromDate = new Date('2026-06-01');
      const toDate = new Date('2026-06-30');

      const result = await repository.findAll({
        status: 'PAID',
        fromDate,
        toDate,
        page: 2,
        limit: 10,
      });

      expect(result).toEqual({ invoices: [{ id: 'inv-1' }], total: 1 });
      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: 'PAID', createdAt: { gte: fromDate, lte: toDate } },
          skip: 10,
          take: 10,
        }),
      );
    });
  });

  describe('updateStatus()', () => {
    it('updates the invoice status', async () => {
      const updated = { id: 'inv-1', status: 'SENT' };
      mockUpdate.mockResolvedValue(updated);

      const result = await repository.updateStatus('inv-1', 'SENT');

      expect(result).toBe(updated);
      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: 'inv-1' },
        data: { status: 'SENT' },
      });
    });
  });

  describe('setPdfUrl()', () => {
    it('sets the pdfUrl field', async () => {
      const updated = { id: 'inv-1', pdfUrl: 'invoices/INV-1.pdf' };
      mockUpdate.mockResolvedValue(updated);

      const result = await repository.setPdfUrl('inv-1', 'invoices/INV-1.pdf');

      expect(result).toBe(updated);
      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: 'inv-1' },
        data: { pdfUrl: 'invoices/INV-1.pdf' },
      });
    });
  });
});
