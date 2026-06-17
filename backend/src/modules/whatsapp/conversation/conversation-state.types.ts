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
  amount: string;
  paymentMode: string;
}

export interface ConversationSession {
  state: ConversationState;
  phone: string;
  language: Language;
  selectedCategoryId?: string;
  selectedCategoryName?: string;
  location?: string;
  activeJobContext?: ActiveJobContext;
  updatedAt: string;
}
