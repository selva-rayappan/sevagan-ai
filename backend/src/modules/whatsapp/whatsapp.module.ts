import { Module } from '@nestjs/common';
import { WebhookController } from './webhook/webhook.controller';
import { WebhookHmacGuard } from './guards/webhook-hmac.guard';
import { ConversationStateService } from './conversation/conversation-state.service';
import { CustomerBotService } from './customer-bot/customer-bot.service';
import { TechnicianSessionModule } from './technician-bot/technician-session.module';
import { TechnicianBotService } from './technician-bot/technician-bot.service';
import { CustomersModule } from '../customers/customers.module';
import { JobsModule } from '../jobs/jobs.module';
import { ServiceCategoriesModule } from '../service-categories/service-categories.module';
import { TechniciansModule } from '../technicians/technicians.module';
import { AssignmentsModule } from '../assignments/assignments.module';
import { CommissionModule } from '../commission/commission.module';
import { TrustScoreModule } from '../trust-score/trust-score.module';
import { RatingsModule } from '../ratings/ratings.module';
import { DisputesModule } from '../disputes/disputes.module';
import { AssignmentEngineModule } from '../assignment-engine/assignment-engine.module';
import { InvoiceModule } from '../invoice/invoice.module';
import { PaymentModule } from '../payment/payment.module';
import { AIDispatcherModule } from '../ai-dispatcher/ai-dispatcher.module';

@Module({
  imports: [
    CustomersModule,
    JobsModule,
    ServiceCategoriesModule,
    TechniciansModule,
    AssignmentsModule,
    CommissionModule,
    TrustScoreModule,
    RatingsModule,
    DisputesModule,
    TechnicianSessionModule,
    AssignmentEngineModule,
    InvoiceModule,
    PaymentModule,
    AIDispatcherModule,
  ],
  controllers: [WebhookController],
  providers: [
    WebhookHmacGuard,
    ConversationStateService,
    CustomerBotService,
    TechnicianBotService,
  ],
  exports: [TechnicianBotService],
})
export class WhatsAppModule {}
