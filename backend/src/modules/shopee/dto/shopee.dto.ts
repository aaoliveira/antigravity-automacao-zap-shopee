import { IsNotEmpty, IsString, IsOptional, IsArray, ArrayMaxSize, IsNumber, Min } from 'class-validator';

export class CreateShopeeCredentialDto {
  @IsString()
  @IsNotEmpty({ message: 'Identificador (label) da credencial é obrigatório.' })
  label: string;

  @IsString()
  @IsNotEmpty({ message: 'App ID da Shopee é obrigatório.' })
  appId: string;

  @IsString()
  @IsNotEmpty({ message: 'App Secret da Shopee é obrigatório.' })
  appSecret: string;
}

export class UpdateShopeeCredentialDto {
  @IsString()
  @IsOptional()
  label?: string;

  @IsString()
  @IsOptional()
  appSecret?: string;
}

export class SearchProductsDto {
  @IsString()
  @IsNotEmpty({ message: 'Palavra-chave (keyword) de nicho é obrigatória.' })
  keyword: string;

  @IsNumber()
  @IsOptional()
  @Min(1)
  page?: number = 1;

  @IsNumber()
  @IsOptional()
  @Min(1)
  limit?: number = 20;

  @IsNumber()
  @IsOptional()
  sortType?: number = 1;
}

export class GenerateShortLinkDto {
  @IsString()
  @IsNotEmpty({ message: 'URL original da Shopee é obrigatória.' })
  originUrl: string;

  @IsArray()
  @IsOptional()
  @ArrayMaxSize(5, { message: 'A Shopee permite no máximo 5 sub-IDs.' })
  @IsString({ each: true })
  subIds?: string[];
}
