import { IsUUID } from 'class-validator';

export class ManualAssignDto {
  @IsUUID()
  technicianId: string;
}
