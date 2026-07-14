import { PdfGeneratorService, InvoicePdfData } from './pdf-generator.service';
import { Language } from '../../domain/enums';

describe('PdfGeneratorService', () => {
  let service: PdfGeneratorService;

  const baseData: InvoicePdfData = {
    invoiceNumber: 'INV-20260630-0001',
    invoiceDate: new Date('2026-06-30'),
    customerName: 'Rajesh',
    customerPhone: '919876543210',
    jobNumber: 'JOB-20260630-0001',
    serviceCategory: 'Electrical',
    location: 'Virudhunagar',
    technicianName: 'Kumar',
    jobAmount: 1000,
    commissionAmount: 20,
    technicianAmount: 980,
    paymentMode: 'CASH',
    language: Language.EN,
  };

  beforeEach(() => {
    service = new PdfGeneratorService();
  });

  it('generates a non-empty PDF buffer for an English invoice', async () => {
    const buffer = await service.generateInvoicePdf(baseData);

    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(0);
    expect(buffer.subarray(0, 4).toString()).toBe('%PDF');
  });

  it('generates a non-empty PDF buffer for a Tamil invoice', async () => {
    const buffer = await service.generateInvoicePdf({ ...baseData, language: Language.TA });

    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(0);
    expect(buffer.subarray(0, 4).toString()).toBe('%PDF');
  });

  it('handles a missing customer name without throwing', async () => {
    await expect(
      service.generateInvoicePdf({ ...baseData, customerName: '' }),
    ).resolves.toBeInstanceOf(Buffer);
  });
});
