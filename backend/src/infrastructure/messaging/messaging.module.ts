import { Global, Module } from '@nestjs/common';
import { MetaWhatsAppProvider } from './meta-whatsapp.provider';
import { MockWhatsAppProvider } from './mock-whatsapp.provider';
import { WHATSAPP_PROVIDER } from './whatsapp.provider.interface';

@Global()
@Module({
  providers: [
    MetaWhatsAppProvider,
    MockWhatsAppProvider,
    {
      provide: WHATSAPP_PROVIDER,
      useFactory: (meta: MetaWhatsAppProvider, mock: MockWhatsAppProvider) =>
        process.env.WA_MOCK_MODE === 'true' ? mock : meta,
      inject: [MetaWhatsAppProvider, MockWhatsAppProvider],
    },
  ],
  exports: [WHATSAPP_PROVIDER],
})
export class MessagingModule {}
