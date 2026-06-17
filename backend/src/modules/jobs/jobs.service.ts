import { Injectable } from '@nestjs/common';
import { Job } from '@prisma/client';
import { RedisService } from '../../infrastructure/cache/redis.service';
import { JobStatus, PaymentMode } from '../../domain/enums';
import { JobsRepository, JobWithCategory, JobWithDetails } from './jobs.repository';
import { CreateJobInput } from './dto/create-job.input';

@Injectable()
export class JobsService {
  constructor(
    private readonly jobsRepository: JobsRepository,
    private readonly redis: RedisService,
  ) {}

  async createJob(input: CreateJobInput): Promise<Job> {
    const jobNumber = await this.generateJobNumber();
    return this.jobsRepository.create({
      jobNumber,
      customerId: input.customerId,
      serviceCategoryId: input.serviceCategoryId,
      location: input.location,
      description: input.scheduledTimeText
        ? `Requested time: ${input.scheduledTimeText}${input.description ? ' | ' + input.description : ''}`
        : input.description,
    });
  }

  async findById(id: string): Promise<Job | null> {
    return this.jobsRepository.findById(id);
  }

  async findWithDetails(id: string): Promise<JobWithDetails | null> {
    return this.jobsRepository.findByIdWithDetails(id);
  }

  async findByJobNumber(jobNumber: string): Promise<JobWithCategory | null> {
    return this.jobsRepository.findByJobNumber(jobNumber);
  }

  async findByTechnicianId(technicianId: string, limit = 5): Promise<JobWithCategory[]> {
    return this.jobsRepository.findByTechnicianId(technicianId, limit);
  }

  async updateStatus(id: string, status: JobStatus): Promise<Job> {
    return this.jobsRepository.updateStatus(id, status);
  }

  async cancelJob(id: string): Promise<Job> {
    return this.jobsRepository.updateStatus(id, JobStatus.CANCELLED);
  }

  async setCompletion(id: string, amount: number, paymentMode: PaymentMode): Promise<Job> {
    return this.jobsRepository.setCompletion(id, amount, paymentMode);
  }

  async appendPhotoUrl(id: string, url: string): Promise<void> {
    return this.jobsRepository.appendDescription(id, `Photo: ${url}`);
  }

  async generateJobNumber(): Promise<string> {
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const counterKey = `job_counter:${today}`;
    const count = await this.redis.getClient().incr(counterKey);
    await this.redis.getClient().expire(counterKey, 172800); // 2-day TTL
    return `JOB-${today}-${String(count).padStart(4, '0')}`;
  }
}
