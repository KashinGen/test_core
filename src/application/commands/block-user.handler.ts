import { CommandHandler, ICommandHandler, EventPublisher } from '@nestjs/cqrs';
import { NotFoundException } from '@nestjs/common';
import { BlockUserCommand } from './block-user.command';
import { IUserRepository } from '@domain/repositories/user-repository.interface';
import { UserDomainService } from '@domain/services/user-domain.service';
import { User } from '@domain/entities/user.entity';

@CommandHandler(BlockUserCommand)
export class BlockUserHandler implements ICommandHandler<BlockUserCommand> {
  constructor(
    private readonly repo: IUserRepository,
    private readonly domainService: UserDomainService,
    private readonly publisher: EventPublisher,
  ) {}

  async execute(command: BlockUserCommand): Promise<{ ok: boolean }> {
    const user = await this.repo.findById(command.id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!this.domainService.canBlock(user)) {
      throw new Error('User cannot be blocked');
    }

    const userWithEvents = this.publisher.mergeObjectContext(user);
    userWithEvents.block();
    await this.repo.save(userWithEvents);
    userWithEvents.commit();

    return { ok: true };
  }
}


