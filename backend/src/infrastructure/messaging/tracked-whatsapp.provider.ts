import { WhatsAppProvider } from './whatsapp.provider.interface';
import { MessageTrailService } from './message-trail.service';
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
 * Decorates the active WhatsAppProvider so every outbound send is written to
 * the S3 message trail, without threading trail-logging through each of the
 * business services that send messages. Trail writes are fire-and-forget
 * (see MessageTrailService.record) — a trail failure never blocks delivery.
 */
export class TrackedWhatsAppProvider implements WhatsAppProvider {
  constructor(
    private readonly delegate: WhatsAppProvider,
    private readonly trail: MessageTrailService,
  ) {}

  async sendText(options: SendTextOptions): Promise<void> {
    await this.delegate.sendText(options);
    void this.trail.record(options.to, 'OUTBOUND', 'text', options.text);
  }

  async sendTemplate(options: SendTemplateOptions): Promise<void> {
    await this.delegate.sendTemplate(options);
    const params = options.bodyParams?.map((p) => `${p.name}=${p.value}`).join(', ');
    void this.trail.record(
      options.to,
      'OUTBOUND',
      'template',
      params ? `${options.templateName} (${params})` : options.templateName,
    );
  }

  async sendInteractiveButtons(options: SendInteractiveButtonsOptions): Promise<void> {
    await this.delegate.sendInteractiveButtons(options);
    void this.trail.record(options.to, 'OUTBOUND', 'interactive_buttons', options.body);
  }

  async sendInteractiveList(options: SendInteractiveListOptions): Promise<void> {
    await this.delegate.sendInteractiveList(options);
    void this.trail.record(options.to, 'OUTBOUND', 'interactive_list', options.body);
  }

  async sendLocationRequest(options: SendLocationRequestOptions): Promise<void> {
    await this.delegate.sendLocationRequest(options);
    void this.trail.record(options.to, 'OUTBOUND', 'location_request', options.body);
  }

  async sendImage(options: SendImageOptions): Promise<void> {
    await this.delegate.sendImage(options);
    void this.trail.record(options.to, 'OUTBOUND', 'image', options.caption ?? '(image)');
  }

  async sendDocument(options: SendDocumentOptions): Promise<void> {
    await this.delegate.sendDocument(options);
    void this.trail.record(options.to, 'OUTBOUND', 'document', options.filename);
  }

  markAsRead(messageId: string): Promise<void> {
    return this.delegate.markAsRead(messageId);
  }

  downloadMedia(mediaId: string): Promise<Buffer> {
    return this.delegate.downloadMedia(mediaId);
  }
}
