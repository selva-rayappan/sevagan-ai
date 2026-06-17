import { Injectable, Logger } from '@nestjs/common';
import { TechniciansRepository } from '../technicians/technicians.repository';

export enum TrustEvent {
  AMOUNT_DISPUTED = 'AMOUNT_DISPUTED',
  MISMATCH_RESOLVED_AGAINST_TECH = 'MISMATCH_RESOLVED_AGAINST_TECH',
  FRAUD_DETECTED = 'FRAUD_DETECTED',
  POSITIVE_RATING = 'POSITIVE_RATING',
  NEGATIVE_RATING = 'NEGATIVE_RATING',
}

const TRUST_DELTAS: Record<TrustEvent, number> = {
  [TrustEvent.AMOUNT_DISPUTED]: -5,
  [TrustEvent.MISMATCH_RESOLVED_AGAINST_TECH]: -10,
  [TrustEvent.FRAUD_DETECTED]: -25,
  [TrustEvent.POSITIVE_RATING]: 2,
  [TrustEvent.NEGATIVE_RATING]: -3,
};

@Injectable()
export class TrustScoreService {
  private readonly logger = new Logger(TrustScoreService.name);

  constructor(private readonly techniciansRepository: TechniciansRepository) {}

  async applyTrustEvent(technicianId: string, event: TrustEvent): Promise<void> {
    const technician = await this.techniciansRepository.findById(technicianId);

    if (!technician) {
      this.logger.warn(`Technician ${technicianId} not found for trust event ${event}`);
      return;
    }

    const delta = TRUST_DELTAS[event];
    const newScore = Math.max(0, technician.trustScore + delta);

    await this.techniciansRepository.updateTrustScore(technicianId, newScore);

    this.logger.log(
      `Trust event ${event}: technician ${technicianId} score ${technician.trustScore} → ${newScore} (Δ${delta})`,
    );
  }
}
