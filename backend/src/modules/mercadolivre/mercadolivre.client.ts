import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { EvolutionSsrfValidator } from '../evolution/evolution-ssrf.validator';
import {
  ML_AUTH_URL,
  ML_SEARCH_URL,
  ML_TOKEN_URL,
  ML_USER_ME_URL,
} from './mercadolivre.constants';

export interface MlOAuthTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
  user_id: number;
  refresh_token?: string;
}

export interface MlUserProfile {
  id: string;
  nickname: string;
}

export interface MlSearchProduct {
  mlItemId: string;
  title: string;
  price: number;
  originalPrice: number | null;
  imageUrl: string;
  permalink: string;
  sellerName: string | null;
  condition: string | null;
}

@Injectable()
export class MercadoLivreClient {
  private readonly logger = new Logger(MercadoLivreClient.name);

  buildAuthorizationUrl(appId: string, redirectUri: string, state: string): string {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: appId,
      redirect_uri: redirectUri,
      state,
    });
    return `${ML_AUTH_URL}?${params.toString()}`;
  }

  async exchangeCodeForToken(params: {
    clientId: string;
    clientSecret: string;
    code: string;
    redirectUri: string;
  }): Promise<MlOAuthTokenResponse> {
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: params.clientId,
      client_secret: params.clientSecret,
      code: params.code,
      redirect_uri: params.redirectUri,
    });

    return this.postTokenRequest(body);
  }

  async refreshAccessToken(params: {
    clientId: string;
    clientSecret: string;
    refreshToken: string;
  }): Promise<MlOAuthTokenResponse> {
    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: params.clientId,
      client_secret: params.clientSecret,
      refresh_token: params.refreshToken,
    });

    return this.postTokenRequest(body);
  }

  private async postTokenRequest(
    body: URLSearchParams,
  ): Promise<MlOAuthTokenResponse> {
    let response: Response;
    try {
      response = await fetch(ML_TOKEN_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
        },
        body: body.toString(),
        signal: AbortSignal.timeout(10000),
      });
    } catch (error: any) {
      this.logger.error(
        `Falha de rede ao trocar/renovar token OAuth Mercado Livre: ${error.message}`,
      );
      throw new BadGatewayException(
        'Não foi possível contatar o servidor OAuth do Mercado Livre.',
      );
    }

    const payload: any = await response.json().catch(() => ({}));
    if (!response.ok || !payload?.access_token) {
      const detail =
        payload?.message || payload?.error_description || payload?.error || `HTTP ${response.status}`;
      this.logger.warn(`Mercado Livre OAuth rejeitou requisição: ${detail}`);
      throw new BadRequestException(
        `Mercado Livre OAuth recusou a solicitação: ${detail}`,
      );
    }

    return payload as MlOAuthTokenResponse;
  }

  async getUserProfile(accessToken: string): Promise<MlUserProfile> {
    let response: Response;
    try {
      response = await fetch(ML_USER_ME_URL, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
        },
        signal: AbortSignal.timeout(10000),
      });
    } catch (error: any) {
      this.logger.error(
        `Erro de rede ao consultar /users/me do Mercado Livre: ${error.message}`,
      );
      throw new BadGatewayException(
        'Falha ao consultar perfil do usuário no Mercado Livre.',
      );
    }

    const payload: any = await response.json().catch(() => ({}));
    if (!response.ok || !payload?.id) {
      throw new BadRequestException(
        `Mercado Livre /users/me retornou erro HTTP ${response.status}.`,
      );
    }

    return {
      id: String(payload.id),
      nickname: String(payload.nickname || `ml-${payload.id}`),
    };
  }

  async searchProductsMLB(
    keyword: string,
    limit = 12,
    accessToken?: string,
  ): Promise<MlSearchProduct[]> {
    const cleanKeyword = keyword.trim();
    if (!cleanKeyword) {
      return [];
    }

    const params = new URLSearchParams({
      q: cleanKeyword,
      limit: String(Math.min(Math.max(limit, 1), 50)),
    });

    const headers: Record<string, string> = {
      Accept: 'application/json',
    };
    if (accessToken) {
      headers.Authorization = `Bearer ${accessToken}`;
    }

    let response: Response;
    try {
      response = await fetch(`${ML_SEARCH_URL}?${params.toString()}`, {
        method: 'GET',
        headers,
        signal: AbortSignal.timeout(10000),
      });
    } catch (error: any) {
      this.logger.error(
        `Erro de rede na busca oficial /sites/MLB/search: ${error.message}`,
      );
      throw new BadGatewayException(
        'Não foi possível consultar o catálogo oficial do Mercado Livre.',
      );
    }

    const payload: any = await response.json().catch(() => ({}));
    if (!response.ok) {
      const msg = payload?.message || `HTTP ${response.status}`;
      this.logger.warn(`Busca oficial Mercado Livre falhou: ${msg}`);
      throw new BadGatewayException(
        `A API oficial do Mercado Livre retornou erro na busca: ${msg}`,
      );
    }

    const results = Array.isArray(payload?.results) ? payload.results : [];
    return results.map((item: any): MlSearchProduct => {
      const rawThumb = String(item.thumbnail || '');
      const secureThumb = rawThumb.startsWith('http://')
        ? rawThumb.replace('http://', 'https://')
        : rawThumb;

      return {
        mlItemId: String(item.id || ''),
        title: String(item.title || 'Produto Mercado Livre'),
        price: Number(item.price || 0),
        originalPrice:
          item.original_price !== null && item.original_price !== undefined
            ? Number(item.original_price)
            : null,
        imageUrl: secureThumb,
        permalink: String(item.permalink || ''),
        sellerName: item.seller?.nickname ? String(item.seller.nickname) : null,
        condition: item.condition ? String(item.condition) : null,
      };
    });
  }

  /**
   * Executa conversão de URL exclusivamente contra um gateway homologado
   * explicitamente configurado pelo tenant e validado contra SSRF.
   * Nunca realiza chamadas a endpoints internos não documentados do Mercado Livre.
   */
  async convertViaPartnerGateway(
    gatewayUrl: string,
    apiKey: string | null,
    payload: { url: string; affiliateTag?: string | null },
  ): Promise<{ shortUrl: string }> {
    EvolutionSsrfValidator.validateUrl(gatewayUrl);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
    if (apiKey) {
      headers.Authorization = `Bearer ${apiKey}`;
    }

    let response: Response;
    try {
      response = await fetch(gatewayUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          url: payload.url,
          tag: payload.affiliateTag || undefined,
        }),
        signal: AbortSignal.timeout(10000),
      });
    } catch (error: any) {
      this.logger.warn(
        `Gateway parceiro Mercado Livre inacessível (${new URL(gatewayUrl).hostname}): ${error.message}`,
      );
      throw new BadGatewayException(
        'Não foi possível conectar ao Gateway Parceiro Homologado configurado.',
      );
    }

    const data: any = await response.json().catch(() => ({}));
    const candidateShortUrl =
      data?.shortUrl || data?.short_link || data?.shortLink || data?.link;

    if (!response.ok || typeof candidateShortUrl !== 'string') {
      const errMsg = data?.message || `HTTP ${response.status}`;
      throw new BadRequestException(
        `O Gateway Parceiro Homologado recusou a conversão: ${errMsg}`,
      );
    }

    return { shortUrl: candidateShortUrl.trim() };
  }
}
