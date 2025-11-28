import { CommandHandler, ICommandHandler, EventPublisher } from '@nestjs/cqrs';
import { NotFoundException } from '@nestjs/common';
import { DeleteAccountCommand } from './delete-account.command';
import { IUserRepository } from '@domain/repositories/user-repository.interface';

@CommandHandler(DeleteAccountCommand)
export class DeleteAccountHandler implements ICommandHandler<DeleteAccountCommand> {
  constructor(
    private readonly repo: IUserRepository,
    private readonly publisher: EventPublisher,
  ) {}

  async execute(command: DeleteAccountCommand): Promise<{ ok: boolean }> {
    const user = await this.repo.findById(command.id);
    if (!user) {
      throw new NotFoundException('Account not found');
    }

    if (user.isDeleted) {
      return { ok: true }; // Already deleted
    }

    const userWithEvents = this.publisher.mergeObjectContext(user);
    userWithEvents.delete();
    await this.repo.save(userWithEvents);
    userWithEvents.commit();

    return { ok: true };
  }
}

