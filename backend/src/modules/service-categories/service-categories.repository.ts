import { Injectable } from '@nestjs/common';
import { ServiceCategory } from '@prisma/client';
import { PrismaService } from '../../infrastructure/database/prisma.service';

@Injectable()
export class ServiceCategoriesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<ServiceCategory[]> {
    return this.prisma.serviceCategory.findMany({ orderBy: { name: 'asc' } });
  }

  async findActive(): Promise<ServiceCategory[]> {
    return this.prisma.serviceCategory.findMany({
      where: { active: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findByName(name: string): Promise<ServiceCategory | null> {
    return this.prisma.serviceCategory.findUnique({ where: { name } });
  }

  async findById(id: string): Promise<ServiceCategory | null> {
    return this.prisma.serviceCategory.findUnique({ where: { id } });
  }
}
