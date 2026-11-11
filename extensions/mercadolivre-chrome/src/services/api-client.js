import {
  API_ENDPOINTS,
  EXTENSION_METADATA,
} from '../config/contracts.js';

export class ShopeeZapExtensionClient {
  constructor(baseUrl, extensionToken, fetchImpl = globalThis.fetch) {
    this.baseUrl = String(baseUrl || '').replace(/\/+$/, '');
    this.extensionToken = String(extensionToken || '').trim();
    this.fetchImpl = fetchImpl;
  }

  async request(path, options = {}) {
    if (!this.baseUrl) {
      throw new Error('Configure a URL da plataforma ShopeeZap antes de continuar.');
    }
    if (!this.extensionToken) {
      throw new Error('Informe o Token da Extensão gerado no painel Mercado Livre.');
    }

    const headers = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'X-Extension-Token': this.extensionToken,
      'X-Extension-Version': EXTENSION_METADATA.version,
      ...(options.headers || {}),
    };

    const response = await this.fetchImpl(`${this.baseUrl}${path}`, {
      ...options,
      headers,
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const msg =
        data?.error?.message ||
        data?.message ||
        `Erro HTTP ${response.status} ao comunicar com o ShopeeZap.`;
      const error = new Error(Array.isArray(msg) ? msg.join(', ') : String(msg));
      error.status = response.status;
      throw error;
    }

    return data?.data ?? data;
  }

  getStatus() {
    return this.request(API_ENDPOINTS.EXTENSION_STATUS, { method: 'GET' });
  }

  syncSession({ affiliateTag, sessionCookie, offer }) {
    return this.request(API_ENDPOINTS.EXTENSION_SYNC, {
      method: 'POST',
      body: JSON.stringify({
        pairingToken: this.extensionToken,
        ...(affiliateTag !== undefined && affiliateTag !== ''
          ? { affiliateTag: affiliateTag.trim() }
          : {}),
        ...(sessionCookie ? { sessionCookie } : {}),
        ...(offer ? { offer } : {}),
      }),
    });
  }

  testConversion(url) {
    return this.request(API_ENDPOINTS.EXTENSION_TEST_CONVERSION, {
      method: 'POST',
      body: JSON.stringify({ url }),
    });
  }

  saveGateway({ affiliateTag, partnerGatewayUrl, partnerGatewayApiKey }) {
    return this.request(API_ENDPOINTS.EXTENSION_GATEWAY, {
      method: 'POST',
      body: JSON.stringify({
        ...(affiliateTag !== undefined ? { affiliateTag } : {}),
        partnerGatewayUrl: partnerGatewayUrl || null,
        ...(partnerGatewayApiKey !== undefined && partnerGatewayApiKey !== ''
          ? { partnerGatewayApiKey }
          : {}),
      }),
    });
  }

  clearRemoteSession() {
    return this.request(API_ENDPOINTS.EXTENSION_SESSION, {
      method: 'DELETE',
    });
  }
}
