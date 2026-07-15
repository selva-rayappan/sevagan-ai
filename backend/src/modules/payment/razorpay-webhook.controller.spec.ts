import { UnauthorizedException } from '@nestjs/common';
import { RazorpayWebhookController } from './razorpay-webhook.controller';

const mockVerifyWebhookSignature = jest.fn();
const mockRazorpayService = { verifyWebhookSignature: mockVerifyWebhookSignature } as any;

const mockConfirmPaymentByRazorpayLinkId = jest.fn();
const mockPaymentService = { confirmPaymentByRazorpayLinkId: mockConfirmPaymentByRazorpayLinkId } as any;

const mockUpdateStatus = jest.fn();
const mockInvoiceRepository = { updateStatus: mockUpdateStatus } as any;

const mockAuditLog = jest.fn().mockResolvedValue(undefined);
const mockAuditService = { log: mockAuditLog } as any;

describe('RazorpayWebhookController', () => {
  let controller: RazorpayWebhookController;

  beforeEach(() => {
    controller = new RazorpayWebhookController(
      mockRazorpayService,
      mockPaymentService,
      mockInvoiceRepository,
      mockAuditService,
    );
    jest.clearAllMocks();
  });

  it('throws and logs to the audit trail when the signature is invalid', async () => {
    mockVerifyWebhookSignature.mockReturnValue(false);
    const payload = { event: 'payment_link.paid', payload: {} } as any;

    await expect(
      controller.handleWebhook(payload, Buffer.from('{}'), 'bad-sig'),
    ).rejects.toThrow(UnauthorizedException);
    expect(mockAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'RAZORPAY_WEBHOOK_SIGNATURE_REJECTED' }),
    );
    expect(mockConfirmPaymentByRazorpayLinkId).not.toHaveBeenCalled();
  });

  it('confirms the payment and marks the invoice PAID on payment_link.paid', async () => {
    mockVerifyWebhookSignature.mockReturnValue(true);
    mockConfirmPaymentByRazorpayLinkId.mockResolvedValue({ id: 'pay-1', invoiceId: 'inv-1' });
    const payload = {
      event: 'payment_link.paid',
      payload: { payment_link: { entity: { id: 'plink_123', status: 'paid' } } },
    } as any;

    const result = await controller.handleWebhook(payload, Buffer.from('{}'), 'good-sig');

    expect(mockConfirmPaymentByRazorpayLinkId).toHaveBeenCalledWith('plink_123');
    expect(mockUpdateStatus).toHaveBeenCalledWith('inv-1', 'PAID');
    expect(result).toEqual({ status: 'ok' });
  });

  it('ignores events other than payment_link.paid', async () => {
    mockVerifyWebhookSignature.mockReturnValue(true);
    const payload = { event: 'payment_link.expired', payload: {} } as any;

    const result = await controller.handleWebhook(payload, Buffer.from('{}'), 'good-sig');

    expect(mockConfirmPaymentByRazorpayLinkId).not.toHaveBeenCalled();
    expect(result).toEqual({ status: 'ok' });
  });

  it('does not touch the invoice when no matching payment is found', async () => {
    mockVerifyWebhookSignature.mockReturnValue(true);
    mockConfirmPaymentByRazorpayLinkId.mockResolvedValue(null);
    const payload = {
      event: 'payment_link.paid',
      payload: { payment_link: { entity: { id: 'plink_unknown', status: 'paid' } } },
    } as any;

    await controller.handleWebhook(payload, Buffer.from('{}'), 'good-sig');

    expect(mockUpdateStatus).not.toHaveBeenCalled();
  });
});
