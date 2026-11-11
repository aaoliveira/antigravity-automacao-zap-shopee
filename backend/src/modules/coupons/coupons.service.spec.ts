import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AffiliatePlatform, CouponDiscountType } from '@prisma/client';
import { CouponsService } from './coupons.service';
import {
  evaluateCouponForProduct,
  selectBestCouponForProduct,
  CouponCandidate,
} from './coupon-matcher';

describe('Coupons Module & Matching Engine - Unit Tests', () => {
  let service: CouponsService;
  let mockPrisma: any;

  const tenantA = 'tenant-a-111';
  const tenantB = 'tenant-b-222';

  const makeCoupon = (overrides: Partial<CouponCandidate> = {}): CouponCandidate => ({
    id: 'cp-1',
    platform: AffiliatePlatform.SHOPEE,
    code: 'PROMO10',
    discountType: CouponDiscountType.PERCENTAGE,
    discountValue: 10,
    maxDiscountAmount: 20,
    minProductPrice: 50,
    expiresAt: new Date(Date.now() + 86400000),
    sellerRestriction: null,
    productKeywords: [],
    isActive: true,
    ...overrides,
  });

  beforeEach(() => {
    mockPrisma = {
      coupon: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };
    service = new CouponsService(mockPrisma);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('evaluateCouponForProduct & selectBestCouponForProduct', () => {
    it('deve calcular corretamente desconto percentual com teto máximo (exemplo do protótipo: 149,90 -> 134,91)', () => {
      const coupon = makeCoupon({
        code: 'FONE10',
        discountType: CouponDiscountType.PERCENTAGE,
        discountValue: 10,
        maxDiscountAmount: 20,
        expiresAt: new Date('2026-10-15T23:59:59.999Z'),
      });

      const match = evaluateCouponForProduct(
        coupon,
        { title: 'Fone de Ouvido Bluetooth TWS', price: 149.9 },
        new Date('2026-10-10T12:00:00Z'),
      );

      expect(match).not.toBeNull();
      expect(match!.discountAmount).toBe(14.99);
      expect(match!.finalPrice).toBe(134.91);
      expect(match!.vars).toEqual({
        cupom: 'FONE10',
        cupom_desconto: '10% OFF (até R$ 20,00)',
        preco_com_cupom: '134,91',
        cupom_validade: '15/10',
      });
    });

    it('deve respeitar o teto máximo em reais quando o percentual ultrapassar o limite', () => {
      const coupon = makeCoupon({
        code: 'TETO20',
        discountValue: 50,
        maxDiscountAmount: 20,
      });

      const match = evaluateCouponForProduct(coupon, {
        title: 'Monitor Gamer 24"',
        price: 500,
      });

      expect(match!.discountAmount).toBe(20);
      expect(match!.finalPrice).toBe(480);
    });

    it('deve rejeitar cupom inativo, expirado ou abaixo do valor mínimo do produto', () => {
      const now = new Date('2026-11-11T12:00:00Z');
      const inactive = makeCoupon({ isActive: false });
      const expired = makeCoupon({ expiresAt: new Date('2026-11-10T23:59:59Z') });
      const belowMin = makeCoupon({ minProductPrice: 200 });

      expect(
        evaluateCouponForProduct(inactive, { title: 'Fone', price: 100 }, now),
      ).toBeNull();
      expect(
        evaluateCouponForProduct(expired, { title: 'Fone', price: 100 }, now),
      ).toBeNull();
      expect(
        evaluateCouponForProduct(belowMin, { title: 'Fone', price: 199.9 }, now),
      ).toBeNull();
    });

    it('deve validar restrição de vendedor apenas quando produto identificar vendedor e palavras-chave case-insensitive', () => {
      const sellerRestricted = makeCoupon({
        code: 'SAMSUNG15',
        sellerRestriction: 'Loja Oficial Samsung',
      });
      const keywordRestricted = makeCoupon({
        code: 'AUDIO15',
        productKeywords: ['fone', 'caixa de som', 'headset'],
      });

      // Produto sem shopName não recebe cupom restrito a loja
      expect(
        evaluateCouponForProduct(sellerRestricted, {
          title: 'Galaxy Buds',
          price: 300,
        }),
      ).toBeNull();

      // Produto com shopName compatível recebe
      expect(
        evaluateCouponForProduct(sellerRestricted, {
          title: 'Galaxy Buds',
          price: 300,
          shopName: 'Loja Oficial Samsung Brasil',
        }),
      ).not.toBeNull();

      // Palavra-chave sem acento/case-insensitive no título
      expect(
        evaluateCouponForProduct(keywordRestricted, {
          title: 'HEADSET Gamer RGB Pro',
          price: 200,
        }),
      ).not.toBeNull();

      expect(
        evaluateCouponForProduct(keywordRestricted, {
          title: 'Garrafa Térmica Inox',
          price: 200,
        }),
      ).toBeNull();
    });

    it('deve escolher o cupom com MAIOR desconto financeiro e desempatar em favor do cupom com restrição', () => {
      const now = new Date('2026-11-11T12:00:00Z');
      const generic10 = makeCoupon({
        id: 'c1',
        code: 'GERAL10',
        discountType: CouponDiscountType.PERCENTAGE,
        discountValue: 10,
        maxDiscountAmount: null,
        expiresAt: null,
      });
      const fixed20 = makeCoupon({
        id: 'c2',
        code: 'FIXO20',
        discountType: CouponDiscountType.FIXED_AMOUNT,
        discountValue: 20,
        expiresAt: null,
      });
      const restrictedFixed20 = makeCoupon({
        id: 'c3',
        code: 'FONE20',
        discountType: CouponDiscountType.FIXED_AMOUNT,
        discountValue: 20,
        productKeywords: ['fone'],
        expiresAt: null,
      });

      // Para produto de R$ 150: GERAL10 = R$ 15, FIXO20 = R$ 20, FONE20 = R$ 20 (empate -> FONE20 vence por ter restrição)
      const winner = selectBestCouponForProduct(
        [generic10, fixed20, restrictedFixed20],
        { title: 'Fone Bluetooth Sports', price: 150 },
        now,
      );

      expect(winner?.coupon.code).toBe('FONE20');

      // Para produto de R$ 300: GERAL10 = R$ 30 > R$ 20 -> GERAL10 vence
      const winnerHighPrice = selectBestCouponForProduct(
        [generic10, fixed20, restrictedFixed20],
        { title: 'Fone Bluetooth Sports', price: 300 },
        now,
      );

      expect(winnerHighPrice?.coupon.code).toBe('GERAL10');
    });

    it('deve suportar tipo NONE ("Não informar") exibindo código e omitindo valores de desconto', () => {
      const noneCoupon = makeCoupon({
        code: 'VIPCOD',
        discountType: CouponDiscountType.NONE,
        discountValue: null,
        maxDiscountAmount: null,
        expiresAt: null,
      });

      const match = evaluateCouponForProduct(noneCoupon, {
        title: 'Mouse Gamer',
        price: 99,
      });

      expect(match!.discountAmount).toBe(0);
      expect(match!.vars.cupom).toBe('VIPCOD');
      expect(match!.vars.cupom_desconto).toBeUndefined();
      expect(match!.vars.preco_com_cupom).toBeUndefined();
      expect(match!.vars.cupom_validade).toBeUndefined();
    });
  });

  describe('CouponsService CRUD, Multi-Tenancy e Validações', () => {
    it('deve retornar plataformas existentes no sistema (SHOPEE e MERCADO_LIVRE)', () => {
      const platforms = service.getPlatforms();
      expect(platforms.map((p) => p.id)).toEqual([
        AffiliatePlatform.SHOPEE,
        AffiliatePlatform.MERCADO_LIVRE,
      ]);
    });

    it('deve bloquear cadastro acima do limite de 50 cupons por tenant', async () => {
      mockPrisma.coupon.count.mockResolvedValue(50);

      await expect(
        service.create(tenantA, {
          platform: 'SHOPEE',
          code: 'EXTRA51',
          discountType: 'PERCENTAGE',
          discountValue: 10,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('deve validar percentual > 100% ou ausente como BadRequestException', async () => {
      mockPrisma.coupon.count.mockResolvedValue(0);

      await expect(
        service.create(tenantA, {
          platform: 'SHOPEE',
          code: 'ABSURDO',
          discountType: 'PERCENTAGE',
          discountValue: 150,
        }),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.create(tenantA, {
          platform: 'SHOPEE',
          code: 'SEMVAL',
          discountType: 'FIXED_AMOUNT',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('MULTI-TENANCY: deve retornar NotFoundException ao tentar acessar cupom de outro tenant', async () => {
      mockPrisma.coupon.findFirst.mockResolvedValue(null);

      await expect(service.findOne(tenantB, 'cp-of-a')).rejects.toThrow(
        NotFoundException,
      );
      expect(mockPrisma.coupon.findFirst).toHaveBeenCalledWith({
        where: { id: 'cp-of-a', tenantId: tenantB },
      });
    });
  });
});
