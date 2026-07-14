import { Module } from '@nestjs/common';
import { CustomersAdminController } from './customers.controller';
import { TechniciansAdminController } from './technicians.controller';
import { JobsAdminController } from './jobs.controller';
import { SettlementsAdminController } from './settlements.controller';
import { CommissionAdminController } from './commission.controller';
import { DisputesAdminController } from './disputes.controller';
import { ServiceCategoriesAdminController } from './service-categories.controller';
import { InvoicesController } from './invoices.controller';
import { AuditLogsController } from './audit-logs.controller';
import { AuditInterceptor } from '../../common/interceptors/audit.interceptor';
import { TechniciansModule } from '../technicians/technicians.module';
import { SettlementModule } from '../settlement/settlement.module';
import { CommissionModule } from '../commission/commission.module';
import { AssignmentEngineModule } from '../assignment-engine/assignment-engine.module';
import { InvoiceModule } from '../invoice/invoice.module';
import { PaymentModule } from '../payment/payment.module';

@Module({
  imports: [
    TechniciansModule,
    SettlementModule,
    CommissionModule,
    AssignmentEngineModule,
    InvoiceModule,
    PaymentModule,
  ],
  controllers: [
    CustomersAdminController,
    TechniciansAdminController,
    JobsAdminController,
    SettlementsAdminController,
    CommissionAdminController,
    DisputesAdminController,
    ServiceCategoriesAdminController,
    InvoicesController,
    AuditLogsController,
  ],
  providers: [AuditInterceptor],
})
export class AdminModule {}

