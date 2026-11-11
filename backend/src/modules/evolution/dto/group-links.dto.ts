import {
  IsString,
  IsNotEmpty,
  IsUUID,
  IsOptional,
  IsInt,
  Min,
  Max,
  Matches,
  MinLength,
  MaxLength,
  IsBoolean,
  IsIn,
  IsArray,
  ArrayMinSize,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export const WHATSAPP_INVITE_URL_REGEX =
  /^https:\/\/chat\.whatsapp\.com\/[A-Za-z0-9_-]{6,100}$/;

export class GroupLinkTargetInputDto {
  @IsUUID()
  @IsNotEmpty()
  groupId: string;

  @IsOptional()
  @IsString()
  @Matches(WHATSAPP_INVITE_URL_REGEX, {
    message:
      'O link de convite deve ser uma URL oficial do WhatsApp (ex: https://chat.whatsapp.com/CodigoDoGrupo).',
  })
  inviteUrl?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(2000)
  maxParticipants?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1000)
  priority?: number;

  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;
}

export class CreateGroupLinkDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(150)
  name: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(80)
  @Matches(/^[a-z0-9-]+$/, {
    message:
      'O slug deve conter apenas letras minúsculas sem acento, números e hífens (ex: ofertas-vip-casa).',
  })
  slug: string;

  @IsOptional()
  @IsIn(['LEAST_FILLED', 'RANDOM_AVAILABLE', 'MANUAL_WITH_FALLBACK'])
  strategy?: 'LEAST_FILLED' | 'RANDOM_AVAILABLE' | 'MANUAL_WITH_FALLBACK';

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(2000)
  maxParticipants?: number;

  @IsOptional()
  @IsUUID()
  currentGroupId?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => GroupLinkTargetInputDto)
  targets: GroupLinkTargetInputDto[];
}

export class UpdateGroupLinkDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  name?: string;

  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(80)
  @Matches(/^[a-z0-9-]+$/, {
    message:
      'O slug deve conter apenas letras minúsculas sem acento, números e hífens.',
  })
  slug?: string;

  @IsOptional()
  @IsIn(['LEAST_FILLED', 'RANDOM_AVAILABLE', 'MANUAL_WITH_FALLBACK'])
  strategy?: 'LEAST_FILLED' | 'RANDOM_AVAILABLE' | 'MANUAL_WITH_FALLBACK';

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(2000)
  maxParticipants?: number;

  @IsOptional()
  @IsUUID()
  currentGroupId?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => GroupLinkTargetInputDto)
  targets?: GroupLinkTargetInputDto[];
}

export class UpdateGroupInviteDto {
  @IsOptional()
  @IsString()
  @Matches(WHATSAPP_INVITE_URL_REGEX, {
    message:
      'O link de convite deve ser uma URL oficial do WhatsApp (ex: https://chat.whatsapp.com/CodigoDoGrupo).',
  })
  inviteUrl?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(2000)
  maxParticipants?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
