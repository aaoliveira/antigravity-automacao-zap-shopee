import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/modules/database/prisma.service';

describe('Auth e2e Tests', () => {
  let app: INestApplication;
  let prisma: PrismaService;

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
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  const testUser = {
    name: 'Afiliado Teste',
    email: `afiliado-${Date.now()}@teste.com`,
    password: 'Password123!',
    tenantName: 'Afiliado Promoções',
  };

  let accessToken = '';
  let refreshToken = '';

  it('/api/auth/register (POST) - deve cadastrar novo usuário e tenant com sucesso', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send(testUser)
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe(testUser.email.toLowerCase());
    expect(res.body.data.tenant.name).toBe(testUser.tenantName);
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.body.data.refreshToken).toBeDefined();

    accessToken = res.body.data.accessToken;
    refreshToken = res.body.data.refreshToken;
  });

  it('/api/auth/register (POST) - deve rejeitar cadastro com email já existente (409)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send(testUser)
      .expect(409);

    expect(res.body.success).toBe(false);
    expect(res.body.error.message).toMatch(/Email já cadastrado/);
  });

  it('/api/auth/register (POST) - deve rejeitar senha fraca (400)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        name: 'Invalido',
        email: 'invalido@teste.com',
        password: 'fraca',
        tenantName: 'Org',
      })
      .expect(400);

    expect(res.body.success).toBe(false);
  });

  it('/api/auth/login (POST) - deve realizar login com credenciais corretas (200)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        email: testUser.email,
        password: testUser.password,
      })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toBeDefined();
    accessToken = res.body.data.accessToken;
  });

  it('/api/auth/login (POST) - deve rejeitar senha incorreta (401)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        email: testUser.email,
        password: 'SenhaErrada999!',
      })
      .expect(401);

    expect(res.body.success).toBe(false);
    expect(res.body.error.message).toMatch(/Credenciais inválidas/);
  });

  it('/api/auth/me (GET) - deve rejeitar requisição sem token (401)', async () => {
    await request(app.getHttpServer())
      .get('/api/auth/me')
      .expect(401);
  });

  it('/api/auth/me (GET) - deve retornar dados do usuário autenticado e tenantId (200)', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.email).toBe(testUser.email.toLowerCase());
    expect(res.body.data.tenantId).toBeDefined();
  });

  it('/api/auth/refresh (POST) - deve rotacionar refresh token válido (200)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .send({ refreshToken })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.body.data.refreshToken).toBeDefined();
  });

  it('/api/auth/logout (POST) - deve encerrar a sessão com sucesso (200)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
  });

  it('/api/auth/me (PATCH) - deve rejeitar campos não autorizados (userId/role) e validar senha ao trocar e-mail', async () => {
    // Rejeita tentativa de alterar tenantId / role via mass-assignment (400 forbidNonWhitelisted)
    await request(app.getHttpServer())
      .patch('/api/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Hacker', role: 'ADMIN', tenantId: '00000000-0000-0000-0000-000000000000' })
      .expect(400);

    // Atualiza nome, organização e fuso horário com sucesso
    const updateProfileRes = await request(app.getHttpServer())
      .patch('/api/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: 'Afiliado Editado E2E',
        tenantName: 'Operação Editada E2E',
        timezone: 'America/Fortaleza',
      })
      .expect(200);

    expect(updateProfileRes.body.success).toBe(true);
    expect(updateProfileRes.body.data.user.name).toBe('Afiliado Editado E2E');
    expect(updateProfileRes.body.data.tenant.name).toBe('Operação Editada E2E');
    expect(updateProfileRes.body.data.tenant.timezone).toBe('America/Fortaleza');

    // Troca de e-mail exige senha atual (400 se ausente)
    const updatedEmail = `editado-${Date.now()}@teste.com`;
    await request(app.getHttpServer())
      .patch('/api/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ email: updatedEmail })
      .expect(400);

    // Troca de e-mail com senha atual válida retorna sessão e novo JWT
    const updateEmailRes = await request(app.getHttpServer())
      .patch('/api/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        email: updatedEmail,
        currentPassword: testUser.password,
      })
      .expect(200);

    expect(updateEmailRes.body.data.user.email).toBe(updatedEmail);
    accessToken = updateEmailRes.body.data.accessToken;

    const meAfterRes = await request(app.getHttpServer())
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    expect(meAfterRes.body.data.email).toBe(updatedEmail);
    expect(meAfterRes.body.data.name).toBe('Afiliado Editado E2E');
    expect(meAfterRes.body.data.tenant.timezone).toBe('America/Fortaleza');

    // Altera senha validando senha atual
    await request(app.getHttpServer())
      .patch('/api/auth/me/password')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        currentPassword: 'SenhaErrada99!',
        newPassword: 'NovaSenha789!',
      })
      .expect(400);

    await request(app.getHttpServer())
      .patch('/api/auth/me/password')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        currentPassword: testUser.password,
        newPassword: 'NovaSenha789!',
      })
      .expect(200);

    // Senha antiga deve falhar no login (401) e nova senha deve funcionar (200)
    await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: updatedEmail, password: testUser.password })
      .expect(401);

    await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: updatedEmail, password: 'NovaSenha789!' })
      .expect(200);
  });
});
