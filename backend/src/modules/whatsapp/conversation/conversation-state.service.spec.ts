import { ConversationStateService } from './conversation-state.service';
import { ConversationState } from './conversation-state.types';
import { Language } from '../../../domain/enums';

const mockGetJson = jest.fn();
const mockSetJson = jest.fn();
const mockDel = jest.fn();

const mockRedis = {
  getJson: mockGetJson,
  setJson: mockSetJson,
  del: mockDel,
} as any;

describe('ConversationStateService', () => {
  let service: ConversationStateService;

  beforeEach(() => {
    service = new ConversationStateService(mockRedis);
    jest.clearAllMocks();
  });

  describe('createNewSession()', () => {
    it('returns an IDLE session with the given phone and default EN language', () => {
      const session = service.createNewSession('919876543210');

      expect(session.state).toBe(ConversationState.IDLE);
      expect(session.phone).toBe('919876543210');
      expect(session.language).toBe(Language.EN);
      expect(session.updatedAt).toBeTruthy();
    });

    it('uses the provided language', () => {
      const session = service.createNewSession('919876543210', Language.TA);
      expect(session.language).toBe(Language.TA);
    });
  });

  describe('getSession()', () => {
    it('returns null when no session exists in Redis', async () => {
      mockGetJson.mockResolvedValue(null);

      const result = await service.getSession('919876543210');

      expect(result).toBeNull();
      expect(mockGetJson).toHaveBeenCalledWith('conv:919876543210');
    });

    it('returns the parsed session when found in Redis', async () => {
      const stored = {
        state: ConversationState.AWAITING_SERVICE,
        phone: '919876543210',
        language: Language.TA,
        updatedAt: '2026-06-14T10:00:00.000Z',
      };
      mockGetJson.mockResolvedValue(stored);

      const result = await service.getSession('919876543210');

      expect(result).toEqual(stored);
    });
  });

  describe('saveSession()', () => {
    it('persists the session to Redis with 24-hour TTL and updates updatedAt', async () => {
      mockSetJson.mockResolvedValue(undefined);
      const session = service.createNewSession('919876543210');
      const before = new Date().toISOString();

      await service.saveSession(session);

      expect(mockSetJson).toHaveBeenCalledWith(
        'conv:919876543210',
        expect.objectContaining({ phone: '919876543210' }),
        86400,
      );
      expect(session.updatedAt >= before).toBe(true);
    });
  });

  describe('clearSession()', () => {
    it('deletes the session key from Redis', async () => {
      mockDel.mockResolvedValue(undefined);

      await service.clearSession('919876543210');

      expect(mockDel).toHaveBeenCalledWith('conv:919876543210');
    });
  });
});
