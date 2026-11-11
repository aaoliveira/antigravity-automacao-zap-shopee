import {
  BadRequestException,
  UnauthorizedException,
  RequestTimeoutException,
} from '@nestjs/common';
import { EvolutionClient, DEFAULT_CAPTION_TEMPLATE } from './evolution.client';
import { EvolutionSsrfValidator } from './evolution-ssrf.validator';

describe('Evolution API - Unit Tests', () => {
  let client: EvolutionClient;
  const originalFetch = global.fetch;

  beforeEach(() => {
    client = new EvolutionClient();
    delete process.env.ALLOW_INTERNAL_EVOLUTION_URL;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    delete process.env.EVOLUTION_DOCKER_ENABLED;
    delete process.env.EVOLUTION_DOCKER_BASE_URL;
    jest.clearAllMocks();
  });

  describe('EvolutionSsrfValidator', () => {
    it('deve bloquear URLs de loopback (localhost, 127.0.0.1)', () => {
      expect(() =>
        EvolutionSsrfValidator.validateUrl('http://localhost:8080'),
      ).toThrow(BadRequestException);

      expect(() =>
        EvolutionSsrfValidator.validateUrl('http://127.0.0.1:8080/test'),
      ).toThrow(BadRequestException);
    });

    it('deve bloquear IPs privados RFC 1918 (10.x, 172.16-31.x, 192.168.x)', () => {
      expect(() =>
        EvolutionSsrfValidator.validateUrl('http://10.0.0.1:8080'),
      ).toThrow(BadRequestException);

      expect(() =>
        EvolutionSsrfValidator.validateUrl('http://172.20.0.5:8080'),
      ).toThrow(BadRequestException);

      expect(() =>
        EvolutionSsrfValidator.validateUrl('http://192.168.1.100:8080'),
      ).toThrow(BadRequestException);
    });

    it('deve bloquear IP de metadados de nuvem (169.254.169.254)', () => {
      expect(() =>
        EvolutionSsrfValidator.validateUrl('http://169.254.169.254/latest/meta-data'),
      ).toThrow(BadRequestException);
    });

    it('deve rejeitar protocolos perigosos que não sejam http ou https', () => {
      expect(() =>
        EvolutionSsrfValidator.validateUrl('ftp://meu-servidor.com/file'),
      ).toThrow(BadRequestException);

      expect(() =>
        EvolutionSsrfValidator.validateUrl('file:///etc/passwd'),
      ).toThrow(BadRequestException);
    });

    it('deve aceitar domínios públicos válidos', () => {
      expect(() =>
        EvolutionSsrfValidator.validateUrl('https://api.evolution.meusaas.com.br'),
      ).not.toThrow();

      expect(() =>
        EvolutionSsrfValidator.validateUrl(
          'https://down-br.img.susercontent.com/file/br-11134207-7r98o-lx192837',
        ),
      ).not.toThrow();
    });

    it('deve respeitar a flag de liberação explícita para ambiente interno (ALLOW_INTERNAL_EVOLUTION_URL)', () => {
      expect(() =>
        EvolutionSsrfValidator.validateUrl('http://127.0.0.1:8080', true),
      ).not.toThrow();
    });

    it('deve autorizar apenas a URL exata configurada para Evolution Docker quando EVOLUTION_DOCKER_ENABLED=true', () => {
      process.env.EVOLUTION_DOCKER_ENABLED = 'false';
      process.env.EVOLUTION_DOCKER_BASE_URL = 'http://localhost:8080';
      expect(EvolutionSsrfValidator.isAuthorizedDockerUrl('http://localhost:8080')).toBe(false);

      process.env.EVOLUTION_DOCKER_ENABLED = 'true';
      expect(EvolutionSsrfValidator.isAuthorizedDockerUrl('http://localhost:8080')).toBe(true);
      expect(EvolutionSsrfValidator.isAuthorizedDockerUrl('http://localhost:8080/')).toBe(true);

      // Qualquer outro destino interno ou porta diferente deve continuar bloqueado
      expect(EvolutionSsrfValidator.isAuthorizedDockerUrl('http://127.0.0.1:8080')).toBe(false);
      expect(EvolutionSsrfValidator.isAuthorizedDockerUrl('http://localhost:3005')).toBe(false);
      expect(EvolutionSsrfValidator.isAuthorizedDockerUrl('http://169.254.169.254')).toBe(false);
      expect(EvolutionSsrfValidator.isAuthorizedDockerUrl('http://10.0.0.1:8080')).toBe(false);
    });
  });

  describe('Template de Legenda de Oferta', () => {
    it('deve formatar legenda usando o template padrão oficial', () => {
      const formatted = client.formatCaption(null, {
        titulo: 'Fone Bluetooth Pro TWS',
        preco: 'R$ 49,90',
        link_afiliado: 'https://shope.ee/teste123',
      });

      expect(formatted).toContain('Oferta encontrada!');
      expect(formatted).toContain('Fone Bluetooth Pro TWS');
      expect(formatted).toContain('Preço: R$ 49,90');
      expect(formatted).toContain('Confira: https://shope.ee/teste123');
    });

    it('deve permitir template personalizado com as tags homologadas', () => {
      const customTemplate = '🔥 PROMOÇÃO: {titulo} por {preco}! Acesse: {link_afiliado}';
      const formatted = client.formatCaption(customTemplate, {
        titulo: 'Smartwatch Ultra 9',
        preco: 'R$ 89,00',
        link_afiliado: 'https://shope.ee/watch789',
      });

      expect(formatted).toBe('🔥 PROMOÇÃO: Smartwatch Ultra 9 por R$ 89,00! Acesse: https://shope.ee/watch789');
    });
  });

  describe('EvolutionClient - Chamadas HTTP Homologadas', () => {
    const baseUrl = 'https://evolution.example.com';
    const apiKey = 'test-secret-global-apikey';

    it('pingServer deve enviar header apikey e consultar /instance/fetchInstances', async () => {
      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => [{ instanceName: 'inst-1' }],
      });
      global.fetch = mockFetch;

      const res = await client.pingServer(baseUrl, apiKey);
      expect(res.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://evolution.example.com/instance/fetchInstances',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({ apikey: apiKey }),
        }),
      );
    });

    it('createInstance deve enviar integration WHATSAPP-BAILEYS e qrcode=true', async () => {
      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 201,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          instance: { instanceName: 'minha-instancia', status: 'created', integration: 'WHATSAPP-BAILEYS' },
          qrcode: { base64: 'data:image/png;base64,iVBORw0KGgo...' },
        }),
      });
      global.fetch = mockFetch;

      const res = await client.createInstance(baseUrl, apiKey, 'minha-instancia');
      expect(res.instance.instanceName).toBe('minha-instancia');
      expect(res.qrcode?.base64).toBeDefined();

      expect(mockFetch).toHaveBeenCalledWith(
        'https://evolution.example.com/instance/create',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            instanceName: 'minha-instancia',
            qrcode: true,
            integration: 'WHATSAPP-BAILEYS',
          }),
        }),
      );
    });

    it('fetchAllGroups deve consultar /group/fetchAllGroups com getParticipants=false', async () => {
      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => [
          {
            id: '1203630192837465@g.us',
            subject: 'Grupo Achadinhos VIP',
            size: 150,
          },
        ],
      });
      global.fetch = mockFetch;

      const groups = await client.fetchAllGroups(baseUrl, apiKey, 'instancia-01');
      expect(groups).toHaveLength(1);
      expect(groups[0].id).toBe('1203630192837465@g.us');
      expect(groups[0].subject).toBe('Grupo Achadinhos VIP');
    });

    it('sendMedia deve enviar imagem com legenda oficial e verificar URL', async () => {
      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 201,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          key: { id: 'MSG123456', remoteJid: '1203630192837465@g.us' },
          status: 'PENDING',
        }),
      });
      global.fetch = mockFetch;

      const res = await client.sendMedia(baseUrl, apiKey, 'instancia-01', {
        number: '1203630192837465@g.us',
        media: 'https://down-br.img.susercontent.com/file/br-11134207.jpg',
        caption: 'Oferta incrível!',
      });

      expect(res.key.id).toBe('MSG123456');
      expect(mockFetch).toHaveBeenCalledWith(
        'https://evolution.example.com/message/sendMedia/instancia-01',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            number: '1203630192837465@g.us',
            mediatype: 'image',
            mimetype: 'image/jpeg',
            caption: 'Oferta incrível!',
            media: 'https://down-br.img.susercontent.com/file/br-11134207.jpg',
            fileName: 'produto.jpg',
          }),
        }),
      );
    });

    it('sendMedia deve incluir delay (ms) e fileName personalizado no payload quando informados', async () => {
      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 201,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ key: { id: 'MSG999' } }),
      });
      global.fetch = mockFetch;

      await client.sendMedia(baseUrl, apiKey, 'instancia-01', {
        number: '1203630192837465@g.us',
        media: 'https://down-br.img.susercontent.com/file/br-11134207.jpg',
        caption: 'Teste delay',
        fileName: 'oferta-shopee-item99.jpg',
        delay: 1450,
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://evolution.example.com/message/sendMedia/instancia-01',
        expect.objectContaining({
          body: JSON.stringify({
            number: '1203630192837465@g.us',
            mediatype: 'image',
            mimetype: 'image/jpeg',
            caption: 'Teste delay',
            media: 'https://down-br.img.susercontent.com/file/br-11134207.jpg',
            fileName: 'oferta-shopee-item99.jpg',
            delay: 1450,
          }),
        }),
      );
    });

    it('deve lançar UnauthorizedException quando a Evolution API retornar 401', async () => {
      const mockFetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 401,
        headers: new Headers({ 'content-type': 'application/json' }),
        text: async () => JSON.stringify({ message: 'Invalid API Key' }),
      });
      global.fetch = mockFetch;

      await expect(client.pingServer(baseUrl, 'chave-invalida')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('formatCaption - Cupons e Variáveis Dinâmicas', () => {
    it('deve substituir variáveis com chaves simples e duplas quando houver cupom aplicável', () => {
      const rendered = client.formatCaption(
        '*{titulo}*\nDe R$ 199,90 por *{preco}*\nCupom: *{{cupom}}*\nDesconto: {{cupom_desconto}}\nCom cupom: *R$ {{preco_com_cupom}}*\nVálido até {{cupom_validade}}\n\n{link_afiliado}',
        {
          titulo: 'Fone Bluetooth TWS',
          preco: 'R$ 149,90',
          link_afiliado: 'https://shope.ee/exemplo',
          cupom: 'FONE10',
          cupom_desconto: '10% OFF (até R$ 20,00)',
          preco_com_cupom: '134,91',
          cupom_validade: '15/10',
        },
      );

      expect(rendered).toContain('Cupom: *FONE10*');
      expect(rendered).toContain('Desconto: 10% OFF (até R$ 20,00)');
      expect(rendered).toContain('Com cupom: *R$ 134,91*');
      expect(rendered).toContain('Válido até 15/10');
      expect(rendered).toContain('https://shope.ee/exemplo');
    });

    it('deve remover automaticamente as linhas com variáveis de cupom não preenchidas', () => {
      const rendered = client.formatCaption(
        '*{titulo}*\nPreço: {preco}\nCupom: *{{cupom}}*\nDesconto: {{cupom_desconto}}\nCom cupom: *R$ {{preco_com_cupom}}*\nVálido até {{cupom_validade}}\nConfira: {link_afiliado}',
        {
          titulo: 'Carregador Rápido USB-C',
          preco: 'R$ 59,90',
          link_afiliado: 'https://shope.ee/usb',
        },
      );

      expect(rendered).toBe(
        '*Carregador Rápido USB-C*\nPreço: R$ 59,90\nConfira: https://shope.ee/usb',
      );
    });
  });

  describe('formatCaption - Suporte a Spintax Anti-Ban (Item 4)', () => {
    it('deve resolver blocos Spintax simples e aninhados sem colidir com {titulo}, {{cupom}} ou remoção de linhas vazias', () => {
      const tpl =
        '{Oferta imperdível|Achadinho do dia|Super promoção {relâmpago|VIP}}!\n*{titulo}*\nPor *{preco}*\nCupom: *{{cupom}}*\n{Confira aqui|Garanta já}: {link_afiliado}';

      const pickFirst = client.formatCaption(
        tpl,
        {
          titulo: 'Kit Gamer {Edição|Especial}',
          preco: 'R$ 120,00',
          link_afiliado: 'https://shope.ee/gamer',
        },
        () => 0,
      );
      expect(pickFirst).toBe(
        'Oferta imperdível!\n*Kit Gamer {Edição|Especial}*\nPor *R$ 120,00*\nConfira aqui: https://shope.ee/gamer',
      );

      const pickLast = client.formatCaption(
        tpl,
        {
          titulo: 'Kit Gamer',
          preco: 'R$ 120,00',
          link_afiliado: 'https://shope.ee/gamer',
          cupom: 'VIP10',
        },
        () => 0.99,
      );
      expect(pickLast).toBe(
        'Super promoção VIP!\n*Kit Gamer*\nPor *R$ 120,00*\nCupom: *VIP10*\nGaranta já: https://shope.ee/gamer',
      );
    });
  });
});
