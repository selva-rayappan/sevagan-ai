import { PaymentService } from './payment.service';

const mockCreate = jest.fn();
const mockUpdateStatus = jest.fn();
const mockFindByRazorpayLinkId = jest.fn();
const mockPaymentRepository = {
  create: mockCreate,
  updateStatus: mockUpdateStatus,
  findByRazorpayLinkId: mockFindByRazorpayLinkId,
} as any;

const mockCreatePaymentLink = jest.fn();
const mockRazorpayService = { createPaymentLink: mockCreatePaymentLink } as any;

const mockGet = jest.fn();
const mockConfigService = { get: mockGet } as any;

describe('PaymentService', () => {
  let service: PaymentService;

  beforeEach(() => {
    service = new PaymentService(mockPaymentRepository, mockRazorpayService, mockConfigService);
    jest.clearAllMocks();
    mockGet.mockReturnValue('sevagan@upi');
  });

  describe('recordCashPayment()', () => {
    it('creates a CASH payment with COMPLETED status', async () => {
      const payment = { id: 'pay-1' };
      mockCreate.mockResolvedValue(payment);

      const result = await service.recordCashPayment('inv-1', 1000);

      expect(result).toBe(payment);
      expect(mockCreate).toHaveBeenCalledWith({
        invoiceId: 'inv-1',
        amount: 1000,
        method: 'CASH',
        status: 'COMPLETED',
      });
    });
  });

  describe('recordUpiPayment()', () => {
    it('creates a real Razorpay payment link and records a PENDING payment referencing it', async () => {
      const payment = { id: 'pay-1' };
      mockCreatePaymentLink.mockResolvedValue({ id: 'plink_123', shortUrl: 'https://rzp.io/i/abc' });
      mockCreate.mockResolvedValue(payment);

      const result = await service.recordUpiPayment('inv-1', 500, 'JOB-20260630-0001', 'Rajesh', '919876543210');

      expect(mockCreatePaymentLink).toHaveBeenCalledWith({
        amount: 500,
        jobNumber: 'JOB-20260630-0001',
        customerName: 'Rajesh',
        customerPhone: '919876543210',
      });
      expect(mockCreate).toHaveBeenCalledWith({
        invoiceId: 'inv-1',
        amount: 500,
        method: 'UPI',
        status: 'PENDING',
        razorpayPaymentLinkId: 'plink_123',
      });
      expect(result).toEqual({ payment, paymentLinkUrl: 'https://rzp.io/i/abc' });
    });
  });

  describe('confirmPayment()', () => {
    it('updates the payment status to COMPLETED', async () => {
      const confirmed = { id: 'pay-1', status: 'COMPLETED' };
      mockUpdateStatus.mockResolvedValue(confirmed);

      const result = await service.confirmPayment('pay-1');

      expect(result).toBe(confirmed);
      expect(mockUpdateStatus).toHaveBeenCalledWith('pay-1', 'COMPLETED');
    });
  });

  describe('confirmPaymentByRazorpayLinkId()', () => {
    it('confirms the payment matching the Razorpay link id', async () => {
      mockFindByRazorpayLinkId.mockResolvedValue({ id: 'pay-1', status: 'PENDING' });
      mockUpdateStatus.mockResolvedValue({ id: 'pay-1', status: 'COMPLETED' });

      const result = await service.confirmPaymentByRazorpayLinkId('plink_123');

      expect(mockFindByRazorpayLinkId).toHaveBeenCalledWith('plink_123');
      expect(mockUpdateStatus).toHaveBeenCalledWith('pay-1', 'COMPLETED');
      expect(result).toEqual({ id: 'pay-1', status: 'COMPLETED' });
    });

    it('returns null when no payment matches the link id', async () => {
      mockFindByRazorpayLinkId.mockResolvedValue(null);

      const result = await service.confirmPaymentByRazorpayLinkId('plink_unknown');

      expect(result).toBeNull();
      expect(mockUpdateStatus).not.toHaveBeenCalled();
    });

    it('does not re-confirm an already-completed payment (webhook redelivery)', async () => {
      const payment = { id: 'pay-1', status: 'COMPLETED' };
      mockFindByRazorpayLinkId.mockResolvedValue(payment);

      const result = await service.confirmPaymentByRazorpayLinkId('plink_123');

      expect(result).toBe(payment);
      expect(mockUpdateStatus).not.toHaveBeenCalled();
    });
  });

  describe('generateUpiDeepLink()', () => {
    it('builds a standard UPI deep link using the configured VPA', () => {
      const link = service.generateUpiDeepLink(500, 'JOB-20260630-0001');

      expect(link).toBe('upi://pay?pa=sevagan@upi&am=500&tn=Payment%20for%20JOB-20260630-0001&cu=INR');
    });
  });
});
