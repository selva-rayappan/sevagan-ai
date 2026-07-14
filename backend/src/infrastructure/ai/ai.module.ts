import { Global, Module } from '@nestjs/common';
import { OllamaProvider } from './ollama.provider';
import { OpenAIProvider } from './openai.provider';
import { AIService } from './ai.service';

@Global()
@Module({
  providers: [OllamaProvider, OpenAIProvider, AIService],
  exports: [AIService],
})
export class AIModule {}
