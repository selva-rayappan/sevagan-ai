import { Global, Module } from '@nestjs/common';
import { MetaWhatsAppProvider } from './meta-whatsapp.provider';
import { WHATSAPP_PROVIDER } from './whatsapp.provider.interface';

@Global()
@Module({
  providers: [
    {
      provide: WHATSAPP_PROVIDER,
      useClass: MetaWhatsAppProvider,
    },
  ],
  exports: [WHATSAPP_PROVIDER],
})
export class MessagingModule {}
