import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoggerModule } from 'nestjs-pino';
import { TerminusModule } from '@nestjs/terminus';
import { RedisModule } from '@infrastructure/adapters/redis.module';
import {
  UserEntity,
  PasswordResetEntity,
  AuditLogEntity,
} from '@infrastructure/entities';
import { PasswordResetRepository } from '@infrastructure/repos/password-reset.repository';
import { UserRepository } from '@infrastructure/repos/user.repository';
import { AuditLogRepository } from '@infrastructure/repos/audit-log.repository';
import { PermissionRepository } from '@infrastructure/repos/permission.repository';
import { HydraMapper } from '@presentation/mappers/hydra.mapper';
import { NotificationModule } from '@infrastructure/services/notification.module';
import { GatewayAuthGuard } from '@presentation/guards/gateway-auth.guard';
import { APP_GUARD } from '@nestjs/core';
import {
  AuthorizationService,
  JwtExtractorService,
  RolesGuard,
  SelfOrRolesGuard,
} from '@presentation/authorization';

// Services
import { UserService } from '@infrastructure/services/user.service';
import { PasswordResetService } from '@infrastructure/services/password-reset.service';
import { JwtService } from '@infrastructure/services/jwt.service';

// Controllers
import { AccountsController } from '@presentation/accounts/accounts.controller';
import { InternalController } from '@presentation/internal/internal.controller';
import { HealthController } from '@presentation/health/health.controller';
import { RedisHealthIndicator } from '@presentation/health/redis-health.indicator';
import { AuthController } from '@presentation/auth/auth.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    LoggerModule.forRoot(),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.POSTGRES_HOST || 'localhost',
      port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
      username: process.env.POSTGRES_USER || 'postgres',
      password: process.env.POSTGRES_PASSWORD || 'postgres',
      database: process.env.POSTGRES_DB || 'core_db',
      ssl: process.env.POSTGRES_SSL_ENABLED === 'true'
        ? {
            rejectUnauthorized: false,
            ca: process.env.POSTGRES_SSL_CERT || undefined,
          }
        : false,
      replication: process.env.POSTGRES_SLAVE_1_HOST
        ? {
            master: {
              host: process.env.POSTGRES_HOST || 'localhost',
              port: parseInt(
                process.env.POSTGRES_PORT || '5432',
                10,
              ),
              username: process.env.POSTGRES_USER || 'postgres',
              password: process.env.POSTGRES_PASSWORD || 'postgres',
              database: process.env.POSTGRES_DB || 'core_db',
              ssl: process.env.POSTGRES_SSL_ENABLED === 'true'
                ? {
                    rejectUnauthorized: false,
                    ca: process.env.POSTGRES_SSL_CERT || undefined,
                  }
                : false,
            },
            slaves: [
              {
                host: process.env.POSTGRES_SLAVE_1_HOST,
                port: parseInt(
                  process.env.POSTGRES_SLAVE_1_PORT ||
                    process.env.POSTGRES_PORT ||
                    '5432',
                  10,
                ),
                username: process.env.POSTGRES_USER || 'postgres',
                password: process.env.POSTGRES_PASSWORD || 'postgres',
                database: process.env.POSTGRES_DB || 'core_db',
                ssl: process.env.POSTGRES_SSL_ENABLED === 'true'
                  ? {
                      rejectUnauthorized: false,
                      ca: process.env.POSTGRES_SSL_CERT || undefined,
                    }
                  : false,
              },
            ],
          }
        : undefined,
      entities: [UserEntity, PasswordResetEntity, AuditLogEntity],
      migrations: [__dirname + '/migrations/**/*.ts'],
      migrationsRun: false,
      synchronize: false,
      logging: process.env.NODE_ENV === 'development',
    }),
    TypeOrmModule.forFeature([
      UserEntity,
      PasswordResetEntity,
      AuditLogEntity,
    ]),
    RedisModule,
    NotificationModule,
    TerminusModule,
  ],
  controllers: [
    AccountsController,
    InternalController,
    HealthController,
    AuthController,
  ],
  providers: [
    // Repositories
    UserRepository,
    AuditLogRepository,
    PasswordResetRepository,
    PermissionRepository,
    // Services
    UserService,
    PasswordResetService,
    JwtService,
    // Mappers
    HydraMapper,
    // Authorization
    JwtExtractorService,
    AuthorizationService,
    RolesGuard,
    SelfOrRolesGuard,
    // Health
    RedisHealthIndicator,
    // Guards
    {
      provide: APP_GUARD,
      useClass: GatewayAuthGuard,
    },
  ],
})
export class AppModule {}
