import { Body, Controller, Get, Param, Post, Query, Version } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { DisputeStatus } from '../../domain/enums';

@Controller('admin/disputes')
export class DisputesAdminController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @Version('1')
  async list(@Query('status') status?: string) {
    return this.prisma.dispute.findMany({
      where: status ? { status: status as any } : undefined,
      include: { job: { include: { customer: true, serviceCategory: true, assignment: { include: { technician: true } } } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  @Get(':id')
  @Version('1')
  async findOne(@Param('id') id: string) {
    return this.prisma.dispute.findUniqueOrThrow({
      where: { id },
      include: { job: { include: { customer: true, assignment: { include: { technician: true } } } } },
    });
  }

  @Post(':id/resolve')
  @Version('1')
  async resolve(@Param('id') id: string, @Body() body: { notes?: string }) {
    return this.prisma.dispute.update({
      where: { id },
      data: {
        status: DisputeStatus.RESOLVED as any,
        notes: body.notes,
        resolvedAt: new Date(),
      },
    });
  }
}
