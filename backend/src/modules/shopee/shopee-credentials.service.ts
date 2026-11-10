import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CryptoVaultService } from '../crypto-vault/crypto-vault.service';
import {
  ShopeeClientService,
  ProductSearchResult,
  ShopeeValidationDiagnostics,
} from './shopee.client';
import {
  CreateShopeeCredentialDto,
  UpdateShopeeCredentialDto,
  SearchProductsDto,
  GenerateShortLinkDto,
} from './dto/shopee.dto';

@Injectable()
export class ShopeeCredentialsService {
  private readonly logger = new Logger(ShopeeCredentialsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cryptoVault: CryptoVaultService,
    private readonly shopeeClient: ShopeeClientService,
  ) {}

  /**
   * Cadastra nova credencial Shopee, valida conexão e armazena Secret criptografado.
   */
  async create(tenantId: string, dto: CreateShopeeCredentialDto) {
    const existing = await this.prisma.shopeeCredential.findUnique({
      where: {
        tenantId_appId: {
          tenantId,
          appId: dto.appId.trim(),
        },
      },
    });

    if (existing) {
      throw new ConflictException('Uma credencial com este App ID já existe nesta organização.');
    }

    const appSecretEncrypted = this.cryptoVault.encrypt(dto.appSecret.trim());
    const appSecretMasked = this.cryptoVault.maskSecret(dto.appSecret.trim(), 4);

    // Valida conectividade real com a API da Shopee antes de marcar como válida
    const diagnostics: ShopeeValidationDiagnostics = {};
    const isValid = await this.shopeeClient.testConnectivity(
      dto.appId.trim(),
      dto.appSecret.trim(),
      diagnostics,
    );

    const credential = await this.prisma.shopeeCredential.create({
      data: {
        tenantId,
        label: dto.label.trim(),
        appId: dto.appId.trim(),
        appSecretEncrypted,
        appSecretMasked,
        isValid,
        lastValidatedAt: isValid ? new Date() : null,
      },
      select: {
        id: true,
        label: true,
        appId: true,
        appSecretMasked: true,
        isValid: true,
        lastValidatedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    this.logger.log(`Credencial Shopee criada [${credential.id}] para tenant [${tenantId}] - Válida: ${isValid}`);
    return {
      ...credential,
      validationErrorCode: !isValid ? diagnostics.code || null : null,
      validationMessage: !isValid ? diagnostics.message || null : null,
    };
  }

  /**
   * Lista todas as credenciais do tenant autenticado (apenas campos seguros e mascarados).
   */
  async findAllByTenant(tenantId: string) {
    return this.prisma.shopeeCredential.findMany({
      where: { tenantId },
      select: {
        id: true,
        label: true,
        appId: true,
        appSecretMasked: true,
        isValid: true,
        lastValidatedAt: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Retorna detalhes de uma credencial pelo ID garantindo escopo de tenant.
   */
  async findOne(tenantId: string, id: string) {
    const credential = await this.prisma.shopeeCredential.findFirst({
      where: { id, tenantId },
      select: {
        id: true,
        label: true,
        appId: true,
        appSecretMasked: true,
        isValid: true,
        lastValidatedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!credential) {
      throw new NotFoundException('Credencial Shopee não encontrada.');
    }

    return credential;
  }

  /**
   * Atualiza dados da credencial garantindo escopo de tenant.
   */
  async update(tenantId: string, id: string, dto: UpdateShopeeCredentialDto) {
    const credential = await this.prisma.shopeeCredential.findFirst({
      where: { id, tenantId },
    });

    if (!credential) {
      throw new NotFoundException('Credencial Shopee não encontrada.');
    }

    let appSecretEncrypted = credential.appSecretEncrypted;
    let appSecretMasked = credential.appSecretMasked;
    let isValid = credential.isValid;
    let lastValidatedAt = credential.lastValidatedAt;
    const diagnostics: ShopeeValidationDiagnostics = {};

    if (dto.appSecret) {
      appSecretEncrypted = this.cryptoVault.encrypt(dto.appSecret.trim());
      appSecretMasked = this.cryptoVault.maskSecret(dto.appSecret.trim(), 4);
      isValid = await this.shopeeClient.testConnectivity(
        credential.appId,
        dto.appSecret.trim(),
        diagnostics,
      );
      lastValidatedAt = isValid ? new Date() : null;
    }

    const updated = await this.prisma.shopeeCredential.update({
      where: { id },
      data: {
        label: dto.label ? dto.label.trim() : credential.label,
        appSecretEncrypted,
        appSecretMasked,
        isValid,
        lastValidatedAt,
      },
      select: {
        id: true,
        label: true,
        appId: true,
        appSecretMasked: true,
        isValid: true,
        lastValidatedAt: true,
        updatedAt: true,
      },
    });

    return {
      ...updated,
      validationErrorCode: !isValid && dto.appSecret ? diagnostics.code || null : null,
      validationMessage: !isValid && dto.appSecret ? diagnostics.message || null : null,
    };
  }

  /**
   * Remove uma credencial garantindo escopo de tenant e integridade com automações.
   */
  async remove(tenantId: string, id: string) {
    const credential = await this.prisma.shopeeCredential.findFirst({
      where: { id, tenantId },
      include: {
        automations: { where: { status: { not: 'DELETED' } } },
      },
    });

    if (!credential) {
      throw new NotFoundException('Credencial Shopee não encontrada.');
    }

    if (credential.automations.length > 0) {
      throw new BadRequestException(
        'Esta credencial não pode ser removida pois está vinculada a automações ativas.',
      );
    }

    await this.prisma.shopeeCredential.delete({ where: { id } });
    return { success: true, message: 'Credencial removida com sucesso.' };
  }

  /**
   * Revalida a conectividade da credencial gravada com a Shopee.
   */
  async revalidate(tenantId: string, id: string) {
    const credential = await this.prisma.shopeeCredential.findFirst({
      where: { id, tenantId },
    });

    if (!credential) {
      throw new NotFoundException('Credencial Shopee não encontrada.');
    }

    const secret = this.cryptoVault.decrypt(credential.appSecretEncrypted);
    const diagnostics: ShopeeValidationDiagnostics = {};
    const isValid = await this.shopeeClient.testConnectivity(
      credential.appId,
      secret,
      diagnostics,
    );

    const updated = await this.prisma.shopeeCredential.update({
      where: { id },
      data: {
        isValid,
        lastValidatedAt: isValid ? new Date() : credential.lastValidatedAt,
      },
      select: {
        id: true,
        isValid: true,
        lastValidatedAt: true,
      },
    });

    return {
      ...updated,
      validationErrorCode: !isValid ? diagnostics.code || null : null,
      validationMessage: !isValid ? diagnostics.message || null : null,
    };
  }

  /**
   * Busca produtos na Shopee usando a credencial proprietária do tenant.
   */
  async searchProductsForTenant(
    tenantId: string,
    dto: SearchProductsDto,
  ): Promise<ProductSearchResult> {
    const credential = await this.prisma.shopeeCredential.findFirst({
      where: { tenantId, isValid: true },
      orderBy: { createdAt: 'desc' },
    });

    if (!credential) {
      throw new BadRequestException(
        'Nenhuma credencial Shopee válida encontrada para esta organização.',
      );
    }

    const secret = this.cryptoVault.decrypt(credential.appSecretEncrypted);
    return this.shopeeClient.searchProducts(credential.appId, secret, dto);
  }

  /**
   * Gera Short Link de afiliado utilizando a credencial proprietária do tenant.
   */
  async generateShortLinkForTenant(
    tenantId: string,
    dto: GenerateShortLinkDto,
  ): Promise<{ shortLink: string }> {
    const credential = await this.prisma.shopeeCredential.findFirst({
      where: { tenantId, isValid: true },
      orderBy: { createdAt: 'desc' },
    });

    if (!credential) {
      throw new BadRequestException(
        'Nenhuma credencial Shopee válida encontrada para esta organização.',
      );
    }

    const secret = this.cryptoVault.decrypt(credential.appSecretEncrypted);
    const shortLink = await this.shopeeClient.generateShortLink(
      credential.appId,
      secret,
      dto.originUrl,
      dto.subIds,
    );

    return { shortLink };
  }
}
