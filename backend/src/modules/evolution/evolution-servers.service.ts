import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CryptoVaultService } from '../crypto-vault/crypto-vault.service';
import { EvolutionClient } from './evolution.client';
import { EvolutionSsrfValidator } from './evolution-ssrf.validator';
import {
  CreateEvolutionServerDto,
  UpdateEvolutionServerDto,
} from './dto/evolution.dto';

@Injectable()
export class EvolutionServersService {
  private readonly logger = new Logger(EvolutionServersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cryptoVault: CryptoVaultService,
    private readonly evolutionClient: EvolutionClient,
  ) {}

  /**
   * Lista todos os servidores Evolution cadastrados para o tenant.
   */
  async findAllByTenant(tenantId: string) {
    const servers = await this.prisma.evolutionServer.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        tenantId: true,
        name: true,
        baseUrl: true,
        apiKeyMasked: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: { instances: true },
        },
      },
    });

    return servers;
  }

  /**
   * Busca um servidor por ID pertencente estritamente ao tenant.
   */
  async findOne(tenantId: string, id: string) {
    const server = await this.prisma.evolutionServer.findFirst({
      where: { id, tenantId },
      select: {
        id: true,
        tenantId: true,
        name: true,
        baseUrl: true,
        apiKeyMasked: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!server) {
      throw new NotFoundException('Servidor Evolution não encontrado para o tenant.');
    }

    return server;
  }

  /**
   * Valida conectividade, cifra a chave e cria o servidor para o tenant.
   */
  async create(tenantId: string, dto: CreateEvolutionServerDto) {
    const cleanUrl = dto.baseUrl.trim().replace(/\/+$/, '');
    EvolutionSsrfValidator.validateUrl(cleanUrl);

    // Valida conectividade e autenticação com o servidor externo
    await this.evolutionClient.pingServer(cleanUrl, dto.apiKey.trim());

    const apiKeyEncrypted = this.cryptoVault.encrypt(dto.apiKey.trim());
    const apiKeyMasked = this.cryptoVault.maskSecret(dto.apiKey.trim());

    const server = await this.prisma.evolutionServer.create({
      data: {
        tenantId,
        name: dto.name.trim(),
        baseUrl: cleanUrl,
        apiKeyEncrypted,
        apiKeyMasked,
        isActive: true,
      },
      select: {
        id: true,
        tenantId: true,
        name: true,
        baseUrl: true,
        apiKeyMasked: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    this.logger.log(`Servidor Evolution criado: ${server.id} para o tenant ${tenantId}`);
    return server;
  }

  /**
   * Atualiza dados de um servidor com reteste se necessário.
   */
  async update(tenantId: string, id: string, dto: UpdateEvolutionServerDto) {
    const existing = await this.prisma.evolutionServer.findFirst({
      where: { id, tenantId },
    });

    if (!existing) {
      throw new NotFoundException('Servidor Evolution não encontrado para o tenant.');
    }

    const cleanUrl = dto.baseUrl ? dto.baseUrl.trim().replace(/\/+$/, '') : existing.baseUrl;
    let apiKeyToUse: string;

    if (dto.apiKey) {
      apiKeyToUse = dto.apiKey.trim();
    } else {
      apiKeyToUse = this.cryptoVault.decrypt(existing.apiKeyEncrypted);
    }

    if (dto.baseUrl || dto.apiKey) {
      EvolutionSsrfValidator.validateUrl(cleanUrl);
      await this.evolutionClient.pingServer(cleanUrl, apiKeyToUse);
    }

    const apiKeyEncrypted = dto.apiKey
      ? this.cryptoVault.encrypt(dto.apiKey.trim())
      : existing.apiKeyEncrypted;
    const apiKeyMasked = dto.apiKey
      ? this.cryptoVault.maskSecret(dto.apiKey.trim())
      : existing.apiKeyMasked;

    const updated = await this.prisma.evolutionServer.update({
      where: { id },
      data: {
        name: dto.name ? dto.name.trim() : existing.name,
        baseUrl: cleanUrl,
        apiKeyEncrypted,
        apiKeyMasked,
      },
      select: {
        id: true,
        tenantId: true,
        name: true,
        baseUrl: true,
        apiKeyMasked: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return updated;
  }

  /**
   * Exclui um servidor garantindo que não há instâncias vinculadas.
   */
  async remove(tenantId: string, id: string) {
    const existing = await this.prisma.evolutionServer.findFirst({
      where: { id, tenantId },
    });

    if (!existing) {
      throw new NotFoundException('Servidor Evolution não encontrado para o tenant.');
    }

    const instanceCount = await this.prisma.whatsAppInstance.count({
      where: { serverId: id, tenantId },
    });

    if (instanceCount > 0) {
      throw new BadRequestException(
        `Não é possível excluir o servidor. Existem ${instanceCount} instâncias vinculadas a ele.`,
      );
    }

    await this.prisma.evolutionServer.delete({
      where: { id },
    });

    return { success: true, message: 'Servidor Evolution removido com sucesso.' };
  }

  /**
   * Método interno seguro para obter credenciais descriptografadas do servidor.
   */
  async getServerCredentials(tenantId: string, serverId: string): Promise<{ baseUrl: string; apiKey: string }> {
    const server = await this.prisma.evolutionServer.findFirst({
      where: { id: serverId, tenantId },
    });

    if (!server) {
      throw new NotFoundException('Servidor Evolution não encontrado ou não pertence a este tenant.');
    }

    const apiKey = this.cryptoVault.decrypt(server.apiKeyEncrypted);
    return { baseUrl: server.baseUrl, apiKey };
  }
}
