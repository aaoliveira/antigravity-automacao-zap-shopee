import { ShopeeClientService, NormalizedProduct } from './shopee.client';
import { ShopeeSignerService } from './shopee.signer';

describe('ShopeeClientService (Lógica de Domínio e Normalização)', () => {
  let client: ShopeeClientService;
  let signer: ShopeeSignerService;

  beforeEach(() => {
    signer = new ShopeeSignerService();
    client = new ShopeeClientService(signer);
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
});
