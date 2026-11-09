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

    await page.route('**/api/shopee-credentials', async (route) => {
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
});
