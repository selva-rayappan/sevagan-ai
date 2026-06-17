export interface CreateJobInput {
  customerId: string;
  serviceCategoryId: string;
  location: string;
  scheduledTimeText: string;
  description?: string;
}
