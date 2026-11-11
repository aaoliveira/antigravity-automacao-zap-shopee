export const FEATURE_FLAG_KEYS = {
  ML_ALTERNATIVE_B_ENABLED: 'ml_alternative_b_enabled',
  ML_ALTERNATIVE_A_ENABLED: 'ml_alternative_a_enabled',
} as const;

export type FeatureFlagKey =
  (typeof FEATURE_FLAG_KEYS)[keyof typeof FEATURE_FLAG_KEYS];

export const ALL_FEATURE_FLAG_KEYS: FeatureFlagKey[] = Object.values(
  FEATURE_FLAG_KEYS,
);

export const FEATURE_FLAG_DEFAULTS: Record<FeatureFlagKey, boolean> = {
  [FEATURE_FLAG_KEYS.ML_ALTERNATIVE_B_ENABLED]: true,
  [FEATURE_FLAG_KEYS.ML_ALTERNATIVE_A_ENABLED]: false,
};

export interface FeatureFlagMetadata {
  key: FeatureFlagKey;
  title: string;
  description: string;
  defaultValue: boolean;
}

export const FEATURE_FLAG_METADATA: FeatureFlagMetadata[] = [
  {
    key: FEATURE_FLAG_KEYS.ML_ALTERNATIVE_B_ENABLED,
    title: 'Mercado Livre — Alternativa B (Protótipo + Extensão / Gateway)',
    description:
      'Tela estilo protótipo para configurar tag de afiliado, cookie criptografado (expiração de 14 dias), pareamento automático no navegador e gateway homologado opcional. Habilitada por padrão.',
    defaultValue: true,
  },
  {
    key: FEATURE_FLAG_KEYS.ML_ALTERNATIVE_A_ENABLED,
    title: 'Mercado Livre — Alternativa A (OAuth 2.0 Oficial + Links meli.la)',
    description:
      'Integração 100% oficial via Mercado Livre Developers (OAuth 2.0), busca oficial de produtos (/sites/MLB/search) e fila de ofertas com links meli.la. Desabilitada por padrão.',
    defaultValue: false,
  },
];
