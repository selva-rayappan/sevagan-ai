import { PaymentRepository } from './payment.repository';

const mockCreate = jest.fn();
const mockFindUnique = jest.fn();
const mockUpdate = jest.fn();

const mockPrisma = {
  payment: {
    create: mockCreate,
    findUnique: mockFindUnique,
    update: mockUpdate,
  },
} as any;

describe('PaymentRepository', () => {
  let repository: PaymentRepository;

  beforeEach(() => {
    repository = new PaymentRepository(mockPrisma);
    jest.clearAllMocks();
  });

  describe('create()', () => {
    it('creates a payment record', async () => {
      const payment = { id: 'pay-1', method: 'CASH', status: 'COMPLETED' };
      mockCreate.mockResolvedValue(payment);

      const result = await repository.create({
        invoiceId: 'inv-1',
        amount: 1000,
        method: 'CASH',
        status: 'COMPLETED',
      });

      expect(result).toBe(payment);
      expect(mockCreate).toHaveBeenCalledWith({
        data: { invoiceId: 'inv-1', amount: 1000, method: 'CASH', status: 'COMPLETED' },
      });
    });
  });

  describe('findByInvoiceId()', () => {
    it('returns the payment for an invoice', async () => {
      const payment = { id: 'pay-1' };
      mockFindUnique.mockResolvedValue(payment);

      const result = await repository.findByInvoiceId('inv-1');

      expect(result).toBe(payment);
      expect(mockFindUnique).toHaveBeenCalledWith({ where: { invoiceId: 'inv-1' } });
    });
  });

  describe('findById()', () => {
    it('returns null when no payment exists', async () => {
      mockFindUnique.mockResolvedValue(null);

      const result = await repository.findById('missing');

      expect(result).toBeNull();
    });
  });

  describe('updateStatus()', () => {
    it('updates the payment status', async () => {
      const updated = { id: 'pay-1', status: 'COMPLETED' };
      mockUpdate.mockResolvedValue(updated);

      const result = await repository.updateStatus('pay-1', 'COMPLETED');

      expect(result).toBe(updated);
      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: 'pay-1' },
        data: { status: 'COMPLETED' },
      });
    });
  });
});
