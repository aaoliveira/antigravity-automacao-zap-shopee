import { AffiliatePlatform } from '@prisma/client';

export const MAX_COUPONS_PER_TENANT = 50;

export interface AffiliatePlatformInfo {
  id: AffiliatePlatform;
  name: string;
  label: string;
  description: string;
}

export const AFFILIATE_PLATFORMS: AffiliatePlatformInfo[] = [
  {
    id: AffiliatePlatform.SHOPEE,
    name: 'Shopee',
    label: 'Shopee Afiliados',
    description: 'Cupons aplicáveis às ofertas geradas pela integração Shopee Open API.',
  },
];
