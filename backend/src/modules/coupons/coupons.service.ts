import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { AffiliatePlatform, CouponDiscountType } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import {
  AFFILIATE_PLATFORMS,
  MAX_COUPONS_PER_TENANT,
} from './coupons.constants';
import {
  CreateCouponDto,
  UpdateCouponDto,
  QueryCouponsDto,
} from './dto/coupons.dto';
import {
  EvaluatedCouponMatch,
  ProductForCouponMatch,
  selectBestCouponForProduct,
} from './coupon-matcher';

@Injectable()
export class CouponsService {
  private readonly logger = new Logger(CouponsService.name);

  constructor(private readonly prisma: PrismaService) {}

  getPlatforms() {
    return AFFILIATE_PLATFORMS;
  }

  async findAllByTenant(tenantId: string, query?: QueryCouponsDto) {
    const where: any = { tenantId };

    if (query?.platform) {
      where.platform = query.platform as AffiliatePlatform;
    }
    if (query?.isActive !== undefined) {
      where.isActive = query.isActive;
    }
    if (query?.search && query.search.trim().length > 0) {
      const q = query.search.trim();
      where.OR = [
        { code: { contains: q, mode: 'insensitive' } },
        { sellerRestriction: { contains: q, mode: 'insensitive' } },
      ];
    }

    const items = await this.prisma.coupon.findMany({
      where,
      orderBy: [{ isActive: 'desc' }, { createdAt: 'desc' }],
    });

    return {
      items,
      total: items.length,
      maxLimit: MAX_COUPONS_PER_TENANT,
    };
  }

  async findOne(tenantId: string, id: string) {
    const coupon = await this.prisma.coupon.findFirst({
      where: { id, tenantId },
    });

    if (!coupon) {
      throw new NotFoundException(
        'Cupom não encontrado para esta organização.',
      );
    }

    return coupon;
  }

  async create(tenantId: string, dto: CreateCouponDto) {
    const totalExisting = await this.prisma.coupon.count({
      where: { tenantId },
    });

    if (totalExisting >= MAX_COUPONS_PER_TENANT) {
      throw new BadRequestException(
        `Limite máximo de ${MAX_COUPONS_PER_TENANT} cupons cadastrados atingido para esta organização.`,
      );
    }

    const normalizedDiscount = this.validateAndNormalizeDiscount(
      dto.discountType as CouponDiscountType,
      dto.discountValue ?? null,
      dto.maxDiscountAmount ?? null,
    );

    const created = await this.prisma.coupon.create({
      data: {
        tenantId,
        platform: (dto.platform || AffiliatePlatform.SHOPEE) as AffiliatePlatform,
        code: dto.code.trim().toUpperCase(),
        discountType: normalizedDiscount.discountType,
        discountValue: normalizedDiscount.discountValue,
        maxDiscountAmount: normalizedDiscount.maxDiscountAmount,
        minProductPrice: dto.minProductPrice ?? null,
        expiresAt: this.parseExpiresAt(dto.expiresAt),
        sellerRestriction: dto.sellerRestriction?.trim() || null,
        productKeywords: this.normalizeKeywords(dto.productKeywords),
        isActive: dto.isActive ?? true,
      },
    });

    this.logger.log(
      `Cupom '${created.code}' (${created.platform}) cadastrado para tenant ${tenantId}.`,
    );
    return created;
  }

  async update(tenantId: string, id: string, dto: UpdateCouponDto) {
    const existing = await this.findOne(tenantId, id);

    const nextDiscountType = (dto.discountType ??
      existing.discountType) as CouponDiscountType;

    const rawDiscountVal =
      dto.discountValue !== undefined
        ? dto.discountValue
        : existing.discountValue !== null
          ? Number(existing.discountValue)
          : null;

    const rawMaxDiscount =
      dto.maxDiscountAmount !== undefined
        ? dto.maxDiscountAmount
        : existing.maxDiscountAmount !== null
          ? Number(existing.maxDiscountAmount)
          : null;

    const normalizedDiscount = this.validateAndNormalizeDiscount(
      nextDiscountType,
      rawDiscountVal,
      rawMaxDiscount,
    );

    const updated = await this.prisma.coupon.update({
      where: { id },
      data: {
        platform: (dto.platform ?? existing.platform) as AffiliatePlatform,
        code: dto.code ? dto.code.trim().toUpperCase() : existing.code,
        discountType: normalizedDiscount.discountType,
        discountValue: normalizedDiscount.discountValue,
        maxDiscountAmount: normalizedDiscount.maxDiscountAmount,
        minProductPrice:
          dto.minProductPrice !== undefined
            ? dto.minProductPrice
            : existing.minProductPrice,
        expiresAt:
          dto.expiresAt !== undefined
            ? this.parseExpiresAt(dto.expiresAt)
            : existing.expiresAt,
        sellerRestriction:
          dto.sellerRestriction !== undefined
            ? dto.sellerRestriction?.trim() || null
            : existing.sellerRestriction,
        productKeywords:
          dto.productKeywords !== undefined
            ? this.normalizeKeywords(dto.productKeywords)
            : existing.productKeywords,
        isActive: dto.isActive ?? existing.isActive,
      },
    });

    return updated;
  }

