import { Injectable } from '@nestjs/common';
import { Technician } from '@prisma/client';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { Language, TechnicianStatus } from '../../domain/enums';
import { normalizePhone } from '../../common/utils/phone.utils';

export interface AdminCreateTechnicianData {
  name: string;
  phone: string;
  address: string;
  aadharNumber?: string;
  serviceArea: string;
  language?: Language;
}

export interface AdminUpdateTechnicianData {
  name?: string;
  phone?: string;
  address?: string;
  aadharNumber?: string;
  serviceArea?: string;
  language?: Language;
  status?: TechnicianStatus;
  active?: boolean;
}

@Injectable()
export class TechniciansRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByPhone(phone: string): Promise<Technician | null> {
    const normalized = normalizePhone(phone);
    const tech = await this.prisma.technician.findUnique({ where: { phone: normalized } });
    if (tech) return tech;
    if (phone !== normalized) {
      return this.prisma.technician.findUnique({ where: { phone } });
    }
    return null;
  }

  async findById(id: string): Promise<Technician | null> {
    return this.prisma.technician.findUnique({ where: { id } });
  }

  async updateLanguage(id: string, language: Language): Promise<void> {
    await this.prisma.technician.update({
      where: { id },
      data: { language: language as any },
    });
  }

  async updateStatus(id: string, status: TechnicianStatus): Promise<void> {
    await this.prisma.technician.update({
      where: { id },
      data: { status: status as any },
    });
  }

  async updateTrustScore(id: string, trustScore: number): Promise<void> {
    await this.prisma.technician.update({
      where: { id },
      data: { trustScore },
    });
  }

  async updateRating(id: string, rating: number): Promise<void> {
    await this.prisma.technician.update({
      where: { id },
      data: { rating },
    });
  }

  async findBestAvailable(
    categoryId: string,
    location: string,
    excludedIds: string[],
  ): Promise<Technician | null> {
    const baseWhere = {
      status: TechnicianStatus.AVAILABLE as any,
      active: true,
      skills: { some: { categoryId } },
      ...(excludedIds.length > 0 ? { id: { notIn: excludedIds } } : {}),
    };
    const orderBy = [{ trustScore: 'desc' as const }, { rating: 'desc' as const }];

    const locationKeyword = this.extractLocationKeyword(location);
    const areaMatch = await this.prisma.technician.findFirst({
      where: { ...baseWhere, serviceArea: { contains: locationKeyword, mode: 'insensitive' } },
      orderBy,
    });
    if (areaMatch) return areaMatch;

    // No technician covers this specific area — fall back to the best
    // available technician with the right skill regardless of service area,
    // rather than leaving the job unassigned.
    return this.prisma.technician.findFirst({ where: baseWhere, orderBy });
  }

  async findAll(activeOnly = true): Promise<Technician[]> {
    return this.prisma.technician.findMany({
      where: activeOnly ? { active: true } : undefined,
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(data: AdminCreateTechnicianData): Promise<Technician> {
    const normalizedPhone = normalizePhone(data.phone);
    return this.prisma.technician.create({
      data: {
        ...data,
        phone: normalizedPhone,
        language: (data.language ?? Language.EN) as any,
      },
    });
  }

  async update(id: string, data: AdminUpdateTechnicianData): Promise<Technician> {
    const updateData = { ...data };
    if (updateData.phone) {
      updateData.phone = normalizePhone(updateData.phone);
    }
    return this.prisma.technician.update({ where: { id }, data: updateData as any });
  }

  private extractLocationKeyword(location: string): string {
    const parts = location.split(',');
    return parts[parts.length - 1].trim();
  }
}
