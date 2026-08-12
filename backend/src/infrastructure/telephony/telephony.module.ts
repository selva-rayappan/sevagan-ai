import { Global, Module } from '@nestjs/common';
import { PlivoVoiceCallProvider } from './plivo-voice-call.provider';
import { MockVoiceCallProvider } from './mock-voice-call.provider';
import { VoiceWebhookTokenGuard } from './guards/voice-webhook-token.guard';
import { VOICE_CALL_PROVIDER } from './voice-call.provider.interface';

@Global()
@Module({
  providers: [
    PlivoVoiceCallProvider,
    MockVoiceCallProvider,
    VoiceWebhookTokenGuard,
    {
      provide: VOICE_CALL_PROVIDER,
      useFactory: (plivo: PlivoVoiceCallProvider, mock: MockVoiceCallProvider) =>
        process.env.VOICE_MOCK_MODE === 'true' ? mock : plivo,
      inject: [PlivoVoiceCallProvider, MockVoiceCallProvider],
    },
  ],
  exports: [VOICE_CALL_PROVIDER, VoiceWebhookTokenGuard],
})
export class TelephonyModule {}
