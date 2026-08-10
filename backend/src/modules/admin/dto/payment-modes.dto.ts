import { IsBoolean } from 'class-validator';

export class UpdatePaymentModeDto {
  @IsBoolean()
  enabled: boolean;
}
