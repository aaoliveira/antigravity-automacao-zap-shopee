import { EXTENSION_METADATA } from '../config/contracts.js';
import { loadSettings, normalizeBaseUrl } from '../services/storage.js';

const el = (id) => document.getElementById(id);

function showFeedback(message, type = 'success') {
  const box = el('feedback-box');
  box.textContent = message;
  box.className = `alert alert-${type}`;
  box.classList.remove('hidden');
}

function hideFeedback() {
  el('feedback-box').classList.add('hidden');
}

function sendWorkerMessage(type, payload = {}) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ type, payload }, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      if (!response?.success) {
        reject(new Error(response?.error || 'Falha na operação.'));
        return;
      }
      resolve(response.data);
    });
  });
}

async function ensureHostPermissionForBaseUrl(rawUrl) {
  const cleanUrl = normalizeBaseUrl(rawUrl);
  if (!cleanUrl) {
    throw new Error('Informe uma URL HTTP/HTTPS válida para o ShopeeZap.');
  }
  const parsed = new URL(cleanUrl);
  const originPattern = `${parsed.origin}/*`;

  if (chrome.permissions?.contains && chrome.permissions?.request) {
    const alreadyGranted = await chrome.permissions.contains({
      origins: [originPattern],
    });
    if (!alreadyGranted) {
      const granted = await chrome.permissions.request({
        origins: [originPattern],
      });
      if (!granted) {
        throw new Error(
          `Permissão negada no navegador para acessar ${parsed.origin}.`,
        );
      }
    }
  }
  return cleanUrl;
}

function renderStatus(statusData) {
  const acc = statusData?.account;
  const badge = el('header-badge');
  const card = el('status-card');

  if (acc && (acc.isCookieConnected || acc.affiliateTag)) {
    badge.textContent = acc.isCookieExpired
      ? 'Cookie Expirado'
      : acc.isCookieConnected
        ? 'Conectado'
        : 'Tag Salva';
    badge.className = acc.isCookieExpired
      ? 'badge badge-warning'
      : 'badge badge-success';

    el('status-title').textContent = acc.isCookieExpired
      ? 'Sessão Expirada'
      : acc.isCookieConnected
        ? 'Conectado ao ShopeeZap'
        : 'Tag Configurada';

    const expLabel = acc.isCookieConnected
      ? acc.isCookieExpired
        ? 'cookie expirado — sincronize novamente'
        : `expira em ${acc.cookieDaysRemaining} dias`
      : 'cookies ainda não sincronizados';
    el('status-detail').textContent = `Tag: ${acc.affiliateTag || 'não definida'} • ${expLabel}`;
    card.classList.remove('hidden');

    if (acc.affiliateTag && !el('affiliate-tag').value) {
      el('affiliate-tag').value = acc.affiliateTag;
    }
    if (acc.partnerGatewayUrl && !el('gw-url').value) {
      el('gw-url').value = acc.partnerGatewayUrl;
    }
  } else {
    badge.textContent = 'Pareado';
    badge.className = 'badge badge-neutral';
    card.classList.add('hidden');
  }

  const latestVersion = statusData?.extensionInfo?.version;
  if (latestVersion && latestVersion !== EXTENSION_METADATA.version) {
    el('remote-version').textContent = `v${latestVersion}`;
    el('update-banner').classList.remove('hidden');
  } else {
    el('update-banner').classList.add('hidden');
  }

  el('btn-disconnect-local').classList.remove('hidden');
}

async function extractActiveTabProduct() {
  if (!chrome.tabs?.query) return;
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id || !tab?.url) return;

  const isMl =
    tab.url.includes('mercadolivre.com.br') ||
    tab.url.includes('mercadolibre.com');
  if (!isMl) return;

  el('offer-original-url').value = tab.url;

  try {
    const res = await new Promise((resolve) => {
      chrome.tabs.sendMessage(tab.id, { type: 'EXTRACT_ML_PRODUCT' }, (reply) => {
        if (chrome.runtime.lastError) {
          resolve(null);
          return;
        }
        resolve(reply);
      });
    });

    if (res?.success && res.data) {
      const p = res.data;
      if (p.title) el('offer-title').value = p.title;
      if (p.price) el('offer-price').value = String(p.price);
      if (p.sellerName) el('offer-seller').value = p.sellerName;
      if (p.imageUrl) el('offer-image').value = p.imageUrl;
      if (p.originalUrl) el('offer-original-url').value = p.originalUrl;
      if (p.detectedAffiliateShortUrl) {
        el('offer-short-url').value = p.detectedAffiliateShortUrl;
      }
    }
  } catch {
    // Aba sem content script ativo
  }
}

document.querySelectorAll('.tab').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach((b) => b.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach((p) => p.classList.remove('active'));
    btn.classList.add('active');
    el(`tab-${btn.dataset.tab}`).classList.add('active');
  });
});

el('btn-save-conn').addEventListener('click', async () => {
  hideFeedback();
  const btn = el('btn-save-conn');
  btn.disabled = true;
  try {
    const baseUrl = await ensureHostPermissionForBaseUrl(el('base-url').value);
    const extensionToken = el('ext-token').value.trim();
    if (!extensionToken) {
      throw new Error('Cole o Token da Extensão gerado no painel.');
    }

    const res = await sendWorkerMessage('SAVE_CONNECTION', {
      baseUrl,
      extensionToken,
    });
    renderStatus(res.status);
    showFeedback('Extensão pareada e autenticada com sucesso!', 'success');
  } catch (err) {
    showFeedback(err.message, 'error');
  } finally {
    btn.disabled = false;
  }
});

