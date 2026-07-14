import { PaymentService } from './payment.service';

const mockCreate = jest.fn();
const mockUpdateStatus = jest.fn();
const mockPaymentRepository = { create: mockCreate, updateStatus: mockUpdateStatus } as any;

const mockGet = jest.fn();
const mockConfigService = { get: mockGet } as any;

describe('PaymentService', () => {
  let service: PaymentService;

  beforeEach(() => {
    service = new PaymentService(mockPaymentRepository, mockConfigService);
    jest.clearAllMocks();
    mockGet.mockReturnValue('https://razorpay.me/@yarlenterprises');
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
    it('creates a UPI payment with PENDING status', async () => {
      const payment = { id: 'pay-1' };
      mockCreate.mockResolvedValue(payment);

      const result = await service.recordUpiPayment('inv-1', 500);

      expect(result).toBe(payment);
      expect(mockCreate).toHaveBeenCalledWith({
        invoiceId: 'inv-1',
        amount: 500,
        method: 'UPI',
        status: 'PENDING',
      });
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

  describe('generatePaymentLink()', () => {
    it('builds a payment link using the configured Razorpay URL', () => {
      const link = service.generatePaymentLink(500, 'JOB-20260630-0001');

      expect(mockGet).toHaveBeenCalledWith('payment.razorpayLinkUrl');
      expect(link).toBe(
        'https://razorpay.me/@yarlenterprises?amount=500&description=Payment%20for%20JOB-20260630-0001',
      );
    });
  });
});
