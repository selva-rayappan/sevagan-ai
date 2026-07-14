import { Injectable, Logger } from '@nestjs/common';
import { AuditLog, Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';

export interface AuditLogEntry {
  actorId?: string;
  actorType?: string;
  action: string;
  entityType: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
}

export interface AuditLogFilters {
  entityType?: string;
  actorId?: string;
  page?: number;
  limit?: number;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Never throws — a logging failure must not block the action it's auditing.
   */
  async log(entry: AuditLogEntry): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: { ...entry, metadata: entry.metadata as Prisma.InputJsonValue },
      });
    } catch (err) {
      this.logger.error(`Failed to write audit log for action "${entry.action}": ${(err as Error).message}`);
    }
  }

  async list(filters: AuditLogFilters): Promise<{ logs: AuditLog[]; total: number }> {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: { entityType?: string; actorId?: string } = {};
    if (filters.entityType) where.entityType = filters.entityType;
    if (filters.actorId) where.actorId = filters.actorId;

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: limit }),
      this.prisma.auditLog.count({ where }),
    ]);

    return { logs, total };
  }
}
