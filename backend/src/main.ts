import { INestApplication, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import * as express from 'express';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { SanitizeInputPipe } from './common/pipes/sanitize-input.pipe';

export function configureApp(app: INestApplication): void {
  // Soporte XML/SOAP en texto plano además de JSON
  app.use(express.text({ type: ['text/xml', 'application/soap+xml', 'application/xml'] }));
  app.use(cookieParser());

  // Cabeceras HTTP de seguridad (CSP, X-Frame-Options, X-Content-Type-Options, HSTS)
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'https://*.tile.openstreetmap.org'],
        },
      },
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  app.enableCors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token', 'X-API-Key'],
  });

  app.setGlobalPrefix('api/v1', {
    exclude: AppModule.excludedGlobalPrefix,
  });

  app.useGlobalPipes(
    new SanitizeInputPipe(),
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('MediConnect Pro — API RESTful Clínica')
    .setDescription(
      'Web Services propios de MediConnect Pro (DWI Unidad 3 - UTC). Incluye autenticación JWT + X-API-Key, CSRF, RBAC, Agenda anti-colisión y Expediente Clínico cifrado AES-256-GCM.',
    )
    .setVersion('1.0.0')
    .addBearerAuth()
    .addApiKey({ type: 'apiKey', name: 'X-API-Key', in: 'header' }, 'X-API-Key')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  configureApp(app);
  const port = Number(process.env.PORT) || 4000;
  await app.listen(port);
  console.log(`MediConnect Pro API escuchando en http://localhost:${port}/api/v1`);
  console.log(`Swagger OpenAPI UI en http://localhost:${port}/api/docs`);
  console.log(`SOAP WSDL en http://localhost:${port}/soap/clinical?wsdl`);
}

if (require.main === module) {
  void bootstrap();
}
