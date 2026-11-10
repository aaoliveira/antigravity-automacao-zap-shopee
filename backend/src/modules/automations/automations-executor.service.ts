import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { QueueService } from '../queue/queue.service';
import { ShopeeClientService } from '../shopee/shopee.client';
import { CryptoVaultService } from '../crypto-vault/crypto-vault.service';
import { WhatsAppGroupsService } from '../evolution/whatsapp-groups.service';
import { AutomationsSchedulerService } from './automations-scheduler.service';
import {
  AutomationStatus,
  DispatchStrategy,
  ExecutionStatus,
  PublicationStatus,
  InstanceStatus,
} from '@prisma/client';
import * as crypto from 'crypto';

@Injectable()
export class AutomationsExecutorService {
  private readonly logger = new Logger(AutomationsExecutorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly queueService: QueueService,
    private readonly shopeeClient: ShopeeClientService,
    private readonly cryptoVault: CryptoVaultService,
    private readonly whatsappGroupsService: WhatsAppGroupsService,
    private readonly schedulerService: AutomationsSchedulerService,
  ) {}

  /**
   * Executa uma automação ponta a ponta com aquisição de lock,
   * validações estritas de tenant, desduplicação, geração de link e publicação multi-grupo.
   */
  async execute(
    automationId: string,
    tenantId: string,
    isManual = false,
  ): Promise<{ success: boolean; executionId?: string; message: string; status: ExecutionStatus }> {
    const lockKey = `lock:automation:${automationId}`;
    const lockToken = crypto.randomUUID();

    // 1. Aquisição de Lock Distribuído no Redis (10 minutos de TTL)
    const acquired = await this.queueService.acquireLock(lockKey, lockToken, 600);
    if (!acquired) {
      this.logger.warn(
        `Execução da automação ${automationId} rejeitada: outra instância já está em processamento (Lock ativo).`,
      );
      return {
        success: false,
        message: 'Automação já está em processamento no momento.',
        status: ExecutionStatus.FAILED,
      };
    }

    try {
      // 2. Validação Multi-Tenant Estrita da Automação
      const automation = await this.prisma.automation.findFirst({
        where: { id: automationId, tenantId },
        include: {
          instance: { include: { server: true } },
          shopeeCredential: true,
          groupRedirectLink: true,
          keywords: true,
          groups: { include: { group: true } },
        },
      });

      if (!automation) {
        throw new NotFoundException('Automação não encontrada ou não pertence a este tenant.');
      }

      // Validação de estado ativo
      if (automation.status !== AutomationStatus.ACTIVE && !isManual) {
        this.logger.log(`Automação ${automationId} está pausada. Ignorando disparo agendado.`);
        return {
          success: false,
          message: 'Automação pausada.',
          status: ExecutionStatus.FAILED,
        };
      }

      // 3. Validação de Limite Diário
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      const executionsToday = await this.prisma.automationExecution.count({
        where: {
          automationId,
          startedAt: { gte: startOfDay },
          status: { in: [ExecutionStatus.SUCCESS, ExecutionStatus.PARTIAL_SUCCESS] },
        },
      });

      if (executionsToday >= automation.dailyExecutionLimit && !isManual) {
        this.logger.warn(
          `Automação ${automationId} atingiu o limite diário de ${automation.dailyExecutionLimit} execuções.`,
        );
        return {
          success: false,
          message: 'Limite diário de execuções atingido.',
          status: ExecutionStatus.FAILED,
        };
      }

      // 4. Validação da Instância WhatsApp (Não publicar se offline)
      if (automation.instance.status !== InstanceStatus.CONNECTED) {
        this.logger.warn(
          `Instância WhatsApp ${automation.instance.displayName} offline (Status: ${automation.instance.status}). Abortando execução.`,
        );

        const execution = await this.prisma.automationExecution.create({
          data: {
            tenantId,
            automationId,
            status: ExecutionStatus.SKIPPED_INSTANCE_OFFLINE,
            errorMessage: `Instância WhatsApp '${automation.instance.displayName}' não está conectada (Status atual: ${automation.instance.status}).`,
            completedAt: new Date(),
          },
        });

        this.updateNextExecution(automation);

        return {
          success: false,
          executionId: execution.id,
          message: 'Instância WhatsApp offline.',
          status: ExecutionStatus.SKIPPED_INSTANCE_OFFLINE,
        };
      }

      // 5. Seleção Imparcial de Nicho / Categoria (Palavras-chave DEC-001)
      if (!automation.keywords || automation.keywords.length === 0) {
        throw new BadRequestException('Automação não possui palavras-chave/nichos cadastrados.');
      }

      const randomKeywordIndex = Math.floor(Math.random() * automation.keywords.length);
      const selectedKeyword = automation.keywords[randomKeywordIndex].keyword;

      // 6. Desduplicação de Produtos (Janela configurável, padrão 7 dias)
      const dedupCutoff = new Date(
        Date.now() - automation.dedupWindowDays * 24 * 60 * 60 * 1000,
      );

      const recentSnapshots = await this.prisma.productSnapshot.findMany({
        where: {
          execution: {
            automationId,
            startedAt: { gte: dedupCutoff },
          },
        },
        select: { shopeeItemId: true },
      });
      const excludedItemIds = recentSnapshots.map((s) => s.shopeeItemId);

      // Descriptografa segredo da Shopee para consulta oficial
      const shopeeSecret = this.cryptoVault.decrypt(
        automation.shopeeCredential.appSecretEncrypted,
      );

      // Consulta ofertas na Shopee Affiliate Open API
      const searchResult = await this.shopeeClient.searchProducts(
        automation.shopeeCredential.appId,
        shopeeSecret,
        {
          keyword: selectedKeyword,
          page: 1,
          limit: 20,
        },
      );
      const candidates = searchResult.products || [];

      // Filtra produtos que já foram divulgados na janela de desduplicação
      const eligibleProducts = candidates.filter(
        (p) => !excludedItemIds.includes(p.itemId),
      );

      if (eligibleProducts.length === 0) {
        this.logger.warn(
          `Nenhum produto elegível encontrado para a palavra-chave '${selectedKeyword}' após exclusão de ${excludedItemIds.length} produtos recentes.`,
        );

        const execution = await this.prisma.automationExecution.create({
          data: {
            tenantId,
            automationId,
            status: ExecutionStatus.SKIPPED_NO_ELIGIBLE_PRODUCT,
            selectedKeyword,
            errorMessage: `Nenhum produto elegível encontrado para o nicho '${selectedKeyword}' dentro da janela de desduplicação de ${automation.dedupWindowDays} dias.`,
            completedAt: new Date(),
          },
        });

        this.updateNextExecution(automation);

        return {
          success: false,
          executionId: execution.id,
          message: 'Nenhum produto elegível encontrado.',
          status: ExecutionStatus.SKIPPED_NO_ELIGIBLE_PRODUCT,
        };
      }

      // Sorteia aleatoriamente um produto entre os elegíveis
      const selectedProduct =
        eligibleProducts[Math.floor(Math.random() * eligibleProducts.length)];

      // 7. Geração do Short Link Oficial Shopee com Credencial do Proprietário
      let shortLinkUrl = '';
      try {
        shortLinkUrl = await this.shopeeClient.generateShortLink(
          automation.shopeeCredential.appId,
          shopeeSecret,
          selectedProduct.productUrl,
          [automation.name.slice(0, 30), selectedProduct.itemId.slice(0, 30)],
        );
      } catch (linkErr: any) {
        this.logger.error(`Falha ao gerar Short Link Shopee: ${linkErr.message}`);

        const execution = await this.prisma.automationExecution.create({
          data: {
            tenantId,
            automationId,
            status: ExecutionStatus.FAILED,
            selectedKeyword,
            errorMessage: `Falha na geração do Short Link de afiliado Shopee: ${linkErr.message}`,
            completedAt: new Date(),
          },
        });

        this.updateNextExecution(automation);

        return {
          success: false,
          executionId: execution.id,
          message: 'Falha na geração do Short Link.',
          status: ExecutionStatus.FAILED,
        };
      }

      // 8. Criação do Registro de Execução, Snapshot e Link
      const targetGroups = this.selectTargetGroups(
        automation.groups,
        automation.dispatchStrategy,
      );
      const totalDestinations = targetGroups.length;

      const publicBaseUrl = (
        process.env.FRONTEND_URL?.split(',')[0] || 'http://localhost:5173'
      )
        .trim()
        .replace(/\/+$/, '');
      const permanentGroupUrl =
        automation.groupRedirectLink && automation.groupRedirectLink.isActive
          ? `${publicBaseUrl}/join/${automation.groupRedirectLink.slug}`
          : undefined;

      const execution = await this.prisma.automationExecution.create({
        data: {
          tenantId,
          automationId,
          status: ExecutionStatus.RUNNING,
          selectedKeyword,
          totalDestinations,
          productSnapshot: {
            create: {
              shopeeItemId: selectedProduct.itemId,
              title: selectedProduct.title,
              price: selectedProduct.price,
              originalPrice: selectedProduct.originalPrice || null,
              imageUrl: selectedProduct.imageUrl,
              productUrl: selectedProduct.productUrl,
              commissionRate: selectedProduct.commissionRate || null,
            },
          },
          affiliateLink: {
            create: {
              originalUrl: selectedProduct.productUrl,
              shortLink: shortLinkUrl,
              subId1: automation.name.slice(0, 30),
              subId2: selectedProduct.itemId.slice(0, 30),
            },
          },
        },
      });

      // 9. Publicação Multi-Grupo Individualizada (respeitando randomização de disparo configurada)
      let successCount = 0;
      let failureCount = 0;

      for (let i = 0; i < targetGroups.length; i++) {
        const autoGroup = targetGroups[i];
        const group = autoGroup.group;

        // Registra publicação pendente
        const publication = await this.prisma.publication.create({
          data: {
            executionId: execution.id,
            groupId: group.id,
            status: PublicationStatus.PENDING,
          },
        });

        try {
          if (!group.isActive) {
            throw new Error(`Grupo '${group.name}' está inativo.`);
          }

          // Formatação do preço
          const formattedPrice = `R$ ${selectedProduct.price.toFixed(2).replace('.', ',')}`;

          const sendResult = await this.whatsappGroupsService.sendMediaToGroup(
            tenantId,
            group.id,
            {
              mediaUrl: selectedProduct.imageUrl,
              captionTemplate: automation.captionTemplate || undefined,
              captionParams: {
                titulo: selectedProduct.title,
                preco: formattedPrice,
                link_afiliado: shortLinkUrl,
                link_grupo: permanentGroupUrl,
              },
            },
          );

          await this.prisma.publication.update({
            where: { id: publication.id },
            data: {
              status: PublicationStatus.SUCCESS,
              evolutionMessageId: sendResult.result?.key?.id || 'SENT',
              sentAt: new Date(),
            },
          });

          successCount++;
        } catch (pubErr: any) {
          this.logger.error(
            `Falha ao publicar no grupo ${group.name} (${group.jid}): ${pubErr.message}`,
          );

          await this.prisma.publication.update({
            where: { id: publication.id },
            data: {
              status: PublicationStatus.FAILED,
              errorMessage: pubErr.message,
            },
          });

          failureCount++;
        }

        // Jitter / Delay entre envios para evitar banimento do WhatsApp
        if (automation.jitterSeconds > 0 && i < targetGroups.length - 1) {
          await new Promise((resolve) =>
            setTimeout(resolve, automation.jitterSeconds * 1000),
          );
        }
      }

      // 10. Atualização do Status Final da Execução
      let finalStatus: ExecutionStatus = ExecutionStatus.SUCCESS;
      if (failureCount > 0 && successCount > 0) {
        finalStatus = ExecutionStatus.PARTIAL_SUCCESS;
      } else if (failureCount > 0 && successCount === 0) {
        finalStatus = ExecutionStatus.FAILED;
      }

      await this.prisma.automationExecution.update({
        where: { id: execution.id },
        data: {
          status: finalStatus,
          successCount,
          failureCount,
          completedAt: new Date(),
        },
      });

      this.updateNextExecution(automation);

      return {
        success: finalStatus !== ExecutionStatus.FAILED,
        executionId: execution.id,
        message: `Execução concluída com status: ${finalStatus}. Sucesso: ${successCount}/${totalDestinations}`,
        status: finalStatus,
      };
    } finally {
      // 11. Liberação do Lock Distribuído
      await this.queueService.releaseLock(lockKey, lockToken);
    }
  }

