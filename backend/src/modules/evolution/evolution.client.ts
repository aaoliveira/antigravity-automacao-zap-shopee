import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  BadGatewayException,
  RequestTimeoutException,
  Logger,
} from '@nestjs/common';
import { EvolutionSsrfValidator } from './evolution-ssrf.validator';

export interface GroupResponse {
  id: string;
  subject: string;
  subjectOwner?: string;
  subjectTime?: number;
  size?: number;
  creation?: number;
  owner?: string;
  desc?: string;
  restrict?: boolean;
  announce?: boolean;
}

export interface SendMediaParams {
  number: string;
  media: string;
  caption: string;
  fileName?: string;
  mimetype?: string;
}

export interface SendTextParams {
  number: string;
  text: string;
  delay?: number;
}

export interface CaptionTemplateParams {
  titulo: string;
  preco: string;
  link_afiliado: string;
}

export const DEFAULT_CAPTION_TEMPLATE = `Oferta encontrada!

{titulo}

Preço: {preco}

Confira: {link_afiliado}`;

@Injectable()
export class EvolutionClient {
  private readonly logger = new Logger(EvolutionClient.name);
  private readonly defaultTimeoutMs = 15000;

  /**
   * Formata a legenda da mensagem substituindo as variáveis homologadas:
   * {titulo}, {preco}, {link_afiliado}
   */
  formatCaption(template: string | undefined | null, params: CaptionTemplateParams): string {
    const rawTemplate = template && template.trim().length > 0 ? template : DEFAULT_CAPTION_TEMPLATE;
    return rawTemplate
      .replace(/\{titulo\}/g, params.titulo || '')
      .replace(/\{preco\}/g, params.preco || '')
      .replace(/\{link_afiliado\}/g, params.link_afiliado || '');
  }

  /**
   * Executa requisição HTTP para a Evolution API com controle de timeout e cabeçalhos.
   */
  private async request<T>(
    baseUrl: string,
    apiKey: string,
    path: string,
    options: {
      method?: string;
      body?: any;
      timeoutMs?: number;
    } = {},
  ): Promise<T> {
    const cleanBaseUrl = baseUrl.replace(/\/+$/, '');
    const isAuthorizedDocker = EvolutionSsrfValidator.isAuthorizedDockerUrl(cleanBaseUrl);
    EvolutionSsrfValidator.validateUrl(cleanBaseUrl, isAuthorizedDocker);

    const url = `${cleanBaseUrl}${path.startsWith('/') ? path : `/${path}`}`;
    const method = options.method || 'GET';
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      options.timeoutMs || this.defaultTimeoutMs,
    );

    const headers: Record<string, string> = {
      'apikey': apiKey,
      'Content-Type': 'application/json',
    };

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: options.body ? JSON.stringify(options.body) : undefined,
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        let parsedMessage = errorText;
        try {
          const errorJson = JSON.parse(errorText);
          parsedMessage =
            errorJson.message ||
            errorJson.response?.message ||
            errorJson.error ||
            JSON.stringify(errorJson);
        } catch {
          // Mantém errorText
        }

        if (response.status === 401 || response.status === 403) {
          throw new UnauthorizedException(
            `Falha de autenticação na Evolution API (Status ${response.status}): ${parsedMessage}`,
          );
        }

        if (response.status === 404) {
          throw new BadRequestException(
            `Recurso ou instância não encontrada na Evolution API: ${parsedMessage}`,
          );
        }

