import { Controller, Get, Query, Version } from '@nestjs/common';
import { AuditService } from '../../infrastructure/audit/audit.service';
import { AdminRole } from '../../domain/enums';
import { Roles } from '../auth/roles.decorator';

@Roles(AdminRole.ADMIN)
@Controller('admin/audit-logs')
export class AuditLogsController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @Version('1')
  async list(
    @Query('entityType') entityType?: string,
    @Query('actorId') actorId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.auditService.list({
      entityType,
      actorId,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });
  }
}
