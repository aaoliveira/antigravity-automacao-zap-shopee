import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/modules/database/prisma.service';
import { ExecutionStatus, PublicationStatus } from '@prisma/client';

describe('Dashboard & History e2e Tests', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let tenantA_token = '';
  let tenantA_id = '';
  let tenantA_automationId = '';
  let tenantA_executionId = '';

  let tenantB_token = '';
  let tenantB_id = '';

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

    // 1. Cadastra Tenant A
    const resA = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        name: 'Gestor Dash A',
        email: `tenantA-dash-${Date.now()}@teste.com`,
        password: 'Password123!',
        tenantName: 'Tenant Dashboard A',
      });
    tenantA_token = resA.body.data.accessToken;
    tenantA_id = resA.body.data.tenant.id;

    // 2. Cadastra Tenant B
    const resB = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        name: 'Gestor Dash B',
        email: `tenantB-dash-${Date.now()}@teste.com`,
        password: 'Password123!',
        tenantName: 'Tenant Dashboard B',
      });
    tenantB_token = resB.body.data.accessToken;
    tenantB_id = resB.body.data.tenant.id;

    // 3. Cria recursos para Tenant A no banco
    const cred = await prisma.shopeeCredential.create({
      data: {
        tenantId: tenantA_id,
        label: 'Credencial Dash',
        appId: '10928099',
        appSecretEncrypted: 'iv:cipher:tag',
        appSecretMasked: '************9988',
        isValid: true,
      },
    });

    const srv = await prisma.evolutionServer.create({
      data: {
        tenantId: tenantA_id,
        name: 'Servidor Dash',
        baseUrl: 'https://evolution.teste.com',
        apiKeyEncrypted: 'iv:cipher:tag',
        apiKeyMasked: '************9988',
      },
    });

    const inst = await prisma.whatsAppInstance.create({
      data: {
        tenantId: tenantA_id,
        serverId: srv.id,
        instanceName: `inst-dash-${Date.now()}`,
        displayName: 'WhatsApp Dash A',
        status: 'CONNECTED',
      },
    });

    const group = await prisma.whatsAppGroup.create({
      data: {
        tenantId: tenantA_id,
        instanceId: inst.id,
        jid: '1203630009@g.us',
        name: 'Grupo Dash A',
      },
    });

    const nextDate = new Date();
    nextDate.setHours(nextDate.getHours() + 1);

    const auto = await prisma.automation.create({
      data: {
        tenantId: tenantA_id,
        instanceId: inst.id,
        shopeeCredentialId: cred.id,
        name: 'Automação Dash Teste',
        status: 'ACTIVE',
        frequencyMinutes: 60,
        nextExecutionAt: nextDate,
      },
    });
    tenantA_automationId = auto.id;

    // Cria uma execução histórica com snapshot e publicações
    const exec = await prisma.automationExecution.create({
      data: {
        tenantId: tenantA_id,
        automationId: auto.id,
        status: ExecutionStatus.SUCCESS,
        totalDestinations: 1,
        successCount: 1,
        failureCount: 0,
        productSnapshot: {
          create: {
            shopeeItemId: 'PROD_DASH_1',
            title: 'Headset Gamer Pro RGB',
            price: 199.9,
            imageUrl: 'https://img.shopee.com/headset.jpg',
            productUrl: 'https://shopee.com.br/product/1/2',
          },
        },
        affiliateLink: {
          create: {
            originalUrl: 'https://shopee.com.br/product/1/2',
            shortLink: 'https://shope.ee/dashHeadset',
          },
        },
        publications: {
          create: {
            groupId: group.id,
            status: PublicationStatus.SUCCESS,
            evolutionMessageId: 'EVO_DASH_MSG_01',
          },
        },
      },
    });
    tenantA_executionId = exec.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  it('GET /api/dashboard/summary deve retornar contadores reais e recentes do Tenant A (200)', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/dashboard/summary')
      .set('Authorization', `Bearer ${tenantA_token}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.automations.active).toBe(1);
    expect(res.body.data.instances.connected).toBe(1);
    expect(res.body.data.publications.success).toBe(1);
    expect(res.body.data.recentExecutions).toHaveLength(1);
    expect(res.body.data.recentExecutions[0].productSnapshot.title).toBe('Headset Gamer Pro RGB');
  });

  it('GET /api/dashboard/upcoming deve retornar próximas execuções do Tenant A (200)', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/dashboard/upcoming')
      .set('Authorization', `Bearer ${tenantA_token}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].id).toBe(tenantA_automationId);
  });

  it('GET /api/history/executions deve retornar lista paginada do histórico (200)', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/history/executions')
      .set('Authorization', `Bearer ${tenantA_token}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.total).toBe(1);
    expect(res.body.data.items[0].id).toBe(tenantA_executionId);
    expect(res.body.data.items[0].publications).toHaveLength(1);
  });

  it('GET /api/history/executions/:id deve retornar detalhes da execução (200)', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/history/executions/${tenantA_executionId}`)
      .set('Authorization', `Bearer ${tenantA_token}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe(tenantA_executionId);
    expect(res.body.data.productSnapshot.shopeeItemId).toBe('PROD_DASH_1');
  });

  // Testes de Isolamento Multi-Tenant (Tenant B)
  it('Tenant B deve receber dados vazios no dashboard e histórico (200)', async () => {
    const resDash = await request(app.getHttpServer())
      .get('/api/dashboard/summary')
      .set('Authorization', `Bearer ${tenantB_token}`)
      .expect(200);

    expect(resDash.body.data.automations.active).toBe(0);
    expect(resDash.body.data.recentExecutions).toHaveLength(0);

    const resHist = await request(app.getHttpServer())
      .get('/api/history/executions')
      .set('Authorization', `Bearer ${tenantB_token}`)
      .expect(200);

    expect(resHist.body.data.total).toBe(0);
    expect(resHist.body.data.items).toHaveLength(0);
  });

  it('Tenant B não pode acessar detalhes da execução do Tenant A (404)', async () => {
    await request(app.getHttpServer())
      .get(`/api/history/executions/${tenantA_executionId}`)
      .set('Authorization', `Bearer ${tenantB_token}`)
      .expect(404);
  });
});