  /**
   * Atualiza a data da próxima execução e o horário da última execução da automação.
   */
  private async updateNextExecution(automation: any) {
    try {
      const nextExecutionAt = this.schedulerService.calculateNextExecution(
        {
          frequencyMinutes: automation.frequencyMinutes,
          windowStartTime: automation.windowStartTime,
          windowEndTime: automation.windowEndTime,
          daysOfWeek: automation.daysOfWeek,
        },
        new Date(),
      );

      await this.prisma.automation.update({
        where: { id: automation.id },
        data: {
          lastExecutedAt: new Date(),
          nextExecutionAt,
        },
      });
    } catch (err: any) {
      this.logger.error(
        `Erro ao atualizar nextExecutionAt da automação ${automation.id}: ${err.message}`,
      );
    }
  }

  /**
   * Seleciona e ordena os grupos-alvo de acordo com a estratégia de randomização da automação.
   * - ALL_SEQUENTIAL: preserva ordem original de todos os grupos.
   * - RANDOM_ORDER: embaralha todos os grupos com Fisher-Yates para variar a ordem de disparo.
   * - RANDOM_SINGLE: sorteia exatamente 1 grupo ativo por execução (fallback para todos se nenhum ativo).
   */
  selectTargetGroups<T extends { group: { isActive: boolean } }>(
    groups: T[],
    strategy: DispatchStrategy,
  ): T[] {
    if (groups.length <= 1 || strategy === DispatchStrategy.ALL_SEQUENTIAL) {
      return [...groups];
    }

    if (strategy === DispatchStrategy.RANDOM_SINGLE) {
      const activePool = groups.filter((item) => item.group.isActive);
      const pool = activePool.length > 0 ? activePool : groups;
      const randomIndex = Math.floor(Math.random() * pool.length);
      return [pool[randomIndex]];
    }

    // RANDOM_ORDER: Fisher-Yates shuffle
    const shuffled = [...groups];
    for (let i = shuffled.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }
}
