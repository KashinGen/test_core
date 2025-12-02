import { CommandHandler, ICommandHandler, EventPublisher } from '@nestjs/cqrs';
import { NotFoundException } from '@nestjs/common';
import { GrantRoleCommand } from './grant-role.command';
import { IUserRepository } from '@domain/repositories/user-repository.interface';
import { UserDomainService } from '@domain/services/user-domain.service';
import { User } from '@domain/entities/user.entity';

@CommandHandler(GrantRoleCommand)
export class GrantRoleHandler implements ICommandHandler<GrantRoleCommand> {
  constructor(
    private readonly repo: IUserRepository,
    private readonly domainService: UserDomainService,
    private readonly publisher: EventPublisher,
  ) {}

  async execute(command: GrantRoleCommand): Promise<{ ok: boolean }> {
    const user = await this.repo.findById(command.id);
    if (!user || user.isDeleted) {
      throw new NotFoundException('User not found');
    }

    if (!this.domainService.canGrantRoles(user, command.roles)) {
      throw new Error('Roles cannot be granted');
    }

    const userWithEvents = this.publisher.mergeObjectContext(user);
    (userWithEvents as any).grantRoles(command.roles);
    await this.repo.save(userWithEvents as any);
    userWithEvents.commit();

    return { ok: true };
  }
}


