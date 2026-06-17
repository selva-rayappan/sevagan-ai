import { Injectable } from '@nestjs/common';
import { Rating } from '@prisma/client';
import { PrismaService } from '../../infrastructure/database/prisma.service';

@Injectable()
export class RatingsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    jobId: string,
    customerId: string,
    technicianId: string,
    rating: number,
  ): Promise<Rating> {
    return this.prisma.rating.create({
      data: { jobId, customerId, technicianId, rating },
    });
  }

  async getAverageForTechnician(technicianId: string): Promise<number> {
    const result = await this.prisma.rating.aggregate({
      where: { technicianId },
      _avg: { rating: true },
    });
    return result._avg.rating ?? 5.0;
  }
}
