import { Injectable } from '@nestjs/common';
import { RedisService } from '../../../infrastructure/cache/redis.service';
import { Language } from '../../../domain/enums';
import { ConversationSession, ConversationState } from './conversation-state.types';

const SESSION_TTL_SECONDS = 86400; // 24 hours
const KEY_PREFIX = 'conv:';

@Injectable()
export class ConversationStateService {
  constructor(private readonly redis: RedisService) {}

  async getSession(phone: string): Promise<ConversationSession | null> {
    return this.redis.getJson<ConversationSession>(`${KEY_PREFIX}${phone}`);
  }

  async saveSession(session: ConversationSession): Promise<void> {
    session.updatedAt = new Date().toISOString();
    await this.redis.setJson(`${KEY_PREFIX}${session.phone}`, session, SESSION_TTL_SECONDS);
  }

  async clearSession(phone: string): Promise<void> {
    await this.redis.del(`${KEY_PREFIX}${phone}`);
  }

  createNewSession(phone: string, language: Language = Language.EN): ConversationSession {
    return {
      state: ConversationState.IDLE,
      phone,
      language,
      updatedAt: new Date().toISOString(),
    };
  }
}
