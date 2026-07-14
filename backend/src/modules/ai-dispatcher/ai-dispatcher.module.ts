import { Module } from '@nestjs/common';
import { ServiceCategoriesModule } from '../service-categories/service-categories.module';
import { IntentClassifierService } from './intent-classifier.service';
import { CategoryMapperService } from './category-mapper.service';
import { LanguageDetectorService } from './language-detector.service';

@Module({
  imports: [ServiceCategoriesModule],
  providers: [IntentClassifierService, CategoryMapperService, LanguageDetectorService],
  exports: [IntentClassifierService, CategoryMapperService, LanguageDetectorService],
})
export class AIDispatcherModule {}
