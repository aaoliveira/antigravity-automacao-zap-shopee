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
});
