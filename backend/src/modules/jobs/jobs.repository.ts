import { Injectable } from '@nestjs/common';
import { Assignment, Customer, Job, ServiceCategory, Technician } from '@prisma/client';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { JobStatus, PaymentMode } from '../../domain/enums';

export type JobWithCategory = Job & { serviceCategory: ServiceCategory };

export type JobWithDetails = Job & {
  serviceCategory: ServiceCategory;
  customer: Customer;
  assignment: (Assignment & { technician: Technician }) | null;
};

export interface CreateJobData {
  jobNumber: string;
  customerId: string;
  serviceCategoryId: string;
  location: string;
  description?: string;
}

@Injectable()
export class JobsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateJobData): Promise<Job> {
    return this.prisma.job.create({
      data: {
        jobNumber: data.jobNumber,
        customerId: data.customerId,
        serviceCategoryId: data.serviceCategoryId,
        location: data.location,
        description: data.description,
      },
    });
  }

  async findById(id: string): Promise<Job | null> {
    return this.prisma.job.findUnique({ where: { id } });
  }

  async findByIdWithDetails(id: string): Promise<JobWithDetails | null> {
    return this.prisma.job.findUnique({
      where: { id },
      include: {
        serviceCategory: true,
        customer: true,
        assignment: { include: { technician: true } },
      },
    }) as Promise<JobWithDetails | null>;
  }

  async findByJobNumber(jobNumber: string): Promise<JobWithCategory | null> {
    return this.prisma.job.findUnique({
      where: { jobNumber },
      include: { serviceCategory: true },
    });
  }

  async findByCustomerId(customerId: string): Promise<Job[]> {
    return this.prisma.job.findMany({
      where: { customerId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByTechnicianId(technicianId: string, limit = 5): Promise<JobWithCategory[]> {
    return this.prisma.job.findMany({
      where: { assignment: { technicianId } },
      include: { serviceCategory: true },
      orderBy: { createdAt: 'desc' },
      take: limit,
    }) as Promise<JobWithCategory[]>;
  }

  async updateStatus(id: string, status: JobStatus): Promise<Job> {
    return this.prisma.job.update({
      where: { id },
      data: { status: status as any },
    });
  }

  async setCompletion(id: string, amount: number, paymentMode: PaymentMode): Promise<Job> {
    return this.prisma.job.update({
      where: { id },
      data: {
        jobAmount: amount,
        paymentMode: paymentMode as any,
        status: 'COMPLETED' as any,
      },
    });
  }

  async appendDescription(id: string, addition: string): Promise<void> {
    const job = await this.prisma.job.findUnique({ where: { id }, select: { description: true } });
    const current = job?.description ?? '';
    await this.prisma.job.update({
      where: { id },
      data: { description: current ? `${current}\n${addition}` : addition },
    });
  }
}
