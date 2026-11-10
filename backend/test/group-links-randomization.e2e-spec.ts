import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/modules/database/prisma.service';
import { ShopeeClientService } from '../src/modules/shopee/shopee.client';
import { EvolutionClient } from '../src/modules/evolution/evolution.client';
import { AutomationsExecutorService } from '../src/modules/automations/automations-executor.service';
import { InstanceStatus, ExecutionStatus } from '@prisma/client';

describe('Group Permanent Links & Dispatch Randomization (E2E)', () => {
  jest.setTimeout(30000);

  let app: INestApplication;
  let prisma: PrismaService;
  let shopeeClient: ShopeeClientService;
  let evolutionClient: EvolutionClient;
  let executorService: AutomationsExecutorService;

  let tenantA_token = '';
  let tenantA_id = '';
  let tenantA_shopeeCredId = '';
  let tenantA_instanceId = '';
  let tenantA_g1Id = '';
  let tenantA_g2Id = '';
  let tenantA_g3Id = '';
  let linkId = '';
  let linkSlug = '';

  let tenantB_token = '';
  let tenantB_id = '';
  let tenantB_groupId = '';
  let tenantB_shopeeCredId = '';
  let tenantB_instanceId = '';

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

    jest.spyOn(shopeeClient, 'testConnectivity').mockResolvedValue(true);
    jest.spyOn(evolutionClient, 'pingServer').mockResolvedValue({
      success: true,
      message: 'OK',
    });
    jest.spyOn(evolutionClient, 'createInstance').mockResolvedValue({
      instance: {
        instanceName: 'zap-links-test',
        status: 'created',
        integration: 'WHATSAPP-BAILEYS',
      },
    });
    jest.spyOn(evolutionClient, 'getGroupInviteCode').mockResolvedValue(null);
    jest.spyOn(evolutionClient, 'findGroupInfos').mockResolvedValue(null);
    jest.spyOn(evolutionClient, 'sendMedia').mockResolvedValue({
      key: { id: 'MSG_RANDOM_LINK_01', remoteJid: '1203630001@g.us' },
      status: 'PENDING',
    });

    const ts = Date.now();
    linkSlug = `clube-vip-${ts}`;

    // Tenant A Setup
    const resA = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        name: 'Afiliado A',
        email: `afiliadoA-links-${ts}@teste.com`,
        password: 'Password123!',
        tenantName: 'Tenant Links A',
      });
    tenantA_token = resA.body.data.accessToken;
    tenantA_id = resA.body.data.tenant.id;

    const credA = await request(app.getHttpServer())
      .post('/api/shopee-credentials')
      .set('Authorization', `Bearer ${tenantA_token}`)
      .send({
        label: 'Shopee A',
        appId: '2001001',
        appSecret: 'secret_links_a',
      });
    tenantA_shopeeCredId = credA.body.data.id;

    const srvA = await request(app.getHttpServer())
      .post('/api/evolution-servers')
      .set('Authorization', `Bearer ${tenantA_token}`)
      .send({
        name: 'Evolution A',
        baseUrl: 'https://evo-links-a.minhaempresa.com',
        apiKey: 'evo_key_links_a',
      });

    const instA = await request(app.getHttpServer())
      .post('/api/whatsapp-instances')
      .set('Authorization', `Bearer ${tenantA_token}`)
      .send({
        serverId: srvA.body.data.id,
        instanceName: `inst-links-a-${ts}`,
        displayName: 'Zap A',
      });
    tenantA_instanceId = instA.body.data.id;

    await prisma.whatsAppInstance.update({
      where: { id: tenantA_instanceId },
      data: { status: InstanceStatus.CONNECTED },
    });

    const g1 = await prisma.whatsAppGroup.create({
      data: {
        tenantId: tenantA_id,
        instanceId: tenantA_instanceId,
        jid: `1203630101-${ts}@g.us`,
        name: 'Grupo VIP #1 (Lotado)',
        participantCount: 5,
        maxParticipants: 5,
        inviteUrl: 'https://chat.whatsapp.com/GroupOneInvite01',
      },
    });
    tenantA_g1Id = g1.id;

    const g2 = await prisma.whatsAppGroup.create({
      data: {
        tenantId: tenantA_id,
        instanceId: tenantA_instanceId,
        jid: `1203630102-${ts}@g.us`,
        name: 'Grupo VIP #2 (Mais Vazio)',
        participantCount: 1,
        maxParticipants: 5,
        inviteUrl: 'https://chat.whatsapp.com/GroupTwoInvite02',
      },
    });
    tenantA_g2Id = g2.id;

    const g3 = await prisma.whatsAppGroup.create({
      data: {
        tenantId: tenantA_id,
        instanceId: tenantA_instanceId,
        jid: `1203630103-${ts}@g.us`,
        name: 'Grupo VIP #3 (Médio)',
        participantCount: 3,
        maxParticipants: 5,
        inviteUrl: 'https://chat.whatsapp.com/GroupThreeInvite',
      },
    });
    tenantA_g3Id = g3.id;

    // Tenant B Setup
    const resB = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        name: 'Afiliado B',
        email: `afiliadoB-links-${ts}@teste.com`,
        password: 'Password123!',
        tenantName: 'Tenant Links B',
      });
    tenantB_token = resB.body.data.accessToken;
    tenantB_id = resB.body.data.tenant.id;

    const credB = await request(app.getHttpServer())
      .post('/api/shopee-credentials')
      .set('Authorization', `Bearer ${tenantB_token}`)
      .send({
        label: 'Shopee B',
        appId: '2001002',
        appSecret: 'secret_links_b',
      });
    tenantB_shopeeCredId = credB.body.data.id;

    const srvB = await request(app.getHttpServer())
      .post('/api/evolution-servers')
      .set('Authorization', `Bearer ${tenantB_token}`)
      .send({
        name: 'Evolution B',
        baseUrl: 'https://evo-links-b.minhaempresa.com',
        apiKey: 'evo_key_links_b',
      });

    const instB = await request(app.getHttpServer())
      .post('/api/whatsapp-instances')
      .set('Authorization', `Bearer ${tenantB_token}`)
      .send({
        serverId: srvB.body.data.id,
        instanceName: `inst-links-b-${ts}`,
        displayName: 'Zap B',
      });
    tenantB_instanceId = instB.body.data.id;

    const gB = await prisma.whatsAppGroup.create({
      data: {
        tenantId: tenantB_id,
        instanceId: tenantB_instanceId,
        jid: `1203630999-${ts}@g.us`,
        name: 'Grupo Exclusivo Tenant B',
        participantCount: 2,
        maxParticipants: 100,
        inviteUrl: 'https://chat.whatsapp.com/TenantBInvite01',
      },
    });
    tenantB_groupId = gB.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  it('SEGURANÇA: deve bloquear Open Redirect (URL fora do chat.whatsapp.com) com 400', async () => {
    await request(app.getHttpServer())
      .post('/api/group-links')
      .set('Authorization', `Bearer ${tenantA_token}`)
      .send({
        name: 'Link Phishing',
        slug: `phish-${Date.now()}`,
        strategy: 'LEAST_FILLED',
        maxParticipants: 100,
        targets: [
          {
            groupId: tenantA_g1Id,
            inviteUrl: 'https://evil-site.com/redirect',
          },
        ],
      })
      .expect(400);
  });

  it('MULTI-TENANCY: Tenant A não pode vincular grupo de Tenant B em seu link permanente (400)', async () => {
    await request(app.getHttpServer())
      .post('/api/group-links')
      .set('Authorization', `Bearer ${tenantA_token}`)
      .send({
        name: 'Link Cruzado',
        slug: `cruzado-${Date.now()}`,
        strategy: 'LEAST_FILLED',
        maxParticipants: 100,
        targets: [{ groupId: tenantB_groupId }],
      })
      .expect(400);
  });

  it('Deve criar Link Permanente e redirecionar (302) automaticamente para o grupo mais vazio ignorando o lotado', async () => {
    const createRes = await request(app.getHttpServer())
      .post('/api/group-links')
      .set('Authorization', `Bearer ${tenantA_token}`)
      .send({
        name: 'Clube Oficial <script>alert(1)</script>',
        slug: linkSlug,
        strategy: 'LEAST_FILLED',
        maxParticipants: 5,
        currentGroupId: tenantA_g1Id,
        targets: [
          { groupId: tenantA_g1Id, priority: 0 },
          { groupId: tenantA_g2Id, priority: 1 },
          { groupId: tenantA_g3Id, priority: 2 },
        ],
      })
      .expect(201);

    expect(createRes.body.success).toBe(true);
    linkId = createRes.body.data.id;

    // Grupo 1 está com 5/5 (lotado), Grupo 3 tem 3/5, Grupo 2 tem 1/5 (mais vazio).
    // Rota pública GET /api/join/:slug deve redirecionar via HTTP 302 para Grupo 2!
    const redirectRes = await request(app.getHttpServer())
      .get(`/api/join/${linkSlug}`)
      .expect(302);

    expect(redirectRes.headers.location).toBe(
      'https://chat.whatsapp.com/GroupTwoInvite02',
    );

    const resolveRes = await request(app.getHttpServer())
      .get(`/api/join/${linkSlug}/resolve`)
      .expect(200);

    expect(resolveRes.body.data.available).toBe(true);
    expect(resolveRes.body.data.groupName).toBe('Grupo VIP #2 (Mais Vazio)');
    expect(resolveRes.body.data.participantCount).toBe(1);
  });

  it('MULTI-TENANCY: Tenant B NÃO consegue ler, editar ou excluir link do Tenant A (404)', async () => {
    await request(app.getHttpServer())
      .get(`/api/group-links/${linkId}`)
      .set('Authorization', `Bearer ${tenantB_token}`)
      .expect(404);

    await request(app.getHttpServer())
      .put(`/api/group-links/${linkId}`)
      .set('Authorization', `Bearer ${tenantB_token}`)
      .send({ name: 'Hackeado B' })
      .expect(404);

    await request(app.getHttpServer())
      .delete(`/api/group-links/${linkId}`)
      .set('Authorization', `Bearer ${tenantB_token}`)
      .expect(404);
  });

  it('Deve permitir trocar grupo de destino mantendo a mesma URL permanente e fazer failover automático ao lotar', async () => {
    // 1. Troca manualmente para o Grupo 3 sem alterar o slug
    await request(app.getHttpServer())
      .put(`/api/group-links/${linkId}`)
      .set('Authorization', `Bearer ${tenantA_token}`)
      .send({
        strategy: 'MANUAL_WITH_FALLBACK',
        currentGroupId: tenantA_g3Id,
      })
      .expect(200);

    const manualRedirect = await request(app.getHttpServer())
      .get(`/api/join/${linkSlug}`)
      .expect(302);

    expect(manualRedirect.headers.location).toBe(
      'https://chat.whatsapp.com/GroupThreeInvite',
    );

    // 2. Evolution API passa a reportar Grupo 3 com 5/5 (lotado) e Grupo 2 com 2/5
    jest
      .spyOn(evolutionClient, 'findGroupInfos')
      .mockImplementation(async (_url, _key, _inst, jid) => {
        if (jid.includes('1203630101')) return { id: jid, subject: 'G1', size: 5 };
        if (jid.includes('1203630102')) return { id: jid, subject: 'G2', size: 2 };
        if (jid.includes('1203630103')) return { id: jid, subject: 'G3', size: 5 };
        return null;
      });

    await request(app.getHttpServer())
      .post(`/api/group-links/${linkId}/sync`)
      .set('Authorization', `Bearer ${tenantA_token}`)
      .expect(200);

    // Mesmo em MANUAL_WITH_FALLBACK, ao detectar que G3 lotou, deve redirecionar automaticamente para G2
    const failoverRedirect = await request(app.getHttpServer())
      .get(`/api/join/${linkSlug}`)
      .expect(302);

    expect(failoverRedirect.headers.location).toBe(
      'https://chat.whatsapp.com/GroupTwoInvite02',
    );
  });

  it('Deve retornar 409 com HTML escapado (anti-XSS) quando todos os grupos do link estiverem lotados', async () => {
    jest
      .spyOn(evolutionClient, 'findGroupInfos')
      .mockResolvedValue({ id: 'any', subject: 'Full', size: 5 });

    await request(app.getHttpServer())
      .post(`/api/group-links/${linkId}/sync`)
      .set('Authorization', `Bearer ${tenantA_token}`)
      .expect(200);

    const conflictRes = await request(app.getHttpServer())
      .get(`/api/join/${linkSlug}`)
      .expect(409);

    expect(conflictRes.text).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(conflictRes.text).not.toContain('<script>alert(1)</script>');

    // Restaura ocupação do Grupo 2 para testes seguintes
    jest.spyOn(evolutionClient, 'findGroupInfos').mockResolvedValue(null);
    await prisma.whatsAppGroup.update({
      where: { id: tenantA_g2Id },
      data: { participantCount: 1 },
    });
  });

  it('DISPARO RANDOMIZADO + {link_grupo}: deve rejeitar vínculo cross-tenant e executar disparo RANDOM_SINGLE com URL permanente', async () => {
    // Bloqueia Tenant B de usar o groupRedirectLinkId de Tenant A
    const crossAutoRes = await request(app.getHttpServer())
      .post('/api/automations')
      .set('Authorization', `Bearer ${tenantB_token}`)
      .send({
        name: 'Automação Indevida B',
        shopeeCredentialId: tenantB_shopeeCredId,
        instanceId: tenantB_instanceId,
        groupIds: [tenantB_groupId],
        keywords: ['fone'],
        frequencyMinutes: 60,
        windowStartTime: '08:00',
        windowEndTime: '22:00',
        groupRedirectLinkId: linkId,
      })
      .expect(400);

    expect(JSON.stringify(crossAutoRes.body)).toMatch(/Link permanente/i);

    // Cria automação válida para Tenant A com estratégia RANDOM_SINGLE e caption contendo {link_grupo}
    const createAuto = await request(app.getHttpServer())
      .post('/api/automations')
      .set('Authorization', `Bearer ${tenantA_token}`)
      .send({
        name: 'Campanha Randomizada VIP',
        shopeeCredentialId: tenantA_shopeeCredId,
        instanceId: tenantA_instanceId,
        groupIds: [tenantA_g1Id, tenantA_g2Id],
        keywords: ['smartwatch'],
        frequencyMinutes: 60,
        windowStartTime: '00:00',
        windowEndTime: '23:59',
        jitterSeconds: 0,
        dispatchStrategy: 'RANDOM_SINGLE',
        groupRedirectLinkId: linkId,
        captionTemplate:
          '🔥 {titulo}\n💰 {preco}\n🔗 Compre: {link_afiliado}\n📲 Entre no VIP: {link_grupo}',
      })
      .expect(201);

    expect(createAuto.body.data.dispatchStrategy).toBe('RANDOM_SINGLE');
    expect(createAuto.body.data.groupRedirectLinkId).toBe(linkId);
    const automationId = createAuto.body.data.id;

    jest.spyOn(shopeeClient, 'searchProducts').mockResolvedValue({
      products: [
        {
          itemId: `PROD_RAND_${Date.now()}`,
          title: 'Relógio Smartwatch AMOLED',
          productUrl: 'https://shopee.com.br/product/111/222',
          imageUrl: 'https://down-br.img.susercontent.com/file/watch.jpg',
          price: 189.9,
          originalPrice: 249.9,
          commissionRate: 0.1,
        },
      ],
      pageInfo: { page: 1, limit: 20, hasNextPage: false },
    });
    jest
      .spyOn(shopeeClient, 'generateShortLink')
      .mockResolvedValue('https://shope.ee/watchLink');

    const sendMediaSpy = jest.spyOn(evolutionClient, 'sendMedia');
    sendMediaSpy.mockClear();

    const execResult = await executorService.execute(
      automationId,
      tenantA_id,
      true,
    );

    expect(execResult.success).toBe(true);
    expect(execResult.status).toBe(ExecutionStatus.SUCCESS);

    const execRecord = await prisma.automationExecution.findUnique({
      where: { id: execResult.executionId },
      include: { publications: true },
    });

    // RANDOM_SINGLE deve sortear exatamente 1 destino mesmo com 2 grupos configurados
    expect(execRecord?.totalDestinations).toBe(1);
    expect(execRecord?.successCount).toBe(1);
    expect(execRecord?.publications).toHaveLength(1);

    // Legenda enviada à Evolution API deve conter o link permanente /join/:slug
    expect(sendMediaSpy).toHaveBeenCalledTimes(1);
    const sentCaption = sendMediaSpy.mock.calls[0][3].caption;
    expect(sentCaption).toContain(`/join/${linkSlug}`);
    expect(sentCaption).toContain('https://shope.ee/watchLink');
  });
});
