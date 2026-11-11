import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildSessionCookieHeader } from '../src/services/cookie-collector.js';
import { ShopeeZapExtensionClient } from '../src/services/api-client.js';
import { normalizeBaseUrl } from '../src/services/storage.js';
import { EXTENSION_METADATA } from '../src/config/contracts.js';
import '../src/content/ml-extractor.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

test('manifest.json MV3 válido e alinhado com metadata do contrato', () => {
  const manifest = JSON.parse(
    fs.readFileSync(path.join(rootDir, 'manifest.json'), 'utf8'),
  );
  assert.equal(manifest.manifest_version, 3);
  assert.equal(manifest.version, EXTENSION_METADATA.version);
  assert.ok(manifest.permissions.includes('cookies'));
  assert.ok(manifest.permissions.includes('storage'));
  assert.ok(manifest.permissions.includes('activeTab'));
  assert.ok(fs.existsSync(path.join(rootDir, manifest.icons['16'])));
  assert.ok(fs.existsSync(path.join(rootDir, manifest.icons['48'])));
  assert.ok(fs.existsSync(path.join(rootDir, manifest.icons['128'])));
});

test('cookie-collector filtra domínios fora do ML e prioriza cookies HttpOnly de sessão', () => {
  const collected = buildSessionCookieHeader([
    { name: 'evil_session', value: 'hack', domain: '.evil.com', httpOnly: true },
    { name: 'ssid', value: 'sec123', domain: '.mercadolivre.com.br', httpOnly: true },
    { name: 'orguserid', value: '9988', domain: '.mercadolibre.com', httpOnly: false },
    { name: 'orguserid', value: '7777', domain: '.mercadolivre.com.br', httpOnly: false },
    { name: 'zeta', value: '1', domain: 'www.mercadolivre.com.br', httpOnly: false },
  ]);

  assert.equal(collected.hasCoreAuthCookies, true);
  assert.equal(collected.httpOnlyCount, 1);
  assert.equal(collected.totalFound, 3);
  assert.ok(!collected.cookieHeader.includes('evil_session'));
  assert.ok(collected.cookieHeader.includes('orguserid=7777'));
  assert.ok(collected.cookieHeader.includes('ssid=sec123'));
});

test('ml-extractor extrai produto, vendedor, ID e link meli.la de DOM estruturado', () => {
  const fakeDoc = {
    title: 'Fone Bluetooth TWS | MercadoLivre',
    body: {
      innerText: 'Compartilhe seu link de afiliado: https://meli.la/2abc999 agora mesmo',
    },
    querySelectorAll(sel) {
      if (sel.includes('ld+json')) {
        return [
          {
            textContent: JSON.stringify({
              '@type': 'Product',
              name: 'Fone Bluetooth TWS Galaxy',
              sku: 'MLB44556677',
              image: ['http://http2.mlstatic.com/fone.jpg'],
              offers: { price: 199.9, seller: { name: 'Loja Oficial Samsung' } },
            }),
          },
        ];
      }
      return [];
    },
    querySelector(sel) {
      if (sel.includes('canonical')) {
        return {
          getAttribute: () => 'https://produto.mercadolivre.com.br/MLB-44556677',
        };
      }
      return null;
    },
  };

  const product = globalThis.__ShopeeZapMlExtractor.extractMercadoLivreProductFromDocument(
    fakeDoc,
    'https://www.mercadolivre.com.br/fone-tws/p/MLB44556677',
  );

  assert.equal(product.mlItemId, 'MLB44556677');
  assert.equal(product.title, 'Fone Bluetooth TWS Galaxy');
  assert.equal(product.price, 199.9);
  assert.equal(product.sellerName, 'Loja Oficial Samsung');
  assert.equal(product.imageUrl, 'https://http2.mlstatic.com/fone.jpg');
  assert.equal(product.detectedAffiliateShortUrl, 'https://meli.la/2abc999');
});

test('api-client envia X-Extension-Token, X-Extension-Version e normaliza URL base', async () => {
  assert.equal(normalizeBaseUrl('https://app.exemplo.com///'), 'https://app.exemplo.com');
  assert.equal(normalizeBaseUrl('javascript:alert(1)'), '');

  let capturedUrl = '';
  let capturedOptions = null;
  const fakeFetch = async (url, options) => {
    capturedUrl = url;
    capturedOptions = options;
    return {
      ok: true,
      json: async () => ({ success: true, data: { ok: true } }),
    };
  };

  const client = new ShopeeZapExtensionClient(
    'https://app.exemplo.com',
    'tok-abc-123',
    fakeFetch,
  );
  const res = await client.testConversion('https://www.mercadolivre.com.br/p/MLB1');

  assert.deepEqual(res, { ok: true });
  assert.equal(
    capturedUrl,
    'https://app.exemplo.com/api/mercadolivre/extension/test-conversion',
  );
  assert.equal(capturedOptions.headers['X-Extension-Token'], 'tok-abc-123');
  assert.equal(
    capturedOptions.headers['X-Extension-Version'],
    EXTENSION_METADATA.version,
  );
});
