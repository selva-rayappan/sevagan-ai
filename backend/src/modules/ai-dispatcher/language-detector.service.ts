import { Injectable, Logger } from '@nestjs/common';
import { AIService } from '../../infrastructure/ai/ai.service';
import { ChatMessage } from '../../infrastructure/ai/ai.provider.interface';
import { Language } from '../../domain/enums';

const SYSTEM_PROMPT = `Detect the language of the following text. 
Reply with ONLY "EN" for English or "TA" for Tamil. Nothing else.`;

@Injectable()
export class LanguageDetectorService {
  private readonly logger = new Logger(LanguageDetectorService.name);

  constructor(private readonly aiService: AIService) {}

  async detectLanguage(text: string): Promise<Language> {
    // Quick heuristic check first — Tamil Unicode range U+0B80–U+0BFF
    const tamilCharCount = (text.match(/[\u0B80-\u0BFF]/g) || []).length;
    if (tamilCharCount > text.length * 0.3) {
      return Language.TA;
    }

    // Only use AI for ambiguous cases
    if (tamilCharCount === 0) {
      return Language.EN;
    }

    try {
      const messages: ChatMessage[] = [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: text },
      ];

      const response = await this.aiService.chat(messages, { temperature: 0, maxTokens: 4 });
      const cleaned = response.trim().toUpperCase();

      if (cleaned === 'TA' || cleaned.includes('TA')) return Language.TA;
      return Language.EN;
    } catch (err) {
      this.logger.warn(`Language detection failed, defaulting to EN: ${(err as Error).message}`);
      return Language.EN;
    }
  }
}
