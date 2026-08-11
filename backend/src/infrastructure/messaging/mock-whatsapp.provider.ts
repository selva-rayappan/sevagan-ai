import { Injectable, Logger } from '@nestjs/common';
import { WhatsAppProvider } from './whatsapp.provider.interface';
import {
  SendDocumentOptions,
  SendImageOptions,
  SendInteractiveButtonsOptions,
  SendInteractiveListOptions,
  SendLocationRequestOptions,
  SendTemplateOptions,
  SendTextOptions,
} from './types/outbound-message.types';

/**
 * No-op provider for testing the bot/job workflow against a real webhook
 * without a live, business-verified Meta WhatsApp account. Logs every call
 * it would have made instead of hitting the Graph API. Enabled via
 * WA_MOCK_MODE=true — never for production traffic.
 */
@Injectable()
export class MockWhatsAppProvider implements WhatsAppProvider {
  private readonly logger = new Logger(MockWhatsAppProvider.name);

  async sendText({ to, text }: SendTextOptions): Promise<void> {
    this.logger.log(`[MOCK] sendText -> ${to}: ${text}`);
  }

  async sendTemplate({ to, templateName, languageCode, bodyParams, headerImageUrl }: SendTemplateOptions): Promise<void> {
    const params = (bodyParams ?? []).map(({ name, value }) => `${name}=${value}`).join(', ');
    this.logger.log(
      `[MOCK] sendTemplate -> ${to}: ${templateName} (${languageCode}) [${params}]${headerImageUrl ? ` header=${headerImageUrl}` : ''}`,
    );
  }

  async sendInteractiveButtons({ to, body, buttons }: SendInteractiveButtonsOptions): Promise<void> {
    this.logger.log(`[MOCK] sendInteractiveButtons -> ${to}: ${body} [${buttons.map((b) => b.id).join(', ')}]`);
  }

  async sendInteractiveList({ to, body, buttonText, sections }: SendInteractiveListOptions): Promise<void> {
    this.logger.log(`[MOCK] sendInteractiveList -> ${to}: ${body} (${buttonText}, ${sections.length} sections)`);
  }

  async sendLocationRequest({ to, body }: SendLocationRequestOptions): Promise<void> {
    this.logger.log(`[MOCK] sendLocationRequest -> ${to}: ${body}`);
  }

  async sendImage({ to, mediaId, caption }: SendImageOptions): Promise<void> {
    this.logger.log(`[MOCK] sendImage -> ${to}: ${mediaId} ${caption ?? ''}`);
  }

  async sendDocument({ to, link, filename, caption }: SendDocumentOptions): Promise<void> {
    this.logger.log(`[MOCK] sendDocument -> ${to}: ${filename} (${link}) ${caption ?? ''}`);
  }

  async markAsRead(messageId: string): Promise<void> {
    this.logger.log(`[MOCK] markAsRead: ${messageId}`);
  }

  async downloadMedia(mediaId: string): Promise<Buffer> {
    this.logger.log(`[MOCK] downloadMedia: ${mediaId}`);
    return Buffer.from('');
  }
}
