import { Injectable, Logger } from '@nestjs/common';
import { ChatMessage, ChatOptions } from './ai.provider.interface';
import { OllamaProvider } from './ollama.provider';
import { OpenAIProvider } from './openai.provider';

@Injectable()
export class AIService {
  private readonly logger = new Logger(AIService.name);

  constructor(
    private readonly ollama: OllamaProvider,
    private readonly openai: OpenAIProvider,
  ) {}

  /**
   * Try Ollama first, fall back to OpenAI if Ollama fails (timeout, connection error, etc.)
   */
  async chat(messages: ChatMessage[], options?: ChatOptions): Promise<string> {
    try {
      const result = await this.ollama.chat(messages, options);
      return result;
    } catch (ollamaError) {
      this.logger.warn(`Ollama failed, falling back to OpenAI: ${(ollamaError as Error).message}`);

      try {
        const result = await this.openai.chat(messages, options);
        this.logger.log('OpenAI fallback succeeded');
        return result;
      } catch (openaiError) {
        this.logger.error(`Both AI providers failed. Ollama: ${(ollamaError as Error).message}, OpenAI: ${(openaiError as Error).message}`);
        throw new Error('AI service unavailable — both Ollama and OpenAI failed');
      }
    }
  }
}
