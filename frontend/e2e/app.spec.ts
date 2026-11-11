import { test, expect } from '@playwright/test';

test.describe('ShopeeZap SaaS Frontend E2E Tests', () => {
  const timestamp = Date.now();
  const testUser = {
    name: 'Administrador E2E',
    email: `e2e-user-${timestamp}@teste.com`,
    password: 'Password123!',
    tenantName: `Afiliados VIP ${timestamp}`,
  };

  test.beforeEach(async ({ page }) => {
    // Intercepta rotas da API para testes isolados de navegação e componentes
    await page.route('**/api/auth/login', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            accessToken: 'mock-jwt-token-playwright',
            user: { id: 'usr-1', name: testUser.name, email: testUser.email },
            tenant: { id: 'tnt-1', name: testUser.tenantName, timezone: 'America/Sao_Paulo' },
          },
        }),
      });
    });

    await page.route('**/api/auth/register', async (route) => {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            accessToken: 'mock-jwt-token-playwright',
            user: { id: 'usr-1', name: testUser.name, email: testUser.email },
            tenant: { id: 'tnt-1', name: testUser.tenantName, timezone: 'America/Sao_Paulo' },
          },
        }),
      });
    });

    await page.route('**/api/dashboard/summary', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            automations: { active: 0, paused: 0, total: 0 },
            instances: { connected: 0, total: 0 },
            publications: { success: 0, failed: 0, total: 0 },
            recentExecutions: [],
          },
        }),
      });
    });

    await page.route('**/api/dashboard/upcoming', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: [] }),
      });
    });

    await page.route('**/api/automations', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: [] }),
      });
    });

    await page.route('**/api/history/executions**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { items: [], total: 0, page: 1, limit: 15, totalPages: 1 },
        }),
      });
    });

    await page.route('**/api/whatsapp-instances', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: [] }),
      });
    });

    await page.route('**/api/whatsapp-groups**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: [] }),
      });
    });

    await page.route('**/api/evolution-servers', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: [] }),
      });
    });

    await page.route('**/api/evolution-servers/docker/status', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            enabled: false,
            configured: false,
            online: false,
            displayUrl: null,
            alreadyConfigured: false,
            existingServer: null,
            dockerStartCommand: 'npm run docker:evolution:up',
            message: 'Desabilitado no mock padrão.',
          },
        }),
      });
    });

    await page.route('**/api/shopee-credentials', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: [] }),
      });
    });

    await page.route('**/api/group-links', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: [] }),
      });
    });

    await page.route('**/api/coupons/platforms', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [
            { id: 'SHOPEE', name: 'Shopee', label: 'Shopee Afiliados' },
            { id: 'MERCADO_LIVRE', name: 'Mercado Livre', label: 'Mercado Livre Afiliados' },
          ],
        }),
      });
    });

    await page.route('**/api/coupons', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: [], meta: { total: 0, maxLimit: 50 } }),
      });
    });

    await page.route('**/api/feature-flags', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            flags: {
              ml_alternative_b_enabled: true,
              ml_alternative_a_enabled: false,
            },
            items: [
              {
                key: 'ml_alternative_b_enabled',
                title: 'Mercado Livre — Alternativa B',
                description: 'Tela protótipo',
                enabled: true,
                defaultValue: true,
              },
              {
                key: 'ml_alternative_a_enabled',
                title: 'Mercado Livre — Alternativa A',
                description: 'OAuth 2.0 Oficial',
                enabled: false,
                defaultValue: false,
              },
            ],
          },
        }),
      });
    });

    await page.route('**/api/mercadolivre/status', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            featureFlags: {
              ml_alternative_b_enabled: true,
              ml_alternative_a_enabled: false,
            },
            accounts: [],
            defaultAccount: null,
            activeOffersCount: 0,
            extensionPackage: { ready: true, version: '1.0.0', contractVersion: '1.0.0', filesCount: 16 },
          },
        }),
      });
    });
  });

  test('Deve redirecionar visitante não autenticado para /login ao tentar acessar rotas protegidas', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/.*login/);
    await expect(page.locator('h2')).toContainText('Acesse sua conta');
  });

  test('Deve realizar cadastro de novo usuário e tenant com sucesso e redirecionar para o Dashboard', async ({ page }) => {
    await page.goto('/register');
    await expect(page.locator('h2')).toContainText('Crie sua conta de Afiliado');

    // Preenche formulário de registro
    await page.fill('#name', testUser.name);
    await page.fill('#tenantName', testUser.tenantName);
    await page.fill('#email', testUser.email);
    await page.fill('#password', testUser.password);

    await page.click('button[type="submit"]');

    // Deve redirecionar para o Dashboard com sessão ativa
    await expect(page).toHaveURL(/.*dashboard/);
    await expect(page.locator('header h2')).toContainText('Visão Geral da Operação');
    await expect(page.locator('text=Conta Nova')).toBeVisible();
  });

  test('Navegação completa entre módulos do SaaS', async ({ page }) => {
    // Autentica via tela de login
    await page.goto('/login');
    await page.fill('input[type="email"]', testUser.email);
    await page.fill('input[type="password"]', testUser.password);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/.*dashboard/);

    // 1. Navega para Automações
    await page.click('nav a:has-text("Automações")');
    await expect(page).toHaveURL(/.*automations/);
    await expect(page.locator('header h2')).toContainText('Motor de Automações');

    // 2. Navega para Publicações & Histórico
    await page.click('nav a:has-text("Publicações & Histórico")');
    await expect(page).toHaveURL(/.*history/);
    await expect(page.locator('header h2')).toContainText('Histórico de Publicações');

    // 3. Navega para WhatsApp & Grupos
    await page.click('nav a:has-text("WhatsApp & Grupos")');
    await expect(page).toHaveURL(/.*whatsapp-instances/);
    await expect(page.locator('header h2')).toContainText('WhatsApp & Evolution API');

    // 4. Navega para Shopee Afiliados
    await page.click('nav a:has-text("Shopee Afiliados")');
    await expect(page).toHaveURL(/.*shopee-credentials/);
    await expect(page.locator('header h2')).toContainText('Credenciais Shopee Affiliate');

    // 5. Navega para Configurações
    await page.click('nav a:has-text("Configurações")');
    await expect(page).toHaveURL(/.*settings/);
    await expect(page.locator('header h2')).toContainText('Configurações da Organização & Conta');
    await expect(page.locator('main').getByText(testUser.email)).toBeVisible();
  });

  test('Wizard de Automação: abre modal e percorre as etapas', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', testUser.email);
    await page.fill('input[type="password"]', testUser.password);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/.*dashboard/);

    await page.goto('/automations');
    await expect(page.locator('header h2')).toContainText('Motor de Automações');

    // Abre o Wizard
    await page.click('button:has-text("Nova Automação (Wizard)")');
    await expect(page.locator('text=Configurar Nova Automação')).toBeVisible();
    await expect(page.locator('text=Etapa 1: Dados da Automação, Plataforma e Credencial')).toBeVisible();
  });

  test('WhatsApp & Evolution: exibe guia em formato de checklist para configurar instância e servidor', async ({ page }) => {
    // Mock com 1 servidor já cadastrado para testar preenchimento em tempo real do formulário de instância
    await page.route('**/api/evolution-servers', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [
            {
              id: 'srv-1',
              name: 'Evolution Cloud',
              baseUrl: 'https://evo.exemplo.com',
              apiKeyMasked: '****1234',
              _count: { instances: 0 },
            },
          ],
        }),
      });
    });

    await page.goto('/login');
    await page.fill('input[type="email"]', testUser.email);
    await page.fill('input[type="password"]', testUser.password);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/.*dashboard/);

    await page.goto('/whatsapp-instances');
    await expect(page.locator('header h2')).toContainText('WhatsApp & Evolution API');

    // Abre o guia em formato de checklist a partir da criação de instância
    await page.click('button:has-text("Como configurar? (Checklist)")');
    const checklist = page.locator('section[aria-label="Checklist de configuração da instância WhatsApp"]');
    await expect(checklist).toBeVisible();
    await expect(checklist).toContainText('Guia Passo a Passo: Como Configurar sua Instância WhatsApp');
    await expect(checklist).toContainText('0 de 5 concluídas');
    await expect(checklist).toContainText('1 servidor(es) ativo(s)');

    // Marca itens do checklist e verifica atualização do progresso
    await page.check('#chk-step-server');
    await expect(checklist).toContainText('1 de 5 concluídas');
    await expect(checklist).toContainText('20%');

    // Preenche slug inválido e depois válido no formulário para testar feedback em tempo real no checklist
    const slugInput = page.locator('input[placeholder="Ex: zap-promocoes-01"]');
    await slugInput.fill('slug com espaco');
    await expect(checklist).toContainText('Remova espaços ou caracteres especiais');

    await slugInput.fill('zap-promocoes-01');
    await expect(checklist).toContainText('Slug no formato válido');

    // Navega para Servidores Evolution pelo atalho do checklist mantendo o guia visível
    await checklist.locator('button:has-text("Ir para Servidores Evolution")').click();
    await expect(page.locator('h3:has-text("Cadastrar Servidor Evolution API")')).toBeVisible();
    await expect(checklist).toBeVisible();

    // Fecha o checklist
    await checklist.locator('button:has-text("Fechar guia")').click();
    await expect(checklist).toBeHidden();
  });

  test('WhatsApp & Evolution: exibe status e permite conectar Evolution API rodando via Docker', async ({ page }) => {
    let dockerLinked = false;
    const serverList: any[] = [];

    await page.route('**/api/evolution-servers', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: serverList }),
      });
    });

    await page.route('**/api/evolution-servers/docker/status', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            enabled: true,
            configured: true,
            online: true,
            displayUrl: 'http://localhost:8080',
            alreadyConfigured: dockerLinked,
            existingServer: dockerLinked
              ? { id: 'srv-docker-1', name: 'Evolution API (Docker Local)', apiKeyMasked: '****prod' }
              : null,
            dockerStartCommand: 'npm run docker:evolution:up',
            message: 'Container Docker Evolution API conectado e pronto para uso.',
          },
        }),
      });
    });

    await page.route('**/api/evolution-servers/docker', async (route) => {
      dockerLinked = true;
      const newSrv = {
        id: 'srv-docker-1',
        name: 'Evolution Docker Teste',
        baseUrl: 'http://localhost:8080',
        apiKeyMasked: '****prod',
        isActive: true,
        _count: { instances: 0 },
      };
      serverList.splice(0, serverList.length, newSrv);
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: newSrv }),
      });
    });

    await page.goto('/login');
    await page.fill('input[type="email"]', testUser.email);
    await page.fill('input[type="password"]', testUser.password);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/.*dashboard/);

    await page.goto('/whatsapp-instances');
    await page.click('button:has-text("Servidores Evolution")');

    await expect(page.locator('text=Usar Evolution API via Docker')).toBeVisible();
    await expect(page.locator('text=Container Online')).toBeVisible();

    await page.fill('input[placeholder="Ex: Evolution API (Docker Local)"]', 'Evolution Docker Teste');
    await page.click('button:has-text("Conectar Evolution Docker")');

    await expect(page.locator('text=Evolution API (Docker) conectada e validada com sucesso!')).toBeVisible();
    await expect(page.locator('h5:has-text("Evolution Docker Teste")')).toBeVisible();
    await expect(page.locator('text=Sincronizar Servidor Docker')).toBeVisible();
  });

  test('Links Permanentes: configura roteamento por grupo mais vazio, troca destino e resolve rota pública /join/:slug', async ({ page }) => {
    const groupsMock = [
      {
        id: '11111111-1111-4111-8111-111111111111',
        name: 'Grupo VIP #1 (Lotado)',
        jid: '1203630001@g.us',
        participantCount: 50,
        maxParticipants: 50,
        inviteUrl: 'https://chat.whatsapp.com/VipGroupOne001',
        instance: { displayName: 'WhatsApp Principal' },
      },
      {
        id: '22222222-2222-4222-8222-222222222222',
        name: 'Grupo VIP #2 (Mais Vazio)',
        jid: '1203630002@g.us',
        participantCount: 5,
        maxParticipants: 50,
        inviteUrl: 'https://chat.whatsapp.com/VipGroupTwo002',
        instance: { displayName: 'WhatsApp Principal' },
      },
    ];

    const linksStore: any[] = [];

    await page.route('**/api/whatsapp-groups', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: groupsMock }),
      });
    });

    await page.route('**/api/group-links', async (route) => {
      if (route.request().method() === 'POST') {
        const created = {
          id: 'lnk-1',
          name: 'Clube Shopee VIP',
          slug: 'clube-shopee-vip',
          strategy: 'LEAST_FILLED',
          maxParticipants: 50,
          isActive: true,
          totalClicks: 0,
          currentGroupId: groupsMock[1].id,
          targets: [
            {
              id: 't1',
              groupId: groupsMock[0].id,
              inviteUrl: groupsMock[0].inviteUrl,
              maxParticipants: 50,
              group: groupsMock[0],
            },
            {
              id: 't2',
              groupId: groupsMock[1].id,
              inviteUrl: groupsMock[1].inviteUrl,
              maxParticipants: 50,
              group: groupsMock[1],
            },
          ],
        };
        linksStore.splice(0, linksStore.length, created);
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: created }),
        });
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: linksStore }),
      });
    });

    await page.route('**/api/group-links/lnk-1', async (route) => {
      if (route.request().method() === 'PUT') {
        linksStore[0].currentGroupId = groupsMock[0].id;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: linksStore[0] }),
        });
        return;
      }
      await route.fulfill({ status: 200, body: JSON.stringify({ success: true, data: linksStore[0] }) });
    });

    await page.goto('/login');
    await page.fill('input[type="email"]', testUser.email);
    await page.fill('input[type="password"]', testUser.password);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/.*dashboard/);

    await page.goto('/whatsapp-instances');
    await page.click('button:has-text("Links Permanentes")');

    await expect(page.locator('text=O grupo mudou. O link continua.')).toBeVisible();

    await page.fill('input[placeholder="Ex: Clube de Ofertas Shopee VIP"]', 'Clube Shopee VIP');
    await page.fill('input[placeholder="clube-vip-shopee"]', 'clube-shopee-vip');

    // Marca os dois grupos sincronizados
    await page.locator('label:has-text("Grupo VIP #1 (Lotado)") input[type="checkbox"]').check();
    await page.locator('label:has-text("Grupo VIP #2 (Mais Vazio)") input[type="checkbox"]').check();

    await page.click('button:has-text("Criar Link Permanente")');
    await expect(page.locator('text=Link permanente criado com sucesso!')).toBeVisible();
    await expect(page.getByText('LOTADO', { exact: true })).toBeVisible();
    await expect(page.getByText('ATUAL', { exact: true })).toBeVisible();

    // Testa troca manual de destino mantendo o mesmo link permanente
    await page.click('button:has-text("Definir como Atual")');
    await expect(page.locator('text=Destino do link')).toBeVisible();

    // Testa acesso público /join/:slug (sem precisar estar na área logada)
    await page.route('https://chat.whatsapp.com/**', async (route) => {
      await route.fulfill({ status: 200, contentType: 'text/plain', body: 'WhatsApp Invite Mock' });
    });
    await page.route('**/api/join/clube-shopee-vip/resolve', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            slug: 'clube-shopee-vip',
            name: 'Clube Shopee VIP',
            available: true,
            inviteUrl: 'https://chat.whatsapp.com/VipGroupTwo002',
            groupName: 'Grupo VIP #2 (Mais Vazio)',
            participantCount: 5,
            maxParticipants: 50,
            message: 'Grupo disponível encontrado.',
          },
        }),
      });
    });

    await page.goto('/join/clube-shopee-vip');
    await expect(page.locator('text=Clube Shopee VIP')).toBeVisible();
    await expect(page.locator('text=Grupo VIP #2 (Mais Vazio)')).toBeVisible();
    const joinBtn = page.locator('a:has-text("Entrar no Grupo do WhatsApp")');
    await expect(joinBtn).toHaveAttribute('href', 'https://chat.whatsapp.com/VipGroupTwo002');
  });

  test('Wizard de Automação: permite configurar randomização de disparos e vincular link permanente {link_grupo}', async ({ page }) => {
    const instId = 'inst-1';
    const credId = 'cred-1';

    await page.route('**/api/shopee-credentials', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [{ id: credId, label: 'Shopee Principal', appIdMasked: '100***01' }],
        }),
      });
    });

    await page.route('**/api/whatsapp-instances', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [{ id: instId, displayName: 'WhatsApp Ofertas', instanceName: 'zap-ofertas', status: 'CONNECTED' }],
        }),
      });
    });

    await page.route(`**/api/whatsapp-groups?instanceId=${instId}`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [
            { id: 'grp-1', name: 'Achadinhos 1', jid: '111@g.us', participantCount: 10 },
            { id: 'grp-2', name: 'Achadinhos 2', jid: '222@g.us', participantCount: 20 },
          ],
        }),
      });
    });

    await page.route('**/api/group-links', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [{ id: 'lnk-vip', name: 'Clube Permanente VIP', slug: 'clube-vip' }],
        }),
      });
    });

    await page.goto('/login');
    await page.fill('input[type="email"]', testUser.email);
    await page.fill('input[type="password"]', testUser.password);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/.*dashboard/);

    await page.goto('/automations');
    await page.click('button:has-text("Nova Automação (Wizard)")');

    // Etapa 1
    await page.fill('input[placeholder="Ex: Ofertas Achadinhos Casa & Cozinha"]', 'Campanha Randomizada E2E');
    await page.locator('select').first().selectOption(credId);
    await page.click('button:has-text("Próxima Etapa")');

    // Etapa 2
    await expect(page.locator('text=Etapa 2: Seleção da Instância WhatsApp')).toBeVisible();
    await page.locator('label:has-text("WhatsApp Ofertas")').click();
    await page.click('button:has-text("Próxima Etapa")');

    // Etapa 3: Seleção de grupos + Estratégia de Randomização + Link Permanente
    await expect(page.locator('text=Estratégia de Randomização dos Disparos')).toBeVisible();
    await page.locator('label:has-text("Achadinhos 1") input[type="checkbox"]').check();
    await page.locator('label:has-text("1 Grupo Aleatório")').click();
    await page.locator('select').first().selectOption('lnk-vip');
    await page.click('button:has-text("+ Inserir modelo com {link_grupo}")');

    await expect(page.locator('textarea')).toHaveValue(/\{link_grupo\}/);
  });

  test('Edição de Automação: permite editar somente quando estiver pausada ou inativa', async ({ page }) => {
    const instId = 'inst-edit-1';
    const credId = 'cred-edit-1';
    const automationsList = [
      {
        id: 'auto-active-1',
        name: 'Automação Em Execução',
        status: 'ACTIVE',
        instanceId: instId,
        shopeeCredentialId: credId,
        dispatchStrategy: 'ALL_SEQUENTIAL',
        frequencyMinutes: 60,
        dailyExecutionLimit: 20,
        jitterSeconds: 10,
        windowStartTime: '08:00',
        windowEndTime: '22:00',
        daysOfWeek: [1, 2, 3, 4, 5, 6, 7],
        dedupWindowDays: 7,
        nextExecutionAt: new Date(Date.now() + 3600000).toISOString(),
        instance: { displayName: 'WhatsApp Principal' },
        keywords: [{ id: 'k1', keyword: 'eletrônicos' }],
        groups: [{ groupId: 'grp-1', group: { id: 'grp-1', name: 'Grupo 1' } }],
      },
      {
        id: 'auto-paused-1',
        name: 'Automação Pausada Original',
        status: 'PAUSED',
        instanceId: instId,
        shopeeCredentialId: credId,
        dispatchStrategy: 'ALL_SEQUENTIAL',
        frequencyMinutes: 60,
        dailyExecutionLimit: 20,
        jitterSeconds: 10,
        windowStartTime: '08:00',
        windowEndTime: '22:00',
        daysOfWeek: [1, 2, 3, 4, 5, 6, 7],
        dedupWindowDays: 7,
        instance: { displayName: 'WhatsApp Principal' },
        keywords: [{ id: 'k2', keyword: 'casa' }],
        groups: [{ groupId: 'grp-1', group: { id: 'grp-1', name: 'Grupo 1' } }],
      },
    ];

    await page.route('**/api/shopee-credentials', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [{ id: credId, label: 'Shopee Principal', appId: '100***01' }],
        }),
      });
    });

    await page.route('**/api/whatsapp-instances', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [{ id: instId, displayName: 'WhatsApp Principal', instanceName: 'zap-edit', status: 'CONNECTED' }],
        }),
      });
    });

    await page.route(`**/api/whatsapp-groups?instanceId=${instId}`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [{ id: 'grp-1', name: 'Grupo 1', jid: '111@g.us', participantCount: 15 }],
        }),
      });
    });

    await page.route('**/api/automations', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: automationsList }),
      });
    });

    await page.route('**/api/automations/auto-paused-1/deactivate', async (route) => {
      automationsList[1].status = 'INACTIVE';
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: { status: 'INACTIVE' } }),
      });
    });

    await page.route('**/api/automations/auto-paused-1', async (route) => {
      if (route.request().method() === 'PUT') {
        const body = route.request().postDataJSON();
        automationsList[1].name = body.name;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: automationsList[1] }),
        });
        return;
      }
      if (route.request().method() === 'DELETE') {
        automationsList.splice(1, 1);
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: { message: 'Removida' } }),
        });
        return;
      }
      await route.fulfill({ status: 405 });
    });

    await page.goto('/login');
    await page.fill('input[type="email"]', testUser.email);
    await page.fill('input[type="password"]', testUser.password);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/.*dashboard/);

    await page.goto('/automations');

    // Card ativo deve manter os botões Editar e Excluir desabilitados
    const activeCard = page.locator('.divide-y > div', { hasText: 'Automação Em Execução' });
    await expect(activeCard.locator('button:has-text("Editar")')).toBeDisabled();
    await expect(activeCard.locator('button:has-text("Excluir")')).toBeDisabled();

    // Card pausado deve permitir Editar, mas manter Excluir desabilitado (precisa estar INACTIVE)
    const pausedCard = page.locator('.divide-y > div', { hasText: 'Automação Pausada Original' });
    await expect(pausedCard.locator('button:has-text("Excluir")')).toBeDisabled();

    const editBtn = pausedCard.locator('button:has-text("Editar")');
    await expect(editBtn).toBeEnabled();
    await editBtn.click();

    // Modal abre em modo edição pré-preenchido
    await expect(page.locator('h3:has-text("Editar Automação")')).toBeVisible();
    const nameInput = page.locator('input[placeholder="Ex: Ofertas Achadinhos Casa & Cozinha"]');
    await expect(nameInput).toHaveValue('Automação Pausada Original');

    await nameInput.fill('Automação Pausada Editada');
    await page.click('button:has-text("6. Revisão")');
    await page.click('button:has-text("Salvar Alterações")');

    await expect(page.locator('text=Automação atualizada com sucesso!')).toBeVisible();
    const editedCard = page.locator('.divide-y > div', { hasText: 'Automação Pausada Editada' });
    await expect(editedCard).toBeVisible();

    // Inativa a automação para liberar exclusão
    await editedCard.locator('button:has-text("Inativar")').click();
    await expect(page.locator('text=Automação inativada com sucesso.')).toBeVisible();
    await expect(editedCard.getByText('Inativa', { exact: true })).toBeVisible();
    await expect(editedCard.locator('button:has-text("Editar")')).toBeEnabled();
    await expect(editedCard.locator('button:has-text("Excluir")')).toBeEnabled();

    // Exclui somente após estar inativa
    page.once('dialog', (dialog) => dialog.accept());
    await editedCard.locator('button:has-text("Excluir")').click();
    await expect(page.locator('text=Automação excluída com sucesso.')).toBeVisible();
    await expect(page.locator('h5:has-text("Automação Pausada Editada")')).toHaveCount(0);
  });

  test('Módulo de Cupons: CRUD por plataforma existente (Shopee), preview WhatsApp e uso no Wizard de Automação', async ({ page }) => {
    const couponsStore: any[] = [];

    await page.route('**/api/coupons', async (route) => {
      if (route.request().method() === 'POST') {
        const body = route.request().postDataJSON();
        const created = {
          id: 'cp-e2e-1',
          ...body,
          isActive: true,
          usageCount: 0,
        };
        couponsStore.splice(0, couponsStore.length, created);
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: created }),
        });
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: couponsStore,
          meta: { total: couponsStore.length, maxLimit: 50 },
        }),
      });
    });

    await page.route('**/api/coupons/cp-e2e-1/toggle', async (route) => {
      couponsStore[0].isActive = !couponsStore[0].isActive;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: couponsStore[0] }),
      });
    });

    await page.route('**/api/coupons/cp-e2e-1', async (route) => {
      if (route.request().method() === 'PUT') {
        const body = route.request().postDataJSON();
        couponsStore[0] = { ...couponsStore[0], ...body };
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: couponsStore[0] }),
        });
        return;
      }
      if (route.request().method() === 'DELETE') {
        couponsStore.splice(0, 1);
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, message: 'Excluído' }),
        });
        return;
      }
      await route.fulfill({ status: 405 });
    });

    await page.goto('/login');
    await page.fill('input[type="email"]', testUser.email);
    await page.fill('input[type="password"]', testUser.password);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/.*dashboard/);

    // Navega via menu lateral para Cupons
    await page.click('nav a:has-text("Cupons")');
    await expect(page).toHaveURL(/.*coupons/);
    await expect(page.locator('text=Nenhum cupom cadastrado.')).toBeVisible();
    await expect(page.locator('text=VOCÊ ESCREVE')).toBeVisible();
    await expect(page.locator('text=CHEGA NO WHATSAPP')).toBeVisible();

    // Abre modal Novo cupom
    await page.click('button:has-text("+ Novo cupom")');
    await expect(page.locator('h3:has-text("Novo cupom")')).toBeVisible();
    await expect(page.locator('button:has-text("Shopee")')).toBeVisible();

    await page.fill('input[placeholder="Ex: PROMO10"]', 'PROMO10');
    await page.fill('input[placeholder="Ex: 10"]', '10');
    await page.locator('input[placeholder="Ex: 50.00"]').nth(0).fill('20');
    await page.locator('input[placeholder="Ex: 50.00"]').nth(1).fill('50');
    await page.fill('input[placeholder="Ex: fone, caixa de som, headset"]', 'fone, headset');

    await page.click('button:has-text("Salvar cupom")');
    await expect(page.locator('text=Cupom cadastrado com sucesso!')).toBeVisible();
    await expect(page.locator('text=1 de 50 cadastrados')).toBeVisible();
    await expect(page.getByText('PROMO10', { exact: true })).toBeVisible();

    // Edita cupom
    await page.click('button:has-text("Editar")');
    await page.fill('input[placeholder="Ex: PROMO10"]', 'PROMO15');
    await page.click('button:has-text("Salvar cupom")');
    await expect(page.locator('text=Cupom atualizado com sucesso!')).toBeVisible();
    await expect(page.getByText('PROMO15', { exact: true })).toBeVisible();

    // Alterna status e exclui
    await page.click('button:has-text("Desativar")');
    await expect(page.locator('text=desativado')).toBeVisible();

    await page.click('button:has-text("Ativar")');
    await expect(page.locator('text=ativado')).toBeVisible();

    // Integra no Wizard de Automação
    await page.route('**/api/shopee-credentials', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: [{ id: 'c1', label: 'Shopee', appId: '1001' }] }),
      });
    });
    await page.route('**/api/whatsapp-instances', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [{ id: 'i1', displayName: 'Zap Cupom', instanceName: 'zap-cp', status: 'CONNECTED' }],
        }),
      });
    });
    await page.route('**/api/whatsapp-groups?instanceId=i1', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [{ id: 'g1', name: 'Grupo Cupom', jid: '123@g.us', participantCount: 10 }],
        }),
      });
    });

    await page.goto('/automations');
    await page.click('button:has-text("Nova Automação (Wizard)")');
    await page.fill('input[placeholder="Ex: Ofertas Achadinhos Casa & Cozinha"]', 'Automação com Cupom');
    await page.locator('select').first().selectOption('c1');
    await page.click('button:has-text("Próxima Etapa")');
    await page.locator('label:has-text("Zap Cupom")').click();
    await page.click('button:has-text("Próxima Etapa")');

    await page.locator('select').last().selectOption('cp-e2e-1');
    await page.click('button:has-text("+ Inserir modelo com Cupom")');
    await expect(page.locator('textarea')).toHaveValue(/\{\{cupom\}\}/);
  });

  test('Mercado Livre Híbrido: Feature Flags padrão (B=ON, A=OFF), Alternativa B protótipo e Alternativa A OAuth/meli.la', async ({ page }) => {
    const mlState = {
      flags: {
        ml_alternative_b_enabled: true,
        ml_alternative_a_enabled: false,
      },
      account: null as any,
      offers: [] as any[],
    };

    await page.route('**/api/feature-flags', async (route) => {
      if (route.request().method() === 'PATCH') {
        const body = route.request().postDataJSON();
        Object.assign(mlState.flags, body);
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            flags: { ...mlState.flags },
            items: [],
          },
        }),
      });
    });

    await page.route('**/api/mercadolivre/status', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            featureFlags: { ...mlState.flags },
            accounts: mlState.account ? [mlState.account] : [],
            defaultAccount: mlState.account,
            activeOffersCount: mlState.offers.length,
            extensionPackage: { ready: true, version: '1.0.0', contractVersion: '1.0.0', filesCount: 16 },
          },
        }),
      });
    });

    await page.route('**/api/mercadolivre/extension/token**', async (route) => {
      if (route.request().method() === 'DELETE') {
        if (mlState.account) mlState.account.hasExtensionToken = false;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: { success: true } }),
        });
        return;
      }
      if (!mlState.account) {
        mlState.account = {
          id: 'ml-acc-e2e-1',
          label: 'Conta Mercado Livre',
          isCookieConnected: false,
          cookieDaysRemaining: 0,
          hasExtensionToken: true,
        };
      } else {
        mlState.account.hasExtensionToken = true;
      }
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            accountId: mlState.account.id,
            extensionToken: 'ext-e2e-token-abc123.deadbeef',
            maskedToken: '************df',
          },
        }),
      });
    });

    await page.route('**/api/mercadolivre/extension/download', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/zip',
        headers: {
          'Content-Disposition': 'attachment; filename="shopeezap-ml-extensao-v1.0.0.zip"',
        },
        body: Buffer.from('PK\x03\x04mockzip'),
      });
    });

    await page.route('**/api/mercadolivre/prototype/config', async (route) => {
      const body = route.request().postDataJSON();
      mlState.account = {
        id: 'ml-acc-e2e-1',
        label: body.label || 'Conta Mercado Livre',
        affiliateTag: body.affiliateTag,
        sessionCookieMasked: '************abc123',
        isCookieConnected: true,
        cookieDaysRemaining: 14,
        isCookieExpired: false,
        isOAuthConnected: false,
      };
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: mlState.account }),
      });
    });

    await page.route('**/api/mercadolivre/prototype/test-conversion', async (route) => {
      const body = route.request().postDataJSON();
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            converted: false,
            status: 'OFFICIAL_CONTRACT_REQUIRED',
            originalUrl: body.url,
            affiliateTag: mlState.account?.affiliateTag,
            isCookieConnected: true,
            message: 'Sessão validada. Configure um Gateway Parceiro Homologado para conversão server-side.',
          },
        }),
      });
    });

    await page.route('**/api/mercadolivre/search**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            items: [
              {
                mlItemId: 'MLB777',
                title: 'Caixa de Som JBL Go 4 Bluetooth',
                price: 249.9,
                originalPrice: 349.9,
                imageUrl: 'https://http2.mlstatic.com/jbl.jpg',
                permalink: 'https://produto.mercadolivre.com.br/MLB-777',
                sellerName: 'Loja Oficial JBL',
              },
            ],
            total: 1,
          },
        }),
      });
    });

    await page.route('**/api/mercadolivre/offers', async (route) => {
      if (route.request().method() === 'POST') {
        const body = route.request().postDataJSON();
        const created = { id: 'offer-e2e-1', isActive: true, ...body };
        mlState.offers.push(created);
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: created }),
        });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { items: mlState.offers, total: mlState.offers.length },
        }),
      });
    });

    // Autentica via Login
    await page.goto('/login');
    await page.fill('input[type="email"]', testUser.email);
    await page.fill('input[type="password"]', testUser.password);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/.*dashboard/);

    // Navega via menu lateral para Mercado Livre
    await page.click('nav a:has-text("Mercado Livre")');
    await expect(page).toHaveURL(/.*mercadolivre/);

    // Por padrão: Alternativa B visível e Alternativa A oculta
    await expect(page.getByTestId('section-ml-alt-b')).toBeVisible();
    await expect(page.getByTestId('section-ml-alt-a')).toHaveCount(0);
    await expect(page.getByTestId('extension-version-badge')).toContainText('v1.0.0');

    // Manual de instalação + download da extensão + geração/revogação de token
    await page.getByTestId('btn-toggle-install-manual').click();
    await expect(page.getByTestId('extension-install-manual')).toBeVisible();
    await expect(page.locator('text=chrome://extensions')).toBeVisible();

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByTestId('btn-download-extension').click(),
    ]);
    expect(download.suggestedFilename()).toContain('shopeezap-ml-extensao-v1.0.0.zip');

    await page.getByTestId('btn-generate-ext-token').click();
    await expect(page.getByTestId('generated-ext-token-value')).toContainText('ext-e2e-token-abc123');
    await page.on('dialog', (d) => d.accept());
    await page.getByTestId('btn-revoke-ext-token').click();
    await expect(page.getByTestId('generated-ext-token-value')).toHaveCount(0);

    // Salva configuração Alternativa B
    await page.fill('input[placeholder="Ex: azevedoalexandre39"]', 'azevedoalexandre39');
    await page.locator('textarea').fill('orguserid=123; ssid=abc; orguseridp=xyz');
    await page.click('button:has-text("Salvar e Validar")');

    await expect(page.locator('text=azevedoalexandre39')).toBeVisible();
    await expect(page.locator('text=expira em 14 dias')).toBeVisible();

    // Testa conversão honesta
    await page.fill('input[placeholder*="mercadolivre.com.br"]', 'https://www.mercadolivre.com.br/p/MLB777');
    await page.click('button:has-text("Testar")');
    await expect(page.locator('text=Validação Local Concluída')).toBeVisible();

    // Ativa Alternativa A via Feature Flag switch
    await page.getByTestId('toggle-ml-alt-a').click();
    await expect(page.getByTestId('section-ml-alt-a')).toBeVisible();

    // Busca no catálogo oficial e importa link meli.la
    await page.fill('input[placeholder*="fone bluetooth samsung"]', 'jbl');
    await page.click('button:has-text("Buscar Produtos")');
    await expect(page.locator('text=Caixa de Som JBL Go 4 Bluetooth')).toBeVisible();
    await expect(page.locator('text=Loja Oficial JBL')).toBeVisible();

    await page.click('button:has-text("Vincular meli.la")');
    await page.fill('input[placeholder="https://meli.la/..."]', 'https://meli.la/2e2eOK');
    await page.click('button:has-text("Salvar na Fila")');
    await expect(page.locator('text=https://meli.la/2e2eOK')).toBeVisible();

    // Desabilita Alternativa B via Feature Flag switch
    await page.getByTestId('toggle-ml-alt-b').click();
    await expect(page.getByTestId('section-ml-alt-b')).toHaveCount(0);
    await expect(page.getByTestId('section-ml-alt-a')).toBeVisible();
  });

  test('Anti-Ban Item 5: Alerta Circuit Breaker no Dashboard, Proteção/Warm-up de Instância, Badges de Grupo e Termômetro de Risco no Wizard', async ({ page }) => {
    const instState = {
      id: 'inst-antiban-1',
      tenantId: 'tnt-1',
      serverId: 'srv-1',
      instanceName: 'zap-vip-01',
      displayName: 'WhatsApp Principal VIP',
      status: 'CONNECTED',
      dailyMessageLimit: 100,
      minIntervalSeconds: 15,
      warmUpEnabled: true,
      warmUpStageDays: 1,
      effectiveDailyLimit: 20,
      messagesSentToday: 18,
      isCircuitOpen: true,
      consecutiveSendFailures: 2,
      circuitOpenUntil: new Date(Date.now() + 30 * 60_000).toISOString(),
      lastErrorReason: 'Evolution API retornou status 429: rate-overlimit',
      server: { id: 'srv-1', name: 'Evolution Principal', baseUrl: 'https://evo.exemplo.com' },
      _count: { groups: 2 },
    };

    const groupsState = [
      {
        id: 'grp-admin-only',
        instanceId: 'inst-antiban-1',
        jid: '1203630111@g.us',
        name: 'Grupo Ofertas Somente Admin',
        participantCount: 250,
        maxParticipants: 1024,
        isActive: false,
        isAnnounceOnly: true,
        isRestricted: true,
        sendBlockedReason: 'Contact is not in group (403)',
        instance: { id: 'inst-antiban-1', displayName: 'WhatsApp Principal VIP' },
      },
      {
        id: 'grp-normal',
        instanceId: 'inst-antiban-1',
        jid: '1203630222@g.us',
        name: 'Grupo Ofertas Aberto',
        participantCount: 120,
        maxParticipants: 1024,
        isActive: true,
        isAnnounceOnly: false,
        isRestricted: false,
        sendBlockedReason: null,
        instance: { id: 'inst-antiban-1', displayName: 'WhatsApp Principal VIP' },
      },
    ];

    await page.route('**/api/dashboard/summary', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            automations: { active: 1, paused: 0, total: 1 },
            instances: { connected: 1, total: 1 },
            publications: { success: 18, failed: 1, total: 19 },
            alerts: {
              openCircuits: instState.isCircuitOpen
                ? [
                    {
                      id: instState.id,
                      displayName: instState.displayName,
                      instanceName: instState.instanceName,
                      status: instState.status,
                      circuitOpenUntil: instState.circuitOpenUntil,
                      consecutiveSendFailures: instState.consecutiveSendFailures,
                      lastErrorReason: instState.lastErrorReason,
                    },
                  ]
                : [],
            },
            recentExecutions: [],
          },
        }),
      });
    });

    await page.route('**/api/whatsapp-instances', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: [instState] }),
      });
    });

    await page.route('**/api/whatsapp-instances/*/safety-settings', async (route) => {
      const payload = route.request().postDataJSON();
      instState.dailyMessageLimit = payload.dailyMessageLimit;
      instState.minIntervalSeconds = payload.minIntervalSeconds;
      instState.warmUpEnabled = payload.warmUpEnabled;
      instState.effectiveDailyLimit = payload.warmUpEnabled ? Math.min(20, payload.dailyMessageLimit) : payload.dailyMessageLimit;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: instState }),
      });
    });

    await page.route('**/api/whatsapp-instances/*/reset-circuit', async (route) => {
      instState.isCircuitOpen = false;
      instState.consecutiveSendFailures = 0;
      instState.circuitOpenUntil = '';
      instState.lastErrorReason = '';
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: instState }),
      });
    });

    await page.route('**/api/whatsapp-groups**', async (route) => {
      if (route.request().method() === 'PATCH') {
        const body = route.request().postDataJSON();
        groupsState[0].isActive = Boolean(body.isActive);
        if (body.isActive) groupsState[0].sendBlockedReason = null as any;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: groupsState[0] }),
        });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: groupsState }),
      });
    });

    await page.route('**/api/shopee-credentials', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [{ id: 'cred-1', label: 'Shopee Principal', appId: '998877', isValid: true }],
        }),
      });
    });

    // Login e verifica alerta Circuit Breaker no Dashboard
    await page.goto('/login');
    await page.fill('input[type="email"]', testUser.email);
    await page.fill('input[type="password"]', testUser.password);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/.*dashboard/);

    await expect(page.getByTestId('dashboard-circuit-alerts')).toBeVisible();
    await expect(page.getByTestId('dashboard-circuit-alerts')).toContainText('WhatsApp Principal VIP');
    await expect(page.getByTestId('dashboard-circuit-alerts')).toContainText('rate-overlimit');

    // Navega para WhatsApp & Evolution e verifica cota, Warm-up e Reset Circuit Breaker
    await page.click('nav a:has-text("WhatsApp")');
    await expect(page).toHaveURL(/.*whatsapp/);

    await expect(page.getByTestId('instance-daily-quota')).toContainText('18 / 20');
    await expect(page.getByTestId('instance-circuit-badge')).toBeVisible();

    await page.getByTestId('btn-open-safety-modal').click();
    await page.getByTestId('input-safety-daily-limit').fill('150');
    await page.getByTestId('input-safety-min-interval').fill('25');
    await page.getByTestId('btn-save-safety-settings').click();
    await expect(page.locator('text=Cooldown: 25s')).toBeVisible();

    await page.getByTestId('btn-reset-circuit').click();
    await expect(page.getByTestId('instance-circuit-badge')).toHaveCount(0);

    // Aba Grupos: badge Apenas Admins, motivo do bloqueio e botão Reativar
    await page.click('button:has-text("Grupos Sincronizados")');
    await expect(page.getByTestId('group-announce-badge')).toContainText('Apenas Admins');
    await expect(page.getByTestId('group-blocked-badge')).toBeVisible();
    await page.getByTestId('btn-reactivate-group').click();
    await expect(page.getByTestId('group-blocked-badge')).toHaveCount(0);

    // Automações: Termômetro de risco dinâmico + Spintax helper no Wizard
    await page.click('nav a:has-text("Automações")');
    await expect(page).toHaveURL(/.*automations/);
    await page.click('button:has-text("Nova Automação (Wizard)")');

    // Etapa 1
    await page.fill('input[placeholder="Ex: Ofertas Achadinhos Casa & Cozinha"]', 'Esteira Anti-Ban E2E');
    await page.locator('select').first().selectOption('cred-1');
    await page.click('button:has-text("Próxima Etapa")');

    // Etapa 2
    await page.locator('label:has-text("WhatsApp Principal VIP")').click();
    await page.click('button:has-text("Próxima Etapa")');

    // Etapa 3: verifica badge Apenas Admins nos grupos + insere Spintax Anti-Ban
    await expect(page.locator('text=Apenas Admins').first()).toBeVisible();
    await page.locator('label:has-text("Grupo Ofertas Aberto") input[type="checkbox"]').check();
    await page.click('button:has-text("+ Inserir Spintax Anti-Ban")');
    await page.click('button:has-text("Próxima Etapa")');

    // Etapa 4: adiciona palavra-chave
    await page.fill('input[placeholder*="fone bluetooth"]', 'fone');
    await page.click('button:has-text("Adicionar")');
    await page.click('button:has-text("Próxima Etapa")');

    // Etapa 5: valida Termômetro Anti-Banimento dinâmico
    await expect(page.getByTestId('antiban-risk-meter')).toContainText('Termômetro Anti-Banimento: Baixo Risco');
    // Reduz jitter para 0 -> risco sobe para Risco Moderado / Alto Risco
    const jitterInput = page.locator('input[type="number"][max="60"]');
    await jitterInput.fill('0');
    await expect(page.getByTestId('antiban-risk-meter')).toContainText('Risco Moderado');
  });

  test('Configurações: permite editar dados do cadastro do usuário (nome, organização, fuso horário, e-mail) e alterar senha', async ({ page }) => {
    const profileState = {
      user: {
        id: 'usr-1',
        name: testUser.name,
        email: testUser.email,
        role: 'OWNER',
      },
      tenant: {
        id: 'tnt-1',
        name: testUser.tenantName,
        slug: 'afiliados-vip',
        timezone: 'America/Sao_Paulo',
      },
    };

    await page.route('**/api/auth/me', async (route) => {
      if (route.request().method() === 'PATCH') {
        const body = route.request().postDataJSON();
        if (body.name) profileState.user.name = body.name;
        if (body.email) profileState.user.email = body.email;
        if (body.tenantName) profileState.tenant.name = body.tenantName;
        if (body.timezone) profileState.tenant.timezone = body.timezone;

        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              user: profileState.user,
              tenant: profileState.tenant,
              accessToken: 'updated-jwt-token',
              refreshToken: 'updated-refresh-token',
            },
          }),
        });
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            userId: profileState.user.id,
            name: profileState.user.name,
            email: profileState.user.email,
            role: profileState.user.role,
            tenantId: profileState.tenant.id,
            tenant: profileState.tenant,
          },
        }),
      });
    });

    await page.route('**/api/auth/me/password', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { message: 'Senha alterada com sucesso.' },
        }),
      });
    });

    await page.route('**/api/feature-flags', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: { items: [] } }),
      });
    });

    await page.goto('/login');
    await page.fill('input[type="email"]', testUser.email);
    await page.fill('input[type="password"]', testUser.password);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/.*dashboard/);

    await page.click('nav a:has-text("Configurações")');
    await expect(page).toHaveURL(/.*settings/);

    // Edita nome, organização e fuso horário sem mudar e-mail
    await expect(page.getByTestId('input-profile-name')).toHaveValue(testUser.name);
    await page.getByTestId('input-profile-name').fill('Alexandre Editado');
    await page.getByTestId('input-profile-tenant-name').fill('Minha Operação Editada');
    await page.getByTestId('select-profile-timezone').selectOption('America/Manaus');
    await page.getByTestId('btn-save-profile').click();

    await expect(page.getByTestId('profile-feedback')).toContainText('Dados do cadastro atualizados com sucesso!');
    await expect(page.locator('aside')).toContainText('Alexandre Editado');

    // Altera e-mail -> campo de senha atual deve aparecer e confirmar troca
    await page.getByTestId('input-profile-email').fill('novo.alexandre@teste.com');
    await expect(page.getByTestId('input-profile-current-password')).toBeVisible();
    await page.getByTestId('input-profile-current-password').fill(testUser.password);
    await page.getByTestId('btn-save-profile').click();

    await expect(page.getByTestId('profile-feedback')).toContainText('Dados do cadastro atualizados com sucesso!');
    await expect(page.locator('aside')).toContainText('novo.alexandre@teste.com');

    // Altera senha (primeiro valida erro de confirmação divergente, depois sucesso)
    await page.getByTestId('input-change-current-password').fill(testUser.password);
    await page.getByTestId('input-change-new-password').fill('NovaSenha99!');
    await page.getByTestId('input-change-confirm-password').fill('Diferente99!');
    await page.getByTestId('btn-save-password').click();
    await expect(page.getByTestId('password-feedback')).toContainText('não conferem');

    await page.getByTestId('input-change-confirm-password').fill('NovaSenha99!');
    await page.getByTestId('btn-save-password').click();
    await expect(page.getByTestId('password-feedback')).toContainText('Senha alterada com sucesso!');
  });
});
