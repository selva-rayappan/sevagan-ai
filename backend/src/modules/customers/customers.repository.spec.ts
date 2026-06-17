import { CustomersRepository } from './customers.repository';
import { Language } from '../../domain/enums';

const mockFindUnique = jest.fn();
const mockUpsert = jest.fn();
const mockUpdate = jest.fn();

const mockPrisma = {
  customer: {
    findUnique: mockFindUnique,
    upsert: mockUpsert,
    update: mockUpdate,
  },
} as any;

describe('CustomersRepository', () => {
  let repo: CustomersRepository;

  beforeEach(() => {
    repo = new CustomersRepository(mockPrisma);
    jest.clearAllMocks();
  });

  describe('findByPhone()', () => {
    it('returns customer when found', async () => {
      const customer = { id: 'c-1', phone: '919876543210' };
      mockFindUnique.mockResolvedValue(customer);

      const result = await repo.findByPhone('919876543210');

      expect(result).toBe(customer);
      expect(mockFindUnique).toHaveBeenCalledWith({ where: { phone: '919876543210' } });
    });

    it('returns null when not found', async () => {
      mockFindUnique.mockResolvedValue(null);

      const result = await repo.findByPhone('000');
      expect(result).toBeNull();
    });
  });

  describe('findById()', () => {
    it('returns customer by id', async () => {
      const customer = { id: 'c-1', phone: '919876543210' };
      mockFindUnique.mockResolvedValue(customer);

      const result = await repo.findById('c-1');
      expect(result).toBe(customer);
    });
  });

  describe('upsert()', () => {
    it('creates a new customer when not found', async () => {
      const newCustomer = { id: 'c-2', phone: '919000000001', name: 'Kumar' };
      mockUpsert.mockResolvedValue(newCustomer);

      const result = await repo.upsert('919000000001', 'Kumar');

      expect(result).toBe(newCustomer);
      expect(mockUpsert).toHaveBeenCalledWith({
        where: { phone: '919000000001' },
        create: { phone: '919000000001', name: 'Kumar' },
        update: { name: 'Kumar' },
      });
    });

    it('upsert without name does not overwrite existing name', async () => {
      const existing = { id: 'c-1', phone: '919876543210', name: 'Existing' };
      mockUpsert.mockResolvedValue(existing);

      await repo.upsert('919876543210');

      expect(mockUpsert).toHaveBeenCalledWith({
        where: { phone: '919876543210' },
        create: { phone: '919876543210', name: undefined },
        update: {},
      });
    });
  });

  describe('updateLanguage()', () => {
    it('updates language on the customer record', async () => {
      mockUpdate.mockResolvedValue({});

      await repo.updateLanguage('c-1', Language.TA);

      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: 'c-1' },
        data: { language: Language.TA },
      });
    });
  });
});
