import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import {
  ALL_FEATURE_FLAG_KEYS,
  FEATURE_FLAG_DEFAULTS,
  FEATURE_FLAG_METADATA,
  FeatureFlagKey,
} from './feature-flags.constants';
import { UpdateFeatureFlagsDto } from './dto/feature-flags.dto';

export interface FeatureFlagsResponse {
  flags: Record<FeatureFlagKey, boolean>;
  items: Array<{
    key: FeatureFlagKey;
    title: string;
    description: string;
    enabled: boolean;
    defaultValue: boolean;
    updatedAt: Date | null;
  }>;
}

@Injectable()
export class FeatureFlagsService {
  constructor(private readonly prisma: PrismaService) {}

  async getFlagsForTenant(tenantId: string): Promise<FeatureFlagsResponse> {
    const rows = await this.prisma.featureFlag.findMany({
      where: {
        tenantId,
        key: { in: ALL_FEATURE_FLAG_KEYS },
      },
      select: {
        key: true,
        enabled: true,
        updatedAt: true,
      },
    });

    const rowMap = new Map(rows.map((r) => [r.key, r]));
    const flags = { ...FEATURE_FLAG_DEFAULTS };

    for (const key of ALL_FEATURE_FLAG_KEYS) {
      const existing = rowMap.get(key);
      if (existing !== undefined) {
        flags[key] = existing.enabled;
      }
    }

    const items = FEATURE_FLAG_METADATA.map((meta) => {
      const existing = rowMap.get(meta.key);
      return {
        ...meta,
        enabled: flags[meta.key],
        updatedAt: existing?.updatedAt ?? null,
      };
    });

    return { flags, items };
  }

  async isEnabled(tenantId: string, key: FeatureFlagKey): Promise<boolean> {
    const row = await this.prisma.featureFlag.findUnique({
      where: {
        tenantId_key: { tenantId, key },
      },
      select: { enabled: true },
    });

    return row ? row.enabled : FEATURE_FLAG_DEFAULTS[key];
  }

  async assertEnabled(tenantId: string, key: FeatureFlagKey): Promise<void> {
    const enabled = await this.isEnabled(tenantId, key);
    if (!enabled) {
      throw new ForbiddenException(
        `A funcionalidade "${key}" está desabilitada para este tenant nas feature flags.`,
      );
    }
  }

  async updateFlagsForTenant(
    tenantId: string,
    userId: string | undefined,
    dto: UpdateFeatureFlagsDto,
  ): Promise<FeatureFlagsResponse> {
    const entries: Array<[FeatureFlagKey, boolean]> = [];

    for (const key of ALL_FEATURE_FLAG_KEYS) {
      const value = dto[key];
      if (typeof value === 'boolean') {
        entries.push([key, value]);
      }
    }

    if (entries.length === 0) {
      throw new BadRequestException(
        'Informe ao menos uma feature flag válida para atualizar.',
      );
    }

    await this.prisma.$transaction(async (tx) => {
      for (const [key, enabled] of entries) {
        await tx.featureFlag.upsert({
          where: { tenantId_key: { tenantId, key } },
          update: {
            enabled,
            updatedByUserId: userId ?? null,
          },
          create: {
            tenantId,
            key,
            enabled,
            updatedByUserId: userId ?? null,
          },
        });
      }

      await tx.auditLog.create({
        data: {
          tenantId,
          userId: userId ?? null,
          action: 'FEATURE_FLAGS_UPDATED',
          entityType: 'FeatureFlag',
          metadataJson: Object.fromEntries(entries),
        },
      });
    });

    return this.getFlagsForTenant(tenantId);
  }
}
