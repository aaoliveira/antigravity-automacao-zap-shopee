import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../database/prisma.service';
import { CryptoVaultService } from '../crypto-vault/crypto-vault.service';
import { EvolutionSsrfValidator } from '../evolution/evolution-ssrf.validator';
import { FeatureFlagsService } from '../feature-flags/feature-flags.service';
import { FEATURE_FLAG_KEYS } from '../feature-flags/feature-flags.constants';
import { MercadoLivreClient } from './mercadolivre.client';
import {
  isAllowedAffiliateShortUrl,
  isAllowedMercadoLivreUrl,
  ML_OAUTH_STATE_TTL_MS,
  ML_PAIRING_TOKEN_TTL_MS,
  ML_SESSION_COOKIE_TTL_DAYS,
} from './mercadolivre.constants';
import {
  CreateMlOfferDto,
  ExchangeMlCodeDto,
  ExtensionSyncDto,
  SaveMlOAuthCredentialsDto,
  SaveMlPrototypeConfigDto,
  SearchMlProductsDto,
  TestMlConversionDto,
  UpdateMlOfferDto,
} from './dto/mercadolivre.dto';

interface SignedTokenPayload {
  kind: 'oauth_state' | 'pairing';
  tenantId: string;
  accountId: string;
  nonce: string;
  exp: number;
}

@Injectable()
export class MercadoLivreService {
  private readonly logger = new Logger(MercadoLivreService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly vault: CryptoVaultService,
    private readonly featureFlags: FeatureFlagsService,
    private readonly mlClient: MercadoLivreClient,
  ) {}

