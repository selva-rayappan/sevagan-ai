import { IsEnum, IsNumber, Min } from 'class-validator';
import { PaymentMode, CommissionType } from '../../../domain/enums';

export class CreateCommissionRuleDto {
  @IsEnum(PaymentMode)
  paymentMode: PaymentMode;

  @IsEnum(CommissionType)
  commissionType: CommissionType;

  @IsNumber()
  @Min(0)
  commissionValue: number;
}
