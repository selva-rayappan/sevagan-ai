import { Module } from '@nestjs/common';
import { JobsRepository } from './jobs.repository';
import { JobsService } from './jobs.service';

@Module({
  providers: [JobsRepository, JobsService],
  exports: [JobsRepository, JobsService],
})
export class JobsModule {}
