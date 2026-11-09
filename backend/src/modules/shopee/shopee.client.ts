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

    const responseData = await this.executeGraphQL(appId, secret, mutation);

    if (responseData.errors && responseData.errors.length > 0) {
      const errorMsg = responseData.errors[0].message || 'Erro desconhecido na API Shopee';
      this.logger.error(`Falha ao gerar Short Link: ${this.sanitizeError(errorMsg)}`);
      throw new BadRequestException(`Erro da Shopee: ${this.sanitizeError(errorMsg)}`);
    }

    const shortLink = responseData?.data?.generateShortLink?.shortLink;
    if (!shortLink) {
      throw new InternalServerErrorException('A Shopee não retornou o link encurtado.');
    }

    return shortLink;
  }

  /**
   * Consulta ofertas de produtos na Shopee usando a query oficial productOfferV2.
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

    const query = {
      query: `query FetchProducts($keyword: String, $page: Int, $limit: Int, $sortType: Int) {
        productOfferV2(
          keyword: $keyword
          listType: 0
          sortType: $sortType
          page: $page
          limit: $limit
        ) {
          nodes {
            itemId
            productName
            productLink
            offerLink
            imageUrl
            price
            priceMin
            priceMax
            commissionRate
          }
          pageInfo {
            page
            limit
            hasNextPage
          }
        }
      }`,
      variables: {
        keyword: params.keyword,
        page,
        limit,
        sortType,
      },
    };

    const responseData = await this.executeGraphQL(appId, secret, query);

    if (responseData.errors && responseData.errors.length > 0) {
      const errorMsg = responseData.errors[0].message || 'Erro desconhecido na busca de produtos';
      this.logger.error(`Falha ao buscar produtos: ${this.sanitizeError(errorMsg)}`);
      throw new BadRequestException(`Erro da Shopee: ${this.sanitizeError(errorMsg)}`);
    }

    const offerData = responseData?.data?.productOfferV2;
    const rawNodes = offerData?.nodes || [];

    // Normalização e validação de qualidade dos dados retornados
    const products: NormalizedProduct[] = [];
    for (const node of rawNodes) {
      const rawPrice = node.price || node.priceMin || 0;
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
   */
  async testConnectivity(appId: string, secret: string): Promise<boolean> {
    try {
      // Dispara busca leve com limit 1 para validar assinatura e appId
      await this.searchProducts(appId, secret, {
        keyword: 'teste',
        page: 1,
        limit: 1,
      });
      return true;
    } catch (error) {
      this.logger.warn(`Falha na validação de credencial Shopee: ${this.sanitizeError(error.message)}`);
      return false;
    }
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
    } catch (error) {
      clearTimeout(timeout);
      if (error.name === 'AbortError') {
        throw new InternalServerErrorException('Timeout ao comunicar com a API da Shopee.');
      }
      throw error;
    }
  }

  private sanitizeError(msg: string): string {
    return msg.replace(/[a-f0-9]{32,64}/gi, '[REDACTED_HASH]');
  }
}
