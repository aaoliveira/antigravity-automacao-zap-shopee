import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/modules/database/prisma.service';
import { MercadoLivreClient } from '../src/modules/mercadolivre/mercadolivre.client';
import { EvolutionClient } from '../src/modules/evolution/evolution.client';
import { AutomationsExecutorService } from '../src/modules/automations/automations-executor.service';
import { ExecutionStatus, InstanceStatus } from '@prisma/client';

describe('Feature Flags & Mercado Livre Hybrid Integration (E2E)', () => {
  jest.setTimeout(30000);

  let app: INestApplication;
  let prisma: PrismaService;
  let mlClient: MercadoLivreClient;
  let evolutionClient: EvolutionClient;
  let executorService: AutomationsExecutorService;

  let tenantA_token = '';
  let tenantA_id = '';
  let tenantA_instanceId = '';
  let tenantA_groupId = '';
  let tenantA_mlAccountId = '';

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
    mlClient = app.get(MercadoLivreClient);
    evolutionClient = app.get(EvolutionClient);
    executorService = app.get(AutomationsExecutorService);

    jest.spyOn(evolutionClient, 'pingServer').mockResolvedValue({
      success: true,
      message: 'OK',
    });
    jest.spyOn(evolutionClient, 'createInstance').mockResolvedValue({
      instance: {
        instanceName: 'zap-ml-test',
        status: 'created',
        integration: 'WHATSAPP-BAILEYS',
      },
    });
    jest.spyOn(evolutionClient, 'sendMedia').mockResolvedValue({
      key: { id: 'MSG_ML_01', remoteJid: '1203630999@g.us' },
      status: 'PENDING',
    });

    const ts = Date.now();

    // Registra Tenant A
    const resA = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        name: 'Afiliado ML A',
        email: `mlA-${ts}@teste.com`,
        password: 'Password123!',
        tenantName: 'Tenant ML A',
      })
      .expect(201);

    tenantA_token = resA.body.data.accessToken;
    tenantA_id = resA.body.data.tenant.id;

    // Registra Tenant B
    const resB = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        name: 'Afiliado ML B',
        email: `mlB-${ts}@teste.com`,
        password: 'Password123!',
        tenantName: 'Tenant ML B',
      })
      .expect(201);

    tenantB_token = resB.body.data.accessToken;
    tenantB_id = resB.body.data.tenant.id;

    // Cria servidor, instância e grupo WhatsApp para Tenant A
    const srvA = await request(app.getHttpServer())
      .post('/api/evolution-servers')
      .set('Authorization', `Bearer ${tenantA_token}`)
      .send({
        name: 'Evo ML A',
        baseUrl: 'https://evo-ml.example.com',
        apiKey: 'evo-key-ml-1234',
      })
      .expect(201);

    const instA = await request(app.getHttpServer())
      .post('/api/whatsapp-instances')
      .set('Authorization', `Bearer ${tenantA_token}`)
      .send({
        serverId: srvA.body.data.id,
        instanceName: `zap-ml-a-${ts}`,
        displayName: 'Zap ML A',
      })
      .expect(201);
    tenantA_instanceId = instA.body.data.id;

    await prisma.whatsAppInstance.update({
      where: { id: tenantA_instanceId },
      data: { status: InstanceStatus.CONNECTED },
    });

    const grpA = await prisma.whatsAppGroup.create({
      data: {
        tenantId: tenantA_id,
        instanceId: tenantA_instanceId,
        jid: `1203630999-${ts}@g.us`,
        name: 'Ofertas Mercado Livre VIP',
        participantCount: 42,
        isActive: true,
      },
    });
    tenantA_groupId = grpA.id;
  });

  afterAll(async () => {
    await prisma.publication.deleteMany({
      where: { groupId: tenantA_groupId },
    });
    await prisma.automationExecution.deleteMany({
      where: { tenantId: { in: [tenantA_id, tenantB_id] } },
    });
    await prisma.automation.deleteMany({
      where: { tenantId: { in: [tenantA_id, tenantB_id] } },
    });
    await prisma.tenant.deleteMany({
      where: { id: { in: [tenantA_id, tenantB_id] } },
    });
    await prisma.$disconnect();
    await app.close();
  });

  it('Feature Flags padrão devem iniciar com Alternativa B=true e Alternativa A=false', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/feature-flags')
      .set('Authorization', `Bearer ${tenantA_token}`)
      .expect(200);

    expect(res.body.data.flags).toEqual({
      ml_alternative_b_enabled: true,
      ml_alternative_a_enabled: false,
    });

    // Como Alternativa A começa desabilitada, rotas A retornam 403
    await request(app.getHttpServer())
      .get('/api/mercadolivre/search?keyword=fone')
      .set('Authorization', `Bearer ${tenantA_token}`)
      .expect(403);
  });

  it('Alternativa B: salva tag e cookies criptografados, bloqueia SSRF, pareia extensão e respeita toggle', async () => {
    // Bloqueia gateway interno SSRF
    await request(app.getHttpServer())
      .post('/api/mercadolivre/prototype/config')
      .set('Authorization', `Bearer ${tenantA_token}`)
      .send({
        affiliateTag: 'azevedoalexandre39',
        partnerGatewayUrl: 'http://127.0.0.1:9000/internal',
      })
      .expect(400);

    // Salva config estilo protótipo
    const saveRes = await request(app.getHttpServer())
      .post('/api/mercadolivre/prototype/config')
      .set('Authorization', `Bearer ${tenantA_token}`)
      .send({
        affiliateTag: 'azevedoalexandre39',
        sessionCookie: 'orguserid=111222; ssid=sessionsecreta999; orguseridp=xyz789',
      })
      .expect(201);

    const acc = saveRes.body.data;
    tenantA_mlAccountId = acc.id;
    expect(acc.affiliateTag).toBe('azevedoalexandre39');
    expect(acc.isCookieConnected).toBe(true);
    expect(acc.cookieDaysRemaining).toBe(14);
    expect(acc.sessionCookieMasked).toContain('****');
    expect(acc.sessionCookieEncrypted).toBeUndefined();

    // Testa conversão honesta (sem gateway homologado -> OFFICIAL_CONTRACT_REQUIRED)
    const testRes = await request(app.getHttpServer())
      .post('/api/mercadolivre/prototype/test-conversion')
      .set('Authorization', `Bearer ${tenantA_token}`)
      .send({
        accountId: tenantA_mlAccountId,
        url: 'https://www.mercadolivre.com.br/p/MLB123456',
      })
      .expect(200);

    expect(testRes.body.data.converted).toBe(false);
    expect(testRes.body.data.status).toBe('OFFICIAL_CONTRACT_REQUIRED');

    // Pareamento via token HMAC
    const pairRes = await request(app.getHttpServer())
      .post('/api/mercadolivre/prototype/pairing-token')
      .set('Authorization', `Bearer ${tenantA_token}`)
      .send({ accountId: tenantA_mlAccountId })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/mercadolivre/extension/sync')
      .send({
        pairingToken: pairRes.body.data.pairingToken,
        affiliateTag: 'azevedo_synced',
        sessionCookie: 'orguserid=555; ssid=atualizado',
      })
      .expect(200);

    // Desabilita Alternativa B no Tenant A -> bloqueia endpoints B (Tenant B continua com B=true!)
    await request(app.getHttpServer())
      .patch('/api/feature-flags')
      .set('Authorization', `Bearer ${tenantA_token}`)
      .send({ ml_alternative_b_enabled: false })
      .expect(200);

    await request(app.getHttpServer())
      .post('/api/mercadolivre/prototype/test-conversion')
      .set('Authorization', `Bearer ${tenantA_token}`)
      .send({ url: 'https://www.mercadolivre.com.br/p/MLB123456' })
      .expect(403);

    // Tenant B isolado mantém defaults (B=true, A=false)
    const flagsB = await request(app.getHttpServer())
      .get('/api/feature-flags')
      .set('Authorization', `Bearer ${tenantB_token}`)
      .expect(200);
    expect(flagsB.body.data.flags.ml_alternative_b_enabled).toBe(true);

    // Reabilita B no Tenant A
    await request(app.getHttpServer())
      .patch('/api/feature-flags')
      .set('Authorization', `Bearer ${tenantA_token}`)
      .send({ ml_alternative_b_enabled: true })
      .expect(200);
  });

  it('Alternativa A + Automação ML + Cupom Mercado Livre: fluxo ponta a ponta e isolamento multi-tenant', async () => {
    // Ativa Alternativa A no Tenant A
    await request(app.getHttpServer())
      .patch('/api/feature-flags')
      .set('Authorization', `Bearer ${tenantA_token}`)
      .send({ ml_alternative_a_enabled: true })
      .expect(200);

    // Salva credenciais OAuth oficiais
    await request(app.getHttpServer())
      .post('/api/mercadolivre/oauth/credentials')
      .set('Authorization', `Bearer ${tenantA_token}`)
      .send({
        accountId: tenantA_mlAccountId,
        appId: '778899001122',
        clientSecret: 'ml-client-secret-top',
        redirectUri: 'https://app.shopeezap.local/mercadolivre',
      })
      .expect(201);

    const authUrlRes = await request(app.getHttpServer())
      .get(`/api/mercadolivre/oauth/authorize-url?accountId=${tenantA_mlAccountId}`)
      .set('Authorization', `Bearer ${tenantA_token}`)
      .expect(200);

    const { authorizationUrl, state } = authUrlRes.body.data;
    expect(authorizationUrl).toContain('https://auth.mercadolivre.com.br/authorization');

    jest.spyOn(mlClient, 'exchangeCodeForToken').mockResolvedValueOnce({
      access_token: 'APP_USR-ml-token-1',
      refresh_token: 'TG-ml-refresh-1',
      expires_in: 21600,
      token_type: 'bearer',
      scope: 'read write offline_access',
      user_id: 445566,
    });
    jest.spyOn(mlClient, 'getUserProfile').mockResolvedValueOnce({
      id: '445566',
      nickname: 'OFERTAS_BR_ML',
    });

    const exRes = await request(app.getHttpServer())
      .post('/api/mercadolivre/oauth/exchange')
      .set('Authorization', `Bearer ${tenantA_token}`)
      .send({
        accountId: tenantA_mlAccountId,
        code: 'TG-oauth-code-123',
        state,
      })
      .expect(200);

    expect(exRes.body.data.isOAuthConnected).toBe(true);
    expect(exRes.body.data.mlNickname).toBe('OFERTAS_BR_ML');

    // Busca oficial /sites/MLB/search (mocked HTTP)
    jest.spyOn(mlClient, 'searchProductsMLB').mockResolvedValueOnce([
      {
        mlItemId: 'MLB99887766',
        title: 'Fone Bluetooth TWS Samsung Galaxy Buds',
        price: 199.9,
        originalPrice: 299.9,
        imageUrl: 'https://http2.mlstatic.com/D_NQ_NP_buds.jpg',
        permalink: 'https://produto.mercadolivre.com.br/MLB-99887766',
        sellerName: 'Loja Oficial Samsung',
        condition: 'new',
      },
    ]);

    const searchRes = await request(app.getHttpServer())
      .get('/api/mercadolivre/search?keyword=fone')
      .set('Authorization', `Bearer ${tenantA_token}`)
      .expect(200);

    expect(searchRes.body.data.items).toHaveLength(1);
    expect(searchRes.body.data.items[0].sellerName).toBe('Loja Oficial Samsung');

    // Rejeita link externo não-ML na criação da oferta
    await request(app.getHttpServer())
      .post('/api/mercadolivre/offers')
      .set('Authorization', `Bearer ${tenantA_token}`)
      .send({
        accountId: tenantA_mlAccountId,
        title: 'Oferta Inválida',
        price: 50,
        imageUrl: 'https://http2.mlstatic.com/x.jpg',
        originalUrl: 'https://produto.mercadolivre.com.br/MLB-1',
        affiliateShortUrl: 'https://malicious.site/redirect',
      })
      .expect(400);

    // Importa oferta oficial meli.la
    const offerRes = await request(app.getHttpServer())
      .post('/api/mercadolivre/offers')
      .set('Authorization', `Bearer ${tenantA_token}`)
      .send({
        accountId: tenantA_mlAccountId,
        mlItemId: 'MLB99887766',
        title: 'Fone Bluetooth TWS Samsung Galaxy Buds',
        price: 199.9,
        originalPrice: 299.9,
        imageUrl: 'https://http2.mlstatic.com/D_NQ_NP_buds.jpg',
        originalUrl: 'https://produto.mercadolivre.com.br/MLB-99887766',
        affiliateShortUrl: 'https://meli.la/2offerOK',
        sellerName: 'Loja Oficial Samsung',
        keyword: 'fone bluetooth',
      })
      .expect(201);

    const offerId = offerRes.body.data.id;

    // Tenant B (com A ativado também) não consegue deletar oferta do Tenant A
    await request(app.getHttpServer())
      .patch('/api/feature-flags')
      .set('Authorization', `Bearer ${tenantB_token}`)
      .send({ ml_alternative_a_enabled: true })
      .expect(200);

    await request(app.getHttpServer())
      .delete(`/api/mercadolivre/offers/${offerId}`)
      .set('Authorization', `Bearer ${tenantB_token}`)
      .expect(404);

    // Cria cupom específico MERCADO_LIVRE com restrição de vendedor
    await request(app.getHttpServer())
      .post('/api/coupons')
      .set('Authorization', `Bearer ${tenantA_token}`)
      .send({
        platform: 'MERCADO_LIVRE',
        code: 'MLSAMSU15',
        discountType: 'FIXED_AMOUNT',
        discountValue: 15,
        minProductPrice: 100,
        sellerRestriction: 'Loja Oficial Samsung',
      })
      .expect(201);

    // Cria automação Mercado Livre e executa manualmente
    const autoRes = await request(app.getHttpServer())
      .post('/api/automations')
      .set('Authorization', `Bearer ${tenantA_token}`)
      .send({
        platform: 'MERCADO_LIVRE',
        name: 'Campanha ML Fones',
        instanceId: tenantA_instanceId,
        mercadoLivreAccountId: tenantA_mlAccountId,
        keywords: ['fone bluetooth'],
        groupIds: [tenantA_groupId],
        captionTemplate:
          '*{titulo}*\nDe {preco}\nCupom: {cupom} ({cupom_desconto})\nCom cupom: R$ {preco_com_cupom}\nCompre: {link_afiliado}',
      })
      .expect(201);

    const execResult = await executorService.execute(
      autoRes.body.data.id,
      tenantA_id,
      true,
    );

    expect(execResult.success).toBe(true);
    expect(execResult.status).toBe(ExecutionStatus.SUCCESS);

    const lastSendCall = (evolutionClient.sendMedia as jest.Mock).mock.calls.at(-1);
    const caption: string = lastSendCall[3].caption;
    expect(caption).toContain('https://meli.la/2offerOK');
    expect(caption).toContain('Cupom: MLSAMSU15');
    expect(caption).toContain('Com cupom: R$ 184,90');

    const dbOffer = await prisma.mercadoLivreOffer.findUnique({
      where: { id: offerId },
    });
    expect(dbOffer?.lastPublishedAt).toBeTruthy();
  });
});
