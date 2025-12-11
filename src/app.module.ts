import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CqrsModule } from '@nestjs/cqrs';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { LoggerModule } from 'nestjs-pino';
import { TerminusModule } from '@nestjs/terminus';
import { RedisModule } from '@infrastructure/adapters/redis.module';
import { EventEntity } from '@infrastructure/event-store/event.entity';
import { PasswordResetEntity } from '@infrastructure/entities/password-reset.entity';
import { EventStoreService } from '@infrastructure/event-store/event-store.service';
import { UserEventStoreRepository } from '@infrastructure/repos/user-event-store.repository';
import { PasswordResetRepository } from '@infrastructure/repos/password-reset.repository';
import { UserReadModelRepository } from '@infrastructure/read-model/user-read-model.repository';
import { UserProjection } from '@infrastructure/read-model/user-projection';
import { PermissionRepository } from '@infrastructure/repos/permission.repository';
import { UserDomainService } from '@domain/services/user-domain.service';
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

// Commands
import { CreateAccountHandler, CreateUserHandler } from '@application/commands/create-user.handler';
import { UpdateAccountHandler } from '@application/commands/update-account.handler';
import { DeleteAccountHandler } from '@application/commands/delete-account.handler';
import { ResetAccountPasswordHandler } from '@application/commands/reset-account-password.handler';
import { ChangeAccountPasswordHandler } from '@application/commands/change-account-password.handler';
import { ApproveUserHandler } from '@application/commands/approve-user.handler';
import { BlockUserHandler } from '@application/commands/block-user.handler';
import { GrantRoleHandler } from '@application/commands/grant-role.handler';

// Queries
import { GetUserByIdHandler } from '@application/queries/get-user-by-id.handler';
import { GetUserByEmailHandler } from '@application/queries/get-user-by-email.handler';
import { GetAccountsHandler } from '@application/queries/get-accounts.handler';
import { GetUsersHandler } from '@application/queries/get-users.handler';

// Controllers
import { CommandController } from '@presentation/command/command.controller';
import { QueryController } from '@presentation/query/query.controller';
import { InternalController } from '@presentation/internal/internal.controller';
import { HealthController } from '@presentation/health/health.controller';
import { RedisHealthIndicator } from '@presentation/health/redis-health.indicator';
import { AuthController } from '@presentation/auth/auth.controller';
import { JwtService } from '@infrastructure/services/jwt.service';

const CommandHandlers = [
  CreateAccountHandler,
  CreateUserHandler,
  UpdateAccountHandler,
  DeleteAccountHandler,
  ResetAccountPasswordHandler,
  ChangeAccountPasswordHandler,
  ApproveUserHandler,
  BlockUserHandler,
  GrantRoleHandler,
];

const QueryHandlers = [
  GetUserByIdHandler,
  GetUserByEmailHandler,
  GetAccountsHandler,
  GetUsersHandler,
];

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
      ssl: process.env.POSTGRES_SSL_ENABLED === 'true' ? {
        rejectUnauthorized: false,
        ca: process.env.POSTGRES_SSL_CERT || undefined,
      } : false,
      replication: process.env.POSTGRES_SLAVE_1_HOST ? {
        master: {
          host: process.env.POSTGRES_HOST || 'localhost',
          port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
          username: process.env.POSTGRES_USER || 'postgres',
          password: process.env.POSTGRES_PASSWORD || 'postgres',
          database: process.env.POSTGRES_DB || 'core_db',
          ssl: process.env.POSTGRES_SSL_ENABLED === 'true' ? {
            rejectUnauthorized: false,
            ca: process.env.POSTGRES_SSL_CERT || undefined,
          } : false,
        },
        slaves: [
          {
            host: process.env.POSTGRES_SLAVE_1_HOST,
            port: parseInt(process.env.POSTGRES_SLAVE_1_PORT || process.env.POSTGRES_PORT || '5432', 10),
            username: process.env.POSTGRES_USER || 'postgres',
            password: process.env.POSTGRES_PASSWORD || 'postgres',
            database: process.env.POSTGRES_DB || 'core_db',
            ssl: process.env.POSTGRES_SSL_ENABLED === 'true' ? {
              rejectUnauthorized: false,
              ca: process.env.POSTGRES_SSL_CERT || undefined,
            } : false,
          },
        ],
      } : undefined,
      entities: [EventEntity, PasswordResetEntity],
      migrations: [__dirname + '/migrations/**/*.ts'],
      migrationsRun: false,
      synchronize: false,
      logging: process.env.NODE_ENV === 'development',
    }),
    TypeOrmModule.forFeature([EventEntity, PasswordResetEntity]),
    CqrsModule,
    EventEmitterModule.forRoot(),
    RedisModule,
    NotificationModule,
    TerminusModule,
  ],
  controllers: [CommandController, QueryController, InternalController, HealthController, AuthController],
  providers: [
    ...CommandHandlers,
    ...QueryHandlers,
    EventStoreService,
    UserEventStoreRepository,
    {
      provide: 'IUserRepository',
      useClass: UserEventStoreRepository,
    },
    UserReadModelRepository,
    UserProjection,
    PermissionRepository,
    PasswordResetRepository,
    UserDomainService,
    HydraMapper,
    JwtExtractorService,
    JwtService,
    AuthorizationService,
    RolesGuard,
    SelfOrRolesGuard,
    RedisHealthIndicator,
    {
      provide: APP_GUARD,
      useClass: GatewayAuthGuard,
    },
  ],
})
export class AppModule {}

