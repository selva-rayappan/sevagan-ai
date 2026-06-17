import { Module } from '@nestjs/common';
import { TechniciansRepository } from './technicians.repository';

@Module({
  providers: [TechniciansRepository],
  exports: [TechniciansRepository],
})
export class TechniciansModule {}
