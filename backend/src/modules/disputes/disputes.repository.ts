import { Injectable } from '@nestjs/common';
import { Dispute } from '@prisma/client';
import { PrismaService } from '../../infrastructure/database/prisma.service';

@Injectable()
export class DisputesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    jobId: string,
    customerAmount: number,
    technicianAmount: number,
  ): Promise<Dispute> {
    return this.prisma.dispute.create({
      data: { jobId, customerAmount, technicianAmount },
    });
  }
}
