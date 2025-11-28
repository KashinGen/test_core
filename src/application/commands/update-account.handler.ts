import { CommandHandler, ICommandHandler, EventPublisher } from '@nestjs/cqrs';
import { NotFoundException } from '@nestjs/common';
import { UpdateAccountCommand } from './update-account.command';
import { IUserRepository } from '@domain/repositories/user-repository.interface';

@CommandHandler(UpdateAccountCommand)
export class UpdateAccountHandler implements ICommandHandler<UpdateAccountCommand> {
  constructor(
    private readonly repo: IUserRepository,
    private readonly publisher: EventPublisher,
  ) {}

  async execute(command: UpdateAccountCommand): Promise<{ id: string }> {
    const user = await this.repo.findById(command.id);
    if (!user) {
      throw new NotFoundException('Account not found');
    }

    if (user.isDeleted) {
      throw new NotFoundException('Account is deleted');
    }

    const userWithEvents = this.publisher.mergeObjectContext(user);
    
    // Если передан passwordHash, меняем пароль отдельной командой
    if (command.passwordHash) {
      userWithEvents.changePassword(command.passwordHash);
    }
    
    userWithEvents.update(
      command.name,
      command.email,
      command.roles,
      command.sources,
    );
    await this.repo.save(userWithEvents);
    userWithEvents.commit();

    return { id: userWithEvents.id };
  }
}

