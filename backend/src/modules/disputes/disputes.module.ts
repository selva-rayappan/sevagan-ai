import { Module } from '@nestjs/common';
import { DisputesRepository } from './disputes.repository';

@Module({
  providers: [DisputesRepository],
  exports: [DisputesRepository],
})
export class DisputesModule {}
