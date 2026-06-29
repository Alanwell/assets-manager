import { MaintenanceType } from '@asset-manager/domain';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateMaintenanceRecordDto {
  @ApiProperty()
  @IsDateString()
  maintenanceDate!: string;

  @ApiProperty({ enum: MaintenanceType })
  @IsEnum(MaintenanceType)
  type!: MaintenanceType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  costCents?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  serviceProvider?: string;
}

export class UpdateMaintenanceRecordDto extends PartialType(
  CreateMaintenanceRecordDto,
) {}
