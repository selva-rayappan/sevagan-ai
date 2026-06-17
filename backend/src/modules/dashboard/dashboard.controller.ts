import { Controller, Get, Version } from '@nestjs/common';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('kpis')
  @Version('1')
  getKpis() {
    return this.dashboardService.getKpis();
  }
}
