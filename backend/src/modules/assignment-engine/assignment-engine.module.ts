import { Module } from '@nestjs/common';
import { AssignmentEngineService } from './assignment-engine.service';
import { AssignmentsModule } from '../assignments/assignments.module';
import { JobsModule } from '../jobs/jobs.module';
import { TechniciansModule } from '../technicians/technicians.module';
import { CustomersModule } from '../customers/customers.module';
import { TechnicianSessionModule } from '../whatsapp/technician-bot/technician-session.module';

@Module({
  imports: [
    AssignmentsModule,
    JobsModule,
    TechniciansModule,
    CustomersModule,
    TechnicianSessionModule,
  ],
  providers: [AssignmentEngineService],
  exports: [AssignmentEngineService],
})
export class AssignmentEngineModule {}
