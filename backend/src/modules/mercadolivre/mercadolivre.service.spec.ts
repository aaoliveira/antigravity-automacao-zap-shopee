import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { CryptoVaultService } from '../crypto-vault/crypto-vault.service';
import { FEATURE_FLAG_KEYS } from '../feature-flags/feature-flags.constants';
import { MercadoLivreService } from './mercadolivre.service';

describe('MercadoLivreService', () => {
  const ORIGINAL_ENV = { ...process.env };
  const tenantA = 'tenant-aaaa-1111-1111-1111-111111111111';
  const tenantB = 'tenant-bbbb-2222-2222-2222-222222222222';
  const userId = 'user-1111';

  let vault: CryptoVaultService;
  let flagsState: Record<string, boolean>;
  let featureFlagsMock: {
    getFlagsForTenant: jest.Mock;
    assertEnabled: jest.Mock;
  };
  let mlClientMock: {
    buildAuthorizationUrl: jest.Mock;
    exchangeCodeForToken: jest.Mock;
    refreshAccessToken: jest.Mock;
    getUserProfile: jest.Mock;
    searchProductsMLB: jest.Mock;
    convertViaPartnerGateway: jest.Mock;
  };
  let prismaMock: any;
  let service: MercadoLivreService;

  beforeEach(() => {
    process.env.ENCRYPTION_MASTER_KEY =
      '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
    process.env.JWT_SECRET = 'test-jwt-secret-for-ml-spec';
    delete process.env.ALLOW_INTERNAL_EVOLUTION_URL;

    vault = new CryptoVaultService();
    flagsState = {
      [FEATURE_FLAG_KEYS.ML_ALTERNATIVE_B_ENABLED]: true,
      [FEATURE_FLAG_KEYS.ML_ALTERNATIVE_A_ENABLED]: false,
    };

    featureFlagsMock = {
      getFlagsForTenant: jest.fn(async () => ({
        flags: { ...flagsState },
        items: [],
      })),
      assertEnabled: jest.fn(async (_tId: string, key: string) => {
        if (!flagsState[key]) {
          throw new ForbiddenException(`Flag ${key} desabilitada.`);
        }
      }),
    };

    mlClientMock = {
      buildAuthorizationUrl: jest.fn(
        (appId, redirectUri, state) =>
          `https://auth.mercadolivre.com.br/authorization?response_type=code&client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`,
      ),
      exchangeCodeForToken: jest.fn(),
      refreshAccessToken: jest.fn(),
      getUserProfile: jest.fn(),
      searchProductsMLB: jest.fn(),
      convertViaPartnerGateway: jest.fn(),
    };

    prismaMock = {
      mercadoLivreAccount: {
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      mercadoLivreOffer: {
        count: jest.fn().mockResolvedValue(0),
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      automation: {
        count: jest.fn().mockResolvedValue(0),
      },
      auditLog: {
        create: jest.fn().mockResolvedValue({}),
      },
    };

    service = new MercadoLivreService(
      prismaMock,
      vault,
      featureFlagsMock as any,
      mlClientMock as any,
    );
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  describe('Feature Flag gating & Alternativa B', () => {
    it('deve cifrar cookies com expiração de 14 dias e nunca expor texto claro no retorno', async () => {
      const savedRow = {
        id: 'acc-1',
        tenantId: tenantA,
        label: 'Conta ML Principal',
        affiliateTag: 'azevedoalexandre39',
        sessionCookieEncrypted: vault.encrypt('orguserid=123; ssid=abc123; orguseridp=xyz'),
        sessionCookieMasked: '************abc123',
        sessionExpiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        partnerGatewayUrl: null,
        partnerGatewayApiKeyEncrypted: null,
        partnerGatewayApiKeyMasked: null,
        isOAuthConnected: false,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      prismaMock.mercadoLivreAccount.create.mockResolvedValue(savedRow);

      const res = await service.savePrototypeConfig(tenantA, userId, {
        affiliateTag: 'azevedoalexandre39',
        sessionCookie: 'orguserid=123; ssid=abc123; orguseridp=xyz',
      });

      const createCall = prismaMock.mercadoLivreAccount.create.mock.calls[0][0].data;
      expect(createCall.sessionCookieEncrypted).not.toContain('ssid=abc123');
      expect(vault.decrypt(createCall.sessionCookieEncrypted)).toBe(
        'orguserid=123; ssid=abc123; orguseridp=xyz',
      );
      expect(res.affiliateTag).toBe('azevedoalexandre39');
      expect(res.isCookieConnected).toBe(true);
      expect(res.cookieDaysRemaining).toBe(14);
      expect((res as any).sessionCookieEncrypted).toBeUndefined();
    });

    it('deve bloquear partnerGatewayUrl interna (SSRF) e bloquear quando flag B estiver OFF', async () => {
      await expect(
        service.savePrototypeConfig(tenantA, userId, {
          affiliateTag: 'minhatag',
          partnerGatewayUrl: 'http://169.254.169.254/latest/meta-data',
        }),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.savePrototypeConfig(tenantA, userId, {
          affiliateTag: 'minhatag',
          partnerGatewayUrl: 'http://127.0.0.1:8080/convert',
        }),
      ).rejects.toThrow(BadRequestException);

      flagsState[FEATURE_FLAG_KEYS.ML_ALTERNATIVE_B_ENABLED] = false;
      await expect(
        service.savePrototypeConfig(tenantA, userId, {
          affiliateTag: 'minhatag',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('testConversion deve responder honestamente sem gateway e validar domínio ML', async () => {
      prismaMock.mercadoLivreAccount.findFirst.mockResolvedValue({
        id: 'acc-1',
        tenantId: tenantA,
        label: 'Conta ML',
        affiliateTag: 'tag123',
        sessionCookieEncrypted: vault.encrypt('ssid=segredo'),
        sessionCookieMasked: '************gredo',
        sessionExpiresAt: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
        partnerGatewayUrl: null,
        isActive: true,
      });

      await expect(
        service.testConversion(tenantA, { url: 'https://evil.com/phishing' }),
      ).rejects.toThrow(BadRequestException);

      const result = await service.testConversion(tenantA, {
        url: 'https://www.mercadolivre.com.br/produto-MLB-123',
      });

      expect(result.converted).toBe(false);
      expect(result.status).toBe('OFFICIAL_CONTRACT_REQUIRED');
      expect(mlClientMock.convertViaPartnerGateway).not.toHaveBeenCalled();
    });

    it('deve validar assinatura HMAC de pareamento da extensão e rejeitar token adulterado', async () => {
      const accountRow = {
        id: 'acc-pair-1',
        tenantId: tenantA,
        label: 'Conta ML',
        affiliateTag: null,
        isActive: true,
      };
      prismaMock.mercadoLivreAccount.findFirst.mockResolvedValue(accountRow);
      prismaMock.mercadoLivreAccount.update.mockResolvedValue({
        ...accountRow,
        affiliateTag: 'tagext',
        sessionCookieEncrypted: vault.encrypt('orguserid=999; ssid=ok'),
        sessionCookieMasked: '************id=ok',
        sessionExpiresAt: new Date(Date.now() + 14 * 86400000),
      });

      const pairing = await service.createPairingToken(tenantA, accountRow.id);
      expect(pairing.pairingToken).toContain('.');

      await expect(
        service.syncFromExtension({
          pairingToken: `${pairing.pairingToken}tampered`,
          affiliateTag: 'tagext',
          sessionCookie: 'orguserid=999; ssid=ok',
        }),
      ).rejects.toThrow(BadRequestException);

      const syncRes = await service.syncFromExtension({
        pairingToken: pairing.pairingToken,
        affiliateTag: 'tagext',
        sessionCookie: 'orguserid=999; ssid=ok',
      });

      expect(syncRes.account.affiliateTag).toBe('tagext');
      expect(syncRes.account.isCookieConnected).toBe(true);
    });
  });

  describe('Feature Flag gating & Alternativa A (OAuth 2.0 Oficial)', () => {
    it('deve bloquear Alternativa A quando desabilitada por padrão e desbloquear após ativação', async () => {
      await expect(
        service.searchProducts(tenantA, { keyword: 'fone bluetooth', limit: 5 }),
      ).rejects.toThrow(ForbiddenException);

      flagsState[FEATURE_FLAG_KEYS.ML_ALTERNATIVE_A_ENABLED] = true;
      mlClientMock.searchProductsMLB.mockResolvedValue([
        {
          mlItemId: 'MLB12345',
          title: 'Fone Bluetooth TWS',
          price: 129.9,
          originalPrice: 199.9,
          imageUrl: 'https://http2.mlstatic.com/fone.jpg',
          permalink: 'https://produto.mercadolivre.com.br/MLB-12345',
          sellerName: 'Loja Oficial Samsung',
          condition: 'new',
        },
      ]);

      const searchRes = await service.searchProducts(tenantA, {
        keyword: 'fone bluetooth',
        limit: 5,
      });

      expect(searchRes.items).toHaveLength(1);
      expect(searchRes.items[0].sellerName).toBe('Loja Oficial Samsung');
    });

    it('deve impedir CSRF no exchange OAuth validando state e tenantId, além de validar links meli.la', async () => {
      flagsState[FEATURE_FLAG_KEYS.ML_ALTERNATIVE_A_ENABLED] = true;

      const accountRow = {
        id: 'acc-oauth-1',
        tenantId: tenantA,
        label: 'ML Oficial',
        oauthAppId: 'APP_123456',
        oauthClientSecretEncrypted: vault.encrypt('ml-secret-abc'),
        oauthClientSecretMasked: '************-abc',
        oauthRedirectUri: 'https://app.example.com/mercadolivre',
        isActive: true,
      };
      prismaMock.mercadoLivreAccount.findFirst.mockResolvedValue(accountRow);

      const { state, authorizationUrl } = await service.getOAuthAuthorizationUrl(
        tenantA,
        accountRow.id,
      );
      expect(authorizationUrl).toContain('auth.mercadolivre.com.br/authorization');

      // Tentativa cross-tenant com o mesmo state deve ser rejeitada
      await expect(
        service.exchangeOAuthCode(tenantB, userId, {
          code: 'TG-12345',
          state,
        }),
      ).rejects.toThrow(BadRequestException);

      mlClientMock.exchangeCodeForToken.mockResolvedValue({
        access_token: 'APP_USR-access-1',
        refresh_token: 'TG-refresh-1',
        expires_in: 21600,
        token_type: 'bearer',
        scope: 'read write offline_access',
        user_id: 987654,
      });
      mlClientMock.getUserProfile.mockResolvedValue({
        id: '987654',
        nickname: 'LOJAO_TECH',
      });
      prismaMock.mercadoLivreAccount.update.mockResolvedValue({
        ...accountRow,
        mlUserId: '987654',
        mlNickname: 'LOJAO_TECH',
        isOAuthConnected: true,
      });

      const connected = await service.exchangeOAuthCode(tenantA, userId, {
        code: 'TG-12345',
        state,
      });
      expect(connected.isOAuthConnected).toBe(true);
      expect(connected.mlNickname).toBe('LOJAO_TECH');

      // Link malicioso fora do domínio Mercado Livre/meli.la é rejeitado na criação de oferta
      await expect(
        service.createOffer(tenantA, userId, {
          accountId: accountRow.id,
          title: 'Oferta Suspeita',
          price: 99,
          imageUrl: 'https://http2.mlstatic.com/item.jpg',
          originalUrl: 'https://produto.mercadolivre.com.br/MLB-1',
          affiliateShortUrl: 'https://evil-redirect.com/steal',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
