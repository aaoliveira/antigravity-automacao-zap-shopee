import { IsEmail, IsNotEmpty, IsString, MinLength, Matches } from 'class-validator';

export class RegisterDto {
  @IsString()
  @IsNotEmpty({ message: 'Nome é obrigatório.' })
  name: string;

  @IsEmail({}, { message: 'Email inválido.' })
  email: string;

  @IsString()
  @MinLength(8, { message: 'A senha deve ter no mínimo 8 caracteres.' })
  @Matches(/(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])/, {
    message: 'A senha deve conter pelo menos uma letra maiúscula, uma minúscula e um número.',
  })
  password: string;

  @IsString()
  @IsNotEmpty({ message: 'Nome da organização / tenant é obrigatório.' })
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
