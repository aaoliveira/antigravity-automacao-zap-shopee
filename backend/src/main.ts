import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  // Headers de segurança HTTP (OWASP / Helmet)
  app.use(
    helmet({
      contentSecurityPolicy: process.env.NODE_ENV === 'production' ? undefined : false,
      crossOriginEmbedderPolicy: false,
    }),
  );

  // Prefixo global
  app.setGlobalPrefix('api');

  // Validação estrita de entrada
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // CORS
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const allowedOrigins = new Set(
    [frontendUrl, 'http://localhost:5173']
      .flatMap((v) => v.split(','))
      .map((s) => s.trim())
      .filter(Boolean),
  );
  app.enableCors({
    origin: (origin, callback) => {
      if (
        !origin ||
        allowedOrigins.has(origin) ||
        /^chrome-extension:\/\/[a-z]{32}$/.test(origin)
      ) {
        callback(null, true);
        return;
      }
      callback(new Error(`Origem CORS não permitida: ${origin}`), false);
    },
    credentials: true,
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Accept',
      'X-Extension-Token',
      'X-Extension-Version',
      'X-Request-Id',
    ],
    exposedHeaders: ['Content-Disposition'],
  });

  const port = process.env.PORT || 3005;
  await app.listen(port);
  logger.log(`Backend rodando com sucesso na porta: ${port}`);
}

bootstrap();
