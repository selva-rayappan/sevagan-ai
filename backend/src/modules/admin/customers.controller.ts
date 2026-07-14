import { Body, Controller, Get, Param, Patch, Query, UseInterceptors, Version } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { CurrentUser, CurrentUserPayload } from '../auth/current-user.decorator';
import { AuditService } from '../../infrastructure/audit/audit.service';
import { AuditInterceptor } from '../../common/interceptors/audit.interceptor';
import { UpdateCustomerDto } from './dto/customers.dto';

@UseInterceptors(AuditInterceptor)
@Controller('admin/customers')
export class CustomersAdminController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

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
  async update(@Param('id') id: string, @Body() body: UpdateCustomerDto, @CurrentUser() user: CurrentUserPayload) {
    const customer = await this.prisma.customer.update({ where: { id }, data: body });

    await this.auditService.log({
      actorId: user.id,
      actorType: 'ADMIN_USER',
      action: 'UPDATE_CUSTOMER',
      entityType: 'Customer',
      entityId: id,
      metadata: { ...body },
    });

    return customer;
  }
}
