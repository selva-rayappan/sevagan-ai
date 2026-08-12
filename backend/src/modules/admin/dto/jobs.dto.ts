import { IsEnum, IsNumber, IsPositive, IsUUID } from 'class-validator';
import { PaymentMode } from '../../../domain/enums';

export class ManualAssignDto {
  @IsUUID()
  technicianId: string;
}

export class CompleteJobDto {
  @IsNumber()
  @IsPositive()
  amount: number;

  @IsEnum(PaymentMode)
  paymentMode: PaymentMode;
}
