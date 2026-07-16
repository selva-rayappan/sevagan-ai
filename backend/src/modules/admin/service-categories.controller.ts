import {
  Body,
  ConflictException,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseInterceptors,
  Version,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { CurrentUser, CurrentUserPayload } from '../auth/current-user.decorator';
import { AuditService } from '../../infrastructure/audit/audit.service';
import { AuditInterceptor } from '../../common/interceptors/audit.interceptor';
import { CreateServiceCategoryDto, UpdateServiceCategoryDto } from './dto/service-categories.dto';

@UseInterceptors(AuditInterceptor)
@Controller('admin/service-categories')
export class ServiceCategoriesAdminController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  @Get()
  @Version('1')
  async list(@Query('all') all?: string) {
    return this.prisma.serviceCategory.findMany({
      where: all === 'true' ? undefined : { active: true },
      orderBy: { name: 'asc' },
    });
  }

  @Post()
  @Version('1')
  async create(@Body() body: CreateServiceCategoryDto, @CurrentUser() user: CurrentUserPayload) {
    const category = await this.prisma.serviceCategory.create({
      data: { name: body.name, description: body.description },
    });

    await this.auditService.log({
      actorId: user.id,
      actorType: 'ADMIN_USER',
      action: 'CREATE_SERVICE_CATEGORY',
      entityType: 'ServiceCategory',
      entityId: category.id,
      metadata: { name: body.name },
    });

    return category;
  }

  @Patch(':id')
  @Version('1')
  async update(
    @Param('id') id: string,
    @Body() body: UpdateServiceCategoryDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    const category = await this.prisma.serviceCategory.update({ where: { id }, data: body });

    await this.auditService.log({
      actorId: user.id,
      actorType: 'ADMIN_USER',
      action: 'UPDATE_SERVICE_CATEGORY',
      entityType: 'ServiceCategory',
      entityId: id,
      metadata: { ...body },
    });

    return category;
  }

  @Delete(':id')
  @Version('1')
  async remove(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    try {
      await this.prisma.serviceCategory.delete({ where: { id } });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2003') {
        throw new ConflictException(
          'Cannot remove this service — technicians or jobs still reference it. Use Hold instead.',
        );
      }
      throw err;
    }

    await this.auditService.log({
      actorId: user.id,
      actorType: 'ADMIN_USER',
      action: 'DELETE_SERVICE_CATEGORY',
      entityType: 'ServiceCategory',
      entityId: id,
    });

    return { message: 'Service category removed' };
  }
}
