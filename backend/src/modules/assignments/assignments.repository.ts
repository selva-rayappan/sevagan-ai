import { Injectable } from '@nestjs/common';
import { Assignment } from '@prisma/client';
import { PrismaService } from '../../infrastructure/database/prisma.service';

export interface CreateAssignmentData {
  jobId: string;
  technicianId: string;
}

@Injectable()
export class AssignmentsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateAssignmentData): Promise<Assignment> {
    return this.prisma.assignment.create({ data });
  }

  // Assignment.jobId is @unique — a job has at most one current assignment,
  // not a history of them. Reassigning a job that was already offered to a
  // technician once (on rejection or on the offer-expiry timeout) must
  // replace that row, not insert a second one, or it throws a P2002 on
  // job_id. acceptedAt resets to null — the new technician hasn't accepted
  // yet, regardless of whether the previous one had.
  async upsertForJob(data: CreateAssignmentData): Promise<Assignment> {
    return this.prisma.assignment.upsert({
      where: { jobId: data.jobId },
      create: data,
      update: { technicianId: data.technicianId, assignedAt: new Date(), acceptedAt: null },
    });
  }

  async findByJobId(jobId: string): Promise<Assignment | null> {
    return this.prisma.assignment.findUnique({ where: { jobId } });
  }

  async findById(id: string): Promise<Assignment | null> {
    return this.prisma.assignment.findUnique({ where: { id } });
  }

  async accept(id: string): Promise<Assignment> {
    return this.prisma.assignment.update({
      where: { id },
      data: { acceptedAt: new Date() },
    });
  }

  async deleteById(id: string): Promise<void> {
    await this.prisma.assignment.delete({ where: { id } });
  }

  async findByTechnicianId(technicianId: string): Promise<Assignment[]> {
    return this.prisma.assignment.findMany({
      where: { technicianId },
      orderBy: { assignedAt: 'desc' },
    });
  }
}