  async getStatusOverview(tenantId: string) {
    const [flagsResponse, accounts, offersCount] = await Promise.all([
      this.featureFlags.getFlagsForTenant(tenantId),
      this.prisma.mercadoLivreAccount.findMany({
        where: { tenantId, isActive: true },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.mercadoLivreOffer.count({
        where: { tenantId, isActive: true },
      }),
    ]);

    const serializedAccounts = accounts.map((acc) => this.serializeAccount(acc));

    return {
      featureFlags: flagsResponse.flags,
      accounts: serializedAccounts,
      defaultAccount: serializedAccounts[0] ?? null,
      activeOffersCount: offersCount,
    };
  }

  // =========================================================================
  // ALTERNATIVA B — Protótipo (Tag + Cookie 14d + Conector Navegador / Gateway)
  // =========================================================================

  async savePrototypeConfig(
    tenantId: string,
    userId: string | undefined,
    dto: SaveMlPrototypeConfigDto,
  ) {
    await this.featureFlags.assertEnabled(
      tenantId,
      FEATURE_FLAG_KEYS.ML_ALTERNATIVE_B_ENABLED,
    );

    const existing = await this.resolveTargetAccount(tenantId, dto.id);

    const cleanTag = dto.affiliateTag?.trim() ?? existing?.affiliateTag ?? null;
    const cleanCookie = dto.sessionCookie?.trim();

    if (!existing && !cleanTag && !cleanCookie) {
      throw new BadRequestException(
        'Informe a Tag de Afiliado ou cole o cookie de sessão do Mercado Livre.',
      );
    }

    if (dto.partnerGatewayUrl !== undefined && dto.partnerGatewayUrl !== null) {
      const trimmedUrl = dto.partnerGatewayUrl.trim();
      if (trimmedUrl.length > 0) {
        EvolutionSsrfValidator.validateUrl(trimmedUrl);
      }
    }

    const updateData: Record<string, any> = {
      label: dto.label?.trim() || existing?.label || 'Conta Mercado Livre',
      affiliateTag: cleanTag,
      isActive: true,
    };

    if (cleanCookie) {
      updateData.sessionCookieEncrypted = this.vault.encrypt(cleanCookie);
      updateData.sessionCookieMasked = this.vault.maskSecret(cleanCookie, 6);
      updateData.sessionExpiresAt = new Date(
        Date.now() + ML_SESSION_COOKIE_TTL_DAYS * 24 * 60 * 60 * 1000,
      );
    }

    if (dto.partnerGatewayUrl !== undefined) {
      const cleanGateway = dto.partnerGatewayUrl?.trim() || null;
      updateData.partnerGatewayUrl = cleanGateway;
      if (!cleanGateway) {
        updateData.partnerGatewayApiKeyEncrypted = null;
        updateData.partnerGatewayApiKeyMasked = null;
      }
    }

    if (dto.partnerGatewayApiKey !== undefined) {
      const cleanKey = dto.partnerGatewayApiKey?.trim() || null;
      if (cleanKey) {
        updateData.partnerGatewayApiKeyEncrypted = this.vault.encrypt(cleanKey);
        updateData.partnerGatewayApiKeyMasked = this.vault.maskSecret(cleanKey, 4);
      } else if (dto.partnerGatewayApiKey === '') {
        updateData.partnerGatewayApiKeyEncrypted = null;
        updateData.partnerGatewayApiKeyMasked = null;
      }
    }

    const account = existing
      ? await this.prisma.mercadoLivreAccount.update({
          where: { id: existing.id },
          data: updateData,
        })
      : await this.prisma.mercadoLivreAccount.create({
          data: {
            tenantId,
            label: updateData.label,
            affiliateTag: updateData.affiliateTag,
            sessionCookieEncrypted: updateData.sessionCookieEncrypted ?? null,
            sessionCookieMasked: updateData.sessionCookieMasked ?? null,
            sessionExpiresAt: updateData.sessionExpiresAt ?? null,
            partnerGatewayUrl: updateData.partnerGatewayUrl ?? null,
            partnerGatewayApiKeyEncrypted:
              updateData.partnerGatewayApiKeyEncrypted ?? null,
            partnerGatewayApiKeyMasked:
              updateData.partnerGatewayApiKeyMasked ?? null,
            isActive: true,
          },
        });

    await this.recordAudit(tenantId, userId, 'ML_PROTOTYPE_CONFIG_SAVED', account.id, {
      hasTag: Boolean(account.affiliateTag),
      hasCookie: Boolean(account.sessionCookieEncrypted),
      hasPartnerGateway: Boolean(account.partnerGatewayUrl),
    });

    return this.serializeAccount(account);
  }

  async clearPrototypeConfig(
    tenantId: string,
    userId: string | undefined,
    accountId?: string,
  ) {
    await this.featureFlags.assertEnabled(
      tenantId,
      FEATURE_FLAG_KEYS.ML_ALTERNATIVE_B_ENABLED,
    );

    const existing = await this.resolveTargetAccount(tenantId, accountId);
    if (!existing) {
      return { success: true, message: 'Nenhuma configuração encontrada para remover.' };
    }

    const automationsCount = await this.prisma.automation.count({
      where: { tenantId, mercadoLivreAccountId: existing.id },
    });

    if (
      !existing.isOAuthConnected &&
      !existing.oauthAppId &&
      automationsCount === 0
    ) {
      await this.prisma.mercadoLivreAccount.delete({
        where: { id: existing.id },
      });
    } else {
      await this.prisma.mercadoLivreAccount.update({
        where: { id: existing.id },
        data: {
          affiliateTag: null,
          sessionCookieEncrypted: null,
          sessionCookieMasked: null,
          sessionExpiresAt: null,
          partnerGatewayUrl: null,
          partnerGatewayApiKeyEncrypted: null,
          partnerGatewayApiKeyMasked: null,
        },
      });
    }

    await this.recordAudit(tenantId, userId, 'ML_PROTOTYPE_CONFIG_REMOVED', existing.id);
    return {
      success: true,
      message: 'Configuração de cookie/tag do Mercado Livre removida com segurança.',
    };
  }

  async createPairingToken(tenantId: string, accountId?: string) {
    await this.featureFlags.assertEnabled(
      tenantId,
      FEATURE_FLAG_KEYS.ML_ALTERNATIVE_B_ENABLED,
    );

    let account = await this.resolveTargetAccount(tenantId, accountId);
    if (!account) {
      account = await this.prisma.mercadoLivreAccount.create({
        data: {
          tenantId,
          label: 'Conta Mercado Livre',
          isActive: true,
        },
      });
    }

    const pairingToken = this.signToken({
      kind: 'pairing',
      tenantId,
      accountId: account.id,
      nonce: crypto.randomBytes(12).toString('hex'),
      exp: Date.now() + ML_PAIRING_TOKEN_TTL_MS,
    });

    return {
      accountId: account.id,
      pairingToken,
      expiresInSeconds: Math.floor(ML_PAIRING_TOKEN_TTL_MS / 1000),
      syncPath: '/api/mercadolivre/extension/sync',
    };
  }

  async syncFromExtension(dto: ExtensionSyncDto) {
    const payload = this.verifySignedToken(dto.pairingToken, 'pairing');

    await this.featureFlags.assertEnabled(
      payload.tenantId,
      FEATURE_FLAG_KEYS.ML_ALTERNATIVE_B_ENABLED,
    );

    const account = await this.prisma.mercadoLivreAccount.findFirst({
      where: {
        id: payload.accountId,
        tenantId: payload.tenantId,
        isActive: true,
      },
    });

    if (!account) {
      throw new NotFoundException(
        'Conta Mercado Livre de pareamento não encontrada para esta organização.',
      );
    }

    const cleanCookie = dto.sessionCookie?.trim();
    const cleanTag = dto.affiliateTag?.trim() || account.affiliateTag;

    const updateData: Record<string, any> = {
      affiliateTag: cleanTag ?? null,
    };

    if (cleanCookie) {
      updateData.sessionCookieEncrypted = this.vault.encrypt(cleanCookie);
      updateData.sessionCookieMasked = this.vault.maskSecret(cleanCookie, 6);
      updateData.sessionExpiresAt = new Date(
        Date.now() + ML_SESSION_COOKIE_TTL_DAYS * 24 * 60 * 60 * 1000,
      );
    }

    const updated = await this.prisma.mercadoLivreAccount.update({
      where: { id: account.id },
      data: updateData,
    });

    let createdOfferId: string | null = null;
    if (dto.offer) {
      if (!isAllowedMercadoLivreUrl(dto.offer.originalUrl)) {
        throw new BadRequestException(
          'originalUrl da oferta sincronizada deve pertencer ao domínio Mercado Livre.',
        );
      }
      if (!isAllowedAffiliateShortUrl(dto.offer.affiliateShortUrl)) {
        throw new BadRequestException(
          'affiliateShortUrl sincronizado deve ser um link oficial Mercado Livre / meli.la.',
        );
      }

      const offer = await this.prisma.mercadoLivreOffer.create({
        data: {
          tenantId: payload.tenantId,
          accountId: account.id,
          mlItemId: dto.offer.mlItemId?.trim() || null,
          title: dto.offer.title.trim(),
          price: dto.offer.price,
          originalPrice: dto.offer.originalPrice ?? null,
          imageUrl: dto.offer.imageUrl.trim(),
          originalUrl: dto.offer.originalUrl.trim(),
          affiliateShortUrl: dto.offer.affiliateShortUrl.trim(),
          sellerName: dto.offer.sellerName?.trim() || null,
          keyword: dto.offer.keyword?.trim() || null,
          isActive: true,
        },
      });
      createdOfferId = offer.id;
    }

    await this.recordAudit(
      payload.tenantId,
      undefined,
      'ML_EXTENSION_SYNC',
      account.id,
      {
        syncedCookie: Boolean(cleanCookie),
        syncedOfferId: createdOfferId,
      },
    );

    return {
      account: this.serializeAccount(updated),
      syncedOfferId: createdOfferId,
    };
  }

  async testConversion(tenantId: string, dto: TestMlConversionDto) {
    await this.featureFlags.assertEnabled(
      tenantId,
      FEATURE_FLAG_KEYS.ML_ALTERNATIVE_B_ENABLED,
    );

    const targetUrl = dto.url.trim();
    if (!isAllowedMercadoLivreUrl(targetUrl)) {
      throw new BadRequestException(
        'Informe uma URL HTTPS válida do domínio Mercado Livre (mercadolivre.com.br ou meli.la).',
      );
    }

    const account = await this.resolveTargetAccount(tenantId, dto.accountId);
    if (!account) {
      throw new BadRequestException(
        'Salve sua configuração do Mercado Livre antes de testar a conversão.',
      );
    }

    const serialized = this.serializeAccount(account);

    if (account.partnerGatewayUrl) {
      const apiKey = account.partnerGatewayApiKeyEncrypted
        ? this.vault.decrypt(account.partnerGatewayApiKeyEncrypted)
        : null;

      const converted = await this.mlClient.convertViaPartnerGateway(
        account.partnerGatewayUrl,
        apiKey,
        {
          url: targetUrl,
          affiliateTag: account.affiliateTag,
        },
      );

      if (!isAllowedAffiliateShortUrl(converted.shortUrl)) {
        throw new BadRequestException(
          'O gateway configurado retornou um domínio fora dos domínios oficiais do Mercado Livre.',
        );
      }

      return {
        converted: true,
        status: 'PARTNER_GATEWAY_OK',
        mode: 'PARTNER_GATEWAY',
        originalUrl: targetUrl,
        shortUrl: converted.shortUrl,
        affiliateTag: serialized.affiliateTag,
        isCookieConnected: serialized.isCookieConnected,
        message: 'Link convertido com sucesso via Gateway Parceiro Homologado.',
      };
    }

    return {
      converted: false,
      status: 'OFFICIAL_CONTRACT_REQUIRED',
      mode: 'LOCAL_VALIDATION_ONLY',
      originalUrl: targetUrl,
      shortUrl: null,
      affiliateTag: serialized.affiliateTag,
      isCookieConnected: serialized.isCookieConnected,
      cookieDaysRemaining: serialized.cookieDaysRemaining,
      message:
        'URL e sessão validadas com segurança. Como o Mercado Livre não publica API oficial server-side para gerar links curtos meli.la diretamente por cookie de navegador, configure um Gateway Parceiro Homologado abaixo ou capture o link meli.la no navegador/extensão ou pela Alternativa A.',
    };
  }

  // =========================================================================
  // ALTERNATIVA A — OAuth 2.0 Oficial + Busca MLB + Fila de Ofertas meli.la
  // =========================================================================

  async saveOAuthCredentials(
    tenantId: string,
    userId: string | undefined,
    dto: SaveMlOAuthCredentialsDto,
  ) {
    await this.featureFlags.assertEnabled(
      tenantId,
      FEATURE_FLAG_KEYS.ML_ALTERNATIVE_A_ENABLED,
    );

    const existing = await this.resolveTargetAccount(tenantId, dto.accountId);
    const cleanSecret = dto.clientSecret?.trim();

    if (!existing?.oauthClientSecretEncrypted && !cleanSecret) {
      throw new BadRequestException(
        'Informe o Client Secret do aplicativo Mercado Livre Developers.',
      );
    }

    const updateData: Record<string, any> = {
      label: dto.label?.trim() || existing?.label || 'Conta Mercado Livre',
      oauthAppId: dto.appId.trim(),
      oauthRedirectUri: dto.redirectUri.trim(),
      isActive: true,
    };

    if (cleanSecret) {
      updateData.oauthClientSecretEncrypted = this.vault.encrypt(cleanSecret);
      updateData.oauthClientSecretMasked = this.vault.maskSecret(cleanSecret, 4);
    }

    const account = existing
      ? await this.prisma.mercadoLivreAccount.update({
          where: { id: existing.id },
          data: updateData,
        })
      : await this.prisma.mercadoLivreAccount.create({
          data: {
            tenantId,
            label: updateData.label,
            oauthAppId: updateData.oauthAppId,
            oauthClientSecretEncrypted: updateData.oauthClientSecretEncrypted,
            oauthClientSecretMasked: updateData.oauthClientSecretMasked,
            oauthRedirectUri: updateData.oauthRedirectUri,
            isActive: true,
          },
        });

    await this.recordAudit(tenantId, userId, 'ML_OAUTH_CREDENTIALS_SAVED', account.id, {
      appId: account.oauthAppId,
    });

    return this.serializeAccount(account);
  }

  async getOAuthAuthorizationUrl(tenantId: string, accountId?: string) {
    await this.featureFlags.assertEnabled(
      tenantId,
      FEATURE_FLAG_KEYS.ML_ALTERNATIVE_A_ENABLED,
    );

    const account = await this.resolveTargetAccount(tenantId, accountId);
    if (!account?.oauthAppId || !account?.oauthRedirectUri) {
      throw new BadRequestException(
        'Cadastre App ID e Redirect URI do Mercado Livre Developers antes de iniciar a autorização OAuth 2.0.',
      );
    }

    const state = this.signToken({
      kind: 'oauth_state',
      tenantId,
      accountId: account.id,
      nonce: crypto.randomBytes(12).toString('hex'),
      exp: Date.now() + ML_OAUTH_STATE_TTL_MS,
    });

    const authorizationUrl = this.mlClient.buildAuthorizationUrl(
      account.oauthAppId,
      account.oauthRedirectUri,
      state,
    );

    return {
      accountId: account.id,
      authorizationUrl,
      state,
    };
  }

  async exchangeOAuthCode(
    tenantId: string,
    userId: string | undefined,
    dto: ExchangeMlCodeDto,
  ) {
    await this.featureFlags.assertEnabled(
      tenantId,
      FEATURE_FLAG_KEYS.ML_ALTERNATIVE_A_ENABLED,
    );

    const statePayload = this.verifySignedToken(dto.state, 'oauth_state');
    if (statePayload.tenantId !== tenantId) {
      throw new BadRequestException(
        'Parâmetro state OAuth inválido para a organização autenticada.',
      );
    }

    const targetAccountId = dto.accountId || statePayload.accountId;
    const account = await this.prisma.mercadoLivreAccount.findFirst({
      where: { id: targetAccountId, tenantId, isActive: true },
    });

    if (
      !account ||
      !account.oauthAppId ||
      !account.oauthClientSecretEncrypted ||
      !account.oauthRedirectUri
    ) {
      throw new BadRequestException(
        'Credenciais OAuth 2.0 incompletas ou conta não encontrada.',
      );
    }

    const clientSecret = this.vault.decrypt(account.oauthClientSecretEncrypted);
    const tokenData = await this.mlClient.exchangeCodeForToken({
      clientId: account.oauthAppId,
      clientSecret,
      code: dto.code.trim(),
      redirectUri: account.oauthRedirectUri,
    });

    const profile = await this.mlClient.getUserProfile(tokenData.access_token);
    const expiresAt = new Date(
      Date.now() + Math.max(Number(tokenData.expires_in || 21600), 60) * 1000,
    );

    const updated = await this.prisma.mercadoLivreAccount.update({
      where: { id: account.id },
      data: {
        oauthAccessTokenEncrypted: this.vault.encrypt(tokenData.access_token),
        oauthRefreshTokenEncrypted: tokenData.refresh_token
          ? this.vault.encrypt(tokenData.refresh_token)
          : account.oauthRefreshTokenEncrypted,
        oauthTokenExpiresAt: expiresAt,
        mlUserId: profile.id,
        mlNickname: profile.nickname,
        isOAuthConnected: true,
      },
    });

    await this.recordAudit(tenantId, userId, 'ML_OAUTH_CONNECTED', account.id, {
      mlUserId: profile.id,
      mlNickname: profile.nickname,
    });

    return this.serializeAccount(updated);
  }

  async disconnectOAuth(
    tenantId: string,
    userId: string | undefined,
    accountId?: string,
  ) {
    await this.featureFlags.assertEnabled(
      tenantId,
      FEATURE_FLAG_KEYS.ML_ALTERNATIVE_A_ENABLED,
    );

    const account = await this.resolveTargetAccount(tenantId, accountId);
    if (!account) {
      throw new NotFoundException('Conta Mercado Livre não encontrada.');
    }

    const updated = await this.prisma.mercadoLivreAccount.update({
      where: { id: account.id },
      data: {
        oauthAccessTokenEncrypted: null,
        oauthRefreshTokenEncrypted: null,
        oauthTokenExpiresAt: null,
        mlUserId: null,
        mlNickname: null,
        isOAuthConnected: false,
      },
    });

    await this.recordAudit(tenantId, userId, 'ML_OAUTH_DISCONNECTED', account.id);
    return this.serializeAccount(updated);
  }

  async searchProducts(tenantId: string, query: SearchMlProductsDto) {
    await this.featureFlags.assertEnabled(
      tenantId,
      FEATURE_FLAG_KEYS.ML_ALTERNATIVE_A_ENABLED,
    );

    const account = await this.resolveTargetAccount(tenantId, query.accountId);
    let accessToken: string | undefined;

    if (account?.isOAuthConnected) {
      try {
        accessToken = await this.getValidAccessToken(account);
      } catch (err: any) {
        this.logger.warn(
          `Falha ao renovar access token ML da conta ${account.id}; tentando busca pública: ${err.message}`,
        );
      }
    }

    const items = await this.mlClient.searchProductsMLB(
      query.keyword,
      query.limit ?? 12,
      accessToken,
    );

    return {
      items,
      total: items.length,
      usedOAuthToken: Boolean(accessToken),
    };
  }

  async listOffers(tenantId: string) {
    await this.featureFlags.assertEnabled(
      tenantId,
      FEATURE_FLAG_KEYS.ML_ALTERNATIVE_A_ENABLED,
    );

    const items = await this.prisma.mercadoLivreOffer.findMany({
      where: { tenantId },
      orderBy: [{ isActive: 'desc' }, { createdAt: 'desc' }],
    });

    return { items, total: items.length };
  }

  async createOffer(
    tenantId: string,
    userId: string | undefined,
    dto: CreateMlOfferDto,
  ) {
    await this.featureFlags.assertEnabled(
      tenantId,
      FEATURE_FLAG_KEYS.ML_ALTERNATIVE_A_ENABLED,
    );

    if (!isAllowedMercadoLivreUrl(dto.originalUrl)) {
      throw new BadRequestException(
        'A URL original deve apontar para um domínio oficial HTTPS do Mercado Livre.',
      );
    }

    if (!isAllowedAffiliateShortUrl(dto.affiliateShortUrl)) {
      throw new BadRequestException(
        'O link de afiliado deve ser uma URL HTTPS oficial (ex: https://meli.la/... ou mercadolivre.com.br).',
      );
    }

    let resolvedAccountId: string | null = null;
    if (dto.accountId) {
      const acc = await this.resolveTargetAccount(tenantId, dto.accountId);
      if (!acc) {
        throw new NotFoundException(
          'Conta Mercado Livre informada não pertence a esta organização.',
        );
      }
      resolvedAccountId = acc.id;
    } else {
      const defaultAcc = await this.resolveTargetAccount(tenantId);
      resolvedAccountId = defaultAcc?.id ?? null;
    }

    const offer = await this.prisma.mercadoLivreOffer.create({
      data: {
        tenantId,
        accountId: resolvedAccountId,
        mlItemId: dto.mlItemId?.trim() || null,
        title: dto.title.trim(),
        price: dto.price,
        originalPrice: dto.originalPrice ?? null,
        imageUrl: dto.imageUrl.trim(),
        originalUrl: dto.originalUrl.trim(),
        affiliateShortUrl: dto.affiliateShortUrl.trim(),
        sellerName: dto.sellerName?.trim() || null,
        keyword: dto.keyword?.trim() || null,
        isActive: true,
      },
    });

    await this.recordAudit(tenantId, userId, 'ML_OFFER_CREATED', offer.id, {
      mlItemId: offer.mlItemId,
      sellerName: offer.sellerName,
    });

    return offer;
  }

  async updateOffer(tenantId: string, id: string, dto: UpdateMlOfferDto) {
    await this.featureFlags.assertEnabled(
      tenantId,
      FEATURE_FLAG_KEYS.ML_ALTERNATIVE_A_ENABLED,
    );

    const existing = await this.prisma.mercadoLivreOffer.findFirst({
      where: { id, tenantId },
    });
    if (!existing) {
      throw new NotFoundException('Oferta Mercado Livre não encontrada.');
    }

    if (dto.affiliateShortUrl && !isAllowedAffiliateShortUrl(dto.affiliateShortUrl)) {
      throw new BadRequestException(
        'O link de afiliado deve ser uma URL HTTPS oficial do Mercado Livre / meli.la.',
      );
    }

    return this.prisma.mercadoLivreOffer.update({
      where: { id: existing.id },
      data: {
        ...(dto.title !== undefined && { title: dto.title.trim() }),
        ...(dto.price !== undefined && { price: dto.price }),
        ...(dto.originalPrice !== undefined && { originalPrice: dto.originalPrice }),
        ...(dto.affiliateShortUrl !== undefined && {
          affiliateShortUrl: dto.affiliateShortUrl.trim(),
        }),
        ...(dto.sellerName !== undefined && {
          sellerName: dto.sellerName ? dto.sellerName.trim() : null,
        }),
        ...(dto.keyword !== undefined && {
          keyword: dto.keyword ? dto.keyword.trim() : null,
        }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });
  }

  async removeOffer(tenantId: string, id: string) {
    await this.featureFlags.assertEnabled(
      tenantId,
      FEATURE_FLAG_KEYS.ML_ALTERNATIVE_A_ENABLED,
    );

    const existing = await this.prisma.mercadoLivreOffer.findFirst({
      where: { id, tenantId },
    });
    if (!existing) {
      throw new NotFoundException('Oferta Mercado Livre não encontrada.');
    }

    await this.prisma.mercadoLivreOffer.delete({ where: { id: existing.id } });
    return { success: true, message: 'Oferta removida da fila do Mercado Livre.' };
  }

  // =========================================================================
  // EXECUÇÃO EM AUTOMAÇÕES (Respeita Feature Flags e Multi-Tenancy)
  // =========================================================================

  async resolveAccountForAutomation(tenantId: string, accountId: string) {
    const account = await this.prisma.mercadoLivreAccount.findFirst({
      where: { id: accountId, tenantId, isActive: true },
    });
    if (!account) {
      throw new NotFoundException(
        'Conta Mercado Livre não encontrada ou inativa para esta organização.',
      );
    }
    return account;
  }

  async resolveOfferForExecution(params: {
    tenantId: string;
    accountId: string;
    keyword: string;
    excludedItemIds: Set<string>;
  }): Promise<{
    itemKey: string;
    title: string;
    price: number;
    originalPrice: number | null;
    imageUrl: string;
    productUrl: string;
    shortLink: string;
    sellerName: string | null;
    offerId?: string;
  }> {
    const { tenantId, accountId, keyword, excludedItemIds } = params;

    const flags = await this.featureFlags.getFlagsForTenant(tenantId);
    const altAEnabled = flags.flags[FEATURE_FLAG_KEYS.ML_ALTERNATIVE_A_ENABLED];
    const altBEnabled = flags.flags[FEATURE_FLAG_KEYS.ML_ALTERNATIVE_B_ENABLED];

    if (!altAEnabled && !altBEnabled) {
      throw new BadRequestException(
        'As integrações do Mercado Livre (Alternativas A e B) estão desabilitadas nas feature flags deste tenant.',
      );
    }

    const account = await this.resolveAccountForAutomation(tenantId, accountId);

    // 1. Se Alternativa A habilitada ou houver ofertas importadas elegíveis na fila
    const candidateOffers = await this.prisma.mercadoLivreOffer.findMany({
      where: {
        tenantId,
        isActive: true,
        OR: [{ accountId: account.id }, { accountId: null }],
      },
      orderBy: [{ lastPublishedAt: 'asc' }, { createdAt: 'asc' }],
    });

    const normalizedKw = keyword.trim().toLowerCase();
    const eligibleOffers = candidateOffers.filter((offer) => {
      const itemKey = offer.mlItemId || `ML:${offer.id}`;
      return !excludedItemIds.has(itemKey);
    });

    const keywordMatched = eligibleOffers.find((offer) => {
      if (!normalizedKw) return true;
      const inKeyword = (offer.keyword || '').toLowerCase().includes(normalizedKw);
      const inTitle = offer.title.toLowerCase().includes(normalizedKw);
      return inKeyword || inTitle;
    });

    const selectedOffer = keywordMatched ?? eligibleOffers[0];
    if (selectedOffer) {
      return {
        itemKey: selectedOffer.mlItemId || `ML:${selectedOffer.id}`,
        title: selectedOffer.title,
        price: Number(selectedOffer.price),
        originalPrice: selectedOffer.originalPrice
          ? Number(selectedOffer.originalPrice)
          : null,
        imageUrl: selectedOffer.imageUrl,
        productUrl: selectedOffer.originalUrl,
        shortLink: selectedOffer.affiliateShortUrl,
        sellerName: selectedOffer.sellerName,
        offerId: selectedOffer.id,
      };
    }

    // 2. Alternativa B com Gateway Parceiro Homologado + Busca Oficial MLB
    if (altBEnabled && account.partnerGatewayUrl) {
      let accessToken: string | undefined;
      if (account.isOAuthConnected) {
        try {
          accessToken = await this.getValidAccessToken(account);
        } catch {
          accessToken = undefined;
        }
      }

      const searchResults = await this.mlClient.searchProductsMLB(
        keyword || 'ofertas',
        10,
        accessToken,
      );
      const nextProduct = searchResults.find(
        (item) => item.mlItemId && !excludedItemIds.has(item.mlItemId),
      );

      if (nextProduct) {
        const apiKey = account.partnerGatewayApiKeyEncrypted
          ? this.vault.decrypt(account.partnerGatewayApiKeyEncrypted)
          : null;
        const converted = await this.mlClient.convertViaPartnerGateway(
          account.partnerGatewayUrl,
          apiKey,
          {
            url: nextProduct.permalink,
            affiliateTag: account.affiliateTag,
          },
        );

        if (!isAllowedAffiliateShortUrl(converted.shortUrl)) {
          throw new BadRequestException(
            'Gateway homologado retornou link de afiliado fora do domínio Mercado Livre.',
          );
        }

        return {
          itemKey: nextProduct.mlItemId,
          title: nextProduct.title,
          price: nextProduct.price,
          originalPrice: nextProduct.originalPrice,
          imageUrl: nextProduct.imageUrl,
          productUrl: nextProduct.permalink,
          shortLink: converted.shortUrl,
          sellerName: nextProduct.sellerName,
        };
      }
    }

    throw new BadRequestException(
      'Nenhuma oferta elegível do Mercado Livre encontrada (importe links meli.la na fila de ofertas ou configure um Gateway Parceiro Homologado).',
    );
  }

  async markOfferPublished(offerId: string): Promise<void> {
    await this.prisma.mercadoLivreOffer.update({
      where: { id: offerId },
      data: { lastPublishedAt: new Date() },
    });
  }

  // =========================================================================
  // HELPERS INTERNOS
  // =========================================================================

  private async resolveTargetAccount(tenantId: string, accountId?: string) {
    if (accountId) {
      const account = await this.prisma.mercadoLivreAccount.findFirst({
        where: { id: accountId, tenantId },
      });
      if (!account) {
        throw new NotFoundException(
          'Conta Mercado Livre não encontrada para esta organização.',
        );
      }
      return account;
    }

    return this.prisma.mercadoLivreAccount.findFirst({
      where: { tenantId, isActive: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  private async getValidAccessToken(account: {
    id: string;
    oauthAppId: string | null;
    oauthClientSecretEncrypted: string | null;
    oauthAccessTokenEncrypted: string | null;
    oauthRefreshTokenEncrypted: string | null;
    oauthTokenExpiresAt: Date | null;
  }): Promise<string | undefined> {
    if (!account.oauthAccessTokenEncrypted) {
      return undefined;
    }

    const expiresAtMs = account.oauthTokenExpiresAt?.getTime() ?? 0;
    const isAboutToExpire = expiresAtMs > 0 && expiresAtMs - Date.now() <= 120_000;

    if (!isAboutToExpire) {
      return this.vault.decrypt(account.oauthAccessTokenEncrypted);
    }

    if (
      !account.oauthAppId ||
      !account.oauthClientSecretEncrypted ||
      !account.oauthRefreshTokenEncrypted
    ) {
      return this.vault.decrypt(account.oauthAccessTokenEncrypted);
    }

    const refreshed = await this.mlClient.refreshAccessToken({
      clientId: account.oauthAppId,
      clientSecret: this.vault.decrypt(account.oauthClientSecretEncrypted),
      refreshToken: this.vault.decrypt(account.oauthRefreshTokenEncrypted),
    });

    const newExpiresAt = new Date(
      Date.now() + Math.max(Number(refreshed.expires_in || 21600), 60) * 1000,
    );

    await this.prisma.mercadoLivreAccount.update({
      where: { id: account.id },
      data: {
        oauthAccessTokenEncrypted: this.vault.encrypt(refreshed.access_token),
        oauthRefreshTokenEncrypted: refreshed.refresh_token
          ? this.vault.encrypt(refreshed.refresh_token)
          : account.oauthRefreshTokenEncrypted,
        oauthTokenExpiresAt: newExpiresAt,
      },
    });

    return refreshed.access_token;
  }

  private serializeAccount(account: any) {
    const now = Date.now();
    const expiresMs = account.sessionExpiresAt
      ? new Date(account.sessionExpiresAt).getTime()
      : null;
    const hasCookie = Boolean(account.sessionCookieEncrypted);
    const cookieDaysRemaining =
      hasCookie && expiresMs !== null
        ? Math.max(0, Math.ceil((expiresMs - now) / (24 * 60 * 60 * 1000)))
        : 0;

    return {
      id: account.id,
      label: account.label,
      affiliateTag: account.affiliateTag,
      sessionCookieMasked: account.sessionCookieMasked,
      isCookieConnected: hasCookie,
      sessionExpiresAt: account.sessionExpiresAt,
      cookieDaysRemaining,
      isCookieExpired: hasCookie && expiresMs !== null && expiresMs <= now,
      partnerGatewayUrl: account.partnerGatewayUrl,
      partnerGatewayApiKeyMasked: account.partnerGatewayApiKeyMasked,
      hasPartnerGateway: Boolean(account.partnerGatewayUrl),
      oauthAppId: account.oauthAppId,
      oauthClientSecretMasked: account.oauthClientSecretMasked,
      oauthRedirectUri: account.oauthRedirectUri,
      oauthTokenExpiresAt: account.oauthTokenExpiresAt,
      mlUserId: account.mlUserId,
      mlNickname: account.mlNickname,
      isOAuthConnected: Boolean(account.isOAuthConnected),
      isActive: Boolean(account.isActive),
      createdAt: account.createdAt,
      updatedAt: account.updatedAt,
    };
  }

  private getSigningKey(): Buffer {
    const rawSecret =
      process.env.JWT_SECRET || process.env.ENCRYPTION_MASTER_KEY;
    if (!rawSecret) {
      throw new InternalServerErrorException(
        'Segredo do servidor ausente para assinatura de tokens temporários.',
      );
    }
    return crypto
      .createHash('sha256')
      .update(`${rawSecret}:mercadolivre-hmac-v1`)
      .digest();
  }

  private signToken(payload: SignedTokenPayload): string {
    const encoded = Buffer.from(JSON.stringify(payload), 'utf8').toString(
      'base64url',
    );
    const sig = crypto
      .createHmac('sha256', this.getSigningKey())
      .update(encoded)
      .digest('hex');
    return `${encoded}.${sig}`;
  }

  private verifySignedToken(
    token: string,
    expectedKind: SignedTokenPayload['kind'],
  ): SignedTokenPayload {
    if (!token || typeof token !== 'string' || !token.includes('.')) {
      throw new BadRequestException('Token assinado inválido ou malformado.');
    }

    const parts = token.split('.');
    if (parts.length !== 2) {
      throw new BadRequestException('Token assinado inválido ou malformado.');
    }

    const [encoded, receivedSig] = parts;
    const expectedSig = crypto
      .createHmac('sha256', this.getSigningKey())
      .update(encoded)
      .digest('hex');

    const receivedBuf = Buffer.from(receivedSig, 'utf8');
    const expectedBuf = Buffer.from(expectedSig, 'utf8');

    if (
      receivedBuf.length !== expectedBuf.length ||
      !crypto.timingSafeEqual(receivedBuf, expectedBuf)
    ) {
      throw new BadRequestException('Assinatura do token inválida.');
    }

    let parsed: SignedTokenPayload;
    try {
      parsed = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
    } catch {
      throw new BadRequestException('Conteúdo do token inválido.');
    }

    if (parsed.kind !== expectedKind || !parsed.tenantId || !parsed.accountId) {
      throw new BadRequestException('Escopo do token inválido.');
    }

    if (!parsed.exp || parsed.exp <= Date.now()) {
      throw new BadRequestException('Token temporário expirado. Gere um novo.');
    }

    return parsed;
  }

  private async recordAudit(
    tenantId: string,
    userId: string | undefined,
    action: string,
    entityId: string,
    metadata?: Record<string, any>,
  ) {
    try {
      await this.prisma.auditLog.create({
        data: {
          tenantId,
          userId: userId ?? null,
          action,
          entityType: 'MercadoLivre',
          entityId,
          metadataJson: metadata ?? undefined,
        },
      });
    } catch (err: any) {
      this.logger.warn(`Falha ao gravar AuditLog ${action}: ${err.message}`);
    }
  }
}
