import { ShopeeZapExtensionClient } from '../services/api-client.js';
import { collectMercadoLivreCookiesFromChrome } from '../services/cookie-collector.js';
import { loadSettings, saveSettings, clearSettings } from '../services/storage.js';

async function getConfiguredClient(overrideSettings = {}) {
  const saved = await loadSettings();
  const baseUrl = overrideSettings.baseUrl ?? saved.baseUrl;
  const extensionToken = overrideSettings.extensionToken ?? saved.extensionToken;
  return {
    client: new ShopeeZapExtensionClient(baseUrl, extensionToken),
    saved,
  };
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  (async () => {
    switch (message?.type) {
      case 'PING_STATUS': {
        const { client } = await getConfiguredClient(message.payload);
        const status = await client.getStatus();
        return { success: true, data: status };
      }

      case 'SAVE_CONNECTION': {
        const saved = await saveSettings({
          baseUrl: message.payload?.baseUrl,
          extensionToken: message.payload?.extensionToken,
        });
        const client = new ShopeeZapExtensionClient(
          saved.baseUrl,
          saved.extensionToken,
        );
        const status = await client.getStatus();
        return { success: true, data: { settings: saved, status } };
      }

      case 'DISCONNECT_EXTENSION': {
        await clearSettings();
        return { success: true };
      }

      case 'SYNC_COOKIES_AND_TAG': {
        const { client } = await getConfiguredClient();
        const collected = await collectMercadoLivreCookiesFromChrome();
        if (!collected.cookieHeader) {
          throw new Error(
            'Nenhum cookie do Mercado Livre encontrado no navegador. Faça login em mercadolivre.com.br primeiro.',
          );
        }

        const synced = await client.syncSession({
          affiliateTag: message.payload?.affiliateTag,
          sessionCookie: collected.cookieHeader,
        });
        await saveSettings({ lastSyncAt: new Date().toISOString() });

        return {
          success: true,
          data: {
            account: synced.account,
            collectedMeta: {
              totalFound: collected.totalFound,
              httpOnlyCount: collected.httpOnlyCount,
              hasCoreAuthCookies: collected.hasCoreAuthCookies,
            },
          },
        };
      }

      case 'TEST_CONVERSION': {
        const { client } = await getConfiguredClient();
        const result = await client.testConversion(message.payload?.url);
        return { success: true, data: result };
      }

      case 'SEND_OFFER': {
        const { client } = await getConfiguredClient();
        const synced = await client.syncSession({
          offer: message.payload?.offer,
        });
        return { success: true, data: synced };
      }

      case 'SAVE_GATEWAY': {
        const { client } = await getConfiguredClient();
        const account = await client.saveGateway(message.payload || {});
        return { success: true, data: account };
      }

      case 'CLEAR_REMOTE_SESSION': {
        const { client } = await getConfiguredClient();
        const res = await client.clearRemoteSession();
        return { success: true, data: res };
      }

      default:
        throw new Error(`Ação desconhecida no worker: ${message?.type}`);
    }
  })()
    .then((result) => sendResponse(result))
    .catch((err) => {
      sendResponse({
        success: false,
        error: err?.message || 'Erro inesperado no service worker.',
      });
    });

  return true;
});
