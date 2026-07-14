import { Injectable, Logger } from '@nestjs/common';
import { AIService } from '../../infrastructure/ai/ai.service';
import { ChatMessage } from '../../infrastructure/ai/ai.provider.interface';
import { ServiceCategoriesRepository } from '../service-categories/service-categories.repository';

export interface CategoryMatch {
  categoryId: string;
  categoryName: string;
  confidence: number;
}

const SYSTEM_PROMPT = `You are a service category classifier for Sevagan Homeservices in Tamil Nadu, India.

The available service categories are:
1. Electrical — electrician, wiring, switch, fan, light, circuit breaker, மின்சாரம், மின்வேலை
2. Plumbing — plumber, pipe, leak, tap, drain, water, குழாய், தண்ணீர்
3. AC Service — AC, air conditioner, cooling, gas filling, ஏசி, குளிர்சாதனம்
4. Carpentry — carpenter, wood, door, furniture, cabinet, தச்சு, மரவேலை
5. Painting — painter, paint, wall, colour, வண்ணம், பெயிண்ட்
6. Appliance Repair — washing machine, fridge, refrigerator, microwave, mixer, grinder, கருவி, சரி செய்
7. RO Service — RO, water purifier, filter, நீர் சுத்திகரிப்பான்
8. CCTV Installation — CCTV, camera, security, surveillance, கேமரா, பாதுகாப்பு

Given the user's message (in English or Tamil), identify which service category they need.

Respond ONLY with valid JSON:
{"categoryName":"exact category name from the list above","confidence":0.95}

If you cannot determine the category, respond:
{"categoryName":null,"confidence":0}`;

@Injectable()
export class CategoryMapperService {
  private readonly logger = new Logger(CategoryMapperService.name);

  constructor(
    private readonly aiService: AIService,
    private readonly categoriesRepository: ServiceCategoriesRepository,
  ) {}

  async mapToCategory(message: string): Promise<CategoryMatch | null> {
    const messages: ChatMessage[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: message },
    ];

    try {
      const response = await this.aiService.chat(messages, { temperature: 0.1, maxTokens: 64 });

      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        this.logger.warn(`AI returned non-JSON response for category mapping: ${response.substring(0, 100)}`);
        return null;
      }

      const parsed = JSON.parse(jsonMatch[0]);
      if (!parsed.categoryName) return null;

      const category = await this.categoriesRepository.findByName(parsed.categoryName);
      if (!category) {
        this.logger.warn(`AI matched category "${parsed.categoryName}" not found in DB`);
        return null;
      }

      return {
        categoryId: category.id,
        categoryName: category.name,
        confidence: parsed.confidence ?? 0,
      };
    } catch (err) {
      this.logger.error(`Category mapping failed: ${(err as Error).message}`);
      return null;
    }
  }
}
