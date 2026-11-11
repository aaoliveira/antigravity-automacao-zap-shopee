import {
  ML_COOKIE_DOMAINS,
  PRIORITY_SESSION_COOKIE_NAMES,
} from '../config/contracts.js';

/**
 * Serializa e deduplica cookies do Mercado Livre priorizando cookies de sessão
 * (inclusive HttpOnly inacessíveis ao bookmarklet padrão).
 */
export function buildSessionCookieHeader(cookies) {
  if (!Array.isArray(cookies) || cookies.length === 0) {
    return {
      cookieHeader: '',
      totalFound: 0,
      hasCoreAuthCookies: false,
      foundNames: [],
      httpOnlyCount: 0,
    };
  }

  const byName = new Map();
  for (const item of cookies) {
    if (!item || !item.name || item.value === undefined) continue;
    const domain = String(item.domain || '').toLowerCase();
    const isAllowedDomain = ML_COOKIE_DOMAINS.some(
      (d) => domain === d || domain.endsWith(`.${d}`),
    );
    if (!isAllowedDomain) continue;

    // Prefere cookies do domínio .mercadolivre.com.br caso haja duplicata por subdomínio
    const existing = byName.get(item.name);
    if (!existing || domain.includes('mercadolivre.com.br')) {
      byName.set(item.name, item);
    }
  }

  const priorityLower = new Set(PRIORITY_SESSION_COOKIE_NAMES);
  const sorted = Array.from(byName.values()).sort((a, b) => {
    const aPri = priorityLower.has(a.name.toLowerCase()) ? 0 : 1;
    const bPri = priorityLower.has(b.name.toLowerCase()) ? 0 : 1;
    if (aPri !== bPri) return aPri - bPri;
    return a.name.localeCompare(b.name);
  });

  const foundNames = sorted.map((c) => c.name);
  const hasCoreAuthCookies = ['orguserid', 'ssid', 'orguseridp'].some((key) =>
    foundNames.some((n) => n.toLowerCase() === key),
  );
  const httpOnlyCount = sorted.filter((c) => Boolean(c.httpOnly)).length;
  const cookieHeader = sorted.map((c) => `${c.name}=${c.value}`).join('; ');

  return {
    cookieHeader,
    totalFound: sorted.length,
    hasCoreAuthCookies,
    foundNames,
    httpOnlyCount,
  };
}

export async function collectMercadoLivreCookiesFromChrome() {
  if (typeof chrome === 'undefined' || !chrome.cookies?.getAll) {
    throw new Error('API chrome.cookies indisponível fora do navegador Chrome.');
  }

  const batches = await Promise.all(
    ML_COOKIE_DOMAINS.map((domain) => chrome.cookies.getAll({ domain })),
  );

  const flat = batches.flat();
  return buildSessionCookieHeader(flat);
}
