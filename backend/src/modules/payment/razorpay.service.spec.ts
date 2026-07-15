import * as crypto from 'crypto';
import { RazorpayService } from './razorpay.service';

const mockGet = jest.fn();
const mockConfigService = { get: mockGet } as any;

describe('RazorpayService', () => {
  let service: RazorpayService;
  let mockPost: jest.Mock;

  beforeEach(() => {
    mockGet.mockImplementation((key: string) => {
      const values: Record<string, string> = {
        'payment.razorpayKeyId': 'rzp_test_key',
        'payment.razorpayKeySecret': 'rzp_test_secret',
        'payment.razorpayWebhookSecret': 'webhook_secret',
      };
      return values[key] ?? '';
    });
    service = new RazorpayService(mockConfigService);

    // Constructor already created a real (harmless) AxiosInstance — swap it
    // out before any test method runs, same pattern as MetaWhatsAppProvider.
    mockPost = jest.fn();
    (service as any).client = { post: mockPost };
  });

  describe('createPaymentLink()', () => {
    it('creates a Razorpay payment link with the amount converted to paise', async () => {
      mockPost.mockResolvedValue({
        data: { id: 'plink_123', short_url: 'https://rzp.io/i/abc' },
      });

      const result = await service.createPaymentLink({
        amount: 1500,
        jobNumber: 'JOB-20260630-0001',
        customerName: 'Rajesh',
        customerPhone: '919876543210',
      });

      expect(result).toEqual({ id: 'plink_123', shortUrl: 'https://rzp.io/i/abc' });
      expect(mockPost).toHaveBeenCalledWith('/payment_links', expect.objectContaining({
        amount: 150000,
        currency: 'INR',
        reference_id: 'JOB-20260630-0001',
        customer: expect.objectContaining({ name: 'Rajesh', contact: '+919876543210' }),
      }));
    });
  });

  describe('verifyWebhookSignature()', () => {
    it('returns true for a signature matching the raw body and secret', () => {
      const body = Buffer.from(JSON.stringify({ event: 'payment_link.paid' }));
      const signature = crypto.createHmac('sha256', 'webhook_secret').update(body).digest('hex');

      expect(service.verifyWebhookSignature(body, signature)).toBe(true);
    });

    it('returns false for a mismatched signature', () => {
      const body = Buffer.from(JSON.stringify({ event: 'payment_link.paid' }));

      expect(service.verifyWebhookSignature(body, 'not-the-right-signature-but-same-length-ish')).toBe(false);
    });

    it('returns false when no signature header is present', () => {
      const body = Buffer.from(JSON.stringify({ event: 'payment_link.paid' }));

      expect(service.verifyWebhookSignature(body, undefined)).toBe(false);
    });
  });
});
