import { Module } from '@nestjs/common';
import { TechnicianSessionService } from './technician-session.service';

@Module({
  providers: [TechnicianSessionService],
  exports: [TechnicianSessionService],
})
export class TechnicianSessionModule {}
