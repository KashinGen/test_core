import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { Logger } from 'nestjs-pino';
import * as qs from 'qs';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
  });

  app.use((req: any, res: any, next: any) => {
    if (req.url.includes('?')) {
      const queryString = req.url.split('?')[1];
      req.query = qs.parse(queryString, {
        allowDots: false,
        arrayLimit: 1000,
        depth: 10,
        parseArrays: true,
      });
    }
    next();
  });
  
  app.use((req: any, res: any, next: any) => {
    if (req.method === 'PATCH' && req.headers['content-type']?.includes('merge-patch+json')) {
      req.headers['content-type'] = 'application/json';
    }
    next();
  });

  app.useLogger(app.get(Logger));
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  const configService = app.get(ConfigService);
  const corsWhitelist = configService.get<string>('CORS_WHITELIST');
  
  if (!corsWhitelist || corsWhitelist.trim() === '') {
    const logger = app.get(Logger);
    logger.warn(
      'CORS_WHITELIST is not configured. CORS is disabled. ' +
      'Set CORS_WHITELIST environment variable to enable CORS.',
    );
  } else {
    const allowedOrigins = corsWhitelist.split(',').map(origin => origin.trim()).filter(origin => origin.length > 0);
    
    if (allowedOrigins.length === 0) {
      const logger = app.get(Logger);
      logger.warn('CORS_WHITELIST is empty. CORS is disabled.');
    } else {
      app.enableCors({
        origin: (origin, callback) => {
          if (!origin) {
            return callback(null, true);
          }
          
          if (allowedOrigins.includes(origin)) {
            callback(null, true);
          } else {
            callback(new Error(`Origin ${origin} is not allowed by CORS`));
          }
        },
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'x-gateway-auth', 'integrationAuthToken'],
      });
      
      const logger = app.get(Logger);
      logger.log(`CORS enabled with whitelist: ${allowedOrigins.join(', ')}`);
    }
  }

  const port = process.env.SERVER_PORT || 3000;
  const host = process.env.SERVER_HOST || '0.0.0.0';
  await app.listen(port, host);

  console.log(`Application is running on: http://${host}:${port}`);
}

bootstrap();


