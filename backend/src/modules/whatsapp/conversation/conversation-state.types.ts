import { Language } from '../../../domain/enums';

export enum ConversationState {
  IDLE = 'IDLE',
  AWAITING_LANGUAGE = 'AWAITING_LANGUAGE',
  AWAITING_SERVICE = 'AWAITING_SERVICE',
  AWAITING_LOCATION = 'AWAITING_LOCATION',
  AWAITING_TIME = 'AWAITING_TIME',
  AWAITING_AMOUNT_CONFIRMATION = 'AWAITING_AMOUNT_CONFIRMATION',
  AWAITING_RATING = 'AWAITING_RATING',
}

export interface ActiveJobContext {
  jobId: string;
  jobNumber: string;
  customerId: string;
  technicianId: string;
  technicianName: string;
  technicianPhone: string;
  // Optional: the amount-confirmation step that populated these is paused
  // (see CustomerBotService.handleAmountConfirmation) until the commission-based
  // model returns — the simplified completion flow moves straight to rating
  // without an amount, so these are unset there.
  amount?: string;
  paymentMode?: string;
}

export interface ConversationSession {
  state: ConversationState;
  phone: string;
  language: Language;
  selectedCategoryId?: string;
  selectedCategoryName?: string;
  location?: string;
  pendingServiceCategoryIds?: string[];
  pendingTimeSlots?: string[];
  activeJobContext?: ActiveJobContext;
  updatedAt: string;
  // Tracks real customer activity separately from updatedAt, since
  // saveSession() bumps updatedAt on every write — including the automated
  // idle-nudge writes below, which would otherwise reset the idle clock.
  lastCustomerMessageAt?: string;
  idleReminderSentAt?: string;
  idleDropOffSentAt?: string;
}
