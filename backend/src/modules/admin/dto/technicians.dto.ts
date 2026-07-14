import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { Language, TechnicianStatus } from '../../../domain/enums';
import { IsIndianPhone } from '../../../common/validators/is-indian-phone.validator';

export class CreateTechnicianDto {
  @IsString()
  @MaxLength(120)
  name: string;

  @IsIndianPhone()
  phone: string;

  @IsString()
  @MaxLength(255)
  serviceArea: string;

  @IsOptional()
  @IsEnum(Language)
  language?: Language;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsUUID('4', { each: true })
  categoryIds?: string[];
}

export class UpdateTechnicianDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  serviceArea?: string;

  @IsOptional()
  @IsEnum(TechnicianStatus)
  status?: TechnicianStatus;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class AddSkillDto {
  @IsUUID()
  categoryId: string;
}
