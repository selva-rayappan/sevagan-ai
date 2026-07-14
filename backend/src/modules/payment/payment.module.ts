import { Module } from '@nestjs/common';
import { PaymentRepository } from './payment.repository';
import { PaymentService } from './payment.service';

@Module({
  providers: [PaymentRepository, PaymentService],
  exports: [PaymentService, PaymentRepository],
})
export class PaymentModule {}
