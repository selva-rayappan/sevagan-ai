import { Injectable, Logger } from '@nestjs/common';
import { VoiceCallProvider, PlaceCallOptions } from './voice-call.provider.interface';

/**
 * No-op provider for testing the offer-escalation flow without spending real
 * Plivo minutes. Logs the call it would have placed instead. Enabled via
 * VOICE_MOCK_MODE=true — never for production traffic.
 */
@Injectable()
export class MockVoiceCallProvider implements VoiceCallProvider {
  private readonly logger = new Logger(MockVoiceCallProvider.name);

  async placeCall({ to, answerUrl }: PlaceCallOptions): Promise<void> {
    this.logger.log(`[MOCK] placeCall -> ${to} (answerUrl: ${answerUrl})`);
  }
}
