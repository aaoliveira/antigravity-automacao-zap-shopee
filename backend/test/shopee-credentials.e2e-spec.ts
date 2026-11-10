import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/modules/database/prisma.service';
import { ShopeeClientService } from '../src/modules/shopee/shopee.client';

describe('Shopee Credentials e2e & Multi-Tenant Isolation Tests', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let shopeeClient: ShopeeClientService;

  let tenantA_token = '';
  let tenantA_id = '';
  let tenantA_credentialId = '';

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
    shopeeClient = app.get(ShopeeClientService);

    // Mock do teste de conectividade para não depender de rede externa da Shopee durante o teste de integração
    jest.spyOn(shopeeClient, 'testConnectivity').mockResolvedValue(true);

    // 1. Cadastra Tenant A
    const resA = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        name: 'Afiliado Tenant A',
        email: `tenantA-shopee-${Date.now()}@teste.com`,
        password: 'Password123!',
        tenantName: 'Afiliados Shopee A',
      });
    tenantA_token = resA.body.data.accessToken;
    tenantA_id = resA.body.data.tenant.id;

    // 2. Cadastra Tenant B
    const resB = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        name: 'Afiliado Tenant B',
        email: `tenantB-shopee-${Date.now()}@teste.com`,
        password: 'Password123!',
        tenantName: 'Afiliados Shopee B',
      });
    tenantB_token = resB.body.data.accessToken;
    tenantB_id = resB.body.data.tenant.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  it('Tenant A deve cadastrar credencial Shopee com sucesso, cifrando Secret e retornando apenas máscara (201)', async () => {
    const rawSecret = 'super_secret_shopee_key_9981';
    const res = await request(app.getHttpServer())
      .post('/api/shopee-credentials')
      .set('Authorization', `Bearer ${tenantA_token}`)
      .send({
        label: 'Minha Credencial Oficial',
        appId: '10928374',
        appSecret: rawSecret,
      })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBeDefined();
    expect(res.body.data.appId).toBe('10928374');
    expect(res.body.data.appSecretMasked).toBe('************9981');
    expect(res.body.data.isValid).toBe(true);

    // SEGURANÇA: Garante que o Secret original e o ciphertext não vazam na resposta
    expect(res.body.data.appSecret).toBeUndefined();
    expect(res.body.data.appSecretEncrypted).toBeUndefined();
    expect(JSON.stringify(res.body)).not.toContain(rawSecret);

    tenantA_credentialId = res.body.data.id;
  });

  it('Tenant A deve listar suas credenciais com segredo mascarado (200)', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/shopee-credentials')
      .set('Authorization', `Bearer ${tenantA_token}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.data[0].appSecretMasked).toContain('************');
  });

  it('Tenant A deve consultar sua própria credencial por ID (200)', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/shopee-credentials/${tenantA_credentialId}`)
      .set('Authorization', `Bearer ${tenantA_token}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe(tenantA_credentialId);
  });

  it('ISOLAMENTO MULTI-TENANT: Tenant B NÃO deve conseguir ver a credencial do Tenant A (esperado 404 Not Found)', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/shopee-credentials/${tenantA_credentialId}`)
      .set('Authorization', `Bearer ${tenantB_token}`)
      .expect(404);

    expect(res.body.success).toBe(false);
    expect(res.body.error.message).toMatch(/não encontrada/i);
    expect(res.body.data).toBeUndefined();
  });

  it('ISOLAMENTO MULTI-TENANT: Tenant B NÃO deve conseguir alterar a credencial do Tenant A (esperado 404 Not Found)', async () => {
    const res = await request(app.getHttpServer())
      .put(`/api/shopee-credentials/${tenantA_credentialId}`)
      .set('Authorization', `Bearer ${tenantB_token}`)
      .send({ label: 'Hacked Label' })
      .expect(404);

    expect(res.body.success).toBe(false);
  });

  it('ISOLAMENTO MULTI-TENANT: Tenant B NÃO deve conseguir excluir a credencial do Tenant A (esperado 404 Not Found)', async () => {
    const res = await request(app.getHttpServer())
      .delete(`/api/shopee-credentials/${tenantA_credentialId}`)
      .set('Authorization', `Bearer ${tenantB_token}`)
      .expect(404);

    expect(res.body.success).toBe(false);
  });

  it('Tenant A deve revalidar a credencial (200)', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/shopee-credentials/${tenantA_credentialId}/test`)
      .set('Authorization', `Bearer ${tenantA_token}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.isValid).toBe(true);
  });

  it('Tenant A deve atualizar label da credencial (200)', async () => {
    const res = await request(app.getHttpServer())
      .put(`/api/shopee-credentials/${tenantA_credentialId}`)
      .set('Authorization', `Bearer ${tenantA_token}`)
      .send({ label: 'Credencial Atualizada' })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.label).toBe('Credencial Atualizada');
  });

  it('Tenant A deve receber diagnóstico detalhado quando Shopee rejeitar credencial no teste (200)', async () => {
    const spy = jest.spyOn(shopeeClient, 'testConnectivity').mockImplementationOnce(
      async (_appId, _secret, diagnostics) => {
        if (diagnostics) {
          diagnostics.code = '10020';
          diagnostics.message = 'Erro Shopee [10020] (Assinatura/Identidade inválida).';
        }
        return false;
      },
    );

    const res = await request(app.getHttpServer())
      .post(`/api/shopee-credentials/${tenantA_credentialId}/test`)
      .set('Authorization', `Bearer ${tenantA_token}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.isValid).toBe(false);
    expect(res.body.data.validationErrorCode).toBe('10020');
    expect(res.body.data.validationMessage).toContain('10020');
    expect(spy).toHaveBeenCalled();
  });

  it('Tenant A deve excluir a credencial (200)', async () => {
    const res = await request(app.getHttpServer())
      .delete(`/api/shopee-credentials/${tenantA_credentialId}`)
      .set('Authorization', `Bearer ${tenantA_token}`)
      .expect(200);

    expect(res.body.success).toBe(true);
  });
});
