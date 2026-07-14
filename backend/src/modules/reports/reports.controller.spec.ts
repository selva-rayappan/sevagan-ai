import { BadRequestException } from '@nestjs/common';
import { ReportsController } from './reports.controller';

const mockGetRevenueReport = jest.fn();
const mockGetJobsReport = jest.fn();
const mockGetTechniciansReport = jest.fn();

const mockReportsService = {
  getRevenueReport: mockGetRevenueReport,
  getJobsReport: mockGetJobsReport,
  getTechniciansReport: mockGetTechniciansReport,
} as any;

describe('ReportsController', () => {
  let controller: ReportsController;

  beforeEach(() => {
    controller = new ReportsController(mockReportsService);
    jest.clearAllMocks();
  });

  describe('revenue()', () => {
    it('defaults to the daily period when none is given', async () => {
      const report = { period: 'daily', data: [] };
      mockGetRevenueReport.mockResolvedValue(report);

      const result = await controller.revenue();

      expect(result).toBe(report);
      expect(mockGetRevenueReport).toHaveBeenCalledWith('daily');
    });

    it.each(['daily', 'weekly', 'monthly'])('accepts a valid "%s" period', async (period) => {
      mockGetRevenueReport.mockResolvedValue({ period, data: [] });

      await controller.revenue(period);

      expect(mockGetRevenueReport).toHaveBeenCalledWith(period);
    });

    it('rejects an invalid period', async () => {
      await expect(controller.revenue('yearly')).rejects.toThrow(BadRequestException);
      expect(mockGetRevenueReport).not.toHaveBeenCalled();
    });
  });

  describe('jobs()', () => {
    it('passes through optional from/to filters', async () => {
      const report = { byStatus: [], byCategory: [] };
      mockGetJobsReport.mockResolvedValue(report);

      const result = await controller.jobs('2026-06-01', '2026-06-30');

      expect(result).toBe(report);
      expect(mockGetJobsReport).toHaveBeenCalledWith('2026-06-01', '2026-06-30');
    });

    it('works with no filters', async () => {
      mockGetJobsReport.mockResolvedValue({ byStatus: [], byCategory: [] });

      await controller.jobs();

      expect(mockGetJobsReport).toHaveBeenCalledWith(undefined, undefined);
    });
  });

  describe('technicians()', () => {
    it('returns the technicians report', async () => {
      const report = [{ id: 'tech-1' }];
      mockGetTechniciansReport.mockResolvedValue(report);

      const result = await controller.technicians();

      expect(result).toBe(report);
    });
  });
});
