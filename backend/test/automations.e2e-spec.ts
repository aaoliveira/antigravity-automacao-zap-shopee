import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/modules/database/prisma.service';
import { ShopeeClientService } from '../src/modules/shopee/shopee.client';
import { EvolutionClient } from '../src/modules/evolution/evolution.client';
import { AutomationsExecutorService } from '../src/modules/automations/automations-executor.service';
import { InstanceStatus, ExecutionStatus, PublicationStatus } from '@prisma/client';

describe('Automations Engine e2e & Multi-Tenant Isolation Tests', () => {
  jest.setTimeout(20000);
  let app: INestApplication;
  let prisma: PrismaService;
  let shopeeClient: ShopeeClientService;
  let evolutionClient: EvolutionClient;
  let executorService: AutomationsExecutorService;

  let tenantA_token = '';
  let tenantA_id = '';
  let tenantA_shopeeCredId = '';
  let tenantA_serverId = '';
  let tenantA_instanceId = '';
  let tenantA_group1Id = '';
  let tenantA_group2Id = '';
  let tenantA_automationId = '';

  let tenantB_token = '';
  let tenantB_id = '';
  let tenantB_shopeeCredId = '';
  let tenantB_instanceId = '';
  let tenantB_groupId = '';

  beforeAll(async () => {
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
    shopeeClient = app.get(ShopeeClientService);
    evolutionClient = app.get(EvolutionClient);
    executorService = app.get(AutomationsExecutorService);

    // Mocks externos controlados
    jest.spyOn(shopeeClient, 'testConnectivity').mockResolvedValue(true);
    jest.spyOn(evolutionClient, 'pingServer').mockResolvedValue({
      success: true,
      message: 'OK',
    });
    jest.spyOn(evolutionClient, 'createInstance').mockResolvedValue({
      instance: {
        instanceName: 'zap-auto-a',
        status: 'created',
        integration: 'WHATSAPP-BAILEYS',
      },
    });
    jest.spyOn(evolutionClient, 'sendMedia').mockResolvedValue({
      key: { id: 'MSG_EVO_AUTOMATION_99', remoteJid: '1203630001@g.us' },
      status: 'PENDING',
    });

    // 1. Setup Tenant A
    const resA = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        name: 'Gestor A',
        email: `tenantA-auto-${Date.now()}@teste.com`,
        password: 'Password123!',
        tenantName: 'Tenant Automations A',
      });
    tenantA_token = resA.body.data.accessToken;
    tenantA_id = resA.body.data.tenant.id;

    // Shopee Credential A
    const credA = await request(app.getHttpServer())
      .post('/api/shopee-credentials')
      .set('Authorization', `Bearer ${tenantA_token}`)
      .send({
        label: 'Credencial Shopee A',
        appId: '10928001',
        appSecret: 'secret_shopee_a_9988',
      });
    tenantA_shopeeCredId = credA.body.data.id;

    // Evolution Server A
    const srvA = await request(app.getHttpServer())
      .post('/api/evolution-servers')
      .set('Authorization', `Bearer ${tenantA_token}`)
      .send({
        name: 'Servidor Evo A',
        baseUrl: 'https://evolution-a.minhaempresa.com',
        apiKey: 'evo_key_a_9988',
      });
    tenantA_serverId = srvA.body.data.id;

    // Instance A
    const instA = await request(app.getHttpServer())
      .post('/api/whatsapp-instances')
      .set('Authorization', `Bearer ${tenantA_token}`)
      .send({
        serverId: tenantA_serverId,
        instanceName: `zap-a-${Date.now()}`,
        displayName: 'WhatsApp Vendas A',
      });
    tenantA_instanceId = instA.body.data.id;

    // Conecta a instância A no banco para permitir publicações
    await prisma.whatsAppInstance.update({
      where: { id: tenantA_instanceId },
      data: { status: InstanceStatus.CONNECTED },
    });

    // Cria 2 Grupos vinculados à instância A
    const grp1 = await prisma.whatsAppGroup.create({
      data: {
        tenantId: tenantA_id,
        instanceId: tenantA_instanceId,
        jid: '1203630001@g.us',
        name: 'Achadinhos Shopee Grupo 1',
        participantCount: 150,
      },
    });
    tenantA_group1Id = grp1.id;

    const grp2 = await prisma.whatsAppGroup.create({
      data: {
        tenantId: tenantA_id,
        instanceId: tenantA_instanceId,
        jid: '1203630002@g.us',
        name: 'Achadinhos Shopee Grupo 2',
        participantCount: 210,
      },
    });
    tenantA_group2Id = grp2.id;

    // 2. Setup Tenant B
    const resB = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        name: 'Gestor B',
        email: `tenantB-auto-${Date.now()}@teste.com`,
        password: 'Password123!',
        tenantName: 'Tenant Automations B',
      });
    tenantB_token = resB.body.data.accessToken;
    tenantB_id = resB.body.data.tenant.id;

    // Shopee Credential B
    const credB = await request(app.getHttpServer())
      .post('/api/shopee-credentials')
      .set('Authorization', `Bearer ${tenantB_token}`)
      .send({
        label: 'Credencial Shopee B',
        appId: '10928002',
        appSecret: 'secret_shopee_b_9988',
      });
    tenantB_shopeeCredId = credB.body.data.id;

    // Evolution Server B
    const srvB = await request(app.getHttpServer())
      .post('/api/evolution-servers')
      .set('Authorization', `Bearer ${tenantB_token}`)
      .send({
        name: 'Servidor Evo B',
        baseUrl: 'https://evolution-b.minhaempresa.com',
        apiKey: 'evo_key_b_9988',
      });

    // Instance B
    const instB = await request(app.getHttpServer())
      .post('/api/whatsapp-instances')
      .set('Authorization', `Bearer ${tenantB_token}`)
      .send({
        serverId: srvB.body.data.id,
        instanceName: `zap-b-${Date.now()}`,
        displayName: 'WhatsApp Vendas B',
      });
    tenantB_instanceId = instB.body.data.id;

    // Grupo B
    const grpB = await prisma.whatsAppGroup.create({
      data: {
        tenantId: tenantB_id,
        instanceId: tenantB_instanceId,
        jid: '1203639999@g.us',
        name: 'Grupo Isolado B',
        participantCount: 50,
      },
    });
    tenantB_groupId = grpB.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  // ==========================================
  // 1. VALIDAÇÃO DE PROPRIEDADE E CRUD
  // ==========================================

  it('Deve rejeitar criação de automação com recursos de outro tenant (400)', async () => {
    // Tentativa do Tenant A usando a credencial da Shopee do Tenant B
    await request(app.getHttpServer())
      .post('/api/automations')
      .set('Authorization', `Bearer ${tenantA_token}`)
      .send({
        name: 'Automação Invasora',
        instanceId: tenantA_instanceId,
        shopeeCredentialId: tenantB_shopeeCredId, // Recurso do Tenant B!
        keywords: ['moda feminina'],
        groupIds: [tenantA_group1Id],
      })
      .expect(400);

    // Tentativa do Tenant A usando o grupo do Tenant B
    await request(app.getHttpServer())
      .post('/api/automations')
      .set('Authorization', `Bearer ${tenantA_token}`)
      .send({
        name: 'Automação Invasora',
        instanceId: tenantA_instanceId,
        shopeeCredentialId: tenantA_shopeeCredId,
        keywords: ['moda feminina'],
        groupIds: [tenantB_groupId], // Grupo do Tenant B!
      })
      .expect(400);
  });

  it('Tenant A deve criar automação com múltiplos grupos e múltiplas categorias (201)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/automations')
      .set('Authorization', `Bearer ${tenantA_token}`)
      .send({
        name: 'Automação Eletrônicos & Casa VIP',
        instanceId: tenantA_instanceId,
        shopeeCredentialId: tenantA_shopeeCredId,
        keywords: ['teclado mecânico', 'mouse gamer', 'fone bluetooth'],
        groupIds: [tenantA_group1Id, tenantA_group2Id],
        frequencyMinutes: 60,
        dailyExecutionLimit: 15,
        jitterSeconds: 0,
        windowStartTime: '08:00',
        windowEndTime: '22:00',
        daysOfWeek: [1, 2, 3, 4, 5, 6, 7],
        dedupWindowDays: 7,
      })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBeDefined();
    expect(res.body.data.name).toBe('Automação Eletrônicos & Casa VIP');
    expect(res.body.data.status).toBe('ACTIVE');
    expect(res.body.data.nextExecutionAt).toBeDefined();
    expect(res.body.data.keywords).toHaveLength(3);
    expect(res.body.data.groups).toHaveLength(2);

    tenantA_automationId = res.body.data.id;
  });

  it('Tenant A deve listar suas automações cadastradas (200)', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/automations')
      .set('Authorization', `Bearer ${tenantA_token}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    expect(res.body.data[0].id).toBe(tenantA_automationId);
  });

  it('Tenant A deve consultar detalhes da automação (200)', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/automations/${tenantA_automationId}`)
      .set('Authorization', `Bearer ${tenantA_token}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe(tenantA_automationId);
    expect(res.body.data.instance.id).toBe(tenantA_instanceId);
  });

  it('Tenant A deve pausar e retomar a automação (200)', async () => {
    // 1. Pausa
    const resPause = await request(app.getHttpServer())
      .patch(`/api/automations/${tenantA_automationId}/pause`)
      .set('Authorization', `Bearer ${tenantA_token}`)
      .expect(200);

    expect(resPause.body.success).toBe(true);
    expect(resPause.body.data.status).toBe('PAUSED');

    // 2. Retoma
    const resResume = await request(app.getHttpServer())
      .patch(`/api/automations/${tenantA_automationId}/resume`)
      .set('Authorization', `Bearer ${tenantA_token}`)
      .expect(200);

    expect(resResume.body.success).toBe(true);
    expect(resResume.body.data.status).toBe('ACTIVE');
  });

  it('Somente automações pausadas ou inativas podem ser editadas (409 quando ACTIVE, 200 quando PAUSED)', async () => {
    // 1. Estando ACTIVE, edição deve ser bloqueada com 409 Conflict
    const conflictRes = await request(app.getHttpServer())
      .put(`/api/automations/${tenantA_automationId}`)
      .set('Authorization', `Bearer ${tenantA_token}`)
      .send({ name: 'Tentativa Edição Ativa' })
      .expect(409);

    expect(JSON.stringify(conflictRes.body)).toMatch(/pausadas ou inativas/i);

    // 2. Pausa a automação para liberar edição
    await request(app.getHttpServer())
      .patch(`/api/automations/${tenantA_automationId}/pause`)
      .set('Authorization', `Bearer ${tenantA_token}`)
      .expect(200);

    // 3. Estando PAUSED, edição deve ser aceita e manter status PAUSED
    const updateRes = await request(app.getHttpServer())
      .put(`/api/automations/${tenantA_automationId}`)
      .set('Authorization', `Bearer ${tenantA_token}`)
      .send({
        name: 'Automação Eletrônicos & Casa VIP (Editada)',
        frequencyMinutes: 90,
        keywords: ['teclado mecânico', 'mouse gamer'],
        groupIds: [tenantA_group1Id, tenantA_group2Id],
      })
      .expect(200);

    expect(updateRes.body.success).toBe(true);
    expect(updateRes.body.data.name).toBe('Automação Eletrônicos & Casa VIP (Editada)');
    expect(updateRes.body.data.frequencyMinutes).toBe(90);
    expect(updateRes.body.data.status).toBe('PAUSED');
    expect(updateRes.body.data.keywords).toHaveLength(2);

    // 4. Retoma automação para os cenários seguintes de execução
    await request(app.getHttpServer())
      .patch(`/api/automations/${tenantA_automationId}/resume`)
      .set('Authorization', `Bearer ${tenantA_token}`)
      .expect(200);
  });

  it('Somente automações inativas podem ser excluídas (409 para ACTIVE/PAUSED; 200 após INACTIVE)', async () => {
    // Cria automação dedicada para testar o ciclo de vida completo de exclusão
    const createTemp = await request(app.getHttpServer())
      .post('/api/automations')
      .set('Authorization', `Bearer ${tenantA_token}`)
      .send({
        name: 'Automação Ciclo Inativação e Exclusão',
        instanceId: tenantA_instanceId,
        shopeeCredentialId: tenantA_shopeeCredId,
        keywords: ['mochila'],
        groupIds: [tenantA_group1Id],
        frequencyMinutes: 60,
      })
      .expect(201);

    const tempId = createTemp.body.data.id;

    // 1. Estando ACTIVE, exclusão é bloqueada (409)
    await request(app.getHttpServer())
      .delete(`/api/automations/${tempId}`)
      .set('Authorization', `Bearer ${tenantA_token}`)
      .expect(409);

    // 2. Pausa (PAUSED): exclusão continua bloqueada (409) pois ainda não está INACTIVE
    await request(app.getHttpServer())
      .patch(`/api/automations/${tempId}/pause`)
      .set('Authorization', `Bearer ${tenantA_token}`)
      .expect(200);

    const pausedDelRes = await request(app.getHttpServer())
      .delete(`/api/automations/${tempId}`)
      .set('Authorization', `Bearer ${tenantA_token}`)
      .expect(409);

    expect(JSON.stringify(pausedDelRes.body)).toMatch(/inativas/i);

    // 3. Inativa via PATCH .../deactivate -> status INACTIVE
    const deactRes = await request(app.getHttpServer())
      .patch(`/api/automations/${tempId}/deactivate`)
      .set('Authorization', `Bearer ${tenantA_token}`)
      .expect(200);

    expect(deactRes.body.data.status).toBe('INACTIVE');

    // Enquanto INACTIVE: disparo manual bloqueado (409), mas edição permitida (200)
    await request(app.getHttpServer())
      .post(`/api/automations/${tempId}/execute-now`)
      .set('Authorization', `Bearer ${tenantA_token}`)
      .expect(409);

    const editInactive = await request(app.getHttpServer())
      .put(`/api/automations/${tempId}`)
      .set('Authorization', `Bearer ${tenantA_token}`)
      .send({ name: 'Automação Inativa Editada Antes de Excluir' })
      .expect(200);

    expect(editInactive.body.data.status).toBe('INACTIVE');

    // 4. Estando INACTIVE, exclusão é finalmente permitida (200)
    await request(app.getHttpServer())
      .delete(`/api/automations/${tempId}`)
      .set('Authorization', `Bearer ${tenantA_token}`)
      .expect(200);

    // Confirma que foi removida
    await request(app.getHttpServer())
      .get(`/api/automations/${tempId}`)
      .set('Authorization', `Bearer ${tenantA_token}`)
      .expect(404);
  });

  // ==========================================
  // 2. EXECUÇÃO MULTI-GRUPO E DESDUPLICAÇÃO
  // ==========================================

  it('Deve executar disparo com seleção de produto, Short Link oficial e publicação multi-grupo', async () => {
    // Mock de busca de produtos na Shopee
    jest.spyOn(shopeeClient, 'searchProducts').mockResolvedValue({
      products: [
        {
          itemId: 'PROD_TEST_991',
          title: 'Teclado Mecânico Gamer RGB Switch Azul',
          productUrl: 'https://shopee.com.br/product/123/456',
          imageUrl: 'https://down-br.img.susercontent.com/file/teclado.jpg',
          price: 159.9,
          originalPrice: 199.9,
          commissionRate: 0.08,
        },
      ],
      pageInfo: { page: 1, limit: 20, hasNextPage: false },
    });

    // Mock de geração de link encurtado oficial da Shopee
    jest.spyOn(shopeeClient, 'generateShortLink').mockResolvedValue('https://shope.ee/autoLink123');

    // Executa a automação através do Executor
    const result = await executorService.execute(
      tenantA_automationId,
      tenantA_id,
      true, // Disparo manual
    );

    expect(result.success).toBe(true);
    expect(result.status).toBe(ExecutionStatus.SUCCESS);
    expect(result.executionId).toBeDefined();

    // Valida no banco se a execução gravou Snapshot, AffiliateLink e 2 Publicações
    const execution = await prisma.automationExecution.findUnique({
      where: { id: result.executionId },
      include: {
        productSnapshot: true,
        affiliateLink: true,
        publications: true,
      },
    });

    expect(execution?.status).toBe(ExecutionStatus.SUCCESS);
    expect(execution?.totalDestinations).toBe(2);
    expect(execution?.successCount).toBe(2);
    expect(execution?.failureCount).toBe(0);

    // Snapshot
    expect(execution?.productSnapshot?.shopeeItemId).toBe('PROD_TEST_991');
    expect(Number(execution?.productSnapshot?.price)).toBe(159.9);

    // Short Link
    expect(execution?.affiliateLink?.shortLink).toBe('https://shope.ee/autoLink123');

    // Publicações individuais por grupo
    expect(execution?.publications).toHaveLength(2);
    expect(execution?.publications[0].status).toBe(PublicationStatus.SUCCESS);
    expect(execution?.publications[1].status).toBe(PublicationStatus.SUCCESS);
  });

  it('Desduplicação: na próxima execução deve ignorar produto já divulgado nos últimos 7 dias', async () => {
    // Retorna o produto que já foi publicado ('PROD_TEST_991') e um produto novo ('PROD_TEST_992')
    jest.spyOn(shopeeClient, 'searchProducts').mockResolvedValue({
      products: [
        {
          itemId: 'PROD_TEST_991', // Já divulgado no teste anterior!
          title: 'Teclado Mecânico Gamer RGB Switch Azul',
          productUrl: 'https://shopee.com.br/product/123/456',
          imageUrl: 'https://down-br.img.susercontent.com/file/teclado.jpg',
          price: 159.9,
        },
        {
          itemId: 'PROD_TEST_992', // Novo produto elegível!
          title: 'Mouse Gamer 12000 DPI Sensor Óptico',
          productUrl: 'https://shopee.com.br/product/123/789',
          imageUrl: 'https://down-br.img.susercontent.com/file/mouse.jpg',
          price: 89.9,
        },
      ],
      pageInfo: { page: 1, limit: 20, hasNextPage: false },
    });

    const result = await executorService.execute(
      tenantA_automationId,
      tenantA_id,
      true,
    );

    expect(result.success).toBe(true);

    const execution = await prisma.automationExecution.findUnique({
      where: { id: result.executionId },
      include: { productSnapshot: true },
    });

    // O produto selecionado DEVE ser o novo ('PROD_TEST_992') por causa da desduplicação
    expect(execution?.productSnapshot?.shopeeItemId).toBe('PROD_TEST_992');
  });

  it('Tenant A deve consultar histórico de execuções da automação (200)', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/automations/${tenantA_automationId}/executions`)
      .set('Authorization', `Bearer ${tenantA_token}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(2);
    expect(res.body.data[0].productSnapshot).toBeDefined();
    expect(res.body.data[0].publications).toHaveLength(2);
  });

  it('Tenant A deve acionar disparo manual via API (202 Accepted)', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/automations/${tenantA_automationId}/execute-now`)
      .set('Authorization', `Bearer ${tenantA_token}`)
      .expect(202);

    expect(res.body.success).toBe(true);
    expect(res.body.data.jobId).toBeDefined();
  });

  // ==========================================
  // 3. ISOLAMENTO MULTI-TENANT (TESTES NEGATIVOS A/B)
  // ==========================================

  it('Tenant B não deve visualizar as automações do Tenant A (lista isolada)', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/automations')
      .set('Authorization', `Bearer ${tenantB_token}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.find((a: any) => a.id === tenantA_automationId)).toBeUndefined();
  });

  it('Tenant B não deve conseguir acessar, alterar ou pausar a automação do Tenant A (404)', async () => {
    await request(app.getHttpServer())
      .get(`/api/automations/${tenantA_automationId}`)
      .set('Authorization', `Bearer ${tenantB_token}`)
      .expect(404);

    await request(app.getHttpServer())
      .put(`/api/automations/${tenantA_automationId}`)
      .set('Authorization', `Bearer ${tenantB_token}`)
      .send({ name: 'Nome Invasor' })
      .expect(404);

    await request(app.getHttpServer())
      .patch(`/api/automations/${tenantA_automationId}/pause`)
      .set('Authorization', `Bearer ${tenantB_token}`)
      .expect(404);

    await request(app.getHttpServer())
      .post(`/api/automations/${tenantA_automationId}/execute-now`)
      .set('Authorization', `Bearer ${tenantB_token}`)
      .expect(404);

    await request(app.getHttpServer())
      .get(`/api/automations/${tenantA_automationId}/executions`)
      .set('Authorization', `Bearer ${tenantB_token}`)
      .expect(404);

    await request(app.getHttpServer())
      .delete(`/api/automations/${tenantA_automationId}`)
      .set('Authorization', `Bearer ${tenantB_token}`)
      .expect(404);
  });
});
