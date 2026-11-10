import {
  ShopeeClientService,
  NormalizedProduct,
  ShopeeValidationDiagnostics,
} from './shopee.client';
import { ShopeeSignerService } from './shopee.signer';

describe('ShopeeClientService (Lógica de Domínio e Normalização)', () => {
  let client: ShopeeClientService;
  let signer: ShopeeSignerService;
  const originalFetch = global.fetch;

  beforeEach(() => {
    signer = new ShopeeSignerService();
    client = new ShopeeClientService(signer);
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  describe('selectRandomEligibleProduct (Desduplicação e Aleatoriedade)', () => {
    const mockProducts: NormalizedProduct[] = [
      {
        itemId: 'item_1',
        title: 'Produto 1',
        price: 29.9,
        imageUrl: 'https://shopee.com/img1.jpg',
        productUrl: 'https://shopee.com/prod1',
      },
      {
        itemId: 'item_2',
        title: 'Produto 2',
        price: 49.9,
        imageUrl: 'https://shopee.com/img2.jpg',
        productUrl: 'https://shopee.com/prod2',
      },
      {
        itemId: 'item_3',
        title: 'Produto 3',
        price: 99.0,
        imageUrl: 'https://shopee.com/img3.jpg',
        productUrl: 'https://shopee.com/prod3',
      },
    ];

    it('deve selecionar um produto elegível que não esteja na janela recente', () => {
      const published = new Set(['item_1', 'item_2']);
      const selected = client.selectRandomEligibleProduct(mockProducts, published);

      expect(selected).not.toBeNull();
      expect(selected?.itemId).toEqual('item_3');
    });

    it('deve retornar null se todos os produtos candidatos já foram publicados recentemente', () => {
      const published = new Set(['item_1', 'item_2', 'item_3']);
      const selected = client.selectRandomEligibleProduct(mockProducts, published);

      expect(selected).toBeNull();
    });

    it('deve distribuir a seleção uniformemente quando houver múltiplos candidatos (sem viés de item 0)', () => {
      const published = new Set<string>();
      const counts: Record<string, number> = { item_1: 0, item_2: 0, item_3: 0 };

      // Simula 300 sorteios
      for (let i = 0; i < 300; i++) {
        const item = client.selectRandomEligibleProduct(mockProducts, published);
        if (item) counts[item.itemId]++;
      }

      // Cada um dos 3 itens deve ser escolhido um número significativo de vezes (distribuição razoável)
      expect(counts.item_1).toBeGreaterThan(40);
      expect(counts.item_2).toBeGreaterThan(40);
      expect(counts.item_3).toBeGreaterThan(40);
    });
  });

  describe('searchProducts e testConnectivity (Contrato Oficial GraphQL)', () => {
    it('não deve enviar listType junto com keyword/sortType e não deve solicitar campo depreciado price', async () => {
      let capturedBody = '';
      global.fetch = jest.fn(async (_url: any, init: any) => {
        capturedBody = String(init?.body || '');
        return {
          ok: true,
          json: async () => ({
            data: {
              productOfferV2: {
                nodes: [
                  {
                    itemId: '18492019481',
                    productName: 'Garrafa Térmica Inox',
                    productLink: 'https://shopee.com.br/garrafa-i.1.2',
                    offerLink: 'https://shope.ee/abc',
                    imageUrl: 'https://down-br.img.susercontent.com/file/img.jpg',
                    priceMin: '29.90',
                    priceMax: '39.90',
                    commissionRate: '0.08',
                  },
                ],
                pageInfo: { page: 1, limit: 1, hasNextPage: false },
              },
            },
          }),
        } as any;
      });

      const diagnostics: ShopeeValidationDiagnostics = {};
      const ok = await client.testConnectivity('109999', 'my_secret', diagnostics);

      expect(ok).toBe(true);
      expect(diagnostics.message).toBeUndefined();
      expect(capturedBody).not.toContain('listType');
      expect(capturedBody).toContain('priceMin');
      expect(capturedBody).toContain('priceMax');
      expect(capturedBody).not.toMatch(/\bprice\b/);
    });

    it('deve capturar código e diagnóstico sanitizado quando Shopee retornar erro (10035 / 10020)', async () => {
      const secret = 'super_secret_non_hex_value';
      global.fetch = jest.fn(async () => ({
        ok: true,
        json: async () => ({
          errors: [
            {
              message: `error [10035]: You currently do not have access (${secret})`,
              extensions: { code: 10035 },
            },
          ],
        }),
      })) as any;

      const diagnostics: ShopeeValidationDiagnostics = {};
      const ok = await client.testConnectivity('109999', secret, diagnostics);

      expect(ok).toBe(false);
      expect(diagnostics.code).toBe('10035');
      expect(diagnostics.message).toContain('10035');
      expect(diagnostics.message).not.toContain(secret);
    });
  });
});
