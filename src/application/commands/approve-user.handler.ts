import { CommandHandler, ICommandHandler, EventPublisher } from '@nestjs/cqrs';
import { NotFoundException } from '@nestjs/common';
import { ApproveUserCommand } from './approve-user.command';
import { IUserRepository } from '@domain/repositories/user-repository.interface';
import { UserDomainService } from '@domain/services/user-domain.service';
import { User } from '@domain/entities/user.entity';

@CommandHandler(ApproveUserCommand)
export class ApproveUserHandler implements ICommandHandler<ApproveUserCommand> {
  constructor(
    private readonly repo: IUserRepository,
    private readonly domainService: UserDomainService,
    private readonly publisher: EventPublisher,
  ) {}

  async execute(command: ApproveUserCommand): Promise<{ ok: boolean }> {
    const user = await this.repo.findById(command.id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!this.domainService.canApprove(user)) {
      throw new Error('User cannot be approved');
    }

    const userWithEvents = this.publisher.mergeObjectContext(user);
    (userWithEvents as any).approve();
    await this.repo.save(userWithEvents as any);
    userWithEvents.commit();

    return { ok: true };
  }
}


