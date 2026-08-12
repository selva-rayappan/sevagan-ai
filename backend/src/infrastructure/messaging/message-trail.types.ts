export type MessageDirection = 'INBOUND' | 'OUTBOUND';

export interface MessageTrailEntry {
  id: string;
  jobId: string | null;
  phone: string;
  direction: MessageDirection;
  messageType: string;
  summary: string;
  timestamp: string;
}
