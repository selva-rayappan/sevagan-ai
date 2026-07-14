import { BadRequestException, Controller, Get, Query, Version } from '@nestjs/common';
import { ReportPeriod, ReportsService } from './reports.service';

const VALID_PERIODS: ReportPeriod[] = ['daily', 'weekly', 'monthly'];

@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('revenue')
  @Version('1')
  async revenue(@Query('period') period: string = 'daily') {
    if (!VALID_PERIODS.includes(period as ReportPeriod)) {
      throw new BadRequestException('period must be one of: daily, weekly, monthly');
    }
    return this.reportsService.getRevenueReport(period as ReportPeriod);
  }

  @Get('jobs')
  @Version('1')
  async jobs(@Query('from') from?: string, @Query('to') to?: string) {
    return this.reportsService.getJobsReport(from, to);
  }

  @Get('technicians')
  @Version('1')
  async technicians() {
    return this.reportsService.getTechniciansReport();
  }
}
