import { PaymentModeSettingsRepository } from './payment-mode-settings.repository';
import { PaymentMode } from '../../domain/enums';

const mockFindMany = jest.fn();
const mockFindUnique = jest.fn();
const mockUpsert = jest.fn();

const mockPrisma = {
  paymentModeSetting: {
    findMany: mockFindMany,
    findUnique: mockFindUnique,
    upsert: mockUpsert,
  },
} as any;

describe('PaymentModeSettingsRepository', () => {
  let repo: PaymentModeSettingsRepository;

  beforeEach(() => {
    repo = new PaymentModeSettingsRepository(mockPrisma);
    jest.clearAllMocks();
  });

  describe('listAll()', () => {
    it('returns rows as-is when both modes already exist', async () => {
      const rows = [
        { paymentMode: 'CASH', enabled: true, updatedAt: new Date() },
        { paymentMode: 'UPI', enabled: false, updatedAt: new Date() },
      ];
      mockFindMany.mockResolvedValue(rows);

      const result = await repo.listAll();

      expect(result).toEqual(rows);
    });

    it('backfills missing modes using the CASH-enabled/UPI-disabled default', async () => {
      mockFindMany.mockResolvedValue([{ paymentMode: 'CASH', enabled: true, updatedAt: new Date() }]);

      const result = await repo.listAll();

      const upi = result.find((r) => r.paymentMode === 'UPI');
      expect(upi?.enabled).toBe(false);
    });
  });

  describe('listEnabled()', () => {
    it('returns only the enabled modes', async () => {
      mockFindMany.mockResolvedValue([
        { paymentMode: 'CASH', enabled: true, updatedAt: new Date() },
        { paymentMode: 'UPI', enabled: false, updatedAt: new Date() },
      ]);

      const result = await repo.listEnabled();

      expect(result).toEqual(['CASH']);
    });
  });

  describe('isEnabled()', () => {
    it('returns the stored value when a row exists', async () => {
      mockFindUnique.mockResolvedValue({ paymentMode: 'UPI', enabled: true });

      expect(await repo.isEnabled(PaymentMode.UPI)).toBe(true);
    });

    it('falls back to the default (CASH enabled) when no row exists', async () => {
      mockFindUnique.mockResolvedValue(null);

      expect(await repo.isEnabled(PaymentMode.CASH)).toBe(true);
    });

    it('falls back to the default (UPI disabled) when no row exists', async () => {
      mockFindUnique.mockResolvedValue(null);

      expect(await repo.isEnabled(PaymentMode.UPI)).toBe(false);
    });
  });

  describe('setEnabled()', () => {
    it('upserts the new enabled value', async () => {
      mockFindMany.mockResolvedValue([
        { paymentMode: 'CASH', enabled: true, updatedAt: new Date() },
        { paymentMode: 'UPI', enabled: false, updatedAt: new Date() },
      ]);
      const updated = { paymentMode: 'UPI', enabled: true, updatedAt: new Date() };
      mockUpsert.mockResolvedValue(updated);

      const result = await repo.setEnabled(PaymentMode.UPI, true);

      expect(result).toBe(updated);
      expect(mockUpsert).toHaveBeenCalledWith({
        where: { paymentMode: 'UPI' },
        create: { paymentMode: 'UPI', enabled: true },
        update: { enabled: true },
      });
    });

    it('rejects disabling the only currently-enabled mode', async () => {
      mockFindMany.mockResolvedValue([
        { paymentMode: 'CASH', enabled: true, updatedAt: new Date() },
        { paymentMode: 'UPI', enabled: false, updatedAt: new Date() },
      ]);

      await expect(repo.setEnabled(PaymentMode.CASH, false)).rejects.toThrow(
        'At least one payment mode must remain enabled',
      );
      expect(mockUpsert).not.toHaveBeenCalled();
    });

    it('allows disabling a mode when another mode is still enabled', async () => {
      mockFindMany.mockResolvedValue([
        { paymentMode: 'CASH', enabled: true, updatedAt: new Date() },
        { paymentMode: 'UPI', enabled: true, updatedAt: new Date() },
      ]);
      mockUpsert.mockResolvedValue({ paymentMode: 'UPI', enabled: false, updatedAt: new Date() });

      await expect(repo.setEnabled(PaymentMode.UPI, false)).resolves.toBeDefined();
      expect(mockUpsert).toHaveBeenCalled();
    });
  });
});
