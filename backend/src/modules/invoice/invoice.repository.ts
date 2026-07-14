import { Injectable } from '@nestjs/common';
import { Invoice, Prisma } from '@prisma/client';
import { PrismaService } from '../../infrastructure/database/prisma.service';

export interface InvoiceWithDetails extends Invoice {
  job: {
    id: string;
    jobNumber: string;
    location: string;
    jobAmount: any;
    paymentMode: string | null;
    customer: { id: string; name: string | null; phone: string; language: string };
    serviceCategory: { name: string };
    assignment: { technician: { name: string; phone: string } } | null;
    commission: { commissionAmount: any; technicianAmount: any } | null;
  };
}

export interface InvoiceListFilters {
  status?: string;
  fromDate?: Date;
  toDate?: Date;
  page?: number;
  limit?: number;
}

@Injectable()
export class InvoiceRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    invoiceNumber: string;
    jobId: string;
    amount: number;
  }): Promise<Invoice> {
    return this.prisma.invoice.create({
      data: {
        invoiceNumber: data.invoiceNumber,
        jobId: data.jobId,
        amount: data.amount,
        status: 'DRAFT',
      },
    });
  }

  async findById(id: string): Promise<InvoiceWithDetails | null> {
    return this.prisma.invoice.findUnique({
      where: { id },
      include: {
        job: {
          include: {
            customer: true,
            serviceCategory: true,
            assignment: { include: { technician: true } },
            commission: true,
          },
        },
      },
    }) as Promise<InvoiceWithDetails | null>;
  }

  async findByJobId(jobId: string): Promise<Invoice | null> {
    return this.prisma.invoice.findUnique({ where: { jobId } });
  }

  async findAll(filters: InvoiceListFilters): Promise<{ invoices: InvoiceWithDetails[]; total: number }> {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.InvoiceWhereInput = {};
    if (filters.status) {
      where.status = filters.status as any;
    }
    if (filters.fromDate || filters.toDate) {
      where.createdAt = {};
      if (filters.fromDate) where.createdAt.gte = filters.fromDate;
      if (filters.toDate) where.createdAt.lte = filters.toDate;
    }

    const [invoices, total] = await Promise.all([
      this.prisma.invoice.findMany({
        where,
        include: {
          job: {
            include: {
              customer: true,
              serviceCategory: true,
              assignment: { include: { technician: true } },
              commission: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.invoice.count({ where }),
    ]);

    return { invoices: invoices as InvoiceWithDetails[], total };
  }

  async updateStatus(id: string, status: string): Promise<Invoice> {
    return this.prisma.invoice.update({
      where: { id },
      data: { status: status as any },
    });
  }

  async setPdfUrl(id: string, pdfUrl: string): Promise<Invoice> {
    return this.prisma.invoice.update({
      where: { id },
      data: { pdfUrl },
    });
  }
}
