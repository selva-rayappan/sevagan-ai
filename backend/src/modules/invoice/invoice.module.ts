import { Module } from '@nestjs/common';
import { InvoiceRepository } from './invoice.repository';
import { PdfGeneratorService } from './pdf-generator.service';
import { InvoiceService } from './invoice.service';
import { MessagingModule } from '../../infrastructure/messaging/messaging.module';

@Module({
  imports: [MessagingModule],
  providers: [InvoiceRepository, PdfGeneratorService, InvoiceService],
  exports: [InvoiceService, InvoiceRepository],
})
export class InvoiceModule {}
