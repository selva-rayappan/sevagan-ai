import { Module } from '@nestjs/common';
import { TrustScoreService } from './trust-score.service';
import { TechniciansModule } from '../technicians/technicians.module';

@Module({
  imports: [TechniciansModule],
  providers: [TrustScoreService],
  exports: [TrustScoreService],
})
export class TrustScoreModule {}
