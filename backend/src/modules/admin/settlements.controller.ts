import { Body, Controller, Get, Param, Post, Query, Version } from '@nestjs/common';
import { SettlementService } from '../settlement/settlement.service';
import { SettlementStatus } from '../../domain/enums';

@Controller('admin/settlements')
export class SettlementsAdminController {
  constructor(private readonly settlementService: SettlementService) {}

  @Get()
  @Version('1')
  async list(@Query('technicianId') technicianId?: string, @Query('status') status?: string) {
    return this.settlementService.listSettlements(
      technicianId,
      status as SettlementStatus | undefined,
    );
  }

  @Post('generate')
  @Version('1')
  async generate(
    @Body() body: { technicianId: string; periodStart: string; periodEnd: string },
  ) {
    return this.settlementService.generateSettlementForTechnician(
      body.technicianId,
      new Date(body.periodStart),
      new Date(body.periodEnd),
    );
  }

  @Post(':id/pay')
  @Version('1')
  async markPaid(@Param('id') id: string) {
    return this.settlementService.markSettlementPaid(id);
  }
}
