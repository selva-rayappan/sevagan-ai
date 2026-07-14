import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './infrastructure/database/prisma.module';
import { RedisModule } from './infrastructure/cache/redis.module';
import { TranslationModule } from './infrastructure/i18n/translation.module';
import { MessagingModule } from './infrastructure/messaging/messaging.module';
import { MinioModule } from './infrastructure/storage/minio.module';
import { HealthModule } from './modules/health/health.module';
import { WhatsAppModule } from './modules/whatsapp/whatsapp.module';
import { CustomersModule } from './modules/customers/customers.module';
import { JobsModule } from './modules/jobs/jobs.module';
import { ServiceCategoriesModule } from './modules/service-categories/service-categories.module';
import { TechniciansModule } from './modules/technicians/technicians.module';
import { AssignmentsModule } from './modules/assignments/assignments.module';
import { CommissionModule } from './modules/commission/commission.module';
import { TrustScoreModule } from './modules/trust-score/trust-score.module';
import { RatingsModule } from './modules/ratings/ratings.module';
import { DisputesModule } from './modules/disputes/disputes.module';
import { SettlementModule } from './modules/settlement/settlement.module';
import { AssignmentEngineModule } from './modules/assignment-engine/assignment-engine.module';
import { AuthModule } from './modules/auth/auth.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { AdminModule } from './modules/admin/admin.module';
import { InvoiceModule } from './modules/invoice/invoice.module';
import { PaymentModule } from './modules/payment/payment.module';
import { ReportsModule } from './modules/reports/reports.module';
import { AIModule } from './infrastructure/ai/ai.module';
import { AuditModule } from './infrastructure/audit/audit.module';
import { appConfig } from './config/app.config';
import { validate } from './config/env.validation';

@Module({
  imports: [
    // Config — loaded globally, validated at startup
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig],
      validate,
      cache: true,
    }),

    // Rate limiting — 30 req/min default, stricter per-route via @Throttle()
    ThrottlerModule.forRoot([
      { name: 'default', ttl: 60000, limit: 30 },
    ]),

    // Infrastructure
    PrismaModule,
    RedisModule,
    TranslationModule,
    MessagingModule,
    MinioModule,
    AIModule,
    AuditModule,

    // Feature modules
    HealthModule,
    WhatsAppModule,
    CustomersModule,
    JobsModule,
    ServiceCategoriesModule,
    TechniciansModule,
    AssignmentsModule,
    CommissionModule,
    TrustScoreModule,
    RatingsModule,
    DisputesModule,
    SettlementModule,
    AssignmentEngineModule,
    AuthModule,
    DashboardModule,
    AdminModule,
    InvoiceModule,
    PaymentModule,
    ReportsModule,
  ],
})
export class AppModule {}
