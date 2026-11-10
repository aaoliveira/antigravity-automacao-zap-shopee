import {
  IsString,
  IsNotEmpty,
  IsUrl,
  IsOptional,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateEvolutionServerDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @IsString()
  @IsNotEmpty()
  @IsUrl({ require_tld: false }) // Permite domínios e IPs em ambiente local/docker
  baseUrl: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(4)
  apiKey: string;
}

export class UpdateEvolutionServerDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsString()
  @IsUrl({ require_tld: false })
  baseUrl?: string;

  @IsOptional()
  @IsString()
  @MinLength(4)
  apiKey?: string;
}

export class ConnectDockerEvolutionDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name?: string;
}

export class CreateWhatsAppInstanceDto {
  @IsUUID()
  @IsNotEmpty()
  serverId: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(60)
  @Matches(/^[a-zA-Z0-9_-]+$/, {
    message: 'Nome da instância deve conter apenas letras, números, hífens ou underscores',
  })
  instanceName: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(100)
  displayName: string;
}

export class SendMediaDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^.+@(g\.us|s\.whatsapp\.net)$/, {
    message: 'Destinatário deve ser um JID válido do WhatsApp (ex: 120363xxx@g.us ou 551199999999@s.whatsapp.net)',
  })
  number: string;

  @IsString()
  @IsNotEmpty()
  @IsUrl({ require_tld: false })
  media: string;

  @IsString()
  @IsNotEmpty()
  caption: string;

  @IsOptional()
  @IsString()
  fileName?: string;
}

export class SendTextDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^.+@(g\.us|s\.whatsapp\.net)$/, {
    message: 'Destinatário deve ser um JID válido do WhatsApp (ex: 120363xxx@g.us ou 551199999999@s.whatsapp.net)',
  })
  number: string;

  @IsString()
  @IsNotEmpty()
  text: string;
}

export class QueryGroupsDto {
  @IsOptional()
  @IsUUID()
  instanceId?: string;

  @IsOptional()
  @IsString()
  search?: string;
}
