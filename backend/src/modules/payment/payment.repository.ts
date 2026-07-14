import { Injectable } from '@nestjs/common';
import { Payment } from '@prisma/client';
import { PrismaService } from '../../infrastructure/database/prisma.service';

@Injectable()
export class PaymentRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    invoiceId: string;
    amount: number;
    method: string;
    status: string;
  }): Promise<Payment> {
    return this.prisma.payment.create({
      data: {
        invoiceId: data.invoiceId,
        amount: data.amount,
        method: data.method as any,
        status: data.status as any,
      },
    });
  }

  async findByInvoiceId(invoiceId: string): Promise<Payment | null> {
    return this.prisma.payment.findUnique({ where: { invoiceId } });
  }

  async findById(id: string): Promise<Payment | null> {
    return this.prisma.payment.findUnique({ where: { id } });
  }

  async updateStatus(id: string, status: string): Promise<Payment> {
    return this.prisma.payment.update({
      where: { id },
      data: { status: status as any },
    });
  }
}