el('btn-disconnect-local').addEventListener('click', async () => {
  await sendWorkerMessage('DISCONNECT_EXTENSION');
  el('ext-token').value = '';
  el('status-card').classList.add('hidden');
  el('btn-disconnect-local').classList.add('hidden');
  el('header-badge').textContent = 'Desconectado';
  el('header-badge').className = 'badge badge-neutral';
  showFeedback('Token removido do armazenamento local da extensão.', 'amber');
});

el('btn-sync-cookies').addEventListener('click', async () => {
  hideFeedback();
  const btn = el('btn-sync-cookies');
  btn.disabled = true;
  try {
    const data = await sendWorkerMessage('SYNC_COOKIES_AND_TAG', {
      affiliateTag: el('affiliate-tag').value.trim() || undefined,
    });
    renderStatus({ account: data.account });
    const meta = data.collectedMeta;
    el('cookie-summary').textContent =
      `Sincronizado: ${meta.totalFound} cookies (${meta.httpOnlyCount} HttpOnly protegidos) cifrados em AES-256-GCM.`;
    showFeedback('Sessão e cookies sincronizados com validade de 14 dias!', 'success');
  } catch (err) {
    showFeedback(err.message, 'error');
  } finally {
    btn.disabled = false;
  }
});

el('btn-refresh-tab').addEventListener('click', async () => {
  hideFeedback();
  await extractActiveTabProduct();
  showFeedback('Dados da aba Mercado Livre atualizados.', 'success');
});

el('btn-test-conversion').addEventListener('click', async () => {
  hideFeedback();
  const btn = el('btn-test-conversion');
  const box = el('conversion-result');
  btn.disabled = true;
  try {
    const url = el('offer-original-url').value.trim();
    if (!url) throw new Error('Informe ou capture uma URL do Mercado Livre.');
    const res = await sendWorkerMessage('TEST_CONVERSION', { url });

    box.textContent = res.converted
      ? `Convertido via Gateway: ${res.shortUrl}`
      : res.message;
    box.className = `alert ${res.converted ? 'alert-success' : 'alert-amber'}`;
    box.classList.remove('hidden');

    if (res.converted && res.shortUrl) {
      el('offer-short-url').value = res.shortUrl;
    }
  } catch (err) {
    showFeedback(err.message, 'error');
  } finally {
    btn.disabled = false;
  }
});

el('btn-send-offer').addEventListener('click', async () => {
  hideFeedback();
  const btn = el('btn-send-offer');
  btn.disabled = true;
  try {
    const offer = {
      title: el('offer-title').value.trim(),
      price: Number(el('offer-price').value),
      imageUrl: el('offer-image').value.trim(),
      originalUrl: el('offer-original-url').value.trim(),
      affiliateShortUrl: el('offer-short-url').value.trim(),
      sellerName: el('offer-seller').value.trim() || undefined,
      keyword: el('offer-keyword').value.trim() || undefined,
    };

    if (!offer.title || !offer.price || !offer.originalUrl || !offer.affiliateShortUrl) {
      throw new Error('Preencha título, preço, URL original e link afiliado meli.la.');
    }
    if (!offer.imageUrl) {
      throw new Error('Informe a URL da imagem do produto.');
    }

    await sendWorkerMessage('SEND_OFFER', { offer });
    showFeedback('Oferta enviada para a fila de automações do ShopeeZap!', 'success');
  } catch (err) {
    showFeedback(err.message, 'error');
  } finally {
    btn.disabled = false;
  }
});

el('btn-save-gateway').addEventListener('click', async () => {
  hideFeedback();
  const btn = el('btn-save-gateway');
  btn.disabled = true;
  try {
    const acc = await sendWorkerMessage('SAVE_GATEWAY', {
      affiliateTag: el('affiliate-tag').value.trim() || undefined,
      partnerGatewayUrl: el('gw-url').value.trim() || null,
      partnerGatewayApiKey: el('gw-key').value.trim() || undefined,
    });
    renderStatus({ account: acc });
    el('gw-key').value = '';
    showFeedback('Configuração de Gateway Homologado salva com segurança.', 'success');
  } catch (err) {
    showFeedback(err.message, 'error');
  } finally {
    btn.disabled = false;
  }
});

el('btn-clear-remote').addEventListener('click', async () => {
  hideFeedback();
  try {
    await sendWorkerMessage('CLEAR_REMOTE_SESSION');
    el('status-card').classList.add('hidden');
    el('header-badge').textContent = 'Pareado';
    el('header-badge').className = 'badge badge-neutral';
    showFeedback('Tag e cookies removidos do servidor.', 'amber');
  } catch (err) {
    showFeedback(err.message, 'error');
  }
});

(async function init() {
  el('ext-version').textContent = `v${EXTENSION_METADATA.version}`;
  const settings = await loadSettings();
  el('base-url').value = settings.baseUrl || EXTENSION_METADATA.defaultBaseUrl;
  el('ext-token').value = settings.extensionToken || '';

  if (settings.baseUrl && settings.extensionToken) {
    try {
      const status = await sendWorkerMessage('PING_STATUS');
      renderStatus(status);
    } catch {
      el('header-badge').textContent = 'Verificar Token';
      el('header-badge').className = 'badge badge-warning';
    }
  }

  await extractActiveTabProduct();
})();
