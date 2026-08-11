import { Body, Controller, Delete, Get, Logger, Param, Patch, Post, Query, UseInterceptors, Version } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { TechniciansRepository } from '../technicians/technicians.repository';
import { Language } from '../../domain/enums';
import {
  WHATSAPP_PROVIDER,
  WhatsAppProvider,
} from '../../infrastructure/messaging/whatsapp.provider.interface';
import { toMetaTemplateLanguageCode } from '../../infrastructure/messaging/whatsapp-language.util';
import { CurrentUser, CurrentUserPayload } from '../auth/current-user.decorator';
import { AuditService } from '../../infrastructure/audit/audit.service';
import { AuditInterceptor } from '../../common/interceptors/audit.interceptor';
import { AddSkillDto, CreateTechnicianDto, SendTechnicianMessageDto, UpdateTechnicianDto } from './dto/technicians.dto';
import { normalizePhone } from '../../common/utils/phone.utils';

@UseInterceptors(AuditInterceptor)
@Controller('admin/technicians')
export class TechniciansAdminController {
  private readonly logger = new Logger(TechniciansAdminController.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly techniciansRepo: TechniciansRepository,
    @Inject(WHATSAPP_PROVIDER) private readonly whatsapp: WhatsAppProvider,
    private readonly configService: ConfigService,
    private readonly auditService: AuditService,
  ) {}

  @Get()
  @Version('1')
  async list(
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Query('status') status?: string,
    @Query('active') active?: string,
  ) {
    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const take = parseInt(limit, 10);
    // Defaults to active-only for backward compatibility; ?active=false surfaces
    // deactivated technicians (otherwise unreachable once toggled off), ?active=all shows both.
    const where: any = active === 'all' ? {} : { active: active !== 'false' };
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
      address: body.address,
      aadharNumber: body.aadharNumber,
      serviceArea: body.serviceArea,
      language: (body.language as Language) ?? Language.EN,
      priorityRank: body.priorityRank,
    });

    if (body.categoryIds?.length) {
      await this.prisma.technicianSkill.createMany({
        data: body.categoryIds.map((categoryId) => ({ technicianId: technician.id, categoryId })),
        skipDuplicates: true,
      });
    }

    // Onboarding is a business-initiated message — the technician has never
    // messaged us, so it's outside WhatsApp's 24-hour session window and must
    // go through a pre-approved template rather than free-form text.
    const lang = (body.language as Language) ?? Language.EN;
    const primaryCategory = body.categoryIds?.length
      ? await this.prisma.serviceCategory.findUnique({ where: { id: body.categoryIds[0] } })
      : null;

    let welcomeMessageSent = true;
    try {
      await this.whatsapp.sendTemplate({
        to: phone,
        templateName: this.configService.get<string>(
          'whatsapp.templates.technicianWelcome',
          'technician_welcome',
        ),
        languageCode: toMetaTemplateLanguageCode(lang),
        bodyParams: [primaryCategory?.name ?? 'Home Services', body.serviceArea],
      });
    } catch (err) {
      welcomeMessageSent = false;
      this.logger.error(`Failed to send welcome template to technician ${technician.id}: ${(err as Error).message}`);
    }

    await this.auditService.log({
      actorId: user.id,
      actorType: 'ADMIN_USER',
      action: 'CREATE_TECHNICIAN',
      entityType: 'Technician',
      entityId: technician.id,
      metadata: { name: body.name, phone, serviceArea: body.serviceArea, welcomeMessageSent },
    });

    const created = await this.prisma.technician.findUnique({
      where: { id: technician.id },
      include: { skills: { include: { category: true } } },
    });

    return { ...created, welcomeMessageSent };
  }

  @Get(':id')
  @Version('1')
  async findOne(@Param('id') id: string) {
    const technician = await this.prisma.technician.findUniqueOrThrow({
      where: { id },
      include: {
        skills: { include: { category: true } },
        assignments: { take: 10, orderBy: { assignedAt: 'desc' }, include: { job: true } },
      },
    });

    const stats = await this.prisma.jobCommission.aggregate({
      where: { job: { assignment: { technicianId: id } } },
      _sum: { technicianAmount: true, commissionAmount: true },
      _count: true,
    });

    return {
      ...technician,
      totalJobs: stats._count,
      totalEarnings: stats._sum.technicianAmount ?? 0,
      totalCommission: stats._sum.commissionAmount ?? 0,
    };
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

  @Post(':id/send-message')
  @Version('1')
  async sendMessage(
    @Param('id') id: string,
    @Body() body: SendTechnicianMessageDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    const technician = await this.prisma.technician.findUniqueOrThrow({ where: { id } });

    // Free-form text only reaches the technician within an active 24-hour
    // WhatsApp session (i.e. they've messaged the bot recently) — unlike
    // onboarding, there's no fixed template for arbitrary admin text, so we
    // just surface success/failure honestly rather than silently swallowing it.
    let sent = true;
    let errorMessage: string | undefined;
    try {
      await this.whatsapp.sendText({ to: technician.phone, text: body.message });
    } catch (err) {
      sent = false;
      errorMessage = (err as Error).message;
      this.logger.error(`Failed to send admin message to technician ${id}: ${errorMessage}`);
    }

    await this.auditService.log({
      actorId: user.id,
      actorType: 'ADMIN_USER',
      action: 'SEND_TECHNICIAN_MESSAGE',
      entityType: 'Technician',
      entityId: id,
      metadata: { message: body.message, sent },
    });

    return { sent, error: sent ? undefined : errorMessage };
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
