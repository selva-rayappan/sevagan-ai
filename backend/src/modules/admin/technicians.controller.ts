import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Version } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { TechniciansRepository } from '../technicians/technicians.repository';
import { Language, TechnicianStatus } from '../../domain/enums';
import {
  WHATSAPP_PROVIDER,
  WhatsAppProvider,
} from '../../infrastructure/messaging/whatsapp.provider.interface';
import { TranslationService } from '../../infrastructure/i18n/translation.service';

@Controller('admin/technicians')
export class TechniciansAdminController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly techniciansRepo: TechniciansRepository,
    @Inject(WHATSAPP_PROVIDER) private readonly whatsapp: WhatsAppProvider,
    private readonly translation: TranslationService,
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
  async create(
    @Body()
    body: {
      name: string;
      phone: string;
      serviceArea: string;
      language?: string;
      categoryIds?: string[];
    },
  ) {
    const technician = await this.techniciansRepo.create({
      name: body.name,
      phone: body.phone,
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
        to: body.phone,
        text: this.translation.translate('technician.welcome', lang, {
          service: primaryCategory?.name ?? 'Home Services',
          serviceArea: body.serviceArea,
        }),
      })
      .catch(() => undefined);

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
  async update(
    @Param('id') id: string,
    @Body() body: { name?: string; serviceArea?: string; status?: string; active?: boolean },
  ) {
    return this.techniciansRepo.update(id, body as any);
  }

  @Post(':id/skills')
  @Version('1')
  async addSkill(@Param('id') technicianId: string, @Body() body: { categoryId: string }) {
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
