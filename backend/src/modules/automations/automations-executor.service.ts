import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  Optional,
  OnModuleDestroy,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { QueueService } from '../queue/queue.service';
import { ShopeeClientService } from '../shopee/shopee.client';
import { CryptoVaultService } from '../crypto-vault/crypto-vault.service';
import { WhatsAppGroupsService } from '../evolution/whatsapp-groups.service';
import { EvolutionClient } from '../evolution/evolution.client';
import { AutomationsSchedulerService } from './automations-scheduler.service';
import { CouponsService } from '../coupons/coupons.service';
import { MercadoLivreService } from '../mercadolivre/mercadolivre.service';
import {
  classifyEvolutionSendError,
  computeCircuitCooldownMinutes,
  computeEffectiveInstanceDailyLimit,
  computeHumanizedGroupDelayMs,
  getStartOfDayInZone,
} from '../evolution/instance-safety.helper';
import {
  AffiliatePlatform,
  AutomationStatus,
  DispatchStrategy,
  ExecutionStatus,
  PublicationStatus,
  InstanceStatus,
} from '@prisma/client';
import * as crypto from 'crypto';

@Injectable()
export class AutomationsExecutorService implements OnModuleDestroy {
  private readonly logger = new Logger(AutomationsExecutorService.name);
  private shuttingDown = false;

  markShuttingDown() {
    this.shuttingDown = true;
  }

  onModuleDestroy() {
    this.shuttingDown = true;
  }

  constructor(
    private readonly prisma: PrismaService,
    private readonly queueService: QueueService,
    private readonly shopeeClient: ShopeeClientService,
    private readonly cryptoVault: CryptoVaultService,
    private readonly whatsappGroupsService: WhatsAppGroupsService,
    private readonly schedulerService: AutomationsSchedulerService,
    @Optional() private readonly couponsService?: CouponsService,
    @Optional() private readonly mercadoLivreService?: MercadoLivreService,
    @Optional() private readonly evolutionClient?: EvolutionClient,
  ) {}

