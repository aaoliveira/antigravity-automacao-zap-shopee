import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/modules/database/prisma.service';
import { InstanceStatus } from '@prisma/client';

describe('Security, Multi-Tenancy & SSRF Audit Tests', () => {
  jest.setTimeout(25000);
  let app: INestApplication;
  let prisma: PrismaService;

  let tenantA_token = '';
  let tenantA_id = '';
  let tenantA_shopeeId = '';
  let tenantA_serverId = '';
  let tenantA_instanceId = '';
  let tenantA_groupId = '';
  let tenantA_automationId = '';

  let tenantB_token = '';
  let tenantB_id = '';
  let tenantB_shopeeId = '';
  let tenantB_serverId = '';
  let tenantB_instanceId = '';
  let tenantB_groupId = '';
  let tenantB_automationId = '';

  beforeAll(async () => {
    // Configura ambiente para teste estrito
    process.env.ALLOW_INTERNAL_EVOLUTION_URL = 'false';
    process.env.EVOLUTION_WEBHOOK_SECRET = 'audit-test-webhook-secret';

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

    // 1. Provisiona Tenant A
    const resA = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        name: 'Sec Audit Tenant A',
        email: `audit-a-${Date.now()}@test.com`,
        password: 'Password123!',
        tenantName: 'Audit Tenant A Corp',
      });
    tenantA_token = resA.body.data.accessToken;
    tenantA_id = resA.body.data.tenant.id;

    // 2. Provisiona Tenant B
    const resB = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        name: 'Sec Audit Tenant B',
        email: `audit-b-${Date.now()}@test.com`,
        password: 'Password123!',
        tenantName: 'Audit Tenant B Corp',
      });
    tenantB_token = resB.body.data.accessToken;
    tenantB_id = resB.body.data.tenant.id;

    // Credencial Shopee A e B
    const shopeeA = await prisma.shopeeCredential.create({
      data: {
        tenantId: tenantA_id,
        label: 'Shopee A',
        appId: '100001',
        appSecretEncrypted: 'aabbcc:ddeeff:112233',
        appSecretMasked: '************1234',
        isValid: true,
      },
    });
    tenantA_shopeeId = shopeeA.id;

    const shopeeB = await prisma.shopeeCredential.create({
      data: {
        tenantId: tenantB_id,
        label: 'Shopee B',
        appId: '100002',
        appSecretEncrypted: 'aabbcc:ddeeff:112233',
        appSecretMasked: '************5678',
        isValid: true,
      },
    });
    tenantB_shopeeId = shopeeB.id;

    // Servidor Evolution A e B
    const srvA = await prisma.evolutionServer.create({
      data: {
        tenantId: tenantA_id,
        name: 'Server A',
        baseUrl: 'https://evolution-a.externo.com',
        apiKeyEncrypted: 'aabbcc:ddeeff:112233',
        apiKeyMasked: '************1111',
        isActive: true,
      },
    });
    tenantA_serverId = srvA.id;

    const srvB = await prisma.evolutionServer.create({
      data: {
        tenantId: tenantB_id,
        name: 'Server B',
        baseUrl: 'https://evolution-b.externo.com',
        apiKeyEncrypted: 'aabbcc:ddeeff:112233',
        apiKeyMasked: '************2222',
        isActive: true,
      },
    });
    tenantB_serverId = srvB.id;

    // Instância A e B
    const instA = await prisma.whatsAppInstance.create({
      data: {
        tenantId: tenantA_id,
        serverId: tenantA_serverId,
        instanceName: `inst_a_${Date.now()}`,
        displayName: 'Instância A',
        status: InstanceStatus.CONNECTED,
      },
    });
    tenantA_instanceId = instA.id;

    const instB = await prisma.whatsAppInstance.create({
      data: {
        tenantId: tenantB_id,
        serverId: tenantB_serverId,
        instanceName: `inst_b_${Date.now()}`,
        displayName: 'Instância B',
        status: InstanceStatus.CONNECTED,
      },
    });
    tenantB_instanceId = instB.id;

    // Grupos A e B
    const grpA = await prisma.whatsAppGroup.create({
      data: {
        tenantId: tenantA_id,
        instanceId: tenantA_instanceId,
        jid: '1203630001@g.us',
        name: 'Grupo Audit A',
        participantCount: 50,
      },
    });
    tenantA_groupId = grpA.id;

    const grpB = await prisma.whatsAppGroup.create({
      data: {
        tenantId: tenantB_id,
        instanceId: tenantB_instanceId,
        jid: '1203630002@g.us',
        name: 'Grupo Audit B',
        participantCount: 30,
      },
    });
    tenantB_groupId = grpB.id;

    // Automação A e B
    const autoA = await prisma.automation.create({
      data: {
        tenantId: tenantA_id,
        name: 'Automação Audit A',
        shopeeCredentialId: tenantA_shopeeId,
        instanceId: tenantA_instanceId,
        status: 'ACTIVE',
        frequencyMinutes: 60,
      },
    });
    tenantA_automationId = autoA.id;

    const autoB = await prisma.automation.create({
      data: {
        tenantId: tenantB_id,
        name: 'Automação Audit B',
        shopeeCredentialId: tenantB_shopeeId,
        instanceId: tenantB_instanceId,
        status: 'ACTIVE',
        frequencyMinutes: 60,
      },
    });
    tenantB_automationId = autoB.id;
  });

  afterAll(async () => {
    delete process.env.ALLOW_INTERNAL_EVOLUTION_URL;
    await prisma.$disconnect();
    await app.close();
  });

  // ============================================================================
  // 1. ISOLAMENTO MULTI-TENANT E IDOR
  // ============================================================================
  describe('Isolamento Horizontal Multi-Tenant e IDOR', () => {
    it('Tenant B não deve visualizar credencial Shopee do Tenant A (404)', async () => {
      await request(app.getHttpServer())
        .get(`/api/shopee-credentials/${tenantA_shopeeId}`)
        .set('Authorization', `Bearer ${tenantB_token}`)
        .expect(404);
    });

    it('Tenant B não deve conseguir excluir credencial Shopee do Tenant A (404)', async () => {
      await request(app.getHttpServer())
        .delete(`/api/shopee-credentials/${tenantA_shopeeId}`)
        .set('Authorization', `Bearer ${tenantB_token}`)
        .expect(404);
    });

    it('Tenant B não deve visualizar servidor Evolution do Tenant A (404)', async () => {
      await request(app.getHttpServer())
        .get(`/api/evolution-servers/${tenantA_serverId}`)
        .set('Authorization', `Bearer ${tenantB_token}`)
        .expect(404);
    });

    it('Tenant B não deve visualizar instância WhatsApp do Tenant A (404)', async () => {
      await request(app.getHttpServer())
        .get(`/api/whatsapp-instances/${tenantA_instanceId}`)
        .set('Authorization', `Bearer ${tenantB_token}`)
        .expect(404);
    });

    it('Tenant B não deve conseguir alterar ou sincronizar grupo do Tenant A (404)', async () => {
      await request(app.getHttpServer())
        .post(`/api/whatsapp-groups/sync/${tenantA_instanceId}`)
        .set('Authorization', `Bearer ${tenantB_token}`)
        .expect(404);
    });

    it('Tenant B não deve conseguir acessar ou alterar automação do Tenant A (404)', async () => {
      await request(app.getHttpServer())
        .get(`/api/automations/${tenantA_automationId}`)
        .set('Authorization', `Bearer ${tenantB_token}`)
        .expect(404);

      await request(app.getHttpServer())
        .put(`/api/automations/${tenantA_automationId}`)
        .set('Authorization', `Bearer ${tenantB_token}`)
        .send({ name: 'Hack Name' })
        .expect(404);
    });

    it('Tenant B não deve conseguir criar automação usando recursos do Tenant A (400)', async () => {
      // Tentativa de usar shopeeCredential do Tenant A
      await request(app.getHttpServer())
        .post('/api/automations')
        .set('Authorization', `Bearer ${tenantB_token}`)
        .send({
          name: 'Automação Invasora',
          instanceId: tenantB_instanceId,
          shopeeCredentialId: tenantA_shopeeId,
          groupIds: [tenantB_groupId],
          keywords: ['promo'],
        })
        .expect(400);

      // Tentativa de usar instância do Tenant A
      await request(app.getHttpServer())
        .post('/api/automations')
        .set('Authorization', `Bearer ${tenantB_token}`)
        .send({
          name: 'Automação Invasora 2',
          instanceId: tenantA_instanceId,
          shopeeCredentialId: tenantB_shopeeId,
          groupIds: [tenantB_groupId],
          keywords: ['promo'],
        })
        .expect(400);

      // Tentativa de usar grupo do Tenant A
      await request(app.getHttpServer())
        .post('/api/automations')
        .set('Authorization', `Bearer ${tenantB_token}`)
        .send({
          name: 'Automação Invasora 3',
          instanceId: tenantB_instanceId,
          shopeeCredentialId: tenantB_shopeeId,
          groupIds: [tenantA_groupId],
          keywords: ['promo'],
        })
        .expect(400);
    });
  });

  // ============================================================================
  // 2. DEFESA CONTRA SSRF (SERVER-SIDE REQUEST FORGERY)
  // ============================================================================
  describe('Mitigação Estrita de SSRF', () => {
    it('Deve rejeitar servidor Evolution apontando para Loopback (127.0.0.1)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/evolution-servers')
        .set('Authorization', `Bearer ${tenantA_token}`)
        .send({
          name: 'SSRF Attack Loopback',
          baseUrl: 'http://127.0.0.1:8080',
          apiKey: 'secret123',
        })
        .expect(400);

      expect(res.body.error.message).toMatch(/SSRF/i);
    });

    it('Deve rejeitar servidor Evolution apontando para Localhost', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/evolution-servers')
        .set('Authorization', `Bearer ${tenantA_token}`)
        .send({
          name: 'SSRF Attack Localhost',
          baseUrl: 'http://localhost:8080',
          apiKey: 'secret123',
        })
        .expect(400);

      expect(res.body.error.message).toMatch(/SSRF/i);
    });

    it('Deve rejeitar servidor Evolution apontando para Nuvem Metadata (169.254.169.254)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/evolution-servers')
        .set('Authorization', `Bearer ${tenantA_token}`)
        .send({
          name: 'SSRF AWS Metadata',
          baseUrl: 'http://169.254.169.254/latest/meta-data/',
          apiKey: 'secret123',
        })
        .expect(400);

      expect(res.body.error.message).toMatch(/SSRF/i);
    });

    it('Deve rejeitar servidor Evolution com faixa privada RFC 1918 (10.0.0.1)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/evolution-servers')
        .set('Authorization', `Bearer ${tenantA_token}`)
        .send({
          name: 'SSRF Private IP 10.x',
          baseUrl: 'http://10.0.0.1:8080',
          apiKey: 'secret123',
        })
        .expect(400);

      expect(res.body.error.message).toMatch(/SSRF/i);
    });

    it('Deve rejeitar URL de mídia maliciosa interna em envio de mensagem (SSRF via mediaUrl)', async () => {
      await request(app.getHttpServer())
        .post(`/api/whatsapp-groups/${tenantA_groupId}/send-media`)
        .set('Authorization', `Bearer ${tenantA_token}`)
        .send({
          mediaUrl: 'http://169.254.169.254/latest/meta-data/credentials',
          titulo: 'Produto Fake',
          preco: 'R$ 10,00',
          link_afiliado: 'https://shope.ee/test',
        })
        .expect(400);
    });
  });

  // ============================================================================
  // 3. SEGURANÇA DE WEBHOOKS E ASSINATURA
  // ============================================================================
  describe('Segurança de Webhooks Evolution API', () => {
    it('Deve rejeitar webhook sem header x-webhook-secret (401)', async () => {
      await request(app.getHttpServer())
        .post('/api/webhooks/evolution')
        .send({
          event: 'connection.update',
          instance: 'inst_qualquer',
          data: { state: 'open' },
        })
        .expect(401);
    });

    it('Deve rejeitar webhook com segredo incorreto (401)', async () => {
      await request(app.getHttpServer())
        .post('/api/webhooks/evolution')
        .set('x-webhook-secret', 'segredo-errado-hacker')
        .send({
          event: 'connection.update',
          instance: 'inst_qualquer',
          data: { state: 'open' },
        })
        .expect(401);
    });

    it('Deve aceitar webhook com segredo válido e tratar instância inexistente com segurança (200 sem alteração)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/webhooks/evolution')
        .set('x-webhook-secret', 'audit-test-webhook-secret')
        .send({
          event: 'connection.update',
          instance: 'instancia_fantasma_inexistente',
          data: { state: 'open' },
        })
        .expect(200);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/não cadastrada/i);
    });
  });

  // ============================================================================
  // 4. MASCARAMENTO DE DADOS SENSÍVEIS (ZERO VAZAMENTO)
  // ==========================================
  describe('Proteção e Mascaramento de Segredos', () => {
    it('Credencial Shopee nunca deve retornar App Secret em texto claro na API', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/shopee-credentials`)
        .set('Authorization', `Bearer ${tenantA_token}`)
        .expect(200);

      const cred = res.body.data[0];
      expect(cred).toBeDefined();
      expect(cred.appSecret).toBeUndefined();
      expect(cred.appSecretEncrypted).toBeUndefined();
      expect(cred.appSecretMasked).toMatch(/^\*\*\*\*/);
      expect(cred.isValid).toBe(true);
    });

    it('Servidor Evolution nunca deve retornar apiKey em texto claro na API', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/evolution-servers`)
        .set('Authorization', `Bearer ${tenantA_token}`)
        .expect(200);

      const server = res.body.data[0];
      expect(server).toBeDefined();
      expect(server.apiKey).toBeUndefined();
      expect(server.apiKeyEncrypted).toBeUndefined();
      expect(server.apiKeyMasked).toBeDefined();
      expect(server.apiKeyMasked).toMatch(/^\*\*\*\*/);
    });
  });

  // ============================================================================
  // 5. RESILIÊNCIA CONTRA SQL INJECTION E PAYLOADS MALICIOSOS
  // ============================================================================
  describe('Sanitização e Resiliência contra Injeção', () => {
    it('Busca com SQL Injection clássico deve ser parametrizada sem vazar dados ou quebrar query', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/whatsapp-groups?search=' OR '1'='1`)
        .set('Authorization', `Bearer ${tenantA_token}`)
        .expect(200);

      // Deve retornar array vazio ou apenas grupos legítimos que contenham a string literal
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('Payload com campos não autorizados deve ser rejeitado (ValidationPipe forbidNonWhitelisted)', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: 'admin@test.com',
          password: 'Password123!',
          isAdmin: true, // campo invasor
          role: 'SUPERADMIN', // campo invasor
        })
        .expect(400);
    });
  });
});
