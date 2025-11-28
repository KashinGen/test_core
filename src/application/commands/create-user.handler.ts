import { CommandHandler, ICommandHandler, EventPublisher } from '@nestjs/cqrs';
import { ConflictException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { v4 as uuid } from 'uuid';
import { CreateAccountCommand, CreateUserCommand } from './create-user.command';
import { IUserRepository } from '@domain/repositories/user-repository.interface';
import { User } from '@domain/entities/user.entity';

@CommandHandler(CreateAccountCommand)
export class CreateAccountHandler implements ICommandHandler<CreateAccountCommand> {
  constructor(
    private readonly repo: IUserRepository,
    private readonly publisher: EventPublisher,
  ) {}

  async execute(command: CreateAccountCommand): Promise<{ id: string }> {
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


