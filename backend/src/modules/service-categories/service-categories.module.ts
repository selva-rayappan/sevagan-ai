import { Module } from '@nestjs/common';
import { ServiceCategoriesRepository } from './service-categories.repository';

@Module({
  providers: [ServiceCategoriesRepository],
  exports: [ServiceCategoriesRepository],
})
export class ServiceCategoriesModule {}
