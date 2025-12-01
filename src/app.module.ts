import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CqrsModule } from '@nestjs/cqrs';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { RedisModule } from '@infrastructure/adapters/redis.module';
import { EventEntity } from '@infrastructure/event-store/event.entity';
import { EventStoreService } from '@infrastructure/event-store/event-store.service';
import { UserEventStoreRepository } from '@infrastructure/repos/user-event-store.repository';
import { UserReadModelRepository } from '@infrastructure/read-model/user-read-model.repository';
import { UserProjection } from '@infrastructure/read-model/user-projection';
import { PermissionRepository } from '@infrastructure/repos/permission.repository';
import { UserDomainService } from '@domain/services/user-domain.service';
import { KafkaPublisher } from '@infrastructure/adapters/kafka.publisher';
import { HydraMapper } from '@presentation/mappers/hydra.mapper';
import { GatewayAuthGuard } from '@presentation/guards/gateway-auth.guard';
import { APP_GUARD } from '@nestjs/core';
import {
  AuthorizationService,
  JwtExtractorService,
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

const CommandHandlers = [
  CreateAccountHandler,
  CreateUserHandler, // Обратная совместимость
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
  GetUsersHandler, // Обратная совместимость
];

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      username: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_NAME || 'core_db',
      entities: [EventEntity],
      migrations: [__dirname + '/migrations/**/*.ts'],
      migrationsRun: false, // Запускать миграции вручную
      synchronize: process.env.NODE_ENV !== 'production',
      logging: process.env.NODE_ENV === 'development',
    }),
    TypeOrmModule.forFeature([EventEntity]),
    CqrsModule,
    EventEmitterModule.forRoot(),
    RedisModule,
  ],
  controllers: [CommandController, QueryController, InternalController],
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
    UserDomainService,
    KafkaPublisher,
    HydraMapper,
    JwtExtractorService,
    AuthorizationService,
    {
      provide: APP_GUARD,
      useClass: GatewayAuthGuard,
    },
  ],
})
export class AppModule {}

