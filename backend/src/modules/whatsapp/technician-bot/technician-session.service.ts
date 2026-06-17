import { Injectable } from '@nestjs/common';
import { RedisService } from '../../../infrastructure/cache/redis.service';
import { Language } from '../../../domain/enums';
import { TechnicianSession, TechnicianConversationState } from './technician-session.types';

const SESSION_TTL_SECONDS = 86400; // 24 hours
const KEY_PREFIX = 'tech_session:';

@Injectable()
export class TechnicianSessionService {
  constructor(private readonly redis: RedisService) {}

  async getSession(phone: string): Promise<TechnicianSession | null> {
    return this.redis.getJson<TechnicianSession>(`${KEY_PREFIX}${phone}`);
  }

  async saveSession(session: TechnicianSession): Promise<void> {
    session.updatedAt = new Date().toISOString();
    await this.redis.setJson(`${KEY_PREFIX}${session.phone}`, session, SESSION_TTL_SECONDS);
  }

  async clearSession(phone: string): Promise<void> {
    await this.redis.del(`${KEY_PREFIX}${phone}`);
  }

  createNewSession(phone: string, language: Language = Language.EN): TechnicianSession {
    return {
      state: TechnicianConversationState.IDLE,
      phone,
      language,
      updatedAt: new Date().toISOString(),
    };
  }
}
