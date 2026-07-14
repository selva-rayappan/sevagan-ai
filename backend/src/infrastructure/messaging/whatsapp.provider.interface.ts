import {
  SendDocumentOptions,
  SendImageOptions,
  SendInteractiveButtonsOptions,
  SendInteractiveListOptions,
  SendTextOptions,
} from './types/outbound-message.types';

export const WHATSAPP_PROVIDER = Symbol('WHATSAPP_PROVIDER');

/**
 * Abstraction over the WhatsApp messaging provider.
 * Swap implementations (Meta Cloud API → Twilio → etc.) by providing
 * a different class for the WHATSAPP_PROVIDER token — no business logic changes.
 */
export interface WhatsAppProvider {
  sendText(options: SendTextOptions): Promise<void>;
  sendInteractiveButtons(options: SendInteractiveButtonsOptions): Promise<void>;
  sendInteractiveList(options: SendInteractiveListOptions): Promise<void>;
  sendImage(options: SendImageOptions): Promise<void>;
  sendDocument(options: SendDocumentOptions): Promise<void>;
  markAsRead(messageId: string): Promise<void>;
  downloadMedia(mediaId: string): Promise<Buffer>;
}
