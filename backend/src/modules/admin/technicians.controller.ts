import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseInterceptors, Version } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { TechniciansRepository } from '../technicians/technicians.repository';
import { Language } from '../../domain/enums';
import {
  WHATSAPP_PROVIDER,
  WhatsAppProvider,
} from '../../infrastructure/messaging/whatsapp.provider.interface';
import { TranslationService } from '../../infrastructure/i18n/translation.service';
import { CurrentUser, CurrentUserPayload } from '../auth/current-user.decorator';
import { AuditService } from '../../infrastructure/audit/audit.service';
import { AuditInterceptor } from '../../common/interceptors/audit.interceptor';
import { AddSkillDto, CreateTechnicianDto, UpdateTechnicianDto } from './dto/technicians.dto';
import { normalizePhone } from '../../common/utils/phone.utils';

@UseInterceptors(AuditInterceptor)
@Controller('admin/technicians')
export class TechniciansAdminController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly techniciansRepo: TechniciansRepository,
    @Inject(WHATSAPP_PROVIDER) private readonly whatsapp: WhatsAppProvider,
    private readonly translation: TranslationService,
    private readonly auditService: AuditService,
  ) {}

  @Get()
  @Version('1')
  async list(@Query('page') page = '1', @Query('limit') limit = '20', @Query('status') status?: string) {
    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const take = parseInt(limit, 10);
    const where: any = { active: true };
    if (status) where.status = status;
    const [technicians, total] = await Promise.all([
      this.prisma.technician.findMany({
        skip,
        take,
        where,
        include: { skills: { include: { category: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.technician.count({ where }),
    ]);
    return { data: technicians, total, page: parseInt(page, 10), limit: take };
  }

  @Post()
  @Version('1')
  async create(@Body() body: CreateTechnicianDto, @CurrentUser() user: CurrentUserPayload) {
    const phone = normalizePhone(body.phone);
    const technician = await this.techniciansRepo.create({
      name: body.name,
      phone,
      serviceArea: body.serviceArea,
      language: (body.language as Language) ?? Language.EN,
    });

    if (body.categoryIds?.length) {
      await this.prisma.technicianSkill.createMany({
        data: body.categoryIds.map((categoryId) => ({ technicianId: technician.id, categoryId })),
        skipDuplicates: true,
      });
    }

    // Send onboarding message
    const lang = (body.language as Language) ?? Language.EN;
    const primaryCategory = body.categoryIds?.length
      ? await this.prisma.serviceCategory.findUnique({ where: { id: body.categoryIds[0] } })
      : null;

    await this.whatsapp
      .sendText({
        to: phone,
        text: this.translation.translate('technician.welcome', lang, {
          service: primaryCategory?.name ?? 'Home Services',
          serviceArea: body.serviceArea,
        }),
      })
      .catch(() => undefined);

    await this.auditService.log({
      actorId: user.id,
      actorType: 'ADMIN_USER',
      action: 'CREATE_TECHNICIAN',
      entityType: 'Technician',
      entityId: technician.id,
      metadata: { name: body.name, phone, serviceArea: body.serviceArea },
    });

    return this.prisma.technician.findUnique({
      where: { id: technician.id },
      include: { skills: { include: { category: true } } },
    });
  }

  @Get(':id')
  @Version('1')
  async findOne(@Param('id') id: string) {
    return this.prisma.technician.findUniqueOrThrow({
      where: { id },
      include: {
        skills: { include: { category: true } },
        assignments: { take: 10, orderBy: { assignedAt: 'desc' }, include: { job: true } },
      },
    });
  }

  @Patch(':id')
  @Version('1')
  async update(@Param('id') id: string, @Body() body: UpdateTechnicianDto, @CurrentUser() user: CurrentUserPayload) {
    const technician = await this.techniciansRepo.update(id, body);

    await this.auditService.log({
      actorId: user.id,
      actorType: 'ADMIN_USER',
      action: 'UPDATE_TECHNICIAN',
      entityType: 'Technician',
      entityId: id,
      metadata: { ...body },
    });

    return technician;
  }

  @Post(':id/skills')
  @Version('1')
  async addSkill(@Param('id') technicianId: string, @Body() body: AddSkillDto) {
    return this.prisma.technicianSkill.upsert({
      where: { technicianId_categoryId: { technicianId, categoryId: body.categoryId } },
      create: { technicianId, categoryId: body.categoryId },
      update: {},
    });
  }

  @Delete(':id/skills/:categoryId')
  @Version('1')
  async removeSkill(@Param('id') technicianId: string, @Param('categoryId') categoryId: string) {
    await this.prisma.technicianSkill.delete({
      where: { technicianId_categoryId: { technicianId, categoryId } },
    });
    return { deleted: true };
  }
}