  /**
   * Executa uma automação ponta a ponta com aquisição de lock,
   * validações estritas de tenant, desduplicação, geração de link e publicação multi-grupo.
   */
  async execute(
    automationId: string,
    tenantId: string,
    isManual = false,
    options?: { instanceLockWaitMs?: number },
  ): Promise<{ success: boolean; executionId?: string; message: string; status: ExecutionStatus }> {
    const lockKey = `lock:automation:${automationId}`;
    const lockToken = crypto.randomUUID();
    let instanceLockKey: string | null = null;
    const instanceLockToken = crypto.randomUUID();

    // 1. Aquisição de Lock Distribuído por automação no Redis (10 minutos de TTL)
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
          tenant: { select: { timezone: true } },
          instance: { include: { server: true } },
          shopeeCredential: true,
          mercadoLivreAccount: true,
          groupRedirectLink: true,
          keywords: true,
          groups: { include: { group: true } },
        },
      });

      if (!automation) {
        throw new NotFoundException('Automação não encontrada ou não pertence a este tenant.');
      }

      // Validação de estado inativo / excluído ou pausado
      if (
        automation.status === AutomationStatus.INACTIVE ||
        automation.status === AutomationStatus.DELETED
      ) {
        this.logger.log(`Automação ${automationId} está inativa/excluída. Abortando execução.`);
        return {
          success: false,
          message: 'Automação inativa ou excluída.',
          status: ExecutionStatus.FAILED,
        };
      }

      if (automation.status !== AutomationStatus.ACTIVE && !isManual) {
        this.logger.log(`Automação ${automationId} está pausada. Ignorando disparo agendado.`);
        return {
          success: false,
          message: 'Automação pausada.',
          status: ExecutionStatus.FAILED,
        };
      }

      const tenantTimezone = automation.tenant?.timezone || 'America/Sao_Paulo';

      // Em disparos agendados, verifica se ainda está dentro da janela configurada
      if (
        !isManual &&
        typeof (this.schedulerService as any).isWithinScheduleWindow === 'function'
      ) {
        const insideWindow = (this.schedulerService as any).isWithinScheduleWindow(
          {
            frequencyMinutes: automation.frequencyMinutes,
            windowStartTime: automation.windowStartTime,
            windowEndTime: automation.windowEndTime,
            daysOfWeek: automation.daysOfWeek,
            timezone: tenantTimezone,
          },
          new Date(),
        );
        if (!insideWindow) {
          this.logger.log(
            `Automação ${automationId} fora da janela horária (${automation.windowStartTime}-${automation.windowEndTime} ${tenantTimezone}). Reagendando sem envio.`,
          );
          await this.updateNextExecution(automation);
          return {
            success: false,
            message: 'Fora da janela horária configurada.',
            status: ExecutionStatus.FAILED,
          };
        }
      }

      // 2.1 Lock Global por Instância WhatsApp (serializa múltiplas automações no mesmo número)
      const candidateInstanceLockKey = `lock:instance:${automation.instanceId}`;
      const instanceLockWaitMs =
        options?.instanceLockWaitMs ??
        (Number.parseInt(process.env.INSTANCE_LOCK_WAIT_MS || '15000', 10) ||
          15000);
      const instanceAcquired = await this.acquireInstanceLockWithWait(
        candidateInstanceLockKey,
        instanceLockToken,
        600,
        instanceLockWaitMs,
      );

      if (!instanceAcquired) {
        this.logger.warn(
          `Instância ${automation.instanceId} ocupada por outra automação. Execução ${automationId} adiada.`,
        );
        if (!isManual) {
          await this.enqueueDelayedInstanceRetry(automationId, tenantId);
        }
        return {
          success: false,
          message: 'Instância WhatsApp ocupada por outra automação em andamento.',
          status: ExecutionStatus.FAILED,
        };
      }
      instanceLockKey = candidateInstanceLockKey;

      // 3. Validação de Limite Diário da Automação e Cota Global da Instância (Publication)
      const startOfDay = getStartOfDayInZone(tenantTimezone);

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
        await this.updateNextExecution(automation);
        return {
          success: false,
          message: 'Limite diário de execuções atingido.',
          status: ExecutionStatus.FAILED,
        };
      }

      const instanceLimitInfo = computeEffectiveInstanceDailyLimit(
        automation.instance,
      );
      const instanceMessagesSentToday =
        typeof this.prisma.publication?.count === 'function'
          ? await this.prisma.publication.count({
              where: {
                status: PublicationStatus.SUCCESS,
                sentAt: { gte: startOfDay },
                group: {
                  instanceId: automation.instanceId,
                  tenantId,
                },
              },
            })
          : 0;

      const remainingInstanceQuota = Math.max(
        0,
        instanceLimitInfo.effectiveDailyLimit - instanceMessagesSentToday,
      );

      if (remainingInstanceQuota <= 0) {
        this.logger.warn(
          `Instância ${automation.instance.displayName} atingiu o limite diário seguro de mensagens (${instanceMessagesSentToday}/${instanceLimitInfo.effectiveDailyLimit}).`,
        );
        if (!isManual) {
          await this.updateNextExecution(automation);
        }
        return {
          success: false,
          message: `Limite diário de mensagens da instância atingido (${instanceMessagesSentToday}/${instanceLimitInfo.effectiveDailyLimit}).`,
          status: ExecutionStatus.FAILED,
        };
      }

      // 4. Validação do Circuit Breaker e da Instância WhatsApp (com ressincronização ao vivo)
      const circuitOpenUntilDate = automation.instance.circuitOpenUntil
        ? new Date(automation.instance.circuitOpenUntil)
        : null;

      if (circuitOpenUntilDate && circuitOpenUntilDate.getTime() > Date.now()) {
        const reasonSuffix = automation.instance.lastErrorReason
          ? ` Motivo anterior: ${automation.instance.lastErrorReason}`
          : '';
        this.logger.warn(
          `Circuit Breaker aberto para instância ${automation.instance.displayName} até ${circuitOpenUntilDate.toISOString()}.${reasonSuffix}`,
        );

        const execution = await this.prisma.automationExecution.create({
          data: {
            tenantId,
            automationId,
            status: ExecutionStatus.SKIPPED_INSTANCE_OFFLINE,
            errorMessage: `Circuit Breaker da instância '${automation.instance.displayName}' aberto até ${circuitOpenUntilDate.toISOString()}.${reasonSuffix}`,
            completedAt: new Date(),
          },
        });

        await this.updateNextExecution(automation);

        return {
          success: false,
          executionId: execution.id,
          message: `Circuit Breaker da instância ativo até ${circuitOpenUntilDate.toISOString()}.`,
          status: ExecutionStatus.SKIPPED_INSTANCE_OFFLINE,
        };
      }

      if (automation.instance.status !== InstanceStatus.CONNECTED) {
        let liveConnected = false;

        if (this.evolutionClient && automation.instance.server) {
          try {
            const apiKey = this.cryptoVault.decrypt(
              automation.instance.server.apiKeyEncrypted,
            );
            const stateData = await this.evolutionClient.getConnectionState(
              automation.instance.server.baseUrl,
              apiKey,
              automation.instance.instanceName,
            );
            if (stateData?.instance?.state === 'open') {
              await this.prisma.whatsAppInstance.update({
                where: { id: automation.instance.id },
                data: {
                  status: InstanceStatus.CONNECTED,
                  lastConnectedAt: new Date(),
                  consecutiveSendFailures: 0,
                  circuitOpenUntil: null,
                  lastErrorReason: null,
                },
              });
              automation.instance.status = InstanceStatus.CONNECTED;
              liveConnected = true;
            }
          } catch {
            liveConnected = false;
          }
        }

        if (!liveConnected) {
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

          await this.updateNextExecution(automation);

          return {
            success: false,
            executionId: execution.id,
            message: 'Instância WhatsApp offline.',
            status: ExecutionStatus.SKIPPED_INSTANCE_OFFLINE,
          };
        }
      }

      // 5. Seleção Imparcial de Nicho / Categoria (Palavras-chave DEC-001)
      if (!automation.keywords || automation.keywords.length === 0) {
        throw new BadRequestException('Automação não possui palavras-chave/nichos cadastrados.');
      }

      const shuffledKeywords = this.shuffleArray(
        automation.keywords.map((k) => k.keyword),
      );
      let selectedKeyword = shuffledKeywords[0];

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

      let selectedProduct: {
        itemId: string;
        title: string;
        price: number;
        originalPrice?: number | null;
        imageUrl: string;
        productUrl: string;
        commissionRate?: number | null;
        shopName?: string | null;
      };
      let shortLinkUrl = '';
      let selectedMlOfferId: string | undefined;

      if (automation.platform === AffiliatePlatform.MERCADO_LIVRE) {
        if (!automation.mercadoLivreAccountId || !this.mercadoLivreService) {
          const execution = await this.prisma.automationExecution.create({
            data: {
              tenantId,
              automationId,
              status: ExecutionStatus.FAILED,
              selectedKeyword,
              errorMessage: 'Conta Mercado Livre não vinculada a esta automação.',
              completedAt: new Date(),
            },
          });
          await this.updateNextExecution(automation);
          return {
            success: false,
            executionId: execution.id,
            message: 'Conta Mercado Livre não configurada na automação.',
            status: ExecutionStatus.FAILED,
          };
        }

        try {
          const mlResult = await this.mercadoLivreService.resolveOfferForExecution({
            tenantId,
            accountId: automation.mercadoLivreAccountId,
            keyword: selectedKeyword,
            excludedItemIds: new Set(excludedItemIds),
          });

          selectedProduct = {
            itemId: mlResult.itemKey,
            title: mlResult.title,
            price: mlResult.price,
            originalPrice: mlResult.originalPrice,
            imageUrl: mlResult.imageUrl,
            productUrl: mlResult.productUrl,
            commissionRate: null,
            shopName: mlResult.sellerName,
          };
          shortLinkUrl = mlResult.shortLink;
          selectedMlOfferId = mlResult.offerId;
        } catch (mlErr: any) {
          const noOffer = String(mlErr.message || '').includes(
            'Nenhuma oferta elegível',
          );
          const failStatus = noOffer
            ? ExecutionStatus.SKIPPED_NO_ELIGIBLE_PRODUCT
            : ExecutionStatus.FAILED;

          const execution = await this.prisma.automationExecution.create({
            data: {
              tenantId,
              automationId,
              status: failStatus,
              selectedKeyword,
              errorMessage: mlErr.message,
              completedAt: new Date(),
            },
          });
          await this.updateNextExecution(automation);
          return {
            success: false,
            executionId: execution.id,
            message: mlErr.message,
            status: failStatus,
          };
        }
      } else {
        if (!automation.shopeeCredential) {
          const execution = await this.prisma.automationExecution.create({
            data: {
              tenantId,
              automationId,
              status: ExecutionStatus.FAILED,
              selectedKeyword,
              errorMessage: 'Credencial Shopee não vinculada a esta automação.',
              completedAt: new Date(),
            },
          });
          await this.updateNextExecution(automation);
          return {
            success: false,
            executionId: execution.id,
            message: 'Credencial Shopee não configurada na automação.',
            status: ExecutionStatus.FAILED,
          };
        }

        // Descriptografa segredo da Shopee para consulta oficial
        const shopeeSecret = this.cryptoVault.decrypt(
          automation.shopeeCredential.appSecretEncrypted,
        );

        // Consulta ofertas na Shopee Affiliate Open API com fallback entre palavras-chave configuradas
        let eligibleProducts: any[] = [];
        let lastSearchError: Error | null = null;

        for (const kw of shuffledKeywords) {
          try {
            const searchResult = await this.shopeeClient.searchProducts(
              automation.shopeeCredential.appId,
              shopeeSecret,
              {
                keyword: kw,
                page: 1,
                limit: 20,
              },
            );
            const candidates = searchResult.products || [];
            const filtered = candidates.filter(
              (p) => !excludedItemIds.includes(p.itemId),
            );
            if (filtered.length > 0) {
              selectedKeyword = kw;
              eligibleProducts = filtered;
              break;
            }
          } catch (searchErr: any) {
            lastSearchError = searchErr;
            this.logger.warn(
              `Erro na busca Shopee para nicho '${kw}' (automação ${automationId}): ${searchErr.message}`,
            );
          }
        }

        if (eligibleProducts.length === 0 && lastSearchError) {
          const execution = await this.prisma.automationExecution.create({
            data: {
              tenantId,
              automationId,
              status: ExecutionStatus.FAILED,
              selectedKeyword,
              errorMessage: `Falha ao consultar produtos na Shopee: ${lastSearchError.message}`,
              completedAt: new Date(),
            },
          });

          await this.updateNextExecution(automation);

          return {
            success: false,
            executionId: execution.id,
            message: `Falha ao consultar produtos na Shopee: ${lastSearchError.message}`,
            status: ExecutionStatus.FAILED,
          };
        }

        if (eligibleProducts.length === 0) {
          this.logger.warn(
            `Nenhum produto elegível encontrado para os nichos configurados após exclusão de ${excludedItemIds.length} produtos recentes.`,
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

          await this.updateNextExecution(automation);

          return {
            success: false,
            executionId: execution.id,
            message: 'Nenhum produto elegível encontrado.',
            status: ExecutionStatus.SKIPPED_NO_ELIGIBLE_PRODUCT,
          };
        }

        // Sorteia aleatoriamente um produto entre os elegíveis
        const pickedShopee =
          eligibleProducts[Math.floor(Math.random() * eligibleProducts.length)];

        // 7. Geração do Short Link Oficial Shopee com Credencial do Proprietário
        try {
          shortLinkUrl = await this.shopeeClient.generateShortLink(
            automation.shopeeCredential.appId,
            shopeeSecret,
            pickedShopee.productUrl,
            [automation.name.slice(0, 30), pickedShopee.itemId.slice(0, 30)],
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

          await this.updateNextExecution(automation);

          return {
            success: false,
            executionId: execution.id,
            message: 'Falha na geração do Short Link.',
            status: ExecutionStatus.FAILED,
          };
        }

        selectedProduct = {
          itemId: pickedShopee.itemId,
          title: pickedShopee.title,
          price: pickedShopee.price,
          originalPrice: pickedShopee.originalPrice,
          imageUrl: pickedShopee.imageUrl,
          productUrl: pickedShopee.productUrl,
          commissionRate: pickedShopee.commissionRate,
          shopName: (pickedShopee as any).shopName ?? null,
        };
      }

      // 8. Criação do Registro de Execução, Snapshot e Link
      let targetGroups = this.selectTargetGroups(
        automation.groups,
        automation.dispatchStrategy,
      );
      if (targetGroups.length > remainingInstanceQuota) {
        this.logger.warn(
          `Limitando grupos da execução ${automationId} de ${targetGroups.length} para ${remainingInstanceQuota} visando respeitar a cota diária da instância ${automation.instance.displayName}.`,
        );
        targetGroups = targetGroups.slice(0, remainingInstanceQuota);
      }
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

      // Seleção automática do melhor cupom elegível da plataforma (ou cupom específico vinculado)
      const matchedCoupon = this.couponsService
        ? await this.couponsService.selectForExecution(
            tenantId,
            automation.platform ?? AffiliatePlatform.SHOPEE,
            {
              title: selectedProduct.title,
              price: selectedProduct.price,
              shopName: selectedProduct.shopName ?? null,
            },
            automation.couponId,
          )
        : null;

      const execution = await this.prisma.automationExecution.create({
        data: {
          tenantId,
          automationId,
          status: ExecutionStatus.RUNNING,
          selectedKeyword,
          appliedCouponCode: matchedCoupon?.vars.cupom || null,
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

      // 9. Publicação Multi-Grupo Individualizada (respeitando cooldown global, jitter e Circuit Breaker)
      let successCount = 0;
      let failureCount = 0;
      let circuitAbortMessage: string | null = null;
      const minIntervalSeconds = automation.instance.minIntervalSeconds ?? 15;

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

          await this.waitForInstanceCooldown(
            automation.instanceId,
            minIntervalSeconds,
          );

          // Formatação do preço e nome de arquivo dinâmico por plataforma/produto
          const formattedPrice = `R$ ${selectedProduct.price.toFixed(2).replace('.', ',')}`;
          const platformPrefix =
            automation.platform === AffiliatePlatform.MERCADO_LIVRE ? 'ml' : 'shopee';
          const safeItemSlug = (selectedProduct.itemId || 'item')
            .toLowerCase()
            .replace(/[^a-z0-9_-]+/g, '-')
            .slice(0, 24);
          const dynamicFileName = `oferta-${platformPrefix}-${safeItemSlug}`;

          let sendResult: any;
          try {
            sendResult = await this.whatsappGroupsService.sendMediaToGroup(
              tenantId,
              group.id,
              {
                mediaUrl: selectedProduct.imageUrl,
                fileName: dynamicFileName,
                captionTemplate: automation.captionTemplate || undefined,
                captionParams: {
                  titulo: selectedProduct.title,
                  preco: formattedPrice,
                  link_afiliado: shortLinkUrl,
                  link_grupo: permanentGroupUrl,
                  cupom: matchedCoupon?.vars.cupom,
                  cupom_desconto: matchedCoupon?.vars.cupom_desconto,
                  preco_com_cupom: matchedCoupon?.vars.preco_com_cupom,
                  cupom_validade: matchedCoupon?.vars.cupom_validade,
                },
              },
            );
          } finally {
            if (
              minIntervalSeconds > 0 &&
              typeof this.queueService?.setInstanceCooldown === 'function'
            ) {
              await this.queueService.setInstanceCooldown(
                automation.instanceId,
                minIntervalSeconds,
              );
            }
          }

          // Envio bem-sucedido zera contador de falhas do Circuit Breaker se havia histórico anterior
          if (
            (automation.instance.consecutiveSendFailures || 0) > 0 ||
            automation.instance.circuitOpenUntil
          ) {
            if (typeof this.prisma.whatsAppInstance?.update === 'function') {
              await this.prisma.whatsAppInstance
                .update({
                  where: { id: automation.instanceId },
                  data: {
                    consecutiveSendFailures: 0,
                    circuitOpenUntil: null,
                    lastErrorReason: null,
                  },
                })
                .catch(() => undefined);
            }
            automation.instance.consecutiveSendFailures = 0;
            automation.instance.circuitOpenUntil = null;
            automation.instance.lastErrorReason = null;
          }

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

          const classification = classifyEvolutionSendError(pubErr);
          if (classification.abortBatch) {
            const nextFailures =
              (automation.instance.consecutiveSendFailures || 0) + 1;
            const cooldownMinutes = computeCircuitCooldownMinutes(nextFailures);
            const circuitOpenUntil = new Date(
              Date.now() + cooldownMinutes * 60 * 1000,
            );
            const sanitizedReason = classification.reason.slice(0, 480);

            if (typeof this.prisma.whatsAppInstance?.update === 'function') {
              await this.prisma.whatsAppInstance
                .update({
                  where: { id: automation.instanceId },
                  data: {
                    consecutiveSendFailures: nextFailures,
                    circuitOpenUntil,
                    lastErrorReason: sanitizedReason,
                    ...(classification.markInstanceDisconnected
                      ? { status: InstanceStatus.DISCONNECTED }
                      : {}),
                  },
                })
                .catch(() => undefined);
            }

            automation.instance.consecutiveSendFailures = nextFailures;
            automation.instance.circuitOpenUntil = circuitOpenUntil;
            automation.instance.lastErrorReason = sanitizedReason;

            circuitAbortMessage = `Circuit Breaker acionado (${classification.scope}, cooldown ${cooldownMinutes}min): abortados ${targetGroups.length - 1 - i} envio(s) restante(s). Motivo: ${sanitizedReason}`;
            this.logger.error(circuitAbortMessage);
            break;
          }

          if (classification.scope === 'GROUP_PERM_ERROR' && group.isActive) {
            const blockedReason = classification.reason.slice(0, 250);
            if (typeof this.prisma.whatsAppGroup?.update === 'function') {
              await this.prisma.whatsAppGroup
                .update({
                  where: { id: group.id },
                  data: {
                    isActive: false,
                    sendBlockedReason: blockedReason,
                  },
                })
                .catch(() => undefined);
            }
            group.isActive = false;
            group.sendBlockedReason = blockedReason;
            this.logger.warn(
              `Grupo '${group.name}' (${group.jid}) desativado automaticamente após erro permanente: ${blockedReason}`,
            );
          }
        }

        // Jitter humanizado aleatório entre grupos + macro-pausa periódica em lotes (Item 2 Anti-Ban)
        if (i < targetGroups.length - 1) {
          const delayPlan = computeHumanizedGroupDelayMs({
            baseJitterSeconds: automation.jitterSeconds,
            minIntervalSeconds,
            sentIndex: i,
            totalGroups: targetGroups.length,
          });
          if (delayPlan.totalDelayMs > 0) {
            if (delayPlan.macroPauseMs > 0) {
              this.logger.debug(
                `Aplicando macro-pausa anti-ban após lote de grupos (${delayPlan.macroPauseMs}ms + jitter ${delayPlan.jitterMs}ms)`,
              );
            }
            await this.sleep(delayPlan.totalDelayMs);
          }
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
          ...(circuitAbortMessage ? { errorMessage: circuitAbortMessage } : {}),
          completedAt: new Date(),
        },
      });

      if (matchedCoupon && successCount > 0 && this.couponsService) {
        await this.couponsService.incrementUsage(matchedCoupon.coupon.id);
      }

      if (selectedMlOfferId && successCount > 0 && this.mercadoLivreService) {
        await this.mercadoLivreService.markOfferPublished(selectedMlOfferId);
      }

      await this.updateNextExecution(automation);

      return {
        success: finalStatus !== ExecutionStatus.FAILED,
        executionId: execution.id,
        message:
          circuitAbortMessage && successCount === 0
            ? circuitAbortMessage
            : `Execução concluída com status: ${finalStatus}. Sucesso: ${successCount}/${totalDestinations}`,
        status: finalStatus,
      };
    } finally {
      // 11. Liberação dos Locks Distribuídos (Instância + Automação)
      if (instanceLockKey) {
        await this.queueService
          .releaseLock(instanceLockKey, instanceLockToken)
          .catch(() => false);
      }
      await this.queueService.releaseLock(lockKey, lockToken);
    }
  }

  protected async sleep(ms: number): Promise<void> {
    if (ms <= 0 || this.shuttingDown) return;
    await new Promise<void>((resolve) => {
      const timer = setTimeout(resolve, ms);
      timer.unref?.();
    });
  }

  async waitForInstanceCooldown(
    instanceId: string,
    minIntervalSeconds: number,
  ): Promise<number> {
    if (
      this.shuttingDown ||
      !minIntervalSeconds ||
      minIntervalSeconds <= 0 ||
      typeof this.queueService?.getInstanceCooldownUntil !== 'function'
    ) {
      return 0;
    }

    const cooldownUntilMs =
      await this.queueService.getInstanceCooldownUntil(instanceId);
    if (!cooldownUntilMs) {
      return 0;
    }

    const waitMs = cooldownUntilMs - Date.now();
    if (waitMs > 0) {
      this.logger.debug(
        `Aguardando cooldown global da instância ${instanceId}: ${waitMs}ms`,
      );
      await this.sleep(waitMs);
      return waitMs;
    }

    return 0;
  }

  private async acquireInstanceLockWithWait(
    lockKey: string,
    lockToken: string,
    ttlSeconds: number,
    maxWaitMs: number,
  ): Promise<boolean> {
    const start = Date.now();
    while (!this.shuttingDown) {
      const acquired = await this.queueService.acquireLock(
        lockKey,
        lockToken,
        ttlSeconds,
      );
      if (acquired) {
        return true;
      }

      if (this.shuttingDown || Date.now() - start >= maxWaitMs) {
        return false;
      }

      await this.sleep(100 + Math.floor(Math.random() * 40));
    }
    return false;
  }

  private async enqueueDelayedInstanceRetry(
    automationId: string,
    tenantId: string,
  ): Promise<void> {
    try {
      if (
        this.shuttingDown ||
        typeof this.queueService?.getAutomationQueue !== 'function'
      ) {
        return;
      }
      const queue = this.queueService.getAutomationQueue();
      const delayMs = 20000 + Math.floor(Math.random() * 10000);
      const bucket = Math.floor(Date.now() / 15000);
      await queue.add(
        'execute-automation',
        {
          automationId,
          tenantId,
          isManual: false,
          triggeredAt: new Date().toISOString(),
          reason: 'instance_lock_retry',
        },
        {
          jobId: `retry-instance-lock-${automationId}-${bucket}`,
          delay: delayMs,
          removeOnComplete: 50,
          removeOnFail: 100,
        },
      );
    } catch (err: any) {
      this.logger.warn(
        `Falha ao reagendar retry por contenção de instância (${automationId}): ${err.message}`,
      );
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
          timezone: automation.tenant?.timezone || 'America/Sao_Paulo',
        },
        new Date(),
        { applyMicroVariation: true },
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

  private shuffleArray<T>(items: T[]): T[] {
    const arr = [...items];
    for (let i = arr.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
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
