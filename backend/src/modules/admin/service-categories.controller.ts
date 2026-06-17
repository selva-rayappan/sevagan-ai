import { Controller, Get, Version } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';

@Controller('admin/service-categories')
export class ServiceCategoriesAdminController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @Version('1')
  async list() {
    return this.prisma.serviceCategory.findMany({ where: { active: true }, orderBy: { name: 'asc' } });
  }
}
