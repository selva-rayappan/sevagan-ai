import { JobStatus } from '../enums';

export interface JobEntity {
  id: string;
  jobNumber: string;
  customerId: string;
  serviceCategoryId: string;
  status: JobStatus;
  location: string;
  description?: string | null;
  scheduledTime?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
