import { BadRequestException, Injectable } from '@nestjs/common';
import { PaymentModeSetting } from '@prisma/client';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { PaymentMode } from '../../domain/enums';

// Fallback used only if a row is missing (e.g. migrated but never seeded) —
// mirrors prisma/seed.ts: only CASH ships enabled by default.
const DEFAULT_ENABLED: Record<string, boolean> = {
  [PaymentMode.CASH]: true,
  [PaymentMode.UPI]: false,
};

@Injectable()
export class PaymentModeSettingsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listAll(): Promise<PaymentModeSetting[]> {
    const rows = await this.prisma.paymentModeSetting.findMany({
      orderBy: { paymentMode: 'asc' },
    });
    const existing = new Set(rows.map((r) => r.paymentMode));
    const missing = Object.values(PaymentMode).filter((mode) => !existing.has(mode as any));
    return [...rows, ...missing.map((paymentMode) => this.defaultRow(paymentMode as PaymentMode))];
  }

  async listEnabled(): Promise<PaymentMode[]> {
    const rows = await this.listAll();
    return rows.filter((r) => r.enabled).map((r) => r.paymentMode as PaymentMode);
  }

  async isEnabled(paymentMode: PaymentMode): Promise<boolean> {
    const row = await this.prisma.paymentModeSetting.findUnique({ where: { paymentMode: paymentMode as any } });
    return row?.enabled ?? DEFAULT_ENABLED[paymentMode];
  }

  async setEnabled(paymentMode: PaymentMode, enabled: boolean): Promise<PaymentModeSetting> {
    if (!enabled) {
      const others = await this.listEnabled();
      const wouldDisableLastOne = others.length === 1 && others[0] === paymentMode;
      if (wouldDisableLastOne) {
        throw new BadRequestException('At least one payment mode must remain enabled');
      }
    }

    return this.prisma.paymentModeSetting.upsert({
      where: { paymentMode: paymentMode as any },
      create: { paymentMode: paymentMode as any, enabled },
      update: { enabled },
    });
  }

  private defaultRow(paymentMode: PaymentMode): PaymentModeSetting {
    return { paymentMode: paymentMode as any, enabled: DEFAULT_ENABLED[paymentMode], updatedAt: new Date() };
  }
}
