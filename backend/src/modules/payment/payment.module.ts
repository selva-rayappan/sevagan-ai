import { Module } from '@nestjs/common';
import { PaymentRepository } from './payment.repository';
import { PaymentService } from './payment.service';
import { RazorpayService } from './razorpay.service';
import { RazorpayWebhookController } from './razorpay-webhook.controller';
import { InvoiceModule } from '../invoice/invoice.module';

@Module({
  imports: [InvoiceModule],
  controllers: [RazorpayWebhookController],
  providers: [PaymentRepository, PaymentService, RazorpayService],
  exports: [PaymentService, PaymentRepository, RazorpayService],
})
export class PaymentModule {}
