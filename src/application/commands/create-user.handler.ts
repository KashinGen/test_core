import { CommandHandler, ICommandHandler, EventPublisher, AggregateRoot, IEvent } from '@nestjs/cqrs';
import { Logger, ConflictException, ForbiddenException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { v4 as uuid } from 'uuid';
import { CreateAccountCommand, CreateUserCommand } from './create-user.command';
import { IUserRepository } from '@domain/repositories/user-repository.interface';
import { User } from '@domain/entities/user.entity';
import { AuthorizationService } from '@presentation/authorization';
import { Role } from '@presentation/authorization/roles.enum';
import { PRIVILEGED_ROLES } from '@presentation/authorization/constants/privileged-roles.constant';

@CommandHandler(CreateAccountCommand)
export class CreateAccountHandler implements ICommandHandler<CreateAccountCommand> {
  private readonly logger = new Logger(CreateAccountHandler.name);

  constructor(
    private readonly repo: IUserRepository,
    private readonly publisher: EventPublisher,
    private readonly authService: AuthorizationService,
  ) {}

  async execute(command: CreateAccountCommand): Promise<{ id: string }> {
    // Базовая проверка ролей выполняется на уровне контроллера через RolesGuard
    // Здесь проверяем только бизнес-логику: назначение привилегированных ролей
    
    // RequesterId обязателен для проверки прав
    if (!command.requesterId || !command.requesterRoles || command.requesterRoles.length === 0) {
      this.logger.error(
        `CreateAccountCommand executed without requesterId/requesterRoles for email ${command.email}`,
      );
      throw new ForbiddenException('Requester information is required');
    }

    const requester = {
      id: command.requesterId,
      roles: command.requesterRoles.filter((r): r is Role =>
        Object.values(Role).includes(r as Role),
      ),
    };

    // Проверка на назначение привилегированных ролей (только ROLE_PLATFORM_ADMIN может назначать)
    const hasPrivilegedRole = command.roles.some((r) =>
      PRIVILEGED_ROLES.includes(r as Role),
    );

    if (hasPrivilegedRole) {
      if (!this.authService.hasAnyRole(requester, [Role.ROLE_PLATFORM_ADMIN])) {
        this.logger.warn(
          `User ${requester.id} (roles: ${requester.roles.join(', ')}) attempted to create account with privileged roles: ${command.roles.join(', ')}`,
        );
        throw new ForbiddenException(
          'Only platform admin can assign privileged roles',
        );
      }
      this.logger.log(
        `User ${requester.id} creating account with privileged roles: ${command.roles.join(', ')}`,
      );
    }

    this.logger.debug(
      `User ${requester.id} creating account for ${command.email} with roles: ${command.roles.join(', ')}`,
    );

    const existing = await this.repo.findByEmail(command.email);
    if (existing && !existing.isDeleted) {
      throw new ConflictException('Account with this email already exists');
    }

    const hash = await bcrypt.hash(command.password, 12);
    const id = uuid();

    const user = User.create(
      id,
      command.name,
      command.email,
      hash,
      command.roles,
      command.sources,
    );
    const userWithEvents = this.publisher.mergeObjectContext(user) as unknown as User & AggregateRoot<IEvent>;

    await this.repo.save(userWithEvents);
    userWithEvents.commit();

    return { id: userWithEvents.id };
  }
}

// Обратная совместимость
@CommandHandler(CreateUserCommand)
export class CreateUserHandler extends CreateAccountHandler
  implements ICommandHandler<CreateUserCommand>
{
  async execute(command: CreateUserCommand): Promise<{ id: string }> {
    return super.execute(command);
  }
}


