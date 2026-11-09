import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../database/prisma.service';
import { RegisterDto, LoginDto, RefreshTokenDto, RecoverPasswordDto } from './dto/auth.dto';

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

    return {
      user: {
        id: result.user.id,
        name: result.user.name,
        email: result.user.email,
        role: result.user.role,
      },
      tenant: {
        id: result.tenant.id,
        name: result.tenant.name,
        slug: result.tenant.slug,
        timezone: result.tenant.timezone,
      },
      ...tokens,
    };
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

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      tenant: {
        id: user.tenant.id,
        name: user.tenant.name,
        slug: user.tenant.slug,
        timezone: user.tenant.timezone,
      },
      ...tokens,
    };
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
