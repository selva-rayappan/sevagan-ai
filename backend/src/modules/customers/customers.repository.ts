import { Injectable } from '@nestjs/common';
import { Customer } from '@prisma/client';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { Language } from '../../domain/enums';
import { normalizePhone } from '../../common/utils/phone.utils';

@Injectable()
export class CustomersRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByPhone(phone: string): Promise<Customer | null> {
    const normalized = normalizePhone(phone);
    const customer = await this.prisma.customer.findUnique({ where: { phone: normalized } });
    if (customer) return customer;
    if (phone !== normalized) {
      return this.prisma.customer.findUnique({ where: { phone } });
    }
    return null;
  }

  async findById(id: string): Promise<Customer | null> {
    return this.prisma.customer.findUnique({ where: { id } });
  }

  async upsert(phone: string, name?: string): Promise<Customer> {
    const normalized = normalizePhone(phone);
    return this.prisma.customer.upsert({
      where: { phone: normalized },
      create: { phone: normalized, name },
      update: name ? { name } : {},
    });
  }

  async updateLanguage(id: string, language: Language): Promise<void> {
    await this.prisma.customer.update({
      where: { id },
      data: { language: language as any },
    });
  }
}
