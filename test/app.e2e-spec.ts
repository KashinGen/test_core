import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('AppController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/accounts (POST) - should create user', () => {
    return request(app.getHttpServer())
      .post('/accounts')
      .send({
        email: 'test@example.com',
        plainPassword: 'password123',
        role: 'USER',
      })
      .expect(201)
      .expect((res) => {
        expect(res.body).toHaveProperty('id');
      });
  });

  it('/accounts (POST) - should fail with invalid email', () => {
    return request(app.getHttpServer())
      .post('/accounts')
      .send({
        email: 'invalid-email',
        plainPassword: 'password123',
        role: 'USER',
      })
      .expect(400);
  });
});


