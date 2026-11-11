import { ForbiddenException, BadRequestException } from '@nestjs/common';
import { FeatureFlagsService } from './feature-flags.service';
import { FEATURE_FLAG_KEYS } from './feature-flags.constants';

describe('FeatureFlagsService', () => {
  const tenantId = 'tenant-1111';

  const makeMockPrisma = () => ({
    featureFlag: {
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn().mockResolvedValue(null),
      upsert: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
    $transaction: jest.fn(async (cb: any) => cb({
      featureFlag: { upsert: jest.fn() },
      auditLog: { create: jest.fn() },
    })),
  });

  it('deve retornar defaults com Alternativa B habilitada e Alternativa A desabilitada', async () => {
    const prisma = makeMockPrisma();
    const service = new FeatureFlagsService(prisma as any);

    const result = await service.getFlagsForTenant(tenantId);

    expect(result.flags).toEqual({
      ml_alternative_b_enabled: true,
      ml_alternative_a_enabled: false,
    });
    expect(result.items).toHaveLength(2);
    expect(prisma.featureFlag.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ tenantId }),
      }),
    );
  });

  it('deve sobrescrever defaults quando houver registros persistidos para o tenant', async () => {
    const prisma = makeMockPrisma();
    prisma.featureFlag.findMany.mockResolvedValue([
      {
        key: FEATURE_FLAG_KEYS.ML_ALTERNATIVE_B_ENABLED,
        enabled: false,
        updatedAt: new Date('2026-11-11T10:00:00Z'),
      },
      {
        key: FEATURE_FLAG_KEYS.ML_ALTERNATIVE_A_ENABLED,
        enabled: true,
        updatedAt: new Date('2026-11-11T10:00:00Z'),
      },
    ]);
    const service = new FeatureFlagsService(prisma as any);

    const result = await service.getFlagsForTenant(tenantId);

    expect(result.flags).toEqual({
      ml_alternative_b_enabled: false,
      ml_alternative_a_enabled: true,
    });
  });

  it('assertEnabled deve respeitar defaults e lançar ForbiddenException quando desabilitado', async () => {
    const prisma = makeMockPrisma();
    const service = new FeatureFlagsService(prisma as any);

    // Por padrão B=true e A=false
    await expect(
      service.assertEnabled(tenantId, FEATURE_FLAG_KEYS.ML_ALTERNATIVE_B_ENABLED),
    ).resolves.toBeUndefined();

    await expect(
      service.assertEnabled(tenantId, FEATURE_FLAG_KEYS.ML_ALTERNATIVE_A_ENABLED),
    ).rejects.toThrow(ForbiddenException);

    // Simula flag A ativada no banco
    prisma.featureFlag.findUnique.mockResolvedValueOnce({ enabled: true });
    await expect(
      service.assertEnabled(tenantId, FEATURE_FLAG_KEYS.ML_ALTERNATIVE_A_ENABLED),
    ).resolves.toBeUndefined();
  });

  it('updateFlagsForTenant deve validar payload não vazio e persistir com AuditLog', async () => {
    const prisma = makeMockPrisma();
    const txUpsert = jest.fn();
    const txAudit = jest.fn();
    prisma.$transaction.mockImplementation(async (cb: any) =>
      cb({
        featureFlag: { upsert: txUpsert },
        auditLog: { create: txAudit },
      }),
    );

    const service = new FeatureFlagsService(prisma as any);

    await expect(
      service.updateFlagsForTenant(tenantId, 'user-1', {}),
    ).rejects.toThrow(BadRequestException);

    prisma.featureFlag.findMany.mockResolvedValueOnce([
      { key: FEATURE_FLAG_KEYS.ML_ALTERNATIVE_A_ENABLED, enabled: true, updatedAt: new Date() },
      { key: FEATURE_FLAG_KEYS.ML_ALTERNATIVE_B_ENABLED, enabled: false, updatedAt: new Date() },
    ]);

    const res = await service.updateFlagsForTenant(tenantId, 'user-1', {
      ml_alternative_a_enabled: true,
      ml_alternative_b_enabled: false,
    });

    expect(txUpsert).toHaveBeenCalledTimes(2);
    expect(txAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          tenantId,
          action: 'FEATURE_FLAGS_UPDATED',
        }),
      }),
    );
    expect(res.flags.ml_alternative_a_enabled).toBe(true);
    expect(res.flags.ml_alternative_b_enabled).toBe(false);
  });
});
