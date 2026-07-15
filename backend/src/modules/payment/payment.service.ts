import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Payment } from '@prisma/client';
import { PaymentRepository } from './payment.repository';
import { RazorpayService } from './razorpay.service';

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    private readonly paymentRepository: PaymentRepository,
    private readonly razorpayService: RazorpayService,
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

  /**
   * Creates a real Razorpay payment link for the job amount and records a
   * PENDING payment referencing it — confirmed later via the Razorpay
   * webhook (payment_link.paid), not by the customer or admin manually.
   */
  async recordUpiPayment(
    invoiceId: string,
    amount: number,
    jobNumber: string,
    customerName: string,
    customerPhone: string,
  ): Promise<{ payment: Payment; paymentLinkUrl: string }> {
    const { id: razorpayPaymentLinkId, shortUrl } = await this.razorpayService.createPaymentLink({
      amount,
      jobNumber,
      customerName,
      customerPhone,
    });

    const payment = await this.paymentRepository.create({
      invoiceId,
      amount,
      method: 'UPI',
      status: 'PENDING',
      razorpayPaymentLinkId,
    });
    this.logger.log(`UPI payment recorded (pending) for invoice ${invoiceId}: ₹${amount}, link ${razorpayPaymentLinkId}`);
    return { payment, paymentLinkUrl: shortUrl };
  }

  async confirmPayment(paymentId: string): Promise<Payment> {
    const payment = await this.paymentRepository.updateStatus(paymentId, 'COMPLETED');
    this.logger.log(`Payment ${paymentId} confirmed`);
    return payment;
  }

  async confirmPaymentByRazorpayLinkId(razorpayPaymentLinkId: string): Promise<Payment | null> {
    const payment = await this.paymentRepository.findByRazorpayLinkId(razorpayPaymentLinkId);
    if (!payment) {
      this.logger.warn(`No payment found for Razorpay link ${razorpayPaymentLinkId}`);
      return null;
    }
    if (payment.status === 'COMPLETED') return payment; // already confirmed, webhook redelivery
    return this.confirmPayment(payment.id);
  }

  /** Standard UPI deep link — works on any UPI app without Razorpay, sent alongside the Razorpay link */
  generateUpiDeepLink(amount: number, jobNumber: string): string {
    const vpa = this.configService.get<string>('payment.upiVpa') ?? 'sevagan@upi';
    const note = encodeURIComponent(`Payment for ${jobNumber}`);
    return `upi://pay?pa=${vpa}&am=${amount}&tn=${note}&cu=INR`;
  }
}

