import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class SaveMlPrototypeConfigDto {
  @IsOptional()
  @IsUUID()
  id?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  label?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  @Matches(/^[a-zA-Z0-9_.-]+$/, {
    message:
      'A tag de afiliado deve conter apenas letras, números, hífen, ponto ou underscore.',
  })
  affiliateTag?: string;

  @IsOptional()
  @IsString()
  @MaxLength(8000)
  sessionCookie?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  partnerGatewayUrl?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  partnerGatewayApiKey?: string | null;
}

export class TestMlConversionDto {
  @IsOptional()
  @IsUUID()
  accountId?: string;

  @IsUrl(
    { protocols: ['https'], require_protocol: true },
    { message: 'Informe uma URL HTTPS válida do Mercado Livre.' },
  )
  @MaxLength(1000)
  url: string;
}

export class ExtensionOfferPayloadDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  mlItemId?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  title: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  price: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  originalPrice?: number;

  @IsUrl({ protocols: ['http', 'https'], require_protocol: true, require_tld: false })
  @MaxLength(1000)
  imageUrl: string;

  @IsUrl({ protocols: ['https'], require_protocol: true })
  @MaxLength(1000)
  originalUrl: string;

  @IsUrl({ protocols: ['https'], require_protocol: true })
  @MaxLength(500)
  affiliateShortUrl: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  sellerName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  keyword?: string;
}

export class ExtensionSyncDto {
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  pairingToken?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  @Matches(/^[a-zA-Z0-9_.-]+$/)
  affiliateTag?: string;

  @IsOptional()
  @IsString()
  @MaxLength(8000)
  sessionCookie?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => ExtensionOfferPayloadDto)
  offer?: ExtensionOfferPayloadDto;
}

export class ExtensionTestConversionDto {
  @IsUrl(
    { protocols: ['https'], require_protocol: true },
    { message: 'Informe uma URL HTTPS válida do Mercado Livre.' },
  )
  @MaxLength(1000)
  url: string;
}

export class ExtensionGatewayDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  @Matches(/^[a-zA-Z0-9_.-]+$/, {
    message:
      'A tag de afiliado deve conter apenas letras, números, hífen, ponto ou underscore.',
  })
  affiliateTag?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  partnerGatewayUrl?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  partnerGatewayApiKey?: string | null;
}

export class SaveMlOAuthCredentialsDto {
  @IsOptional()
  @IsUUID()
  accountId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  label?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  appId: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  clientSecret?: string;

  @IsUrl(
    { protocols: ['http', 'https'], require_protocol: true, require_tld: false },
    { message: 'Informe uma Redirect URI HTTP ou HTTPS válida.' },
  )
  @MaxLength(500)
  redirectUri: string;
}

export class ExchangeMlCodeDto {
  @IsOptional()
  @IsUUID()
  accountId?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  code: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  state: string;
}

export class SearchMlProductsDto {
  @IsOptional()
  @IsUUID()
  accountId?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  keyword: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 12;
}

export class CreateMlOfferDto {
  @IsOptional()
  @IsUUID()
  accountId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  mlItemId?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  title: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(1000000)
  price: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(1000000)
  originalPrice?: number | null;

  @IsUrl(
    { protocols: ['http', 'https'], require_protocol: true, require_tld: false },
    { message: 'Informe uma URL de imagem válida.' },
  )
  @MaxLength(1000)
  imageUrl: string;

  @IsUrl(
    { protocols: ['https'], require_protocol: true },
    { message: 'Informe a URL HTTPS original do produto no Mercado Livre.' },
  )
  @MaxLength(1000)
  originalUrl: string;

  @IsUrl(
    { protocols: ['https'], require_protocol: true },
    { message: 'Informe o link de afiliado oficial (ex: https://meli.la/...).' },
  )
  @MaxLength(500)
  affiliateShortUrl: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  sellerName?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  keyword?: string | null;
}

export class UpdateMlOfferDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  title?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(1000000)
  price?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(1000000)
  originalPrice?: number | null;

  @IsOptional()
  @IsUrl({ protocols: ['https'], require_protocol: true })
  @MaxLength(500)
  affiliateShortUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  sellerName?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  keyword?: string | null;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
