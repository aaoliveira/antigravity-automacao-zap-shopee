import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { UserRole } from '@prisma/client';
import { AuthService } from './auth.service';

describe('AuthService - Edição de Cadastro e Senha (Unit Tests)', () => {
  let service: AuthService;
  let mockPrisma: any;
  let mockJwt: any;
  let hashedOriginal: string;

  beforeAll(async () => {
    hashedOriginal = await bcrypt.hash('Password123!', 4);
  });

  const makeMockUser = (overrides: any = {}) => ({
    id: 'usr-1',
    tenantId: 'tnt-1',
    name: 'Lucas Original',
    email: 'lucas@teste.com',
    passwordHash: hashedOriginal,
    role: UserRole.OWNER,
    isActive: true,
    tenant: {
      id: 'tnt-1',
      name: 'Operação VIP',
      slug: 'operacao-vip',
      timezone: 'America/Sao_Paulo',
      isActive: true,
    },
    ...overrides,
  });

  beforeEach(() => {
    const baseUser = makeMockUser();
    const txClient = {
      user: {
        update: jest.fn(async ({ data }: any) => ({ ...baseUser, ...data })),
      },
      tenant: {
        update: jest.fn(async ({ data }: any) => ({ ...baseUser.tenant, ...data })),
      },
      auditLog: {
        create: jest.fn().mockResolvedValue({}),
      },
    };

    mockPrisma = {
      user: {
        findFirst: jest.fn().mockImplementation(async ({ where }: any) => {
          if (where?.id === 'usr-1' && where?.tenantId === 'tnt-1') {
            return makeMockUser();
          }
          return null;
        }),
      },
      $transaction: jest.fn(async (cb: any) => cb(txClient)),
      __tx: txClient,
    };

    mockJwt = {
      sign: jest.fn().mockReturnValue('mock-jwt-token'),
    };

    service = new AuthService(mockPrisma, mockJwt);
  });

  it('deve atualizar nome, organização e fuso horário sem exigir senha atual quando e-mail não muda', async () => {
    const res = await service.updateProfile('usr-1', 'tnt-1', {
      name: 'Lucas Atualizado',
      tenantName: 'Operação Nova',
      timezone: 'America/Manaus',
    });

    expect(res.user.name).toBe('Lucas Atualizado');
    expect(res.user.email).toBe('lucas@teste.com');
    expect(res.tenant.name).toBe('Operação Nova');
    expect(res.tenant.timezone).toBe('America/Manaus');
    expect(res.accessToken).toBe('mock-jwt-token');
    expect(mockPrisma.__tx.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: 'USER_PROFILE_UPDATED',
          metadataJson: { changedFields: ['name', 'tenantName', 'timezone'] },
        }),
      }),
    );
  });

  it('deve exigir senha atual válida ao alterar e-mail e rejeitar duplicidade', async () => {
    await expect(
      service.updateProfile('usr-1', 'tnt-1', { email: 'novo@teste.com' }),
    ).rejects.toThrow(BadRequestException);

    await expect(
      service.updateProfile('usr-1', 'tnt-1', {
        email: 'novo@teste.com',
        currentPassword: 'WrongPassword1!',
      }),
    ).rejects.toThrow(BadRequestException);

    mockPrisma.user.findFirst.mockImplementation(async ({ where }: any) => {
      if (where?.email === 'duplicado@teste.com') {
        return { id: 'usr-other', email: 'duplicado@teste.com' };
      }
      return makeMockUser();
    });

    await expect(
      service.updateProfile('usr-1', 'tnt-1', {
        email: 'duplicado@teste.com',
        currentPassword: 'Password123!',
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('deve impedir usuário MEMBER de alterar nome/fuso horário da organização (403 Forbidden)', async () => {
    mockPrisma.user.findFirst.mockResolvedValueOnce(
      makeMockUser({ role: UserRole.MEMBER }),
    );

    await expect(
      service.updateProfile('usr-1', 'tnt-1', {
        tenantName: 'Tenant Sequestrado',
      }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('deve rejeitar fuso horário IANA inválido', async () => {
    await expect(
      service.updateProfile('usr-1', 'tnt-1', {
        timezone: 'Mars/Phobos',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('deve validar senha atual ao alterar senha e gravar hash seguro sem expor segredos no AuditLog', async () => {
    await expect(
      service.changePassword('usr-1', 'tnt-1', {
        currentPassword: 'Errada123!',
        newPassword: 'NovaSenha123!',
      }),
    ).rejects.toThrow(BadRequestException);

    await expect(
      service.changePassword('usr-1', 'tnt-1', {
        currentPassword: 'Password123!',
        newPassword: 'Password123!',
      }),
    ).rejects.toThrow(BadRequestException);

    const res = await service.changePassword('usr-1', 'tnt-1', {
      currentPassword: 'Password123!',
      newPassword: 'NovaSenha456!',
    });

    expect(res.message).toBe('Senha alterada com sucesso.');
    const updateCall = mockPrisma.__tx.user.update.mock.calls[0][0];
    expect(updateCall.data.passwordHash).not.toBe('NovaSenha456!');
    expect(await bcrypt.compare('NovaSenha456!', updateCall.data.passwordHash)).toBe(true);
    expect(mockPrisma.__tx.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: 'USER_PASSWORD_CHANGED',
        }),
      }),
    );
  });
});
