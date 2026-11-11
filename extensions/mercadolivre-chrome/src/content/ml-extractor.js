(function (root) {
  const ML_ID_REGEX = /\b(MLB-?\d{6,14})\b/i;
  const MELI_LA_REGEX = /https:\/\/(?:meli\.la|mercadolivre\.com\/sec)\/[A-Za-z0-9_-]+/i;

  function parseNumericPrice(rawText) {
    if (typeof rawText === 'number' && Number.isFinite(rawText)) {
      return rawText;
    }
    if (!rawText || typeof rawText !== 'string') return null;
    const cleaned = rawText
      .replace(/[^\d.,]/g, '')
      .replace(/\.(?=\d{3}(?:\D|$))/g, '')
      .replace(',', '.');
    const parsed = Number.parseFloat(cleaned);
    return Number.isFinite(parsed) && parsed > 0 ? Number(parsed.toFixed(2)) : null;
  }

  function normalizeMlItemId(rawValue) {
    if (!rawValue) return '';
    const match = String(rawValue).match(ML_ID_REGEX);
    return match ? match[1].replace('-', '').toUpperCase() : '';
  }

  function extractFromJsonLd(doc) {
    const scripts = doc.querySelectorAll
      ? Array.from(doc.querySelectorAll('script[type="application/ld+json"]'))
      : [];
    for (const script of scripts) {
      try {
        const raw = script.textContent || '';
        const parsed = JSON.parse(raw);
        const candidates = Array.isArray(parsed) ? parsed : [parsed];
        for (const node of candidates) {
          if (node && (node['@type'] === 'Product' || node.name)) {
            const offers = Array.isArray(node.offers) ? node.offers[0] : node.offers;
            return {
              title: typeof node.name === 'string' ? node.name.trim() : '',
              price: parseNumericPrice(offers?.price ?? offers?.lowPrice),
              imageUrl: Array.isArray(node.image)
                ? node.image[0]
                : typeof node.image === 'string'
                  ? node.image
                  : '',
              mlItemId: normalizeMlItemId(node.sku || node.productID || ''),
              sellerName:
                typeof offers?.seller?.name === 'string'
                  ? offers.seller.name.trim()
                  : '',
            };
          }
        }
      } catch {
        // Ignora blocos JSON-LD malformados da página externa
      }
    }
    return null;
  }

  function findMeliLaLink(doc) {
    if (!doc || !doc.querySelectorAll) return '';

    const inputs = Array.from(doc.querySelectorAll('input, textarea'));
    for (const el of inputs) {
      const val = String(el.value || '');
      const m = val.match(MELI_LA_REGEX);
      if (m) return m[0];
    }

    const anchors = Array.from(doc.querySelectorAll('a[href]'));
    for (const a of anchors) {
      const href = String(a.getAttribute('href') || '');
      const m = href.match(MELI_LA_REGEX);
      if (m) return m[0];
    }

    const bodyText = doc.body?.innerText || '';
    const textMatch = bodyText.match(MELI_LA_REGEX);
    return textMatch ? textMatch[0] : '';
  }

  function extractMercadoLivreProductFromDocument(doc, pageUrl) {
    if (!doc) return null;

    const ld = extractFromJsonLd(doc) || {};
    const getMeta = (prop) => {
      const el = doc.querySelector?.(
        `meta[property="${prop}"], meta[name="${prop}"]`,
      );
      return el?.getAttribute?.('content')?.trim() || '';
    };
    const getText = (selector) =>
      doc.querySelector?.(selector)?.textContent?.trim() || '';

    const title =
      getText('h1.ui-pdp-title') ||
      ld.title ||
      getMeta('og:title') ||
      doc.title ||
      '';

    const fractionText = getText(
      '.ui-pdp-price__second-line .andes-money-amount__fraction, .andes-money-amount__fraction',
    );
    const centsText = getText(
      '.ui-pdp-price__second-line .andes-money-amount__cents',
    );
    const domPrice = fractionText
      ? parseNumericPrice(
          `${fractionText}${centsText ? `,${centsText}` : ''}`,
        )
      : null;

    const origFraction = getText(
      '.ui-pdp-price__original-value .andes-money-amount__fraction',
    );
    const originalPrice = origFraction ? parseNumericPrice(origFraction) : null;

    const imgEl = doc.querySelector?.(
      'img.ui-pdp-image.ui-pdp-gallery__figure__image, figure.ui-pdp-gallery__figure img',
    );
    const rawImg =
      imgEl?.getAttribute?.('data-zoom') ||
      imgEl?.getAttribute?.('src') ||
      ld.imageUrl ||
      getMeta('og:image') ||
      '';
    const imageUrl = rawImg.startsWith('http://')
      ? rawImg.replace('http://', 'https://')
      : rawImg;

    const sellerName =
      getText('.ui-pdp-seller__link-trigger-button, .ui-pdp-seller__header__title')
        .replace(/^Vendido por\s+/i, '')
        .trim() ||
      ld.sellerName ||
      '';

    const canonicalUrl =
      doc.querySelector?.('link[rel="canonical"]')?.getAttribute?.('href') ||
      pageUrl ||
      '';

    const mlItemId =
      normalizeMlItemId(pageUrl) ||
      normalizeMlItemId(canonicalUrl) ||
      ld.mlItemId ||
      '';

    const detectedAffiliateShortUrl = findMeliLaLink(doc);

    return {
      mlItemId,
      title: title.slice(0, 500),
      price: domPrice || ld.price || null,
      originalPrice,
      imageUrl,
      originalUrl: canonicalUrl || pageUrl || '',
      sellerName,
      detectedAffiliateShortUrl,
    };
  }

  const exportedApi = {
    extractMercadoLivreProductFromDocument,
    parseNumericPrice,
    normalizeMlItemId,
  };

  if (typeof globalThis !== 'undefined') {
    globalThis.__ShopeeZapMlExtractor = exportedApi;
  }

  if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage) {
    chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
      if (message?.type === 'EXTRACT_ML_PRODUCT') {
        try {
          const data = extractMercadoLivreProductFromDocument(
            root.document,
            root.location?.href || '',
          );
          sendResponse({ success: true, data });
        } catch (err) {
          sendResponse({ success: false, error: err?.message || 'Erro ao extrair DOM.' });
        }
        return true;
      }
      return false;
    });
  }
})(typeof window !== 'undefined' ? window : globalThis);
