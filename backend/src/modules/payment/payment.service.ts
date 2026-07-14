import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Payment } from '@prisma/client';
import { PaymentRepository } from './payment.repository';

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    private readonly paymentRepository: PaymentRepository,
    private readonly configService: ConfigService,
  ) {}

  async recordCashPayment(invoiceId: string, amount: number): Promise<Payment> {
    const payment = await this.paymentRepository.create({
      invoiceId,
      amount,
      method: 'CASH',
      status: 'COMPLETED',
    });
    this.logger.log(`Cash payment recorded for invoice ${invoiceId}: ₹${amount}`);
    return payment;
  }

  async recordUpiPayment(invoiceId: string, amount: number): Promise<Payment> {
    const payment = await this.paymentRepository.create({
      invoiceId,
      amount,
      method: 'UPI',
      status: 'PENDING',
    });
    this.logger.log(`UPI payment recorded (pending) for invoice ${invoiceId}: ₹${amount}`);
    return payment;
  }

  async confirmPayment(paymentId: string): Promise<Payment> {
    const payment = await this.paymentRepository.updateStatus(paymentId, 'COMPLETED');
    this.logger.log(`Payment ${paymentId} confirmed`);
    return payment;
  }

  generatePaymentLink(amount: number, jobNumber: string): string {
    const razorpayLinkUrl = this.configService.get<string>('payment.razorpayLinkUrl');
    return `${razorpayLinkUrl}?amount=${amount}&description=${encodeURIComponent(`Payment for ${jobNumber}`)}`;
  }

  /** Standard UPI deep link — works on any UPI app without Razorpay */
  generateUpiDeepLink(amount: number, jobNumber: string): string {
    const vpa = this.configService.get<string>('payment.upiVpa') ?? 'sevagan@upi';
    const note = encodeURIComponent(`Payment for ${jobNumber}`);
    return `upi://pay?pa=${vpa}&am=${amount}&tn=${note}&cu=INR`;
  }
}

