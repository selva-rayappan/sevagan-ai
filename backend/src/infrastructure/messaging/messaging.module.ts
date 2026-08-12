import { Global, Module } from '@nestjs/common';
import { MetaWhatsAppProvider } from './meta-whatsapp.provider';
import { MockWhatsAppProvider } from './mock-whatsapp.provider';
import { MessageTrailService } from './message-trail.service';
import { TrackedWhatsAppProvider } from './tracked-whatsapp.provider';
import { WHATSAPP_PROVIDER } from './whatsapp.provider.interface';

@Global()
@Module({
  providers: [
    MetaWhatsAppProvider,
    MockWhatsAppProvider,
    MessageTrailService,
    {
      provide: WHATSAPP_PROVIDER,
      useFactory: (meta: MetaWhatsAppProvider, mock: MockWhatsAppProvider, trail: MessageTrailService) => {
        const delegate = process.env.WA_MOCK_MODE === 'true' ? mock : meta;
        return new TrackedWhatsAppProvider(delegate, trail);
      },
      inject: [MetaWhatsAppProvider, MockWhatsAppProvider, MessageTrailService],
    },
  ],
  exports: [WHATSAPP_PROVIDER, MessageTrailService],
})
export class MessagingModule {}