        throw new BadRequestException(
          `Evolution API retornou status ${response.status}: ${parsedMessage}`,
        );
      }

      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        return (await response.json()) as T;
      }

      const text = await response.text();
      return (text ? JSON.parse(text) : {}) as T;
    } catch (err: any) {
      if (err.name === 'AbortError') {
        throw new RequestTimeoutException(
          `Timeout de ${options.timeoutMs || this.defaultTimeoutMs}ms excedido na requisição à Evolution API (${url}).`,
        );
      }
      if (
        err instanceof BadRequestException ||
        err instanceof UnauthorizedException ||
        err instanceof RequestTimeoutException
      ) {
        throw err;
      }

      this.logger.error(`Erro de conexão com Evolution API (${url}): ${err.message}`);
      throw new BadGatewayException(
        `Não foi possível comunicar com o servidor da Evolution API: ${err.message}`,
      );
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * Testa a conectividade com o servidor Evolution e valida se a Global API Key é válida.
   */
  async pingServer(baseUrl: string, apiKey: string): Promise<{ success: boolean; message: string }> {
    try {
      // Chama rota oficial para listar instâncias
      await this.request<any>(baseUrl, apiKey, '/instance/fetchInstances', {
        method: 'GET',
        timeoutMs: 8000,
      });
      return { success: true, message: 'Servidor Evolution conectado com sucesso.' };
    } catch (err: any) {
      // Se a rota fetchInstances retornar ou se conseguir resposta do servidor
      if (err instanceof UnauthorizedException) {
        throw err;
      }
      throw new BadRequestException(`Falha ao conectar no servidor Evolution: ${err.message}`);
    }
  }

  /**
   * Registra uma nova instância no servidor Evolution (POST /instance/create).
   */
  async createInstance(
    baseUrl: string,
    apiKey: string,
    instanceName: string,
  ): Promise<{
    instance: { instanceName: string; status: string; integration: string };
    hash?: { apikey: string };
    qrcode?: { pairingCode?: string; code?: string; base64?: string };
  }> {
    return this.request(baseUrl, apiKey, '/instance/create', {
      method: 'POST',
      body: {
        instanceName,
        qrcode: true,
        integration: 'WHATSAPP-BAILEYS',
      },
    });
  }

  /**
   * Solicita o QR Code atualizado de pareamento (GET /instance/connect/{instanceName}).
   */
  async getConnectQrCode(
    baseUrl: string,
    apiKey: string,
    instanceName: string,
  ): Promise<{ pairingCode?: string; code?: string; base64?: string }> {
    return this.request(baseUrl, apiKey, `/instance/connect/${instanceName}`, {
      method: 'GET',
    });
  }

  /**
   * Consulta o estado de conexão em tempo real da instância (GET /instance/connectionState/{instanceName}).
   */
  async getConnectionState(
    baseUrl: string,
    apiKey: string,
    instanceName: string,
  ): Promise<{ instance: { instanceName: string; state: 'open' | 'close' | 'connecting' | string } }> {
    return this.request(baseUrl, apiKey, `/instance/connectionState/${instanceName}`, {
      method: 'GET',
    });
  }

  /**
   * Efetua o logout da instância no WhatsApp (DELETE /instance/logout/{instanceName}).
   */
  async logoutInstance(
    baseUrl: string,
    apiKey: string,
    instanceName: string,
  ): Promise<{ status: string; error?: boolean; response?: any }> {
    return this.request(baseUrl, apiKey, `/instance/logout/${instanceName}`, {
      method: 'DELETE',
    });
  }

  /**
   * Remove completamente a instância do servidor Evolution (DELETE /instance/delete/{instanceName}).
   */
  async deleteInstance(
    baseUrl: string,
    apiKey: string,
    instanceName: string,
  ): Promise<{ status: string; error?: boolean; response?: any }> {
    return this.request(baseUrl, apiKey, `/instance/delete/${instanceName}`, {
      method: 'DELETE',
    });
  }

  /**
   * Lista todos os grupos de WhatsApp da instância (GET /group/fetchAllGroups/{instanceName}?getParticipants=false).
   */
  async fetchAllGroups(
    baseUrl: string,
    apiKey: string,
    instanceName: string,
  ): Promise<GroupResponse[]> {
    const response = await this.request<any>(
      baseUrl,
      apiKey,
      `/group/fetchAllGroups/${instanceName}?getParticipants=false`,
      {
        method: 'GET',
        timeoutMs: 25000, // Grupos podem demorar um pouco mais dependendo da quantidade
      },
    );

    if (Array.isArray(response)) {
      return response;
    }

    if (response && Array.isArray(response.response)) {
      return response.response;
    }

    return [];
  }

  /**
   * Envia uma mensagem com imagem e legenda oficial (POST /message/sendMedia/{instanceName}).
   */
  async sendMedia(
    baseUrl: string,
    apiKey: string,
    instanceName: string,
    params: SendMediaParams,
  ): Promise<any> {
    // Valida URL da imagem para mitigar SSRF
    EvolutionSsrfValidator.validateUrl(params.media);

    return this.request(baseUrl, apiKey, `/message/sendMedia/${instanceName}`, {
      method: 'POST',
      body: {
        number: params.number,
        mediatype: 'image',
        mimetype: params.mimetype || 'image/jpeg',
        caption: params.caption,
        media: params.media,
        fileName: params.fileName || 'produto.jpg',
      },
    });
  }

  /**
   * Envia mensagem de texto simples (POST /message/sendText/{instanceName}).
   */
  async sendText(
    baseUrl: string,
    apiKey: string,
    instanceName: string,
    params: SendTextParams,
  ): Promise<any> {
    return this.request(baseUrl, apiKey, `/message/sendText/${instanceName}`, {
      method: 'POST',
      body: {
        number: params.number,
        text: params.text,
        delay: params.delay ?? 1200,
      },
    });
  }
}
