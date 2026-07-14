import { DashboardController } from './dashboard.controller';

const mockGetKpis = jest.fn();
const mockDashboardService = { getKpis: mockGetKpis } as any;

describe('DashboardController', () => {
  let controller: DashboardController;

  beforeEach(() => {
    controller = new DashboardController(mockDashboardService);
    jest.clearAllMocks();
  });

  describe('getKpis()', () => {
    it('delegates to DashboardService.getKpis', () => {
      const kpis = { jobsToday: 5 };
      mockGetKpis.mockReturnValue(kpis);

      const result = controller.getKpis();

      expect(result).toBe(kpis);
      expect(mockGetKpis).toHaveBeenCalledTimes(1);
    });
  });
});
