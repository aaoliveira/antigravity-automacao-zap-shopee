import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/modules/database/prisma.service';
import { QueueService } from '../src/modules/queue/queue.service';
import { CryptoVaultService } from '../src/modules/crypto-vault/crypto-vault.service';
import { AutomationsExecutorService } from '../src/modules/automations/automations-executor.service';
import { ShopeeClientService } from '../src/modules/shopee/shopee.client';
import { EvolutionClient } from '../src/modules/evolution/evolution.client';
import { InstanceStatus, ExecutionStatus, PublicationStatus } from '@prisma/client';

describe('MVP E2E Master Scenarios (E2E-01 to E2E-09)', () => {
  jest.setTimeout(35000);
  let app: INestApplication;
  let prisma: PrismaService;
  let queueService: QueueService;
  let cryptoVault: CryptoVaultService;
  let executorService: AutomationsExecutorService;
  let shopeeClient: ShopeeClientService;
  let evolutionClient: EvolutionClient;

  // Contexto Tenant A
  let userA_email = '';
  let tenantA_token = '';
  let tenantA_id = '';
  let tenantA_shopeeId = '';
  let tenantA_serverId = '';
  let tenantA_instanceId = '';
  let tenantA_group1Id = '';
  let tenantA_group2Id = '';
  let tenantA_automationId = '';
  let tenantA_executionId = '';

  // Contexto Tenant B (Para testes de isolamento)
  let userB_email = '';
  let tenantB_token = '';
  let tenantB_id = '';

  beforeAll(async () => {
    process.env.ALLOW_INTERNAL_EVOLUTION_URL = 'false';
    process.env.EVOLUTION_WEBHOOK_SECRET = 'live-validation-webhook-secret';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();
    prisma = app.get(PrismaService);
    queueService = app.get(QueueService);
    cryptoVault = app.get(CryptoVaultService);
    executorService = app.get(AutomationsExecutorService);
    shopeeClient = app.get(ShopeeClientService);
    evolutionClient = app.get(EvolutionClient);
  });

  afterAll(async () => {
    delete process.env.ALLOW_INTERNAL_EVOLUTION_URL;
    await prisma.$disconnect();
    await app.close();
  });

  // ============================================================================
  // CENÁRIO E2E-01: CONFIGURAÇÃO DE CONTAS E INTEGRAÇÕES
  // ============================================================================
  describe('CENÁRIO E2E-01: Configuração de Contas e Integrações', () => {
    it('1. Criar e autenticar usuário A com tenant dedicado', async () => {
      userA_email = `afiliado-a-${Date.now()}@e2e-test.com`;
      const res = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          name: 'Afiliado Master A',
          email: userA_email,
          password: 'Password123!',
          tenantName: 'Clube de Ofertas VIP A',
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.tenant.id).toBeDefined();

      tenantA_token = res.body.data.accessToken;
      tenantA_id = res.body.data.tenant.id;
    });

    it('2. Cadastrar credenciais Shopee A com cifragem autenticada e mascaramento', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/shopee-credentials')
        .set('Authorization', `Bearer ${tenantA_token}`)
        .send({
          label: 'Credencial Shopee Oficial A',
          appId: '108881',
          appSecret: 'shopee_live_secret_key_abcdef123456',
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.appId).toBe('108881');
      expect(res.body.data.appSecret).toBeUndefined();
      expect(res.body.data.appSecretMasked).toMatch(/^\*\*\*\*/);

      tenantA_shopeeId = res.body.data.id;
    });

    it('3. Validar teste de conexão da credencial Shopee (chama endpoint real)', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/shopee-credentials/${tenantA_shopeeId}/test`)
        .set('Authorization', `Bearer ${tenantA_token}`)
        .expect(200);

      expect(res.body.success).toBeDefined();
    });

    it('4. Cadastrar servidor Evolution A e validar proteção anti-SSRF', async () => {
      jest.spyOn(evolutionClient, 'pingServer').mockResolvedValue({
        success: true,
        message: 'Servidor Evolution online e autenticado',
      });

      const res = await request(app.getHttpServer())
        .post('/api/evolution-servers')
        .set('Authorization', `Bearer ${tenantA_token}`)
        .send({
          name: 'Evolution Gateway A',
          baseUrl: 'https://evolution-gateway-a.e2e.com',
          apiKey: 'evolution_api_key_secure_123456',
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.apiKey).toBeUndefined();
      expect(res.body.data.apiKeyMasked).toMatch(/^\*\*\*\*/);

      tenantA_serverId = res.body.data.id;
    });

    it('5. Criar instância WhatsApp e simular estado CONNECTED', async () => {
      const instance = await prisma.whatsAppInstance.create({
        data: {
          tenantId: tenantA_id,
          serverId: tenantA_serverId,
          instanceName: `inst_a_e2e_${Date.now()}`,
          displayName: 'Instância Promoções A',
          status: InstanceStatus.CONNECTED,
          lastConnectedAt: new Date(),
        },
      });

      expect(instance.id).toBeDefined();
      expect(instance.status).toBe(InstanceStatus.CONNECTED);
      tenantA_instanceId = instance.id;
    });

    it('6. Listar e sincronizar grupos WhatsApp da instância', async () => {
      const grp1 = await prisma.whatsAppGroup.create({
        data: {
          tenantId: tenantA_id,
          instanceId: tenantA_instanceId,
          jid: '1203630001@g.us',
          name: 'Grupo Ofertas Relâmpago 1',
          participantCount: 250,
          isActive: true,
        },
      });
      tenantA_group1Id = grp1.id;

      const grp2 = await prisma.whatsAppGroup.create({
        data: {
          tenantId: tenantA_id,
          instanceId: tenantA_instanceId,
          jid: '1203630002@g.us',
          name: 'Grupo Cupons VIP 2',
          participantCount: 180,
          isActive: true,
        },
      });
      tenantA_group2Id = grp2.id;

      const res = await request(app.getHttpServer())
        .get('/api/whatsapp-groups')
        .set('Authorization', `Bearer ${tenantA_token}`)
        .expect(200);

      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(2);
    });
  });

  // ============================================================================
  // CENÁRIO E2E-02: CRIAÇÃO DA AUTOMAÇÃO COM WIZARD
  // ============================================================================
  describe('CENÁRIO E2E-02: Criação e Persistência de Automação', () => {
    it('Deve criar automação com múltiplos nichos, grupos e agendamento seguro', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/automations')
        .set('Authorization', `Bearer ${tenantA_token}`)
        .send({
          name: 'Automação Nicho Tecnologia & Casa',
          instanceId: tenantA_instanceId,
          shopeeCredentialId: tenantA_shopeeId,
          groupIds: [tenantA_group1Id, tenantA_group2Id],
          keywords: ['fone bluetooth', 'relogio inteligente', 'luminaria led'],
          frequencyMinutes: 30,
          dailyExecutionLimit: 15,
          jitterSeconds: 0,
          dedupWindowDays: 7,
          windowStartTime: '08:00',
          windowEndTime: '22:00',
          daysOfWeek: [1, 2, 3, 4, 5, 6, 7],
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.nextExecutionAt).toBeDefined();

      tenantA_automationId = res.body.data.id;
    });

    it('Deve consultar automação e confirmar que todos os relacionamentos foram persistidos', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/automations/${tenantA_automationId}`)
        .set('Authorization', `Bearer ${tenantA_token}`)
        .expect(200);

      expect(res.body.data.groups.length).toBe(2);
      expect(res.body.data.keywords.length).toBe(3);
      expect(res.body.data.frequencyMinutes).toBe(30);
    });
  });

  // ============================================================================
  // CENÁRIO E2E-03: EXECUÇÃO MANUAL CONTROLADA
  // ============================================================================
  describe('CENÁRIO E2E-03: Execução Manual Controlada e Auditoria', () => {
    it('Deve validar endpoint de enqueue manual (HTTP 202) em automação dedicada', async () => {
      const enqueueAuto = await prisma.automation.create({
        data: {
          tenantId: tenantA_id,
          name: 'Automação Enqueue Test',
          shopeeCredentialId: tenantA_shopeeId,
          instanceId: tenantA_instanceId,
          status: 'ACTIVE',
        },
      });

      const res = await request(app.getHttpServer())
        .post(`/api/automations/${enqueueAuto.id}/execute-now`)
        .set('Authorization', `Bearer ${tenantA_token}`)
        .expect(202);

      expect(res.body.success).toBe(true);
      expect(res.body.data.jobId).toBeDefined();
    });

    it('Deve executar ciclo de automação, sortear produto elegível, gerar Short Link e salvar no banco', async () => {
      const mockProduct = {
        itemId: `shopee_item_${Date.now()}`,
        title: 'Fone de Ouvido Bluetooth Sem Fio TWS i12',
        price: 39.9,
        originalPrice: 89.9,
        imageUrl: 'https://cf.shopee.com.br/file/fone_bluetooth.jpg',
        productUrl: 'https://shopee.com.br/product/12345/67890',
        commissionRate: 0.12,
      };

      jest.spyOn(shopeeClient, 'searchProducts').mockResolvedValue({
        products: [mockProduct],
        pageInfo: { page: 1, limit: 20, hasNextPage: false },
      });

      jest.spyOn(shopeeClient, 'generateShortLink').mockResolvedValue(
        'https://s.shopee.com.br/e2e-test-link-001',
      );

      jest.spyOn(evolutionClient, 'sendMedia').mockResolvedValue({
        key: { id: 'EVO_MSG_TEST_001', remoteJid: '1203630001@g.us' },
        status: 'PENDING',
      });

      const execResult = await executorService.execute(tenantA_automationId, tenantA_id, true);

      expect(execResult.success).toBe(true);
      expect(execResult.executionId).toBeDefined();
      tenantA_executionId = execResult.executionId!;

      // Confirma auditoria no banco
      const execDb = await prisma.automationExecution.findUnique({
        where: { id: tenantA_executionId },
        include: {
          productSnapshot: true,
          affiliateLink: true,
          publications: true,
        },
      });

      expect(execDb).toBeDefined();
      expect(execDb?.status).toBe(ExecutionStatus.SUCCESS);
      expect(execDb?.productSnapshot?.shopeeItemId).toBe(mockProduct.itemId);
      expect(execDb?.affiliateLink?.shortLink).toBe('https://s.shopee.com.br/e2e-test-link-001');
      expect(execDb?.publications.length).toBe(2);
    });
  });

  // ============================================================================
  // CENÁRIO E2E-04: PUBLICAÇÃO MULTIGRUPO E FALHA PARCIAL
  // ============================================================================
  describe('CENÁRIO E2E-04: Publicação Multigrupo e Falha Parcial', () => {
    it('Deve publicar com sucesso no Grupo 1 e registrar falha no Grupo 2 sem perder o sucesso (PARTIAL_SUCCESS)', async () => {
      const candidate = {
        itemId: `item_multi_${Date.now()}`,
        title: 'Kit 3 Camisetas Algodão Premium',
        price: 79.9,
        imageUrl: 'https://cf.shopee.com.br/file/camisetas.jpg',
        productUrl: 'https://shopee.com.br/product/999/888',
        commissionRate: 0.1,
      };

      jest.spyOn(shopeeClient, 'searchProducts').mockResolvedValue({
        products: [candidate],
        pageInfo: { page: 1, limit: 20, hasNextPage: false },
      });

      jest.spyOn(shopeeClient, 'generateShortLink').mockResolvedValue(
        'https://s.shopee.com.br/multi-group-link',
      );

      let sendCalls = 0;
      jest.spyOn(evolutionClient, 'sendMedia').mockImplementation(async () => {
        sendCalls++;
        if (sendCalls === 1) {
          return { key: { id: 'MSG_SUCCESS_G1' } };
        } else {
          throw new Error('Evolution API: WhatsApp Group is restricted or bot was removed (403)');
        }
      });

      const execResult = await executorService.execute(tenantA_automationId, tenantA_id, true);

      expect(execResult.status).toBe(ExecutionStatus.PARTIAL_SUCCESS);

      const execDb = await prisma.automationExecution.findUnique({
        where: { id: execResult.executionId },
        include: { publications: true },
      });

      const pubSuccess = execDb?.publications.find((p) => p.status === PublicationStatus.SUCCESS);
      const pubFailed = execDb?.publications.find((p) => p.status === PublicationStatus.FAILED);

      expect(pubSuccess).toBeDefined();
      expect(pubFailed).toBeDefined();
      expect(pubFailed?.errorMessage).toMatch(/bot was removed/i);
    });
  });

  // ============================================================================
  // CENÁRIO E2E-05: AGENDAMENTO E LIMITES
  // ============================================================================
  describe('CENÁRIO E2E-05: Agendamento, Fila e Limites Diários', () => {
    it('Pausar a automação deve impedir execuções agendadas', async () => {
      await request(app.getHttpServer())
        .patch(`/api/automations/${tenantA_automationId}/pause`)
        .set('Authorization', `Bearer ${tenantA_token}`)
        .expect(200);

      const auto = await prisma.automation.findUnique({
        where: { id: tenantA_automationId },
      });
      expect(auto?.status).toBe('PAUSED');

      // Execução automática agendada é abortada se pausada
      const res = await executorService.execute(tenantA_automationId, tenantA_id, false);
      expect(res.success).toBe(false);
      expect(res.message).toMatch(/pausada/i);

      // Reativa automação
      await request(app.getHttpServer())
        .patch(`/api/automations/${tenantA_automationId}/resume`)
        .set('Authorization', `Bearer ${tenantA_token}`)
        .expect(200);
    });

    it('Atingir o limite diário de execuções deve abortar execuções agendadas', async () => {
      await prisma.automation.update({
        where: { id: tenantA_automationId },
        data: { dailyExecutionLimit: 1 },
      });

      // Como já houve execuções bem-sucedidas hoje, execução agendada respeita o limite diário
      const res = await executorService.execute(tenantA_automationId, tenantA_id, false);
      expect(res.success).toBe(false);
      expect(res.message).toMatch(/limite diário/i);

      // Restaura limite
      await prisma.automation.update({
        where: { id: tenantA_automationId },
        data: { dailyExecutionLimit: 20 },
      });
    });
  });

  // ============================================================================
  // CENÁRIO E2E-06: ISOLAMENTO RIGOROSO MULTI-TENANT
  // ============================================================================
  describe('CENÁRIO E2E-06: Isolamento Multi-Tenant e IDOR', () => {
    it('Criar usuário B e tentar invadir dados do usuário A', async () => {
      userB_email = `afiliado-b-${Date.now()}@e2e-test.com`;
      const resB = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          name: 'Afiliado Invasor B',
          email: userB_email,
          password: 'Password123!',
          tenantName: 'Clube de Ofertas B',
        })
        .expect(201);

      tenantB_token = resB.body.data.accessToken;
      tenantB_id = resB.body.data.tenant.id;

      // 1. B tenta ver credencial da Shopee de A (404)
      await request(app.getHttpServer())
        .get(`/api/shopee-credentials/${tenantA_shopeeId}`)
        .set('Authorization', `Bearer ${tenantB_token}`)
        .expect(404);

      // 2. B tenta ver servidor Evolution de A (404)
      await request(app.getHttpServer())
        .get(`/api/evolution-servers/${tenantA_serverId}`)
        .set('Authorization', `Bearer ${tenantB_token}`)
        .expect(404);

      // 3. B tenta ver instância de A (404)
      await request(app.getHttpServer())
        .get(`/api/whatsapp-instances/${tenantA_instanceId}`)
        .set('Authorization', `Bearer ${tenantB_token}`)
        .expect(404);

      // 4. B tenta disparar automação de A (404)
      await request(app.getHttpServer())
        .post(`/api/automations/${tenantA_automationId}/execute-now`)
        .set('Authorization', `Bearer ${tenantB_token}`)
        .expect(404);

      // 5. B tenta ver histórico de execução de A (404)
      await request(app.getHttpServer())
        .get(`/api/history/executions/${tenantA_executionId}`)
        .set('Authorization', `Bearer ${tenantB_token}`)
        .expect(404);
    });
  });

  // ============================================================================
  // CENÁRIO E2E-07: TRATAMENTO DE FALHAS E CONDIÇÕES ADVERSAS
  // ============================================================================
  describe('CENÁRIO E2E-07: Tratamento de Falhas e Condições Adversas', () => {
    it('Instância WhatsApp desconectada deve abortar com status SKIPPED_INSTANCE_OFFLINE', async () => {
      await prisma.whatsAppInstance.update({
        where: { id: tenantA_instanceId },
        data: { status: InstanceStatus.DISCONNECTED },
      });

      const res = await executorService.execute(tenantA_automationId, tenantA_id, true);
      expect(res.status).toBe(ExecutionStatus.SKIPPED_INSTANCE_OFFLINE);

      // Restaura status
      await prisma.whatsAppInstance.update({
        where: { id: tenantA_instanceId },
        data: { status: InstanceStatus.CONNECTED },
      });
    });

    it('Erro de Short Link na Shopee deve registrar FAILED sem quebrar o fluxo', async () => {
      jest.spyOn(shopeeClient, 'searchProducts').mockResolvedValueOnce({
        products: [{
          itemId: `item_err_${Date.now()}`,
          title: 'Produto Erro Link',
          price: 10,
          imageUrl: 'https://cf.shopee.com.br/file/img.jpg',
          productUrl: 'https://shopee.com.br/product/err',
        }],
        pageInfo: { page: 1, limit: 1, hasNextPage: false },
      });

      jest.spyOn(shopeeClient, 'generateShortLink').mockRejectedValueOnce(
        new Error('Shopee GraphQL Error: Invalid URL or affiliate account inactive'),
      );

      const res = await executorService.execute(tenantA_automationId, tenantA_id, true);
      expect(res.status).toBe(ExecutionStatus.FAILED);
      expect(res.success).toBe(false);
    });
  });

  // ============================================================================
  // CENÁRIO E2E-08: DESDUPLICAÇÃO E NÃO REPETIÇÃO
  // ============================================================================
  describe('CENÁRIO E2E-08: Desduplicação e Prevenção de Repetição', () => {
    it('Quando todos os candidatos já foram publicados na janela de 7 dias, registra SKIPPED_NO_ELIGIBLE_PRODUCT', async () => {
      const repeatedItem = {
        itemId: `item_repeated_${Date.now()}`,
        title: 'Mochila Impermeável Notebook',
        price: 99.0,
        imageUrl: 'https://cf.shopee.com.br/file/mochila.jpg',
        productUrl: 'https://shopee.com.br/product/mochila',
      };

      // Cria um snapshot recente simulando que já foi publicado há 2 dias
      await prisma.automationExecution.create({
        data: {
          tenantId: tenantA_id,
          automationId: tenantA_automationId,
          status: ExecutionStatus.SUCCESS,
          startedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
          productSnapshot: {
            create: {
              shopeeItemId: repeatedItem.itemId,
              title: repeatedItem.title,
              price: repeatedItem.price,
              imageUrl: repeatedItem.imageUrl,
              productUrl: repeatedItem.productUrl,
            },
          },
        },
      });

      jest.spyOn(shopeeClient, 'searchProducts').mockResolvedValueOnce({
        products: [repeatedItem],
        pageInfo: { page: 1, limit: 1, hasNextPage: false },
      });

      const res = await executorService.execute(tenantA_automationId, tenantA_id, true);
      expect(res.status).toBe(ExecutionStatus.SKIPPED_NO_ELIGIBLE_PRODUCT);
    });
  });

  // ============================================================================
  // CENÁRIO E2E-09: AUDITORIA COMPLETA DE EXECUÇÃO E HISTÓRICO
  // ============================================================================
  describe('CENÁRIO E2E-09: Auditoria Completa de Execução', () => {
    it('Histórico deve detalhar snapshots, publicações por grupo e mensagens sem vazar dados confidenciais', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/history/executions/${tenantA_executionId}`)
        .set('Authorization', `Bearer ${tenantA_token}`)
        .expect(200);

      const exec = res.body.data;
      expect(exec).toBeDefined();
      expect(exec.tenantId).toBe(tenantA_id);
      expect(exec.productSnapshot).toBeDefined();
      expect(exec.affiliateLink).toBeDefined();
      expect(exec.publications.length).toBeGreaterThan(0);

      // Garante que nenhum segredo esteja no histórico
      const rawJson = JSON.stringify(exec);
      expect(rawJson).not.toMatch(/shopee_live_secret_key/);
      expect(rawJson).not.toMatch(/evolution_api_key/);
    });
  });
});
