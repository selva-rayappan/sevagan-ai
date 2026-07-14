import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { AIProvider, ChatMessage, ChatOptions } from './ai.provider.interface';

@Injectable()
export class OpenAIProvider implements AIProvider {
  private readonly logger = new Logger(OpenAIProvider.name);
  private readonly apiKey: string;

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('OPENAI_API_KEY', '');
  }

  async chat(messages: ChatMessage[], options?: ChatOptions): Promise<string> {
    if (!this.apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const startTime = Date.now();

    try {
      const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: 'gpt-4o-mini',
          messages,
          temperature: options?.temperature ?? 0.1,
          max_tokens: options?.maxTokens ?? 256,
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 15_000,
        },
      );

      const content = response.data?.choices?.[0]?.message?.content ?? '';
      const duration = Date.now() - startTime;
      this.logger.log(`OpenAI response in ${duration}ms`);
      return content.trim();
    } catch (err) {
      const duration = Date.now() - startTime;
      this.logger.error(`OpenAI failed after ${duration}ms: ${(err as Error).message}`);
      throw err;
    }
  }
}
