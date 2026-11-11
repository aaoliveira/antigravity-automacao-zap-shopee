import { AffiliatePlatform, CouponDiscountType } from '@prisma/client';

export interface CouponCandidate {
  id: string;
  platform: AffiliatePlatform;
  code: string;
  discountType: CouponDiscountType;
  discountValue: any;
  maxDiscountAmount: any;
  minProductPrice: any;
  expiresAt: Date | string | null;
  sellerRestriction: string | null;
  productKeywords: string[];
  isActive: boolean;
}

export interface ProductForCouponMatch {
  title: string;
  price: number;
  platform?: AffiliatePlatform;
  shopName?: string | null;
}

export interface CouponTemplateVars {
  cupom: string;
  cupom_desconto?: string;
  preco_com_cupom?: string;
  cupom_validade?: string;
}

export interface EvaluatedCouponMatch {
  coupon: CouponCandidate;
  discountAmount: number;
  finalPrice: number;
  hasRestriction: boolean;
  vars: CouponTemplateVars;
}

function normalizeText(value: string): string {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function roundCents(value: number): number {
  return Math.round(value * 100) / 100;
}

export function formatMoneyPtBr(value: number): string {
  return value.toFixed(2).replace('.', ',');
}

function formatPercent(value: number): string {
  if (Number.isInteger(value)) return String(value);
  return value.toFixed(2).replace(/\.?0+$/, '').replace('.', ',');
}

export function formatValidityShort(expiresAt: Date | string | null | undefined): string | undefined {
  if (!expiresAt) return undefined;
  const d = new Date(expiresAt);
  if (Number.isNaN(d.getTime())) return undefined;
  const day = String(d.getUTCDate()).padStart(2, '0');
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${day}/${month}`;
}

export function evaluateCouponForProduct(
  coupon: CouponCandidate,
  product: ProductForCouponMatch,
  now = new Date(),
): EvaluatedCouponMatch | null {
  const targetPlatform = product.platform || AffiliatePlatform.SHOPEE;
  if (!coupon.isActive || coupon.platform !== targetPlatform) {
    return null;
  }

  if (coupon.expiresAt) {
    const exp = new Date(coupon.expiresAt);
    if (Number.isNaN(exp.getTime()) || exp.getTime() < now.getTime()) {
      return null;
    }
  }

  const productPrice = Number(product.price);
  if (!Number.isFinite(productPrice) || productPrice <= 0) {
    return null;
  }

  if (coupon.minProductPrice !== null && coupon.minProductPrice !== undefined) {
    const minPrice = Number(coupon.minProductPrice);
    if (Number.isFinite(minPrice) && productPrice < minPrice) {
      return null;
    }
  }

  const cleanSeller = coupon.sellerRestriction?.trim();
  if (cleanSeller) {
    if (!product.shopName) {
      return null;
    }
    if (!normalizeText(product.shopName).includes(normalizeText(cleanSeller))) {
      return null;
    }
  }

  const cleanKeywords = (coupon.productKeywords || [])
    .map((k) => normalizeText(k))
    .filter(Boolean);

  if (cleanKeywords.length > 0) {
    const normalizedTitle = normalizeText(product.title);
    const hasMatchingKeyword = cleanKeywords.some((kw) =>
      normalizedTitle.includes(kw),
    );
    if (!hasMatchingKeyword) {
      return null;
    }
  }

  let discountAmount = 0;
  let cupomDesconto: string | undefined;
  let precoComCupom: string | undefined;

  const rawDiscountVal =
    coupon.discountValue !== null && coupon.discountValue !== undefined
      ? Number(coupon.discountValue)
      : 0;
  const rawMaxDiscount =
    coupon.maxDiscountAmount !== null && coupon.maxDiscountAmount !== undefined
      ? Number(coupon.maxDiscountAmount)
      : null;

  if (coupon.discountType === CouponDiscountType.PERCENTAGE && rawDiscountVal > 0) {
    const calculated = roundCents(productPrice * (rawDiscountVal / 100));
    const capped =
      rawMaxDiscount && rawMaxDiscount > 0
        ? Math.min(calculated, rawMaxDiscount)
        : calculated;
    discountAmount = Math.min(capped, productPrice);

    const maxLabel =
      rawMaxDiscount && rawMaxDiscount > 0
        ? ` (até R$ ${formatMoneyPtBr(rawMaxDiscount)})`
        : '';
    cupomDesconto = `${formatPercent(rawDiscountVal)}% OFF${maxLabel}`;
    precoComCupom = formatMoneyPtBr(Math.max(0, roundCents(productPrice - discountAmount)));
  } else if (coupon.discountType === CouponDiscountType.FIXED_AMOUNT && rawDiscountVal > 0) {
    discountAmount = Math.min(roundCents(rawDiscountVal), productPrice);
    cupomDesconto = `R$ ${formatMoneyPtBr(rawDiscountVal)} OFF`;
    precoComCupom = formatMoneyPtBr(Math.max(0, roundCents(productPrice - discountAmount)));
  }

  const finalPrice = Math.max(0, roundCents(productPrice - discountAmount));
  const hasRestriction = Boolean(cleanSeller) || cleanKeywords.length > 0;
  const cupomValidade = formatValidityShort(coupon.expiresAt);

  return {
    coupon,
    discountAmount,
    finalPrice,
    hasRestriction,
    vars: {
      cupom: coupon.code,
      cupom_desconto: cupomDesconto,
      preco_com_cupom: precoComCupom,
      cupom_validade: cupomValidade,
    },
  };
}

/**
 * Seleciona o melhor cupom elegível conforme regras do protótipo:
 * 1) Filtra plataforma, validade, valor mínimo, vendedor e palavras-chave.
 * 2) Prioriza maior desconto financeiro (R$) para o produto.
 * 3) Em caso de empate no desconto, cupons com restrição vencem os sem restrição.
 * 4) Entre empatados equivalentes, escolhe aleatoriamente.
 */
export function selectBestCouponForProduct(
  coupons: CouponCandidate[],
  product: ProductForCouponMatch,
  now = new Date(),
): EvaluatedCouponMatch | null {
  const eligible = coupons
    .map((coupon) => evaluateCouponForProduct(coupon, product, now))
    .filter((item): item is EvaluatedCouponMatch => item !== null);

  if (eligible.length === 0) {
    return null;
  }

  const bestDiscount = Math.max(...eligible.map((item) => item.discountAmount));
  const topByDiscount = eligible.filter(
    (item) => Math.abs(item.discountAmount - bestDiscount) < 0.005,
  );

  const restrictedTop = topByDiscount.filter((item) => item.hasRestriction);
  const finalPool = restrictedTop.length > 0 ? restrictedTop : topByDiscount;

  const chosenIndex = Math.floor(Math.random() * finalPool.length);
  return finalPool[chosenIndex];
}
