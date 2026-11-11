import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/modules/database/prisma.service';
import { QueueService } from '../src/modules/queue/queue.service';
import { CryptoVaultService } from '../src/modules/crypto-vault/crypto-vault.service';
import { AutomationsExecutorService } from '../src/modules/automations/automations-executor.service';
import { ShopeeClientService } from '../src/modules/shopee/shopee.client';
import { EvolutionClient } from '../src/modules/evolution/evolution.client';
import { InstanceStatus, ExecutionStatus, PublicationStatus } from '@prisma/client';

describe('Reliability, Resilience & Fault Tolerance Tests', () => {
  jest.setTimeout(25000);
  let app: INestApplication;
  let prisma: PrismaService;
  let queueService: QueueService;
  let cryptoVault: CryptoVaultService;
  let executorService: AutomationsExecutorService;
  let shopeeClient: ShopeeClientService;
  let evolutionClient: EvolutionClient;

  let tenantId = '';
  let shopeeCredId = '';
  let serverId = '';
  let instanceId = '';
  let group1Id = '';
  let group2Id = '';
  let automationId = '';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prisma = app.get(PrismaService);
    queueService = app.get(QueueService);
    cryptoVault = app.get(CryptoVaultService);
    executorService = app.get(AutomationsExecutorService);
    shopeeClient = app.get(ShopeeClientService);
    evolutionClient = app.get(EvolutionClient);

    // Setup de tenant e recursos para testes de resiliência
    const tenant = await prisma.tenant.create({
      data: {
        name: 'Resilience Test Tenant',
        slug: `resilience-tenant-${Date.now()}`,
      },
    });
    tenantId = tenant.id;

    const encryptedSecret = cryptoVault.encrypt('test_shopee_secret_123456');
    const shopeeCred = await prisma.shopeeCredential.create({
      data: {
        tenantId,
        label: 'Shopee Resiliência',
        appId: '109999',
        appSecretEncrypted: encryptedSecret,
        appSecretMasked: '************3456',
        isValid: true,
      },
    });
    shopeeCredId = shopeeCred.id;

    const encryptedApiKey = cryptoVault.encrypt('test_evolution_api_key');
    const server = await prisma.evolutionServer.create({
      data: {
        tenantId,
        name: 'Resilience Server',
        baseUrl: 'https://evolution.resilience-test.com',
        apiKeyEncrypted: encryptedApiKey,
        apiKeyMasked: '************key1',
        isActive: true,
      },
    });
    serverId = server.id;

    const instance = await prisma.whatsAppInstance.create({
      data: {
        tenantId,
        serverId,
        instanceName: `inst_resilience_${Date.now()}`,
        displayName: 'Instância Resiliência',
        status: InstanceStatus.CONNECTED,
      },
    });
    instanceId = instance.id;

    const grp1 = await prisma.whatsAppGroup.create({
      data: {
        tenantId,
        instanceId,
        jid: '1203631111@g.us',
        name: 'Grupo Resiliência 1',
        participantCount: 100,
        isActive: true,
      },
    });
    group1Id = grp1.id;

    const grp2 = await prisma.whatsAppGroup.create({
      data: {
        tenantId,
        instanceId,
        jid: '1203632222@g.us',
        name: 'Grupo Resiliência 2',
        participantCount: 80,
        isActive: true,
      },
    });
    group2Id = grp2.id;

    const automation = await prisma.automation.create({
      data: {
        tenantId,
        name: 'Automação Resiliente',
        shopeeCredentialId: shopeeCredId,
        instanceId,
        status: 'ACTIVE',
        frequencyMinutes: 30,
        jitterSeconds: 0,
        dedupWindowDays: 7,
        keywords: {
          create: [{ keyword: 'fone bluetooth' }],
        },
        groups: {
          create: [{ groupId: group1Id }, { groupId: group2Id }],
        },
      },
    });
    automationId = automation.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  // ============================================================================
  // 1. LOCK DISTRIBUÍDO NO REDIS & PROTEÇÃO CONTRA EXECUÇÕES CONCORRENTES
  // ============================================================================
  describe('Locks Distribuídos e Prevenção de Concorrência', () => {
    it('Deve impedir aquisição dupla de lock para o mesmo identificador de automação', async () => {
      const lockKey = `lock:automation:${automationId}`;
      const token1 = 'worker-node-1';
      const token2 = 'worker-node-2';

      // 1. Worker 1 adquire o lock
      const acquired1 = await queueService.acquireLock(lockKey, token1, 30);
      expect(acquired1).toBe(true);

      // 2. Worker 2 tenta adquirir o mesmo lock simultaneamente -> Rejeitado
      const acquired2 = await queueService.acquireLock(lockKey, token2, 30);
      expect(acquired2).toBe(false);

      // 3. Worker 1 libera o lock
      const released = await queueService.releaseLock(lockKey, token1);
      expect(released).toBe(true);

      // 4. Agora o lock fica livre para nova aquisição
      const acquiredAfter = await queueService.acquireLock(lockKey, token2, 30);
      expect(acquiredAfter).toBe(true);
      await queueService.releaseLock(lockKey, token2);
    });

    it('Worker que não é dono do token não deve conseguir liberar o lock de outro worker', async () => {
      const lockKey = `lock:automation:${automationId}`;
      const tokenOwner = 'worker-real-owner';
      const tokenAttacker = 'worker-imposter';

      await queueService.acquireLock(lockKey, tokenOwner, 30);

      // Impostor tenta liberar
      const imposterRelease = await queueService.releaseLock(lockKey, tokenAttacker);
      expect(imposterRelease).toBe(false);

      // Owner legítimo libera
      const ownerRelease = await queueService.releaseLock(lockKey, tokenOwner);
      expect(ownerRelease).toBe(true);
    });
  });

  // ============================================================================
  // 2. RESILIÊNCIA A INSTÂNCIA WHATSAPP OFFLINE (CIRCUIT BREAKER)
  // ============================================================================
  describe('Tratamento de Instância WhatsApp Desconectada', () => {
    it('Deve abortar execução com status SKIPPED_INSTANCE_OFFLINE se WhatsApp estiver offline', async () => {
      // Altera status da instância para DISCONNECTED
      await prisma.whatsAppInstance.update({
        where: { id: instanceId },
        data: { status: InstanceStatus.DISCONNECTED },
      });

      const result = await executorService.execute(automationId, tenantId, true);

      expect(result.status).toBe(ExecutionStatus.SKIPPED_INSTANCE_OFFLINE);
      expect(result.success).toBe(false);
      expect(result.message).toMatch(/offline/i);

      // Restaura status para CONNECTED
      await prisma.whatsAppInstance.update({
        where: { id: instanceId },
        data: { status: InstanceStatus.CONNECTED },
      });
    });
  });

  // ============================================================================
  // 3. TOLERÂNCIA A FALHAS NA SHOPEE API
  // ============================================================================
  describe('Tolerância a Falhas na API da Shopee', () => {
    it('Deve capturar erro da Shopee (ex: Rate Limit 10035 / Timeout) e marcar FAILED sem quebrar o worker', async () => {
      // Mock do ShopeeClient simulando erro de cota / rate limit da Shopee
      jest.spyOn(shopeeClient, 'searchProducts').mockRejectedValueOnce(
        new Error('error [10035]: You currently do not have access to the Shopee Affiliate Open API Platform.'),
      );

      const execRes = await executorService.execute(automationId, tenantId, true);
      expect(execRes.success).toBe(false);
      expect(execRes.status).toBe(ExecutionStatus.FAILED);
      expect(execRes.message).toMatch(/Shopee/i);
      expect(execRes.executionId).toBeDefined();

      const failedRow = await prisma.automationExecution.findUnique({
        where: { id: execRes.executionId },
      });
      expect(failedRow?.status).toBe(ExecutionStatus.FAILED);
      expect(failedRow?.errorMessage).toMatch(/10035/);

      // Restaura implementação original
      jest.restoreAllMocks();
    });
  });

  // ============================================================================
  // 4. DESDUPLICAÇÃO DE PRODUTOS & CANDIDATOS ESGOTADOS
  // ============================================================================
  describe('Desduplicação e Prevenção de Spam Repetido', () => {
    it('Deve registrar SKIPPED_NO_ELIGIBLE_PRODUCT se todos os produtos foram publicados recentemente', async () => {
      // Simula retorno de apenas 1 produto pela Shopee
      const fakeProduct = {
        itemId: 'shopee_item_123',
        title: 'Fone de Ouvido Bluetooth TWS',
        price: 49.9,
        originalPrice: 99.9,
        imageUrl: 'https://cf.shopee.com.br/file/fake_image.jpg',
        productUrl: 'https://shopee.com.br/product/123',
        commissionRate: 0.1,
      };

      jest.spyOn(shopeeClient, 'searchProducts').mockResolvedValueOnce({
        products: [fakeProduct],
        pageInfo: {
          page: 1,
          limit: 20,
          hasNextPage: false,
        },
      });

      // Cria um snapshot recente para este mesmo produto dentro da janela de 7 dias
      const previousExec = await prisma.automationExecution.create({
        data: {
          tenantId,
          automationId,
          status: ExecutionStatus.SUCCESS,
          selectedKeyword: 'fone bluetooth',
          startedAt: new Date(),
          completedAt: new Date(),
          productSnapshot: {
            create: {
              shopeeItemId: fakeProduct.itemId,
              title: fakeProduct.title,
              price: fakeProduct.price,
              imageUrl: fakeProduct.imageUrl,
              productUrl: fakeProduct.productUrl,
            },
          },
        },
      });

      const result = await executorService.execute(automationId, tenantId, true);

      expect(result.status).toBe(ExecutionStatus.SKIPPED_NO_ELIGIBLE_PRODUCT);
      expect(result.success).toBe(false);
      expect(result.message).toMatch(/Nenhum produto elegível/i);

      jest.restoreAllMocks();
    });
  });

  // ============================================================================
  // 5. FALHA PARCIAL MULTI-GRUPO (PARTIAL_SUCCESS)
  // ============================================================================
  describe('Consistência em Publicação Multi-Grupo e Falha Parcial', () => {
    it('Deve registrar PARTIAL_SUCCESS quando um grupo tem sucesso e outro falha', async () => {
      const candidateProduct = {
        itemId: `item_partial_${Date.now()}`,
        title: 'Relógio Smartwatch Esportivo',
        price: 89.9,
        imageUrl: 'https://cf.shopee.com.br/file/smartwatch.jpg',
        productUrl: 'https://shopee.com.br/product/smartwatch',
        commissionRate: 0.15,
      };

      jest.spyOn(shopeeClient, 'searchProducts').mockResolvedValueOnce({
        products: [candidateProduct],
        pageInfo: {
          page: 1,
          limit: 20,
          hasNextPage: false,
        },
      });

      jest.spyOn(shopeeClient, 'generateShortLink').mockResolvedValueOnce(
        'https://s.shopee.com.br/partial-test',
      );

      // Mock de envio para WhatsApp:
      // Grupo 1 tem SUCESSO, Grupo 2 FALHA (ex: removido do grupo / timeout)
      let sendCount = 0;
      jest.spyOn(evolutionClient, 'sendMedia').mockImplementation(async () => {
        sendCount++;
        if (sendCount === 1) {
          return {
            key: { id: 'EVOLUTION_MSG_001', remoteJid: '1203631111@g.us' },
            status: 'PENDING',
          };
        } else {
          throw new Error('Evolution API error: Contact is not in group (403)');
        }
      });

      const result = await executorService.execute(automationId, tenantId, true);

      expect(result.status).toBe(ExecutionStatus.PARTIAL_SUCCESS);
      expect(result.success).toBe(true);

      // Verifica registros no banco de dados
      const execDb = await prisma.automationExecution.findUnique({
        where: { id: result.executionId },
        include: { publications: true },
      });

      expect(execDb).toBeDefined();
      expect(execDb?.status).toBe(ExecutionStatus.PARTIAL_SUCCESS);
      expect(execDb?.publications.length).toBe(2);

      const pubSuccess = execDb?.publications.find(
        (p) => p.status === PublicationStatus.SUCCESS,
      );
      const pubFailed = execDb?.publications.find(
        (p) => p.status === PublicationStatus.FAILED,
      );

      expect(pubSuccess).toBeDefined();
      expect(pubSuccess?.evolutionMessageId).toBe('EVOLUTION_MSG_001');

      expect(pubFailed).toBeDefined();
      expect(pubFailed?.errorMessage).toMatch(/Contact is not in group/i);

      jest.restoreAllMocks();
    });
  });

  // ============================================================================
  // 6. ROTAÇÃO DE CHAVE MESTRE DE CRIPTOGRAFIA
  // ============================================================================
  describe('Suporte à Rotação Segura de Chave Mestre (Crypto Vault)', () => {
    it('Deve decifrar com chave antiga e recifrar com nova chave mantendo integridade', () => {
      const originalSecret = 'shopee_live_secret_rotation_test_xyz';
      const initialEncrypted = cryptoVault.encrypt(originalSecret);

      const newKeyHex = 'fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210';
      const reencrypted = cryptoVault.reencryptWithNewKey(initialEncrypted, newKeyHex);

      expect(reencrypted).not.toBe(initialEncrypted);

      // Cria nova instância com a nova chave e valida decifragem
      process.env.ENCRYPTION_MASTER_KEY = newKeyHex;
      const newVault = new CryptoVaultService();
      const decryptedWithNew = newVault.decrypt(reencrypted);

      expect(decryptedWithNew).toBe(originalSecret);
    });
  });
});
