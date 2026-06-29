import { AssetStatus, DepreciationMethod } from '@asset-manager/domain';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  ArrayMinSize,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Max,
  MaxLength,
  Matches,
  Min,
  ValidateNested,
} from 'class-validator';

export class CustomScheduleItemDto {
  @ApiProperty({ example: '2026-01' })
  @IsString()
  @Length(7, 7)
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/)
  month!: string;

  @ApiProperty()
  @IsInt()
  @Min(0)
  depreciationCents!: number;
}

export class CreateAssetDto {
  @ApiProperty({ example: 'MacBook Pro' })
  @IsString()
  @Length(1, 200)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  brand?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  model?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  serialNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  purchaseDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  purchasePriceCents?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  purchaseChannel?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  invoiceNumber?: string;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  residualValueCents?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  usefulLifeMonths?: number;

  @ApiPropertyOptional({ enum: DepreciationMethod })
  @IsOptional()
  @IsEnum(DepreciationMethod)
  depreciationMethod?: DepreciationMethod;

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

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  depreciationStartDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  currentMarketValueCents?: number;

  @ApiPropertyOptional({ enum: AssetStatus })
  @IsOptional()
  @IsEnum(AssetStatus)
  status?: AssetStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  location?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  ownerName?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsUUID(undefined, { each: true })
  tagIds?: string[];
}

export class UpdateAssetDto extends PartialType(CreateAssetDto) {}

export class AssetListQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional({ default: 20, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize = 20;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  keyword?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @Transform(({ value }): unknown =>
    typeof value === 'string' ? value.split(',').filter(Boolean) : value,
  )
  @IsArray()
  @IsUUID(undefined, { each: true })
  tagIds?: string[];

  @ApiPropertyOptional({ enum: AssetStatus })
  @IsOptional()
  @IsEnum(AssetStatus)
  status?: AssetStatus;

  @ApiPropertyOptional({
    enum: [
      'name',
      'purchaseDate',
      'purchasePriceCents',
      'status',
      'createdAt',
      'updatedAt',
    ],
  })
  @IsOptional()
  @IsIn([
    'name',
    'purchaseDate',
    'purchasePriceCents',
    'status',
    'createdAt',
    'updatedAt',
  ])
  sortBy = 'updatedAt';

  @ApiPropertyOptional({ enum: ['asc', 'desc'], default: 'desc' })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder: 'asc' | 'desc' = 'desc';

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minPurchasePriceCents?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  maxPurchasePriceCents?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  purchaseDateFrom?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  purchaseDateTo?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @Transform(({ value }): unknown => value === true || value === 'true')
  @IsBoolean()
  includeArchived = false;
}

export class ChangeAssetStatusDto {
  @ApiProperty({ enum: AssetStatus })
  @IsEnum(AssetStatus)
  status!: AssetStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  occurredAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  disposalPriceCents?: number;
}
