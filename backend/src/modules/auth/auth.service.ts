import {
  Injectable,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import {
  RegisterDto,
  LoginDto,
  RefreshTokenDto,
  RecoverPasswordDto,
  UpdateProfileDto,
  ChangePasswordDto,
} from './dto/auth.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly saltRounds = 12;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase().trim() },
    });

    if (existingUser) {
      throw new ConflictException('Email já cadastrado no sistema.');
    }

    const passwordHash = await bcrypt.hash(dto.password, this.saltRounds);
    const tenantSlug = this.generateSlug(dto.tenantName);

    // Criação atômica de Tenant e User proprietário
    const result = await this.prisma.$transaction(async (tx) => {
      let slug = tenantSlug;
      let counter = 1;
      while (await tx.tenant.findUnique({ where: { slug } })) {
        slug = `${tenantSlug}-${counter++}`;
      }

      const tenant = await tx.tenant.create({
        data: {
          name: dto.tenantName,
          slug,
        },
      });

      const user = await tx.user.create({
        data: {
          tenantId: tenant.id,
          name: dto.name,
          email: dto.email.toLowerCase().trim(),
          passwordHash,
          role: 'OWNER',
        },
      });

      await tx.auditLog.create({
        data: {
          tenantId: tenant.id,
          userId: user.id,
          action: 'USER_REGISTERED',
          entityType: 'User',
          entityId: user.id,
          metadataJson: { email: user.email, tenantName: tenant.name },
        },
      });

      return { user, tenant };
    });

    const tokens = await this.generateTokens(
      result.user.id,
      result.user.email,
      result.tenant.id,
      result.user.role,
    );

    return this.formatAuthSession(result.user, result.tenant, tokens);
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase().trim() },
      include: { tenant: true },
    });

    if (!user) {
      throw new UnauthorizedException('Credenciais inválidas.');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciais inválidas.');
    }

    if (!user.isActive || !user.tenant.isActive) {
      throw new UnauthorizedException('Conta ou organização suspensa.');
    }

    const tokens = await this.generateTokens(user.id, user.email, user.tenantId, user.role);

    return this.formatAuthSession(user, user.tenant, tokens);
  }

  async refreshTokens(dto: RefreshTokenDto) {
    try {
      const refreshSecret =
        process.env.JWT_REFRESH_SECRET || 'dev_jwt_refresh_secret_change_in_production_32_chars';
      const payload = this.jwtService.verify(dto.refreshToken, {
        secret: refreshSecret,
      });

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        include: { tenant: true },
      });

      if (!user || !user.isActive || !user.tenant.isActive) {
        throw new UnauthorizedException('Sessão expirada ou revogada.');
      }

      return this.generateTokens(user.id, user.email, user.tenantId, user.role);
    } catch (e) {
      throw new UnauthorizedException('Refresh token inválido ou expirado.');
    }
  }

  async recoverPassword(dto: RecoverPasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase().trim() },
    });

    // Resposta idempotente que não expõe se o email existe
    if (!user) {
      return {
        message: 'Se o email estiver cadastrado, as instruções de recuperação foram enviadas.',
      };
    }

    this.logger.log(`Solicitação de recuperação de senha para: ${user.email}`);

    return {
      message: 'Se o email estiver cadastrado, as instruções de recuperação foram enviadas.',
    };
  }

  /**
   * Atualiza os dados cadastrais do usuário autenticado (nome, e-mail) e, se OWNER/ADMIN,
   * os dados da organização (nome do tenant e fuso horário IANA).
   */
  async updateProfile(userId: string, tenantId: string, dto: UpdateProfileDto) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, tenantId },
      include: { tenant: true },
    });

    if (!user || !user.isActive || !user.tenant.isActive) {
      throw new UnauthorizedException('Usuário ou organização inativos ou inexistentes.');
    }

    const userUpdateData: { name?: string; email?: string } = {};
    const tenantUpdateData: { name?: string; timezone?: string } = {};
    const changedFields: string[] = [];

    if (dto.name !== undefined) {
      const cleanName = dto.name.trim();
      if (cleanName.length < 2) {
        throw new BadRequestException('Nome deve ter no mínimo 2 caracteres.');
      }
      if (cleanName !== user.name) {
        userUpdateData.name = cleanName;
        changedFields.push('name');
      }
    }

    if (dto.email !== undefined) {
      const cleanEmail = dto.email.toLowerCase().trim();
      if (cleanEmail !== user.email) {
        if (!dto.currentPassword) {
          throw new BadRequestException(
            'Informe sua senha atual para confirmar a alteração de e-mail.',
          );
        }
        const passwordMatch = await bcrypt.compare(
          dto.currentPassword,
          user.passwordHash,
        );
        if (!passwordMatch) {
          throw new BadRequestException('Senha atual incorreta.');
        }

        const existingEmail = await this.prisma.user.findFirst({
          where: { email: cleanEmail, id: { not: user.id } },
        });
        if (existingEmail) {
          throw new ConflictException('Email já cadastrado no sistema.');
        }

        userUpdateData.email = cleanEmail;
        changedFields.push('email');
      }
    }

    const wantsTenantEdit =
      (dto.tenantName !== undefined && dto.tenantName.trim() !== user.tenant.name) ||
      (dto.timezone !== undefined && dto.timezone.trim() !== user.tenant.timezone);

    if (wantsTenantEdit) {
      if (user.role !== UserRole.OWNER && user.role !== UserRole.ADMIN) {
        throw new ForbiddenException(
          'Apenas proprietários ou administradores podem alterar dados da organização.',
        );
      }

      if (dto.tenantName !== undefined) {
        const cleanTenantName = dto.tenantName.trim();
        if (cleanTenantName.length < 2) {
          throw new BadRequestException(
            'Nome da organização / tenant deve ter no mínimo 2 caracteres.',
          );
        }
        if (cleanTenantName !== user.tenant.name) {
          tenantUpdateData.name = cleanTenantName;
          changedFields.push('tenantName');
        }
      }

      if (dto.timezone !== undefined) {
        const cleanTimezone = dto.timezone.trim();
        try {
          Intl.DateTimeFormat(undefined, { timeZone: cleanTimezone });
        } catch {
          throw new BadRequestException(
            `Fuso horário '${cleanTimezone}' inválido. Utilize um identificador IANA válido (ex: America/Sao_Paulo).`,
          );
        }
        if (cleanTimezone !== user.tenant.timezone) {
          tenantUpdateData.timezone = cleanTimezone;
          changedFields.push('timezone');
        }
      }
    }

    const { updatedUser, updatedTenant } = await this.prisma.$transaction(
      async (tx) => {
        const nextUser =
          Object.keys(userUpdateData).length > 0
            ? await tx.user.update({
                where: { id: user.id },
                data: userUpdateData,
              })
            : user;

        const nextTenant =
          Object.keys(tenantUpdateData).length > 0
            ? await tx.tenant.update({
                where: { id: user.tenantId },
                data: tenantUpdateData,
              })
            : user.tenant;

        if (changedFields.length > 0) {
          await tx.auditLog.create({
            data: {
              tenantId: user.tenantId,
              userId: user.id,
              action: 'USER_PROFILE_UPDATED',
              entityType: 'User',
              entityId: user.id,
              metadataJson: { changedFields },
            },
          });
        }

        return { updatedUser: nextUser, updatedTenant: nextTenant };
      },
    );

    const tokens = await this.generateTokens(
      updatedUser.id,
      updatedUser.email,
      updatedTenant.id,
      updatedUser.role,
    );

    return this.formatAuthSession(updatedUser, updatedTenant, tokens);
  }

  /**
   * Altera a senha do usuário autenticado validando previamente a senha atual.
   */
  async changePassword(
    userId: string,
    tenantId: string,
    dto: ChangePasswordDto,
  ) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, tenantId },
      include: { tenant: true },
    });

    if (!user || !user.isActive || !user.tenant.isActive) {
      throw new UnauthorizedException('Usuário ou organização inativos ou inexistentes.');
    }

    const isCurrentValid = await bcrypt.compare(
      dto.currentPassword,
      user.passwordHash,
    );
    if (!isCurrentValid) {
      throw new BadRequestException('Senha atual incorreta.');
    }

    if (dto.currentPassword === dto.newPassword) {
      throw new BadRequestException(
        'A nova senha deve ser diferente da senha atual.',
      );
    }

    const newPasswordHash = await bcrypt.hash(dto.newPassword, this.saltRounds);

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: { passwordHash: newPasswordHash },
      });

      await tx.auditLog.create({
        data: {
          tenantId: user.tenantId,
          userId: user.id,
          action: 'USER_PASSWORD_CHANGED',
          entityType: 'User',
          entityId: user.id,
          metadataJson: { changedAt: new Date().toISOString() },
        },
      });
    });

    return { message: 'Senha alterada com sucesso.' };
  }

  private formatAuthSession(
    user: { id: string; name: string; email: string; role: string },
    tenant: { id: string; name: string; slug: string; timezone: string },
    tokens: { accessToken: string; refreshToken: string },
  ) {
    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      tenant: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        timezone: tenant.timezone,
      },
      ...tokens,
    };
  }

  private async generateTokens(userId: string, email: string, tenantId: string, role: string) {
    const payload = { sub: userId, email, tenantId, role };

    const accessToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_SECRET || 'dev_jwt_secret_change_in_production_min_32_chars_long',
      expiresIn: process.env.JWT_EXPIRES_IN || '1d',
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret:
        process.env.JWT_REFRESH_SECRET || 'dev_jwt_refresh_secret_change_in_production_32_chars',
      expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    });

    return { accessToken, refreshToken };
  }

  private generateSlug(text: string): string {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'tenant';
  }
}
