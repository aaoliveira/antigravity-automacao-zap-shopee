import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/modules/database/prisma.service';

describe('Multi-Tenancy Isolation e2e Tests (Negative Security Tests)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let tenantA_token = '';
  let tenantA_id = '';
  let tenantA_resourceId = '';

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

    // 1. Cadastra Usuário e Tenant A
    const resA = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        name: 'Usuário Tenant A',
        email: `tenantA-${Date.now()}@teste.com`,
        password: 'Password123!',
        tenantName: 'Organização A',
      });

    tenantA_token = resA.body.data.accessToken;
    tenantA_id = resA.body.data.tenant.id;

    // Cria um recurso de teste explicitamente sob o Tenant A
    const resourceA = await prisma.auditLog.create({
      data: {
        tenantId: tenantA_id,
        action: 'TEST_RESOURCE_A',
        entityType: 'TestResource',
        entityId: 'secret-resource-of-A',
        metadataJson: { confidentialData: 'DADOS_ULTRA_CONFIDENCIAIS_TENANT_A' },
      },
    });
    tenantA_resourceId = resourceA.id;

    // 2. Cadastra Usuário e Tenant B
    const resB = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        name: 'Usuário Tenant B',
        email: `tenantB-${Date.now()}@teste.com`,
        password: 'Password123!',
        tenantName: 'Organização B',
      });

    tenantB_token = resB.body.data.accessToken;
    tenantB_id = resB.body.data.tenant.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  it('Tenant A deve conseguir ler seu próprio recurso normalmente (200)', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/tenants/resources/${tenantA_resourceId}`)
      .set('Authorization', `Bearer ${tenantA_token}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe(tenantA_resourceId);
    expect(res.body.data.tenantId).toBe(tenantA_id);
  });

  it('SEGURANÇA MULTI-TENANT: Tenant B NÃO deve conseguir acessar recurso de Tenant A (esperado 404 Not Found)', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/tenants/resources/${tenantA_resourceId}`)
      .set('Authorization', `Bearer ${tenantB_token}`)
      .expect(404);

    expect(res.body.success).toBe(false);
    expect(res.body.error.message).toMatch(/não encontrado/i);
    // Garante que nenhum dado do Tenant A vazou
    expect(res.body.data).toBeUndefined();
  });

  it('Tenant B deve acessar apenas seus próprios dados de organização (200)', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/tenants/current')
      .set('Authorization', `Bearer ${tenantB_token}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe(tenantB_id);
    expect(res.body.data.name).toBe('Organização B');
    expect(res.body.data.id).not.toBe(tenantA_id);
  });
});
