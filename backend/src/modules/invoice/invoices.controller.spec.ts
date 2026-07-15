import { InvoicesController } from './invoices.controller';

const mockGetInvoicePdfBuffer = jest.fn();
const mockInvoiceService = { getInvoicePdfBuffer: mockGetInvoicePdfBuffer } as any;

const makeResponse = (): any => ({
  status: jest.fn().mockReturnThis(),
  json: jest.fn().mockReturnThis(),
  set: jest.fn().mockReturnThis(),
  send: jest.fn().mockReturnThis(),
});

describe('InvoicesController (public)', () => {
  let controller: InvoicesController;

  beforeEach(() => {
    controller = new InvoicesController(mockInvoiceService);
    jest.clearAllMocks();
  });

  describe('downloadPdf()', () => {
    it('streams the PDF bytes with an inline content disposition', async () => {
      const buffer = Buffer.from('%PDF-fake');
      mockGetInvoicePdfBuffer.mockResolvedValue({ buffer, invoiceNumber: 'INV-1' });
      const res = makeResponse();

      await controller.downloadPdf('inv-1', res);

      expect(res.set).toHaveBeenCalledWith(
        expect.objectContaining({
          'Content-Type': 'application/pdf',
          'Content-Disposition': 'inline; filename="INV-1.pdf"',
        }),
      );
      expect(res.send).toHaveBeenCalledWith(buffer);
    });

    it('returns 404 when no PDF exists', async () => {
      mockGetInvoicePdfBuffer.mockResolvedValue(null);
      const res = makeResponse();

      await controller.downloadPdf('missing', res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'Invoice PDF not found' });
    });
  });
});
