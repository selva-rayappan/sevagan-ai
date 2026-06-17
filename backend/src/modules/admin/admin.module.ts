import { Module } from '@nestjs/common';
import { CustomersAdminController } from './customers.controller';
import { TechniciansAdminController } from './technicians.controller';
import { JobsAdminController } from './jobs.controller';
import { SettlementsAdminController } from './settlements.controller';
import { CommissionAdminController } from './commission.controller';
import { DisputesAdminController } from './disputes.controller';
import { ServiceCategoriesAdminController } from './service-categories.controller';
import { TechniciansModule } from '../technicians/technicians.module';
import { SettlementModule } from '../settlement/settlement.module';
import { CommissionModule } from '../commission/commission.module';
import { AssignmentEngineModule } from '../assignment-engine/assignment-engine.module';

@Module({
  imports: [
    TechniciansModule,
    SettlementModule,
    CommissionModule,
    AssignmentEngineModule,
  ],
  controllers: [
    CustomersAdminController,
    TechniciansAdminController,
    JobsAdminController,
    SettlementsAdminController,
    CommissionAdminController,
    DisputesAdminController,
    ServiceCategoriesAdminController,
  ],
})
export class AdminModule {}
