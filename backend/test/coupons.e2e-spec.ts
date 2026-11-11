import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/modules/database/prisma.service';
import { ShopeeClientService } from '../src/modules/shopee/shopee.client';
import { EvolutionClient } from '../src/modules/evolution/evolution.client';
import { AutomationsExecutorService } from '../src/modules/automations/automations-executor.service';
import { ExecutionStatus, InstanceStatus } from '@prisma/client';

describe('Affiliate Coupons CRUD, Multi-Tenancy & Automation Integration (E2E)', () => {
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
  let tenantA_groupId = '';
  let couponGeralId = '';
  let couponFoneId = '';

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

    jest.spyOn(shopeeClient, 'testConnectivity').mockResolvedValue(true);
    jest.spyOn(evolutionClient, 'pingServer').mockResolvedValue({
      success: true,
      message: 'OK',
    });
    jest.spyOn(evolutionClient, 'createInstance').mockResolvedValue({
      instance: {
        instanceName: 'zap-coupons-test',
        status: 'created',
        integration: 'WHATSAPP-BAILEYS',
      },
    });
    jest.spyOn(evolutionClient, 'sendMedia').mockResolvedValue({
      key: { id: 'MSG_COUPON_01', remoteJid: '1203630777@g.us' },
      status: 'PENDING',
    });

    const ts = Date.now();

    // Tenant A
    const resA = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        name: 'Gestor Cupons A',
        email: `cuponsA-${ts}@teste.com`,
        password: 'Password123!',
        tenantName: 'Tenant Cupons A',
      });
    tenantA_token = resA.body.data.accessToken;
    tenantA_id = resA.body.data.tenant.id;

    const credA = await request(app.getHttpServer())
      .post('/api/shopee-credentials')
      .set('Authorization', `Bearer ${tenantA_token}`)
      .send({
        label: 'Shopee Cupons A',
        appId: '3001001',
        appSecret: 'secret_cupons_a',
      });
    tenantA_shopeeCredId = credA.body.data.id;

    const srvA = await request(app.getHttpServer())
      .post('/api/evolution-servers')
      .set('Authorization', `Bearer ${tenantA_token}`)
      .send({
        name: 'Evolution Cupons A',
        baseUrl: 'https://evo-cupons-a.minhaempresa.com',
        apiKey: 'evo_key_cupons_a',
      });

    const instA = await request(app.getHttpServer())
      .post('/api/whatsapp-instances')
      .set('Authorization', `Bearer ${tenantA_token}`)
      .send({
        serverId: srvA.body.data.id,
        instanceName: `inst-cupons-a-${ts}`,
        displayName: 'Zap Cupons A',
      });
    tenantA_instanceId = instA.body.data.id;

    await prisma.whatsAppInstance.update({
      where: { id: tenantA_instanceId },
      data: { status: InstanceStatus.CONNECTED },
    });

    const grpA = await prisma.whatsAppGroup.create({
      data: {
        tenantId: tenantA_id,
        instanceId: tenantA_instanceId,
        jid: `1203630771-${ts}@g.us`,
        name: 'Grupo Ofertas com Cupom',
      },
    });
    tenantA_groupId = grpA.id;

    // Tenant B
    const resB = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        name: 'Gestor Cupons B',
        email: `cuponsB-${ts}@teste.com`,
        password: 'Password123!',
        tenantName: 'Tenant Cupons B',
      });
    tenantB_token = resB.body.data.accessToken;
    tenantB_id = resB.body.data.tenant.id;

    const credB = await request(app.getHttpServer())
      .post('/api/shopee-credentials')
      .set('Authorization', `Bearer ${tenantB_token}`)
      .send({
        label: 'Shopee Cupons B',
        appId: '3001002',
        appSecret: 'secret_cupons_b',
      });
    tenantB_shopeeCredId = credB.body.data.id;

    const srvB = await request(app.getHttpServer())
      .post('/api/evolution-servers')
      .set('Authorization', `Bearer ${tenantB_token}`)
      .send({
        name: 'Evolution Cupons B',
        baseUrl: 'https://evo-cupons-b.minhaempresa.com',
        apiKey: 'evo_key_cupons_b',
      });

    const instB = await request(app.getHttpServer())
      .post('/api/whatsapp-instances')
      .set('Authorization', `Bearer ${tenantB_token}`)
      .send({
        serverId: srvB.body.data.id,
        instanceName: `inst-cupons-b-${ts}`,
        displayName: 'Zap Cupons B',
      });
    tenantB_instanceId = instB.body.data.id;

    const grpB = await prisma.whatsAppGroup.create({
      data: {
        tenantId: tenantB_id,
        instanceId: tenantB_instanceId,
        jid: `1203630779-${ts}@g.us`,
        name: 'Grupo Isolado B',
      },
    });
    tenantB_groupId = grpB.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  it('GET /api/coupons/platforms deve listar plataformas existentes no sistema (SHOPEE e MERCADO_LIVRE)', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/coupons/platforms')
      .set('Authorization', `Bearer ${tenantA_token}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.map((p: any) => p.id)).toEqual([
      'SHOPEE',
      'MERCADO_LIVRE',
    ]);
  });

  it('CRUD de Cupons: cria, lista, edita, alterna status e valida regras de entrada', async () => {
    // Rejeita código inválido com espaços
    await request(app.getHttpServer())
      .post('/api/coupons')
      .set('Authorization', `Bearer ${tenantA_token}`)
      .send({
        platform: 'SHOPEE',
        code: 'CUPOM INVALIDO',
        discountType: 'PERCENTAGE',
        discountValue: 10,
      })
      .expect(400);

    // Rejeita plataforma inexistente no sistema
    await request(app.getHttpServer())
      .post('/api/coupons')
      .set('Authorization', `Bearer ${tenantA_token}`)
      .send({
        platform: 'AMAZON',
        code: 'AMZ10',
        discountType: 'PERCENTAGE',
        discountValue: 10,
      })
      .expect(400);

    // Cria cupom geral 5%
    const c1 = await request(app.getHttpServer())
      .post('/api/coupons')
      .set('Authorization', `Bearer ${tenantA_token}`)
      .send({
        platform: 'SHOPEE',
        code: 'geral5',
        discountType: 'PERCENTAGE',
        discountValue: 5,
      })
      .expect(201);

    expect(c1.body.data.code).toBe('GERAL5');
    couponGeralId = c1.body.data.id;

    // Cria cupom FONE10 (10% até R$ 20,00, mín R$ 50,00, palavras-chave)
    const futureDate = new Date(Date.now() + 30 * 86400000)
      .toISOString()
      .slice(0, 10);

    const c2 = await request(app.getHttpServer())
      .post('/api/coupons')
      .set('Authorization', `Bearer ${tenantA_token}`)
      .send({
        platform: 'SHOPEE',
        code: 'fone10',
        discountType: 'PERCENTAGE',
        discountValue: 10,
        maxDiscountAmount: 20,
        minProductPrice: 50,
        expiresAt: futureDate,
        productKeywords: ['fone', 'caixa de som', 'headset'],
      })
      .expect(201);

    expect(c2.body.data.code).toBe('FONE10');
    couponFoneId = c2.body.data.id;

    // Lista cupons de Tenant A
    const listRes = await request(app.getHttpServer())
      .get('/api/coupons')
      .set('Authorization', `Bearer ${tenantA_token}`)
      .expect(200);

    expect(listRes.body.data).toHaveLength(2);
    expect(listRes.body.meta.maxLimit).toBe(50);

    // Edita cupom GERAL5 e alterna ativo/inativo
    await request(app.getHttpServer())
      .put(`/api/coupons/${couponGeralId}`)
      .set('Authorization', `Bearer ${tenantA_token}`)
      .send({ minProductPrice: 30 })
      .expect(200);

    const toggleOff = await request(app.getHttpServer())
      .patch(`/api/coupons/${couponGeralId}/toggle`)
      .set('Authorization', `Bearer ${tenantA_token}`)
      .expect(200);
    expect(toggleOff.body.data.isActive).toBe(false);

    const toggleOn = await request(app.getHttpServer())
      .patch(`/api/coupons/${couponGeralId}/toggle`)
      .set('Authorization', `Bearer ${tenantA_token}`)
      .expect(200);
    expect(toggleOn.body.data.isActive).toBe(true);
  });

  it('MULTI-TENANCY: Tenant B não consegue ler, editar, inativar, excluir nem vincular cupom de Tenant A', async () => {
    await request(app.getHttpServer())
      .get(`/api/coupons/${couponFoneId}`)
      .set('Authorization', `Bearer ${tenantB_token}`)
      .expect(404);

    await request(app.getHttpServer())
      .put(`/api/coupons/${couponFoneId}`)
      .set('Authorization', `Bearer ${tenantB_token}`)
      .send({ code: 'HACKED' })
      .expect(404);

    await request(app.getHttpServer())
      .patch(`/api/coupons/${couponFoneId}/toggle`)
      .set('Authorization', `Bearer ${tenantB_token}`)
      .expect(404);

    await request(app.getHttpServer())
      .delete(`/api/coupons/${couponFoneId}`)
      .set('Authorization', `Bearer ${tenantB_token}`)
      .expect(404);

    const crossAuto = await request(app.getHttpServer())
      .post('/api/automations')
      .set('Authorization', `Bearer ${tenantB_token}`)
      .send({
        name: 'Automação Cross Cupom B',
        shopeeCredentialId: tenantB_shopeeCredId,
        instanceId: tenantB_instanceId,
        groupIds: [tenantB_groupId],
        keywords: ['fone'],
        couponId: couponFoneId,
      })
      .expect(400);

    expect(JSON.stringify(crossAuto.body)).toMatch(/cupom/i);
  });

  it('AUTOMAÇÃO COM CUPOM: seleciona o melhor cupom para o produto, substitui variáveis e remove linhas se nenhum servir', async () => {
    const createAuto = await request(app.getHttpServer())
      .post('/api/automations')
      .set('Authorization', `Bearer ${tenantA_token}`)
      .send({
        name: 'Disparo com Cupons Inteligentes',
        shopeeCredentialId: tenantA_shopeeCredId,
        instanceId: tenantA_instanceId,
        groupIds: [tenantA_groupId],
        keywords: ['fone'],
        jitterSeconds: 0,
        windowStartTime: '00:00',
        windowEndTime: '23:59',
        captionTemplate:
          '*{titulo}*\nPor *{preco}*\nCupom: *{{cupom}}*\nDesconto: {{cupom_desconto}}\nCom cupom: *R$ {{preco_com_cupom}}*\nVálido até {{cupom_validade}}\n👉 {link_afiliado}',
      })
      .expect(201);

    const automationId = createAuto.body.data.id;
    const sendMediaSpy = jest.spyOn(evolutionClient, 'sendMedia');

    // Cenário 1: Produto elegível de R$ 149,90 -> escolhe FONE10 (R$ 14,99 > GERAL5 R$ 7,50)
    jest.spyOn(shopeeClient, 'searchProducts').mockResolvedValueOnce({
      products: [
        {
          itemId: `PROD_CP_MATCH_${Date.now()}`,
          title: 'Fone de Ouvido Bluetooth TWS Pro',
          productUrl: 'https://shopee.com.br/product/1/2',
          imageUrl: 'https://down-br.img.susercontent.com/file/fone.jpg',
          price: 149.9,
        },
      ],
      pageInfo: { page: 1, limit: 20, hasNextPage: false },
    });
    jest
      .spyOn(shopeeClient, 'generateShortLink')
      .mockResolvedValueOnce('https://shope.ee/fone10');

    sendMediaSpy.mockClear();
    const resMatch = await executorService.execute(automationId, tenantA_id, true);

    expect(resMatch.success).toBe(true);
    expect(resMatch.status).toBe(ExecutionStatus.SUCCESS);

    const sentCaptionMatch = sendMediaSpy.mock.calls[0][3].caption;
    expect(sentCaptionMatch).toContain('Cupom: *FONE10*');
    expect(sentCaptionMatch).toContain('Desconto: 10% OFF (até R$ 20,00)');
    expect(sentCaptionMatch).toContain('Com cupom: *R$ 134,91*');
    expect(sentCaptionMatch).toContain('Válido até ');

    const execRecord = await prisma.automationExecution.findUnique({
      where: { id: resMatch.executionId },
    });
    expect(execRecord?.appliedCouponCode).toBe('FONE10');

    const updatedCoupon = await prisma.coupon.findUnique({
      where: { id: couponFoneId },
    });
    expect(updatedCoupon?.usageCount).toBe(1);

    // Cenário 2: Produto de R$ 15,00 (abaixo do mínimo de R$ 30 e R$ 50) -> remove linhas com variáveis de cupom
    jest.spyOn(shopeeClient, 'searchProducts').mockResolvedValueOnce({
      products: [
        {
          itemId: `PROD_CP_NOMATCH_${Date.now()}`,
          title: 'Cabo P2 Simples',
          productUrl: 'https://shopee.com.br/product/1/3',
          imageUrl: 'https://down-br.img.susercontent.com/file/cabo.jpg',
          price: 15,
        },
      ],
      pageInfo: { page: 1, limit: 20, hasNextPage: false },
    });
    jest
      .spyOn(shopeeClient, 'generateShortLink')
      .mockResolvedValueOnce('https://shope.ee/cabo15');

    sendMediaSpy.mockClear();
    const resNoMatch = await executorService.execute(automationId, tenantA_id, true);
    expect(resNoMatch.success).toBe(true);

    const sentCaptionNoMatch = sendMediaSpy.mock.calls[0][3].caption;
    expect(sentCaptionNoMatch).toContain('*Cabo P2 Simples*');
    expect(sentCaptionNoMatch).not.toContain('Cupom:');
    expect(sentCaptionNoMatch).not.toContain('Desconto:');
    expect(sentCaptionNoMatch).not.toContain('Com cupom:');
    expect(sentCaptionNoMatch).not.toContain('Válido até');
    expect(sentCaptionNoMatch).toContain('https://shope.ee/cabo15');
  });

  it('DELETE /api/coupons/:id deve remover cupom do próprio tenant (200)', async () => {
    await request(app.getHttpServer())
      .delete(`/api/coupons/${couponGeralId}`)
      .set('Authorization', `Bearer ${tenantA_token}`)
      .expect(200);

    await request(app.getHttpServer())
      .get(`/api/coupons/${couponGeralId}`)
      .set('Authorization', `Bearer ${tenantA_token}`)
      .expect(404);
  });
});
