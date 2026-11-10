import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/modules/database/prisma.service';
import { EvolutionClient } from '../src/modules/evolution/evolution.client';

describe('Evolution API e2e & Multi-Tenant Isolation Tests', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let evolutionClient: EvolutionClient;

  let tenantA_token = '';
  let tenantA_id = '';
  let tenantA_serverId = '';
  let tenantA_instanceId = '';
  let tenantA_groupId = '';

  let tenantB_token = '';
  let tenantB_id = '';

  beforeAll(async () => {
    // Garante que a chave secreta do webhook está configurada para testes
    process.env.EVOLUTION_WEBHOOK_SECRET = 'secret-test-evolution-webhook-token';

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
    evolutionClient = app.get(EvolutionClient);

    // Mock das chamadas externas da Evolution API para ambiente de teste controlado
    jest.spyOn(evolutionClient, 'pingServer').mockResolvedValue({
      success: true,
      message: 'Conectado',
    });

    jest.spyOn(evolutionClient, 'createInstance').mockResolvedValue({
      instance: {
        instanceName: 'instancia-afiliado-a',
        status: 'created',
        integration: 'WHATSAPP-BAILEYS',
      },
      qrcode: {
        base64: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...',
        code: '2@code-teste',
      },
    });

    jest.spyOn(evolutionClient, 'getConnectQrCode').mockResolvedValue({
      base64: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA_NOVO...',
      code: '2@novo-code',
    });

    jest.spyOn(evolutionClient, 'getConnectionState').mockResolvedValue({
      instance: {
        instanceName: 'instancia-afiliado-a',
        state: 'open',
      },
    });

    jest.spyOn(evolutionClient, 'fetchAllGroups').mockResolvedValue([
      {
        id: '1203630192837465@g.us',
        subject: 'Grupo Achadinhos VIP A',
        size: 120,
      },
    ]);

    jest.spyOn(evolutionClient, 'sendMedia').mockResolvedValue({
      key: { id: 'EVO_MSG_123', remoteJid: '1203630192837465@g.us' },
      status: 'PENDING',
    });

    jest.spyOn(evolutionClient, 'sendText').mockResolvedValue({
      key: { id: 'EVO_TXT_456', remoteJid: '1203630192837465@g.us' },
      status: 'PENDING',
    });

    jest.spyOn(evolutionClient, 'logoutInstance').mockResolvedValue({
      status: 'SUCCESS',
    });

    jest.spyOn(evolutionClient, 'deleteInstance').mockResolvedValue({
      status: 'SUCCESS',
    });

    // 1. Cadastra Tenant A
    const resA = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        name: 'Afiliado A',
        email: `tenantA-evo-${Date.now()}@teste.com`,
        password: 'Password123!',
        tenantName: 'Tenant Evolution A',
      });
    tenantA_token = resA.body.data.accessToken;
    tenantA_id = resA.body.data.tenant.id;

    // 2. Cadastra Tenant B
    const resB = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        name: 'Afiliado B',
        email: `tenantB-evo-${Date.now()}@teste.com`,
        password: 'Password123!',
        tenantName: 'Tenant Evolution B',
      });
    tenantB_token = resB.body.data.accessToken;
    tenantB_id = resB.body.data.tenant.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  // ==========================================
  // 1. TESTES DO SERVIDOR EVOLUTION
  // ==========================================

  it('Deve rejeitar cadastro de servidor com URL interna/SSRF não autorizada (400)', async () => {
    await request(app.getHttpServer())
      .post('/api/evolution-servers')
      .set('Authorization', `Bearer ${tenantA_token}`)
      .send({
        name: 'Servidor Malicioso Localhost',
        baseUrl: 'http://localhost:8080',
        apiKey: 'chave123',
      })
      .expect(400);

    await request(app.getHttpServer())
      .post('/api/evolution-servers')
      .set('Authorization', `Bearer ${tenantA_token}`)
      .send({
        name: 'Servidor Malicioso Metadata AWS',
        baseUrl: 'http://169.254.169.254',
        apiKey: 'chave123',
      })
      .expect(400);
  });

  it('Tenant A deve cadastrar Servidor Evolution com sucesso, cifrando a API Key (201)', async () => {
    const rawApiKey = 'super_secret_evolution_api_key_7788';
    const res = await request(app.getHttpServer())
      .post('/api/evolution-servers')
      .set('Authorization', `Bearer ${tenantA_token}`)
      .send({
        name: 'Servidor Principal Evolution A',
        baseUrl: 'https://evolution.minhaempresa.com.br',
        apiKey: rawApiKey,
      })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBeDefined();
    expect(res.body.data.name).toBe('Servidor Principal Evolution A');
    expect(res.body.data.apiKeyMasked).toBe('************7788');

    // SEGURANÇA: Chave em texto claro e chave cifrada não devem vazar na resposta da API
    expect(res.body.data.apiKey).toBeUndefined();
    expect(res.body.data.apiKeyEncrypted).toBeUndefined();
    expect(JSON.stringify(res.body)).not.toContain(rawApiKey);

    tenantA_serverId = res.body.data.id;
  });

  it('Tenant A deve listar seus servidores Evolution (200)', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/evolution-servers')
      .set('Authorization', `Bearer ${tenantA_token}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    expect(res.body.data[0].apiKeyMasked).toBeDefined();
  });

  // ==========================================
  // 2. TESTES DE INSTÂNCIAS WHATSAPP
  // ==========================================

  it('Tenant A deve criar uma instância WhatsApp com status inicial CREATED (201)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/whatsapp-instances')
      .set('Authorization', `Bearer ${tenantA_token}`)
      .send({
        serverId: tenantA_serverId,
        instanceName: 'instancia-afiliado-a',
        displayName: 'WhatsApp Vendas A',
      })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBeDefined();
    expect(res.body.data.instanceName).toBe('instancia-afiliado-a');
    expect(res.body.data.status).toBe('CREATED'); // Nunca assumir CONNECTED imediatamente!

    tenantA_instanceId = res.body.data.id;
  });

  it('Tenant A deve obter QR Code de pareamento atualizado (200)', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/whatsapp-instances/${tenantA_instanceId}/qrcode`)
      .set('Authorization', `Bearer ${tenantA_token}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.base64).toContain('data:image/png;base64');
  });

  it('Tenant A deve consultar status em tempo real e atualizar para CONNECTED (200)', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/whatsapp-instances/${tenantA_instanceId}/status`)
      .set('Authorization', `Bearer ${tenantA_token}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('CONNECTED');
    expect(res.body.data.state).toBe('open');
  });

  // ==========================================
  // 3. TESTES DE GRUPOS DO WHATSAPP
  // ==========================================

  it('Tenant A deve sincronizar grupos preservando o formato original do JID @g.us (200)', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/whatsapp-groups/sync/${tenantA_instanceId}`)
      .set('Authorization', `Bearer ${tenantA_token}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.count).toBe(1);
    expect(res.body.data.groups[0].jid).toBe('1203630192837465@g.us');
    expect(res.body.data.groups[0].name).toBe('Grupo Achadinhos VIP A');

    tenantA_groupId = res.body.data.groups[0].id;
  });

  it('Tenant A deve listar grupos com filtro e busca (200)', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/whatsapp-groups?search=Achadinhos`)
      .set('Authorization', `Bearer ${tenantA_token}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].id).toBe(tenantA_groupId);
  });

  // ==========================================
  // 4. TESTES DE MENSAGENS E MÍDIA
  // ==========================================

  it('Tenant A deve enviar imagem com legenda formatada para o grupo (200)', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/whatsapp-groups/${tenantA_groupId}/send-media`)
      .set('Authorization', `Bearer ${tenantA_token}`)
      .send({
        mediaUrl: 'https://down-br.img.susercontent.com/file/br-11134207.jpg',
        titulo: 'Mouse Gamer RGB Sem Fio',
        preco: 'R$ 69,90',
        link_afiliado: 'https://shope.ee/mouse123',
      })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.groupJid).toBe('1203630192837465@g.us');
    expect(res.body.data.result.key.id).toBe('EVO_MSG_123');
  });

  it('Tenant A deve enviar texto simples para o grupo (200)', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/whatsapp-groups/${tenantA_groupId}/send-text`)
      .set('Authorization', `Bearer ${tenantA_token}`)
      .send({
        text: 'Aviso: nova lista de ofertas adicionada!',
      })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.groupJid).toBe('1203630192837465@g.us');
    expect(res.body.data.result.key.id).toBe('EVO_TXT_456');
  });

  // ==========================================
  // 5. TESTES DE WEBHOOKS
  // ==========================================

  it('Webhook deve rejeitar chamada com segredo incorreto (401)', async () => {
    await request(app.getHttpServer())
      .post('/api/webhooks/evolution')
      .set('x-webhook-secret', 'segredo-errado')
      .send({
        event: 'connection.update',
        instance: 'instancia-afiliado-a',
        data: { state: 'close' },
      })
      .expect(401);
  });

  it('Webhook deve atualizar o status da instância para DISCONNECTED ao receber state: close (200)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/webhooks/evolution')
      .set('x-webhook-secret', 'secret-test-evolution-webhook-token')
      .send({
        event: 'connection.update',
        instance: 'instancia-afiliado-a',
        data: { state: 'close' },
      })
      .expect(200);

    expect(res.body.success).toBe(true);

    // Verifica se no banco a instância ficou DISCONNECTED
    const inst = await prisma.whatsAppInstance.findUnique({
      where: { id: tenantA_instanceId },
    });
    expect(inst?.status).toBe('DISCONNECTED');
  });

  // ==========================================
  // 6. ISOLAMENTO MULTI-TENANT (TESTES NEGATIVOS A/B)
  // ==========================================

  it('Tenant B não deve visualizar os servidores do Tenant A (lista isolada)', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/evolution-servers')
      .set('Authorization', `Bearer ${tenantB_token}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.find((s: any) => s.id === tenantA_serverId)).toBeUndefined();
  });

  it('Tenant B não deve conseguir acessar nem alterar o servidor do Tenant A (404)', async () => {
    await request(app.getHttpServer())
      .get(`/api/evolution-servers/${tenantA_serverId}`)
      .set('Authorization', `Bearer ${tenantB_token}`)
      .expect(404);

    await request(app.getHttpServer())
      .put(`/api/evolution-servers/${tenantA_serverId}`)
      .set('Authorization', `Bearer ${tenantB_token}`)
      .send({ name: 'Nome Invadido' })
      .expect(404);

    await request(app.getHttpServer())
      .delete(`/api/evolution-servers/${tenantA_serverId}`)
      .set('Authorization', `Bearer ${tenantB_token}`)
      .expect(404);
  });

  it('Tenant B não deve conseguir criar instância vinculada ao servidor do Tenant A (404)', async () => {
    await request(app.getHttpServer())
      .post('/api/whatsapp-instances')
      .set('Authorization', `Bearer ${tenantB_token}`)
      .send({
        serverId: tenantA_serverId,
        instanceName: 'instancia-invasora-b',
        displayName: 'Tentativa B',
      })
      .expect(404);
  });

  it('Tenant B não deve conseguir visualizar instância ou QR Code do Tenant A (404)', async () => {
    await request(app.getHttpServer())
      .get(`/api/whatsapp-instances/${tenantA_instanceId}`)
      .set('Authorization', `Bearer ${tenantB_token}`)
      .expect(404);

    await request(app.getHttpServer())
      .get(`/api/whatsapp-instances/${tenantA_instanceId}/qrcode`)
      .set('Authorization', `Bearer ${tenantB_token}`)
      .expect(404);
  });

  it('Tenant B não deve conseguir sincronizar ou disparar mensagens para grupos do Tenant A (404)', async () => {
    await request(app.getHttpServer())
      .post(`/api/whatsapp-groups/sync/${tenantA_instanceId}`)
      .set('Authorization', `Bearer ${tenantB_token}`)
      .expect(404);

    await request(app.getHttpServer())
      .post(`/api/whatsapp-groups/${tenantA_groupId}/send-media`)
      .set('Authorization', `Bearer ${tenantB_token}`)
      .send({
        mediaUrl: 'https://down-br.img.susercontent.com/file/teste.jpg',
        titulo: 'Invasão',
        preco: 'R$ 0,00',
        link_afiliado: 'https://shope.ee/fake',
      })
      .expect(404);
  });

  // ==========================================
  // 7. DESCONEXÃO E EXCLUSÃO LIMPA
  // ==========================================

  it('Tenant A deve desconectar a instância com logout (200)', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/whatsapp-instances/${tenantA_instanceId}/logout`)
      .set('Authorization', `Bearer ${tenantA_token}`)
      .expect(200);

    expect(res.body.success).toBe(true);

    const inst = await prisma.whatsAppInstance.findUnique({
      where: { id: tenantA_instanceId },
    });
    expect(inst?.status).toBe('DISCONNECTED');
  });

  it('Tenant A não pode excluir o servidor enquanto houver instâncias vinculadas (400)', async () => {
    await request(app.getHttpServer())
      .delete(`/api/evolution-servers/${tenantA_serverId}`)
      .set('Authorization', `Bearer ${tenantA_token}`)
      .expect(400);
  });

  it('Tenant A deve excluir a instância e em seguida conseguir excluir o servidor (200)', async () => {
    // 1. Exclui a instância
    await request(app.getHttpServer())
      .delete(`/api/whatsapp-instances/${tenantA_instanceId}`)
      .set('Authorization', `Bearer ${tenantA_token}`)
      .expect(200);

    // 2. Agora o servidor pode ser excluído
    await request(app.getHttpServer())
      .delete(`/api/evolution-servers/${tenantA_serverId}`)
      .set('Authorization', `Bearer ${tenantA_token}`)
      .expect(200);
  });

  // ==========================================
  // 8. INTEGRAÇÃO COM EVOLUTION API DOCKER
  // ==========================================

  it('Deve exigir autenticação JWT para consultar status ou provisionar Evolution Docker (401)', async () => {
    await request(app.getHttpServer())
      .get('/api/evolution-servers/docker/status')
      .expect(401);

    await request(app.getHttpServer())
      .post('/api/evolution-servers/docker')
      .send({ name: 'Docker Sem Auth' })
      .expect(401);
  });

  it('Deve informar corretamente quando Evolution Docker estiver desabilitado e bloquear vínculo (400)', async () => {
    const prevEnabled = process.env.EVOLUTION_DOCKER_ENABLED;
    process.env.EVOLUTION_DOCKER_ENABLED = 'false';

    try {
      const statusRes = await request(app.getHttpServer())
        .get('/api/evolution-servers/docker/status')
        .set('Authorization', `Bearer ${tenantA_token}`)
        .expect(200);

      expect(statusRes.body.success).toBe(true);
      expect(statusRes.body.data.enabled).toBe(false);
      expect(statusRes.body.data.online).toBe(false);

      await request(app.getHttpServer())
        .post('/api/evolution-servers/docker')
        .set('Authorization', `Bearer ${tenantA_token}`)
        .send({ name: 'Docker Desabilitado' })
        .expect(400);
    } finally {
      process.env.EVOLUTION_DOCKER_ENABLED = prevEnabled;
    }
  });

  it('Tenant A deve consultar e vincular Evolution Docker cifrando API Key sem expor segredos nem quebrar isolamento multi-tenant', async () => {
    const prevEnabled = process.env.EVOLUTION_DOCKER_ENABLED;
    const prevBaseUrl = process.env.EVOLUTION_DOCKER_BASE_URL;
    const prevApiKey = process.env.EVOLUTION_DOCKER_API_KEY;

    const secretDockerKey = 'docker_evolution_super_secret_key_9988';
    process.env.EVOLUTION_DOCKER_ENABLED = 'true';
    process.env.EVOLUTION_DOCKER_BASE_URL = 'http://localhost:8080';
    process.env.EVOLUTION_DOCKER_API_KEY = secretDockerKey;

    try {
      // 1. Consulta status antes do vínculo
      const statusBefore = await request(app.getHttpServer())
        .get('/api/evolution-servers/docker/status')
        .set('Authorization', `Bearer ${tenantA_token}`)
        .expect(200);

      expect(statusBefore.body.data.enabled).toBe(true);
      expect(statusBefore.body.data.online).toBe(true);
      expect(statusBefore.body.data.alreadyConfigured).toBe(false);
      expect(JSON.stringify(statusBefore.body)).not.toContain(secretDockerKey);

      // 2. Vincula Evolution Docker para o Tenant A
      const provisionRes = await request(app.getHttpServer())
        .post('/api/evolution-servers/docker')
        .set('Authorization', `Bearer ${tenantA_token}`)
        .send({ name: 'Evolution Docker Tenant A' })
        .expect(201);

      expect(provisionRes.body.success).toBe(true);
      expect(provisionRes.body.data.name).toBe('Evolution Docker Tenant A');
      expect(provisionRes.body.data.baseUrl).toBe('http://localhost:8080');
      expect(provisionRes.body.data.apiKeyMasked).toContain('9988');
      expect(provisionRes.body.data.apiKeyEncrypted).toBeUndefined();
      expect(JSON.stringify(provisionRes.body)).not.toContain(secretDockerKey);

      const dockerServerId = provisionRes.body.data.id;

      // 3. Confirma criptografia AES-256-GCM no banco
      const serverInDb = await prisma.evolutionServer.findUnique({
        where: { id: dockerServerId },
      });
      expect(serverInDb?.apiKeyEncrypted).not.toBe(secretDockerKey);
      expect(serverInDb?.apiKeyEncrypted.split(':').length).toBe(3);

      // 4. Tenant A vê alreadyConfigured = true, Tenant B continua vendo false e não acessa servidor de A
      const statusTenantA = await request(app.getHttpServer())
        .get('/api/evolution-servers/docker/status')
        .set('Authorization', `Bearer ${tenantA_token}`)
        .expect(200);
      expect(statusTenantA.body.data.alreadyConfigured).toBe(true);

      const statusTenantB = await request(app.getHttpServer())
        .get('/api/evolution-servers/docker/status')
        .set('Authorization', `Bearer ${tenantB_token}`)
        .expect(200);
      expect(statusTenantB.body.data.alreadyConfigured).toBe(false);

      await request(app.getHttpServer())
        .get(`/api/evolution-servers/${dockerServerId}`)
        .set('Authorization', `Bearer ${tenantB_token}`)
        .expect(404);

      // Limpeza do servidor Docker vinculado pelo Tenant A
      await request(app.getHttpServer())
        .delete(`/api/evolution-servers/${dockerServerId}`)
        .set('Authorization', `Bearer ${tenantA_token}`)
        .expect(200);
    } finally {
      process.env.EVOLUTION_DOCKER_ENABLED = prevEnabled;
      process.env.EVOLUTION_DOCKER_BASE_URL = prevBaseUrl;
      process.env.EVOLUTION_DOCKER_API_KEY = prevApiKey;
    }
  });
});
