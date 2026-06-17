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
