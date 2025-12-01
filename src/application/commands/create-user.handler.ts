import { CommandHandler, ICommandHandler, EventPublisher } from '@nestjs/cqrs';
import { ConflictException, ForbiddenException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { v4 as uuid } from 'uuid';
import { CreateAccountCommand, CreateUserCommand } from './create-user.command';
import { IUserRepository } from '@domain/repositories/user-repository.interface';
import { User } from '@domain/entities/user.entity';
import { AuthorizationService } from '@presentation/authorization';
import { Role } from '@presentation/authorization/roles.enum';

@CommandHandler(CreateAccountCommand)
export class CreateAccountHandler implements ICommandHandler<CreateAccountCommand> {
  constructor(
    private readonly repo: IUserRepository,
    private readonly publisher: EventPublisher,
    private readonly authService: AuthorizationService,
  ) {}

  async execute(command: CreateAccountCommand): Promise<{ id: string }> {
    // Проверка авторизации: только ROLE_PLATFORM_ACCOUNT_RW или ROLE_PLATFORM_ADMIN
    if (command.requesterId && command.requesterRoles.length > 0) {
      const requester = {
        id: command.requesterId,
        roles: command.requesterRoles.filter((r): r is Role =>
          Object.values(Role).includes(r as Role),
        ),
      };
      if (
        !this.authService.hasAnyRole(requester, [
          Role.ROLE_PLATFORM_ACCOUNT_RW,
          Role.ROLE_PLATFORM_ADMIN,
        ])
      ) {
        throw new ForbiddenException('Insufficient permissions to create account');
      }
    }

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
    const userWithEvents = this.publisher.mergeObjectContext(user);

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


