import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { AIProvider, ChatMessage, ChatOptions } from './ai.provider.interface';

@Injectable()
export class OllamaProvider implements AIProvider {
  private readonly logger = new Logger(OllamaProvider.name);
  private readonly baseUrl: string;
  private readonly model: string;

  constructor(private readonly configService: ConfigService) {
    this.baseUrl = this.configService.get<string>('OLLAMA_BASE_URL', 'http://localhost:11434');
    this.model = this.configService.get<string>('OLLAMA_MODEL', 'qwen3');
  }

  async chat(messages: ChatMessage[], options?: ChatOptions): Promise<string> {
    const startTime = Date.now();

    try {
      const response = await axios.post(
        `${this.baseUrl}/api/chat`,
        {
          model: this.model,
          messages,
          stream: false,
          options: {
            temperature: options?.temperature ?? 0.1,
            num_predict: options?.maxTokens ?? 256,
          },
        },
        { timeout: 10_000 },
      );

      const content = response.data?.message?.content ?? '';
      const duration = Date.now() - startTime;
      this.logger.log(`Ollama response (${this.model}) in ${duration}ms`);
      return content.trim();
    } catch (err) {
      const duration = Date.now() - startTime;
      this.logger.error(`Ollama failed after ${duration}ms: ${(err as Error).message}`);
      throw err;
    }
  }
}
