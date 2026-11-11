export const ML_AUTH_URL = 'https://auth.mercadolivre.com.br/authorization';
export const ML_TOKEN_URL = 'https://api.mercadolibre.com/oauth/token';
export const ML_USER_ME_URL = 'https://api.mercadolibre.com/users/me';
export const ML_SEARCH_URL = 'https://api.mercadolibre.com/sites/MLB/search';

export const ML_SESSION_COOKIE_TTL_DAYS = 14;
export const ML_OAUTH_STATE_TTL_MS = 10 * 60 * 1000; // 10 min
export const ML_PAIRING_TOKEN_TTL_MS = 15 * 60 * 1000; // 15 min

const ALLOWED_ML_HOST_SUFFIXES = [
  'mercadolivre.com.br',
  'mercadolibre.com',
  'mercadolivre.com',
  'meli.la',
];

export function isAllowedMercadoLivreUrl(rawUrl: string): boolean {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return false;
  }
  try {
    const parsed = new URL(rawUrl.trim());
    if (parsed.protocol !== 'https:') {
      return false;
    }
    const host = parsed.hostname.toLowerCase();
    return ALLOWED_ML_HOST_SUFFIXES.some(
      (domain) => host === domain || host.endsWith(`.${domain}`),
    );
  } catch {
    return false;
  }
}

export function isAllowedAffiliateShortUrl(rawUrl: string): boolean {
  return isAllowedMercadoLivreUrl(rawUrl);
}
