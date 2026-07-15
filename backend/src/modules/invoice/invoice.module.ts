import { Module } from '@nestjs/common';
import { InvoiceRepository } from './invoice.repository';
import { PdfGeneratorService } from './pdf-generator.service';
import { InvoiceService } from './invoice.service';
import { InvoicesController } from './invoices.controller';
import { MessagingModule } from '../../infrastructure/messaging/messaging.module';

@Module({
  imports: [MessagingModule],
  controllers: [InvoicesController],
  providers: [InvoiceRepository, PdfGeneratorService, InvoiceService],
  exports: [InvoiceService, InvoiceRepository],
})
export class InvoiceModule {}
