import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsIn,
  IsNumber,
  Min,
  Max,
  MinLength,
  MaxLength,
  Matches,
  IsBoolean,
  IsArray,
  ArrayMaxSize,
  IsDateString,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class CreateCouponDto {
  @IsOptional()
  @IsIn(['SHOPEE'])
  platform?: 'SHOPEE' = 'SHOPEE';

  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(60)
  @Matches(/^[A-Za-z0-9._-]+$/, {
    message:
      'O código do cupom deve conter apenas letras, números, hífen, ponto ou underscore (sem espaços).',
  })
  code: string;

  @IsIn(['PERCENTAGE', 'FIXED_AMOUNT', 'NONE'])
  discountType: 'PERCENTAGE' | 'FIXED_AMOUNT' | 'NONE';

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(100000)
  discountValue?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(100000)
  maxDiscountAmount?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(1000000)
  minProductPrice?: number | null;

  @IsOptional()
  @IsDateString({}, { message: 'Informe uma data de validade válida (YYYY-MM-DD).' })
  expiresAt?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  sellerRestriction?: string | null;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10, {
    message: 'São permitidas no máximo 10 palavras-chave de restrição por cupom.',
  })
  @IsString({ each: true })
  productKeywords?: string[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateCouponDto {
  @IsOptional()
  @IsIn(['SHOPEE'])
  platform?: 'SHOPEE';

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(60)
  @Matches(/^[A-Za-z0-9._-]+$/, {
    message:
      'O código do cupom deve conter apenas letras, números, hífen, ponto ou underscore (sem espaços).',
  })
  code?: string;

  @IsOptional()
  @IsIn(['PERCENTAGE', 'FIXED_AMOUNT', 'NONE'])
  discountType?: 'PERCENTAGE' | 'FIXED_AMOUNT' | 'NONE';

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(100000)
  discountValue?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(100000)
  maxDiscountAmount?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(1000000)
  minProductPrice?: number | null;

  @IsOptional()
  @IsDateString({}, { message: 'Informe uma data de validade válida (YYYY-MM-DD).' })
  expiresAt?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  sellerRestriction?: string | null;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10, {
    message: 'São permitidas no máximo 10 palavras-chave de restrição por cupom.',
  })
  @IsString({ each: true })
  productKeywords?: string[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class QueryCouponsDto {
  @IsOptional()
  @IsIn(['SHOPEE'])
  platform?: 'SHOPEE';

  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  search?: string;
}