  async toggleActive(tenantId: string, id: string) {
    const existing = await this.findOne(tenantId, id);

    const updated = await this.prisma.coupon.update({
      where: { id },
      data: { isActive: !existing.isActive },
    });

    return updated;
  }

  async remove(tenantId: string, id: string) {
    await this.findOne(tenantId, id);
    await this.prisma.coupon.delete({ where: { id } });
    return { success: true, message: 'Cupom excluído com sucesso.' };
  }

  /**
   * Seleciona o melhor cupom elegível (ou avalia o cupom específico vinculado à automação)
   * garantindo isolamento estrito por tenant e plataforma.
   */
  async selectForExecution(
    tenantId: string,
    platform: AffiliatePlatform,
    product: ProductForCouponMatch,
    pinnedCouponId?: string | null,
  ): Promise<EvaluatedCouponMatch | null> {
    const where: any = {
      tenantId,
      platform,
      isActive: true,
    };

    if (pinnedCouponId) {
      where.id = pinnedCouponId;
    }

    const candidates = await this.prisma.coupon.findMany({ where });
    if (candidates.length === 0) {
      return null;
    }

    return selectBestCouponForProduct(candidates, {
      ...product,
      platform,
    });
  }

  async incrementUsage(couponId: string): Promise<void> {
    try {
      await this.prisma.coupon.update({
        where: { id: couponId },
        data: { usageCount: { increment: 1 } },
      });
    } catch (err: any) {
      this.logger.warn(`Falha ao incrementar usageCount do cupom ${couponId}: ${err.message}`);
    }
  }

  private validateAndNormalizeDiscount(
    discountType: CouponDiscountType,
    discountValue: number | null,
    maxDiscountAmount: number | null,
  ) {
    if (discountType === CouponDiscountType.NONE) {
      return {
        discountType,
        discountValue: null,
        maxDiscountAmount: null,
      };
    }

    if (discountValue === null || discountValue === undefined || discountValue <= 0) {
      throw new BadRequestException(
        discountType === CouponDiscountType.PERCENTAGE
          ? 'Informe o percentual de desconto do cupom (maior que 0 e até 100%).'
          : 'Informe o valor fixo de desconto em R$ (maior que 0).',
      );
    }

    if (discountType === CouponDiscountType.PERCENTAGE) {
      if (discountValue > 100) {
        throw new BadRequestException(
          'O desconto percentual do cupom não pode ultrapassar 100%.',
        );
      }
      return {
        discountType,
        discountValue,
        maxDiscountAmount: maxDiscountAmount && maxDiscountAmount > 0 ? maxDiscountAmount : null,
      };
    }

    // FIXED_AMOUNT
    return {
      discountType,
      discountValue,
      maxDiscountAmount: null,
    };
  }

  private parseExpiresAt(raw?: string | null): Date | null {
    if (!raw || !raw.trim()) return null;
    const clean = raw.trim();

    if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
      return new Date(`${clean}T23:59:59.999Z`);
    }

    const parsed = new Date(clean);
    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException('Data de validade do cupom inválida.');
    }
    return parsed;
  }

  private normalizeKeywords(raw?: string[]): string[] {
    if (!Array.isArray(raw)) return [];
    const unique = new Set<string>();
    for (const kw of raw) {
      const clean = String(kw || '').trim();
      if (clean.length > 0 && clean.length <= 60) {
        unique.add(clean);
      }
      if (unique.size >= 10) break;
    }
    return Array.from(unique);
  }
}
