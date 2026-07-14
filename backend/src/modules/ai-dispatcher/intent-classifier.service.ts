import { Injectable, Logger } from '@nestjs/common';
import { AIService } from '../../infrastructure/ai/ai.service';
import { ChatMessage } from '../../infrastructure/ai/ai.provider.interface';
import { Language } from '../../domain/enums';

export enum Intent {
  REQUEST_SERVICE = 'REQUEST_SERVICE',
  TRACK_JOB = 'TRACK_JOB',
  CANCEL_JOB = 'CANCEL_JOB',
  FAQ_HOURS = 'FAQ_HOURS',
  FAQ_PRICING = 'FAQ_PRICING',
  FAQ_COVERAGE = 'FAQ_COVERAGE',
  UNKNOWN = 'UNKNOWN',
}

export interface IntentResult {
  intent: Intent;
  confidence: number;
  detectedLanguage: Language;
  extractedJobNumber?: string;
}

const SYSTEM_PROMPT = `You are a message classifier for Sevagan Homeservices, a home service platform in Virudhunagar, Tamil Nadu, India.

Classify the user's message into ONE of these intents:
- REQUEST_SERVICE: User wants to book a home service (electrical, plumbing, AC, carpentry, painting, appliance repair, RO, CCTV)
- TRACK_JOB: User wants to check the status of an existing job
- CANCEL_JOB: User wants to cancel an existing job
- FAQ_HOURS: User is asking about working hours or availability
- FAQ_PRICING: User is asking about pricing, cost, or rates
- FAQ_COVERAGE: User is asking about service area or coverage
- UNKNOWN: Message doesn't match any intent

Also detect the language: EN (English) or TA (Tamil).
If a job number is mentioned (format: JOB-XXXXXXXX-XXXX), extract it.

Respond ONLY with valid JSON:
{"intent":"INTENT_NAME","confidence":0.95,"detectedLanguage":"EN","extractedJobNumber":"JOB-xxx" or null}`;

@Injectable()
export class IntentClassifierService {
  private readonly logger = new Logger(IntentClassifierService.name);

  constructor(private readonly aiService: AIService) {}

  async classifyIntent(message: string, currentLanguage: Language): Promise<IntentResult> {
    const messages: ChatMessage[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: message },
    ];

    try {
      const response = await this.aiService.chat(messages, { temperature: 0.1, maxTokens: 128 });

      // Extract JSON from response (handle markdown code blocks)
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        this.logger.warn(`AI returned non-JSON response: ${response.substring(0, 100)}`);
        return { intent: Intent.UNKNOWN, confidence: 0, detectedLanguage: currentLanguage };
      }

      const parsed = JSON.parse(jsonMatch[0]);
      return {
        intent: (Intent[parsed.intent as keyof typeof Intent] ?? Intent.UNKNOWN) as Intent,
        confidence: parsed.confidence ?? 0,
        detectedLanguage: parsed.detectedLanguage === 'TA' ? Language.TA : Language.EN,
        extractedJobNumber: parsed.extractedJobNumber ?? undefined,
      };
    } catch (err) {
      this.logger.error(`Intent classification failed: ${(err as Error).message}`);
      return { intent: Intent.UNKNOWN, confidence: 0, detectedLanguage: currentLanguage };
    }
  }
}
