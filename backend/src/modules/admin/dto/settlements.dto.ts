import { IsDateString, IsUUID } from 'class-validator';

export class GenerateSettlementDto {
  @IsUUID()
  technicianId: string;

  @IsDateString()
  periodStart: string;

  @IsDateString()
  periodEnd: string;
}
