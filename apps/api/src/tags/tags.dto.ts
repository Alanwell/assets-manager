import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsHexColor, IsOptional, IsString, Length } from 'class-validator';

export class CreateTagDto {
  @ApiProperty({ example: '重要' })
  @IsString()
  @Length(1, 50)
  name!: string;

  @ApiPropertyOptional({ example: '#3b82f6' })
  @IsOptional()
  @IsHexColor()
  color?: string;
}

export class UpdateTagDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(1, 50)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsHexColor()
  color?: string;
}
