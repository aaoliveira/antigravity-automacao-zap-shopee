import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export const PASSWORD_COMPLEXITY_REGEX = /(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])/;
export const PASSWORD_COMPLEXITY_MSG =
  'A senha deve conter pelo menos uma letra maiúscula, uma minúscula e um número.';

export class RegisterDto {
  @IsString()
  @IsNotEmpty({ message: 'Nome é obrigatório.' })
  @MinLength(2, { message: 'Nome deve ter no mínimo 2 caracteres.' })
  @MaxLength(255)
  name: string;

  @IsEmail({}, { message: 'Email inválido.' })
  email: string;

  @IsString()
  @MinLength(8, { message: 'A senha deve ter no mínimo 8 caracteres.' })
  @Matches(PASSWORD_COMPLEXITY_REGEX, {
    message: PASSWORD_COMPLEXITY_MSG,
  })
  password: string;

  @IsString()
  @IsNotEmpty({ message: 'Nome da organização / tenant é obrigatório.' })
  @MinLength(2, { message: 'Nome da organização deve ter no mínimo 2 caracteres.' })
  @MaxLength(255)
  tenantName: string;
}

export class LoginDto {
  @IsEmail({}, { message: 'Email inválido.' })
  email: string;

  @IsString()
  @IsNotEmpty({ message: 'Senha é obrigatória.' })
  password: string;
}

export class RefreshTokenDto {
  @IsString()
  @IsNotEmpty({ message: 'Refresh token é obrigatório.' })
  refreshToken: string;
}

export class RecoverPasswordDto {
  @IsEmail({}, { message: 'Email inválido.' })
  email: string;
}

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'Nome deve ter no mínimo 2 caracteres.' })
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsEmail({}, { message: 'Email inválido.' })
  @MaxLength(255)
  email?: string;

  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'Nome da organização / tenant deve ter no mínimo 2 caracteres.' })
  @MaxLength(255)
  tenantName?: string;

  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'Fuso horário inválido.' })
  @MaxLength(50)
  timezone?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'Senha atual inválida.' })
  currentPassword?: string;
}

export class ChangePasswordDto {
  @IsString()
  @IsNotEmpty({ message: 'Senha atual é obrigatória.' })
  currentPassword: string;

  @IsString()
  @MinLength(8, { message: 'A nova senha deve ter no mínimo 8 caracteres.' })
  @Matches(PASSWORD_COMPLEXITY_REGEX, {
    message: PASSWORD_COMPLEXITY_MSG,
  })
  newPassword: string;
}
