import { DepreciationMethod } from '@asset-manager/domain';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  ArrayMinSize,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { CustomScheduleItemDto } from './assets.dto';

export class CreateDepreciationProfileDto {
  @ApiProperty()
  @IsDateString()
  effectiveFrom!: string;

  @ApiProperty()
  @IsInt()
  @Min(0)
  originalCostCents!: number;

  @ApiProperty()
  @IsInt()
  @Min(0)
  residualValueCents!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  usefulLifeMonths?: number;

  @ApiProperty({ enum: DepreciationMethod })
  @IsEnum(DepreciationMethod)
  depreciationMethod!: DepreciationMethod;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  customAnnualDepreciationRate?: number;

  @ApiPropertyOptional({ type: [CustomScheduleItemDto] })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CustomScheduleItemDto)
  customSchedule?: CustomScheduleItemDto[];
}
