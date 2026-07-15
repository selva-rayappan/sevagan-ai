import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import * as crypto from 'crypto';

const RAZORPAY_API_BASE = 'https://api.razorpay.com/v1';

export interface CreatePaymentLinkOptions {
  amount: number;
  jobNumber: string;
  customerName: string;
  customerPhone: string;
}

export interface PaymentLink {
  id: string;
  shortUrl: string;
}

@Injectable()
export class RazorpayService {
  private readonly logger = new Logger(RazorpayService.name);
  private readonly client: AxiosInstance;
  private readonly webhookSecret: string;

  constructor(private readonly configService: ConfigService) {
    const keyId = this.configService.get<string>('payment.razorpayKeyId', '');
    const keySecret = this.configService.get<string>('payment.razorpayKeySecret', '');
    this.webhookSecret = this.configService.get<string>('payment.razorpayWebhookSecret', '');

    this.client = axios.create({
      baseURL: RAZORPAY_API_BASE,
      auth: { username: keyId, password: keySecret },
      timeout: 10_000,
    });
  }

  async createPaymentLink(options: CreatePaymentLinkOptions): Promise<PaymentLink> {
    const { amount, jobNumber, customerName, customerPhone } = options;

    const response = await this.client.post('/payment_links', {
      amount: Math.round(amount * 100), // paise
      currency: 'INR',
      accept_partial: false,
      description: `Payment for ${jobNumber}`,
      reference_id: jobNumber,
      customer: {
        name: customerName || 'Sevagan Customer',
        contact: `+${customerPhone}`,
      },
      notify: { sms: false, email: false }, // delivered via our own WhatsApp bot instead
      notes: { jobNumber },
    });

    return { id: response.data.id, shortUrl: response.data.short_url };
  }

  /** Verifies X-Razorpay-Signature against the raw request body per Razorpay's webhook spec. */
  verifyWebhookSignature(rawBody: Buffer, signature: string | undefined): boolean {
    if (!signature || !this.webhookSecret) return false;

    const expected = crypto.createHmac('sha256', this.webhookSecret).update(rawBody).digest('hex');

    if (signature.length !== expected.length) return false;
    return crypto.timingSafeEqual(Buffer.from(signature, 'utf8'), Buffer.from(expected, 'utf8'));
  }
}
