import { Module } from '@nestjs/common';
import { AssignmentsRepository } from './assignments.repository';

@Module({
  providers: [AssignmentsRepository],
  exports: [AssignmentsRepository],
})
export class AssignmentsModule {}
