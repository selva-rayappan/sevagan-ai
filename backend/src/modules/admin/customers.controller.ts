import { Body, Controller, Get, Param, Patch, Query, Version } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';

@Controller('admin/customers')
export class CustomersAdminController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @Version('1')
  async list(@Query('page') page = '1', @Query('limit') limit = '20') {
    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const take = parseInt(limit, 10);
    const [customers, total] = await Promise.all([
      this.prisma.customer.findMany({
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.customer.count(),
    ]);
    return { data: customers, total, page: parseInt(page, 10), limit: take };
  }

  @Get(':id')
  @Version('1')
  async findOne(@Param('id') id: string) {
    return this.prisma.customer.findUniqueOrThrow({
      where: { id },
      include: { jobs: { orderBy: { createdAt: 'desc' }, take: 10, include: { serviceCategory: true } } },
    });
  }

  @Patch(':id')
  @Version('1')
  async update(@Param('id') id: string, @Body() body: { name?: string; address?: string }) {
    return this.prisma.customer.update({ where: { id }, data: body });
  }
}
