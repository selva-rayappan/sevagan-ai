import { Language } from '../../../domain/enums';

export enum TechnicianConversationState {
  IDLE = 'IDLE',
  JOB_OFFER_PENDING = 'JOB_OFFER_PENDING',
  JOB_ACCEPTED = 'JOB_ACCEPTED',
  JOB_IN_PROGRESS = 'JOB_IN_PROGRESS',
  AWAITING_PAYMENT_AMOUNT = 'AWAITING_PAYMENT_AMOUNT',
  AWAITING_COMPLETION = 'AWAITING_COMPLETION',
}

export interface TechnicianSession {
  state: TechnicianConversationState;
  phone: string;
  language: Language;
  activeJobId?: string;
  activeJobNumber?: string;
  activeAssignmentId?: string;
  customerPhone?: string;
  offerExpiresAt?: string;
  pendingPaymentMode?: 'CASH' | 'UPI';
  updatedAt: string;
}
