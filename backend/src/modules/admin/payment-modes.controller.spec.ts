import { BadRequestException } from '@nestjs/common';
import { PaymentModesAdminController } from './payment-modes.controller';
import { PaymentMode } from '../../domain/enums';

const mockListAll = jest.fn();
const mockSetEnabled = jest.fn();
const mockPaymentModeSettingsRepo = { listAll: mockListAll, setEnabled: mockSetEnabled } as any;

const mockAuditLog = jest.fn().mockResolvedValue(undefined);
const mockAuditService = { log: mockAuditLog } as any;
const mockUser = { id: 'admin-1', email: 'admin@sevagan.in', role: 'ADMIN', name: 'Admin' };

describe('PaymentModesAdminController', () => {
  let controller: PaymentModesAdminController;

  beforeEach(() => {
    controller = new PaymentModesAdminController(mockPaymentModeSettingsRepo, mockAuditService);
    jest.clearAllMocks();
  });

  describe('list()', () => {
    it('returns all payment mode settings', async () => {
      const settings = [{ paymentMode: 'CASH', enabled: true }];
      mockListAll.mockResolvedValue(settings);

      const result = await controller.list();

      expect(result).toBe(settings);
    });
  });

  describe('update()', () => {
    it('enables a payment mode and logs the audit event', async () => {
      const updated = { paymentMode: 'UPI', enabled: true };
      mockSetEnabled.mockResolvedValue(updated);

      const result = await controller.update('UPI', { enabled: true }, mockUser);

      expect(result).toBe(updated);
      expect(mockSetEnabled).toHaveBeenCalledWith(PaymentMode.UPI, true);
      expect(mockAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          actorId: 'admin-1',
          action: 'ENABLE_PAYMENT_MODE',
          entityType: 'PaymentModeSetting',
          entityId: 'UPI',
        }),
      );
    });

    it('disables a payment mode and logs the audit event', async () => {
      mockSetEnabled.mockResolvedValue({ paymentMode: 'UPI', enabled: false });

      await controller.update('UPI', { enabled: false }, mockUser);

      expect(mockAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'DISABLE_PAYMENT_MODE' }),
      );
    });

    it('rejects an unknown payment mode before touching the repository', async () => {
      await expect(controller.update('BITCOIN', { enabled: true }, mockUser)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockSetEnabled).not.toHaveBeenCalled();
    });

    it('propagates the repository error when disabling the last enabled mode', async () => {
      mockSetEnabled.mockRejectedValue(new BadRequestException('At least one payment mode must remain enabled'));

      await expect(controller.update('CASH', { enabled: false }, mockUser)).rejects.toThrow(
        'At least one payment mode must remain enabled',
      );
    });
  });
});
