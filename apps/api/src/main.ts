import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { AppModule } from './app.module';
import * as http from 'http';
import * as https from 'https';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api/v1');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const allowedOrigins = (process.env.FRONTEND_URL || '')
    .split(',')
    .map(o => o.trim())
    .filter(Boolean);

  // Always allow common dev ports
  const devOrigins = [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:3002',
    'http://localhost:3003',
  ];

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true); // allow non-browser (curl, Postman)
      const allowed = [...devOrigins, ...allowedOrigins];
      if (allowed.includes(origin)) return callback(null, true);
      callback(new Error(`CORS blocked: ${origin}`));
    },
    credentials: true,
  });

  app.useWebSocketAdapter(new IoAdapter(app));

  const config = new DocumentBuilder()
    .setTitle('Techie Ride API')
    .setDescription('Verified IT employee carpooling platform API')
    .setVersion('2.0')
    .addBearerAuth()
    .build();
  // Only expose Swagger UI in non-production environments
  if (process.env.NODE_ENV !== 'production') {
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
  }

  // ── Public health endpoint (no auth) — used by UptimeRobot to keep Render awake
  const httpAdapter = app.getHttpAdapter();
  // Render injects RENDER_GIT_COMMIT — exposing it lets the deploy-verify
  // workflow (and humans) confirm which commit is actually live.
  httpAdapter.get('/health', (_req: any, res: any) => {
    res.status(200).json({
      status: 'ok',
      ts: new Date().toISOString(),
      commit: process.env.RENDER_GIT_COMMIT || 'unknown',
    });
  });

  const port = process.env.PORT || 3001;
  await app.listen(port);
  console.log(`🚀 Techie Ride API running on http://localhost:${port}/api/v1`);
  if (process.env.NODE_ENV !== 'production') {
    console.log(`📚 Swagger docs at http://localhost:${port}/api/docs`);
  }

  // ── Self-ping every 10 min to prevent Render free-tier cold starts ─────────
  // Only runs in production (Render sets NODE_ENV=production)
  if (process.env.NODE_ENV === 'production') {
    const selfUrl = process.env.RENDER_EXTERNAL_URL || `http://localhost:${port}`;
    const pingUrl = `${selfUrl}/health`;
    const client = pingUrl.startsWith('https') ? https : http;
    setInterval(() => {
      client.get(pingUrl, (res) => {
        console.log(`🏓 Self-ping ${pingUrl} → ${res.statusCode}`);
      }).on('error', (err) => {
        console.warn(`⚠️  Self-ping failed: ${err.message}`);
      });
    }, 10 * 60 * 1000); // 10 minutes
    console.log(`🏓 Self-ping scheduler started → ${pingUrl} every 10 min`);
  }
}
bootstrap();
