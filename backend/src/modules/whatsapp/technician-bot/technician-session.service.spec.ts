import { TechnicianSessionService } from './technician-session.service';
import { TechnicianConversationState } from './technician-session.types';
import { Language } from '../../../domain/enums';

const mockGetJson = jest.fn();
const mockSetJson = jest.fn();
const mockDel = jest.fn();

const mockRedis = {
  getJson: mockGetJson,
  setJson: mockSetJson,
  del: mockDel,
} as any;

describe('TechnicianSessionService', () => {
  let service: TechnicianSessionService;

  beforeEach(() => {
    service = new TechnicianSessionService(mockRedis);
    jest.clearAllMocks();
  });

  describe('createNewSession()', () => {
    it('returns an IDLE session with EN language by default', () => {
      const session = service.createNewSession('919111111111');

      expect(session.state).toBe(TechnicianConversationState.IDLE);
      expect(session.phone).toBe('919111111111');
      expect(session.language).toBe(Language.EN);
      expect(session.updatedAt).toBeTruthy();
    });

    it('uses the provided language', () => {
      const session = service.createNewSession('919111111111', Language.TA);
      expect(session.language).toBe(Language.TA);
    });
  });

  describe('getSession()', () => {
    it('returns null when no session in Redis', async () => {
      mockGetJson.mockResolvedValue(null);
      const result = await service.getSession('919111111111');
      expect(result).toBeNull();
      expect(mockGetJson).toHaveBeenCalledWith('tech_session:919111111111');
    });

    it('returns the stored session', async () => {
      const stored = {
        state: TechnicianConversationState.JOB_ACCEPTED,
        phone: '919111111111',
        language: Language.EN,
        activeJobId: 'job-1',
        updatedAt: '2026-06-14T10:00:00.000Z',
      };
      mockGetJson.mockResolvedValue(stored);
      const result = await service.getSession('919111111111');
      expect(result).toEqual(stored);
    });
  });

  describe('saveSession()', () => {
    it('persists the session with 24-hour TTL', async () => {
      mockSetJson.mockResolvedValue(undefined);
      const session = service.createNewSession('919111111111');
      const before = new Date().toISOString();

      await service.saveSession(session);

      expect(mockSetJson).toHaveBeenCalledWith(
        'tech_session:919111111111',
        expect.objectContaining({ phone: '919111111111' }),
        86400,
      );
      expect(session.updatedAt >= before).toBe(true);
    });
  });

  describe('clearSession()', () => {
    it('deletes the session from Redis', async () => {
      mockDel.mockResolvedValue(undefined);
      await service.clearSession('919111111111');
      expect(mockDel).toHaveBeenCalledWith('tech_session:919111111111');
    });
  });
});
