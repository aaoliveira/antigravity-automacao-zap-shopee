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
    await expect(page.locator('text=Etapa 1: Dados da Automação e Credencial Shopee')).toBeVisible();
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
    await page.locator('select').last().selectOption('lnk-vip');
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
});
