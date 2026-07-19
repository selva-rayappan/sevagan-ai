export type WhatsAppMessageType =
  | 'text'
  | 'interactive'
  | 'location'
  | 'image'
  | 'audio'
  | 'document'
  | 'sticker'
  | 'video';

export type InteractiveType = 'button_reply' | 'list_reply';

export interface WhatsAppContact {
  profile: { name: string };
  wa_id: string;
}

export interface WhatsAppTextMessage {
  body: string;
}

export interface WhatsAppInteractiveButtonReply {
  id: string;
  title: string;
}

export interface WhatsAppInteractiveListReply {
  id: string;
  title: string;
  description?: string;
}

export interface WhatsAppInteractive {
  type: InteractiveType;
  button_reply?: WhatsAppInteractiveButtonReply;
  list_reply?: WhatsAppInteractiveListReply;
}

export interface WhatsAppLocation {
  latitude: number;
  longitude: number;
  name?: string;
  address?: string;
}

export interface WhatsAppMedia {
  id: string;
  mime_type: string;
  sha256: string;
  caption?: string;
}

export interface InboundWhatsAppMessage {
  from: string;
  id: string;
  timestamp: string;
  type: WhatsAppMessageType;
  text?: WhatsAppTextMessage;
  interactive?: WhatsAppInteractive;
  location?: WhatsAppLocation;
  image?: WhatsAppMedia;
  audio?: WhatsAppMedia;
  document?: WhatsAppMedia;
}

export interface WhatsAppStatusError {
  code: number;
  title: string;
  message?: string;
  error_data?: { details?: string };
}

export interface WhatsAppStatusUpdate {
  id: string;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  timestamp: string;
  recipient_id: string;
  errors?: WhatsAppStatusError[];
}

export interface WhatsAppMetadata {
  display_phone_number: string;
  phone_number_id: string;
}

export interface WhatsAppChangeValue {
  messaging_product: 'whatsapp';
  metadata: WhatsAppMetadata;
  contacts?: WhatsAppContact[];
  messages?: InboundWhatsAppMessage[];
  statuses?: WhatsAppStatusUpdate[];
}

export interface WhatsAppChange {
  field: 'messages';
  value: WhatsAppChangeValue;
}

export interface WhatsAppEntry {
  id: string;
  changes: WhatsAppChange[];
}

export interface WhatsAppWebhookPayload {
  object: 'whatsapp_business_account';
  entry: WhatsAppEntry[];
}
