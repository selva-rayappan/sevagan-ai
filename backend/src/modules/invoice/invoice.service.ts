import { Inject, Injectable, Logger } from '@nestjs/common';
import { Invoice } from '@prisma/client';
import { RedisService } from '../../infrastructure/cache/redis.service';
import { MinioService } from '../../infrastructure/storage/minio.service';
import {
  WHATSAPP_PROVIDER,
  WhatsAppProvider,
} from '../../infrastructure/messaging/whatsapp.provider.interface';
import { TranslationService } from '../../infrastructure/i18n/translation.service';
import { Language } from '../../domain/enums';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { InvoiceRepository } from './invoice.repository';
import { PdfGeneratorService, InvoicePdfData } from './pdf-generator.service';

@Injectable()
export class InvoiceService {
  private readonly logger = new Logger(InvoiceService.name);

  constructor(
    private readonly invoiceRepository: InvoiceRepository,
    private readonly pdfGenerator: PdfGeneratorService,
    private readonly minioService: MinioService,
    private readonly redis: RedisService,
    private readonly prisma: PrismaService,
    private readonly translation: TranslationService,
    @Inject(WHATSAPP_PROVIDER) private readonly whatsapp: WhatsAppProvider,
  ) {}

  async generateInvoice(jobId: string): Promise<Invoice> {
    // Load job with all related data
    const job = await this.prisma.job.findUnique({
      where: { id: jobId },
      include: {
        customer: true,
        serviceCategory: true,
        assignment: { include: { technician: true } },
        commission: true,
      },
    });

    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }

    // Check if invoice already exists
    const existing = await this.invoiceRepository.findByJobId(jobId);
    if (existing) {
      this.logger.warn(`Invoice already exists for job ${jobId}: ${existing.invoiceNumber}`);
      return existing;
    }

    // Generate invoice number
    const invoiceNumber = await this.generateInvoiceNumber();
    const amount = Number(job.jobAmount ?? 0);

    // Create invoice record
    const invoice = await this.invoiceRepository.create({
      invoiceNumber,
      jobId,
      amount,
    });

    const customerLang = (job.customer.language as Language) ?? Language.EN;
    const commissionAmount = job.commission ? Number(job.commission.commissionAmount) : 0;
    const technicianAmount = job.commission ? Number(job.commission.technicianAmount) : amount;

    // Generate PDF
    const pdfData: InvoicePdfData = {
      invoiceNumber,
      invoiceDate: new Date(),
      customerName: job.customer.name ?? '',
      customerPhone: job.customer.phone,
      jobNumber: job.jobNumber,
      serviceCategory: job.serviceCategory.name,
      location: job.location,
      technicianName: job.assignment?.technician?.name ?? 'N/A',
      jobAmount: amount,
      commissionAmount,
      technicianAmount,
      paymentMode: job.paymentMode ?? 'CASH',
      language: customerLang,
    };

    try {
      const pdfBuffer = await this.pdfGenerator.generateInvoicePdf(pdfData);

      // Upload to MinIO
      const minioKey = `invoices/${invoiceNumber}.pdf`;
      await this.minioService.uploadFile(minioKey, pdfBuffer, 'application/pdf');

      // Update invoice with PDF URL
      await this.invoiceRepository.setPdfUrl(invoice.id, minioKey);
      await this.invoiceRepository.updateStatus(invoice.id, 'SENT');

      // Get presigned URL and send to customer
      const pdfUrl = await this.minioService.getPresignedUrl(minioKey, 604800); // 7-day URL

      await this.whatsapp.sendDocument({
        to: job.customer.phone,
        link: pdfUrl,
        filename: `${invoiceNumber}.pdf`,
        caption: this.translation.translate('customer.invoice_sent', customerLang, {
          invoiceNumber,
        }),
      });

      this.logger.log(`Invoice ${invoiceNumber} generated and sent for job ${job.jobNumber}`);
    } catch (err) {
      this.logger.error(`PDF generation/delivery failed for invoice ${invoiceNumber}: ${(err as Error).message}`);
      // Invoice record still exists — PDF can be regenerated later
    }

    return invoice;
  }

  async getInvoicePdfUrl(invoiceId: string): Promise<string | null> {
    const invoice = await this.invoiceRepository.findById(invoiceId);
    if (!invoice?.pdfUrl) return null;
    return this.minioService.getPresignedUrl(invoice.pdfUrl, 86400); // 24h URL
  }

  private async generateInvoiceNumber(): Promise<string> {
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const counterKey = `invoice_counter:${today}`;
    const count = await this.redis.getClient().incr(counterKey);
    await this.redis.getClient().expire(counterKey, 172800); // 2-day TTL
    return `INV-${today}-${String(count).padStart(4, '0')}`;
  }
}
