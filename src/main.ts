import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { Logger } from 'nestjs-pino';
import * as qs from 'qs';
import { NestExpressApplication } from '@nestjs/platform-express';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
  });

  // Настройка парсинга query параметров для поддержки вложенных объектов
  // Поддержка формата order[name]=asc&order[email]=desc
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
  
  // Поддержка application/merge-patch+json для PATCH запросов
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

  const port = process.env.PORT || 3000;
  await app.listen(port);

  console.log(`Application is running on: http://localhost:${port}`);
}

bootstrap();


