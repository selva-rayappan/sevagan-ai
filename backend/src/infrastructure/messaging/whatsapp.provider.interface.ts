import {
  SendDocumentOptions,
  SendImageOptions,
  SendInteractiveButtonsOptions,
  SendInteractiveListOptions,
  SendLocationRequestOptions,
  SendTemplateOptions,
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
  // WhatsApp only allows free-form text (sendText) as a reply inside an active
  // 24-hour customer service window. Any business-initiated message to a user
  // who hasn't messaged us first — e.g. onboarding a new technician — must use
  // a pre-approved template instead, or Meta rejects it (error 131047).
  sendTemplate(options: SendTemplateOptions): Promise<void>;
  sendInteractiveButtons(options: SendInteractiveButtonsOptions): Promise<void>;
  sendInteractiveList(options: SendInteractiveListOptions): Promise<void>;
  sendLocationRequest(options: SendLocationRequestOptions): Promise<void>;
  sendImage(options: SendImageOptions): Promise<void>;
  sendDocument(options: SendDocumentOptions): Promise<void>;
  markAsRead(messageId: string): Promise<void>;
  downloadMedia(mediaId: string): Promise<Buffer>;
}
