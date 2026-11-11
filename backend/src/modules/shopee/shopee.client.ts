import { Injectable, Logger, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { ShopeeSignerService } from './shopee.signer';

export interface NormalizedProduct {
  itemId: string;
  title: string;
  productUrl: string;
  offerUrl?: string;
  imageUrl: string;
  price: number;
  originalPrice?: number;
  commissionRate?: number;
}

export interface ProductSearchResult {
  products: NormalizedProduct[];
  pageInfo: {
    page: number;
    limit: number;
    hasNextPage: boolean;
  };
}

export interface ShopeeValidationDiagnostics {
  code?: string;
  message?: string;
  rawError?: string;
}

@Injectable()
export class ShopeeClientService {
  private readonly logger = new Logger(ShopeeClientService.name);
  private readonly endpoint = 'https://open-api.affiliate.shopee.com.br/graphql';
  private readonly timeoutMs = 15000;

  constructor(private readonly signer: ShopeeSignerService) {}

  /**
   * Converte uma URL de produto da Shopee em Short Link de afiliado oficial.
   */
  async generateShortLink(
    appId: string,
    secret: string,
    originUrl: string,
    subIds?: string[],
  ): Promise<string> {
    if (!originUrl) {
      throw new BadRequestException('URL de origem é obrigatória para conversão de link.');
    }

    const mutation = {
      query: `mutation GenerateShortLink($input: ShortLinkInput!) {
        generateShortLink(input: $input) {
          shortLink
        }
      }`,
      variables: {
        input: {
          originUrl,
          subIds: subIds && subIds.length > 0 ? subIds.slice(0, 5) : undefined,
        },
      },
    };

    const responseData = await this.executeGraphQLWithTransientRetry(
      appId,
      secret,
      mutation,
    );

    if (responseData.errors && responseData.errors.length > 0) {
      const errorMsg = this.extractGraphQLError(responseData.errors[0], 'Erro desconhecido na API Shopee');
      this.logger.error(`Falha ao gerar Short Link: ${this.sanitizeError(errorMsg, secret)}`);
      throw new BadRequestException(`Erro da Shopee: ${this.sanitizeError(errorMsg, secret)}`);
    }

    const shortLink = responseData?.data?.generateShortLink?.shortLink;
    if (!shortLink) {
      throw new InternalServerErrorException('A Shopee não retornou o link encurtado.');
    }

    return shortLink;
  }

  /**
   * Consulta ofertas de produtos na Shopee usando a query oficial productOfferV2.
   * Nota contratual Shopee: listType NÃO pode ser combinado com keyword/sortType.
   * Além disso, `price` está marcado como toBeRemoved na documentação oficial; usar priceMin/priceMax.
   */
  async searchProducts(
    appId: string,
    secret: string,
    params: {
      keyword: string;
      page?: number;
      limit?: number;
      sortType?: number;
    },
  ): Promise<ProductSearchResult> {
    const page = params.page || 1;
    const limit = Math.min(params.limit || 20, 50);
    const sortType = params.sortType || 1;
    const trimmedKeyword = (params.keyword || '').trim();

    const query = trimmedKeyword
      ? {
          query:
            'query FetchProducts($keyword: String, $page: Int, $limit: Int, $sortType: Int) { productOfferV2(keyword: $keyword, sortType: $sortType, page: $page, limit: $limit) { nodes { itemId productName productLink offerLink imageUrl priceMin priceMax commissionRate } pageInfo { page limit hasNextPage } } }',
          variables: {
            keyword: trimmedKeyword,
            page,
            limit,
            sortType,
          },
        }
      : {
          query:
            'query FetchDefaultProducts($page: Int, $limit: Int) { productOfferV2(listType: 0, page: $page, limit: $limit) { nodes { itemId productName productLink offerLink imageUrl priceMin priceMax commissionRate } pageInfo { page limit hasNextPage } } }',
          variables: {
            page,
            limit,
          },
        };

    const responseData = await this.executeGraphQLWithTransientRetry(
      appId,
      secret,
      query,
    );

    if (responseData.errors && responseData.errors.length > 0) {
      const errorMsg = this.extractGraphQLError(responseData.errors[0], 'Erro desconhecido na busca de produtos');
      this.logger.error(`Falha ao buscar produtos: ${this.sanitizeError(errorMsg, secret)}`);
      throw new BadRequestException(`Erro da Shopee: ${this.sanitizeError(errorMsg, secret)}`);
    }

    const offerData = responseData?.data?.productOfferV2;
    const rawNodes = offerData?.nodes || [];

    // Normalização e validação de qualidade dos dados retornados
    const products: NormalizedProduct[] = [];
    for (const node of rawNodes) {
      const rawPrice = node.priceMin || node.priceMax || node.price || 0;
      const parsedPrice = typeof rawPrice === 'string' ? parseFloat(rawPrice) : Number(rawPrice);

      // Validação obrigatória: produto deve ter título, preço positivo, imagem e link
      if (node.itemId && node.productName && parsedPrice > 0 && node.imageUrl && node.productLink) {
        products.push({
          itemId: String(node.itemId),
          title: node.productName.trim(),
          productUrl: node.productLink,
          offerUrl: node.offerLink,
          imageUrl: node.imageUrl,
          price: parsedPrice,
          originalPrice: node.priceMax ? parseFloat(node.priceMax) : undefined,
          commissionRate: node.commissionRate ? parseFloat(node.commissionRate) : undefined,
        });
      }
    }

    return {
      products,
      pageInfo: {
        page: offerData?.pageInfo?.page || page,
        limit: offerData?.pageInfo?.limit || limit,
        hasNextPage: Boolean(offerData?.pageInfo?.hasNextPage),
      },
    };
  }

  /**
   * Sorteia um produto aleatoriamente entre candidatos elegíveis, aplicando desduplicação.
   * Evita viés de sempre pegar o primeiro item.
   */
  selectRandomEligibleProduct(
    candidates: NormalizedProduct[],
    recentlyPublishedItemIds: Set<string>,
  ): NormalizedProduct | null {
    if (!candidates || candidates.length === 0) {
      return null;
    }

    // Filtra produtos que já foram publicados na janela recente
    const eligible = candidates.filter((p) => !recentlyPublishedItemIds.has(p.itemId));

    if (eligible.length === 0) {
      return null;
    }

    // Sorteio pseudo-aleatório uniforme
    const randomIndex = Math.floor(Math.random() * eligible.length);
    return eligible[randomIndex];
  }

  /**
   * Teste de conectividade e validação da credencial contra o endpoint da Shopee.
   * Preenche `diagnostics` com código e orientação sanitizada caso ocorra falha.
   */
  async testConnectivity(
    appId: string,
    secret: string,
    diagnostics?: ShopeeValidationDiagnostics,
  ): Promise<boolean> {
    try {
      // Dispara busca leve com keyword + sortType=1 (sem listType) para validar assinatura e permissão Open API
      await this.searchProducts(appId, secret, {
        keyword: 'shopee',
        sortType: 1,
        page: 1,
        limit: 1,
      });
      return true;
    } catch (error: any) {
      const sanitized = this.sanitizeError(error?.message || 'Erro desconhecido na API Shopee', secret);
      const formatted = this.formatValidationFailure(sanitized);

      if (diagnostics) {
        diagnostics.code = formatted.code;
        diagnostics.message = formatted.userMessage;
        diagnostics.rawError = sanitized;
      }

      this.logger.warn(`Falha na validação de credencial Shopee: ${sanitized}`);
      return false;
    }
  }

  private async executeGraphQLWithTransientRetry(
    appId: string,
    secret: string,
    bodyPayload: Record<string, any>,
  ): Promise<any> {
    const backoffDelaysMs = [500, 1200];
    let responseData = await this.executeGraphQL(appId, secret, bodyPayload);

    for (const delayMs of backoffDelaysMs) {
      if (!responseData?.errors?.length) {
        return responseData;
      }
      const errMsg = this.extractGraphQLError(responseData.errors[0], '');
      if (!/error\s*\[10000\]/i.test(errMsg)) {
        return responseData;
      }
      this.logger.warn(
        `Shopee retornou erro transitório [10000]; aguardando ${delayMs}ms para nova tentativa...`,
      );
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      responseData = await this.executeGraphQL(appId, secret, bodyPayload);
    }

    return responseData;
  }

  /**
   * Executa requisição POST para o GraphQL oficial da Shopee com assinatura SHA-256.
   */
  private async executeGraphQL(appId: string, secret: string, payload: any): Promise<any> {
    const { authorizationHeader, payloadString } = this.signer.generateAuthorization(
      appId,
      secret,
      payload,
    );

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: authorizationHeader,
        },
        body: payloadString,
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        if (response.status === 429) {
          throw new BadRequestException('Shopee Rate Limit excedido. Tente novamente em instantes.');
        }
        throw new BadRequestException(`Shopee retornou status HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error: any) {
      clearTimeout(timeout);
      if (error.name === 'AbortError') {
        throw new InternalServerErrorException('Timeout ao comunicar com a API da Shopee.');
      }
      throw error;
    }
  }

  private extractGraphQLError(errObj: any, fallback: string): string {
    const extCode = errObj?.extensions?.code;
    const rawMsg = errObj?.message || errObj?.extensions?.message || fallback;
    if (extCode !== undefined && !String(rawMsg).includes(String(extCode))) {
      return `error [${extCode}]: ${rawMsg}`;
    }
    return String(rawMsg);
  }

  private formatValidationFailure(sanitizedError: string): { code?: string; userMessage: string } {
    const match = sanitizedError.match(/error\s*\[(\d+)\]/i);
    const code = match ? match[1] : undefined;

    switch (code) {
      case '10020':
        return {
          code,
          userMessage:
            'Erro Shopee [10020] (Assinatura/Identidade inválida): confirme se o App ID e App Secret foram gerados em affiliate.shopee.com.br/open_api (Portal de Afiliados Brasil, não Open Platform de lojas) e sem alteração após Reset.',
        };
      case '10035':
        return {
          code,
          userMessage:
            'Erro Shopee [10035] (Acesso não liberado): o App ID foi reconhecido, mas sua conta ainda não possui aprovação ativa na Shopee Affiliate Open API. Verifique seu status no menu Open API do portal da Shopee.',
        };
      case '10010':
        return {
          code,
          userMessage: `Erro Shopee [10010] (Parsing GraphQL): ${sanitizedError}`,
        };
      case '10030':
        return {
          code,
          userMessage:
            'Erro Shopee [10030] (Rate Limit): limite de chamadas à Shopee atingido. Aguarde alguns instantes e tente novamente.',
        };
      default:
        return {
          code,
          userMessage: `A Shopee rejeitou a validação: ${sanitizedError}`,
        };
    }
  }

  private sanitizeError(msg: string, secret?: string): string {
    let cleaned = String(msg || '');
    if (secret) {
      cleaned = cleaned.split(secret).join('[REDACTED_SECRET]');
    }
    return cleaned.replace(/[a-f0-9]{32,64}/gi, '[REDACTED_HASH]');
  }
}
