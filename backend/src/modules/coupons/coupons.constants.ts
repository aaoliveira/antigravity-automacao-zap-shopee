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
  {
    id: AffiliatePlatform.MERCADO_LIVRE,
    name: 'Mercado Livre',
    label: 'Mercado Livre Afiliados',
    description: 'Cupons aplicáveis às ofertas e divulgações do programa de afiliados Mercado Livre.',
  },
];
