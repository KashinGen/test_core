import { CommandHandler, ICommandHandler, EventPublisher } from '@nestjs/cqrs';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { DeleteAccountCommand } from './delete-account.command';
import { IUserRepository } from '@domain/repositories/user-repository.interface';
import { AuthorizationService } from '@presentation/authorization';
import { Role } from '@presentation/authorization/roles.enum';

@CommandHandler(DeleteAccountCommand)
export class DeleteAccountHandler implements ICommandHandler<DeleteAccountCommand> {
  constructor(
    private readonly repo: IUserRepository,
    private readonly publisher: EventPublisher,
    private readonly authService: AuthorizationService,
  ) {}

  async execute(command: DeleteAccountCommand): Promise<{ ok: boolean }> {
    const user = await this.repo.findById(command.id);
    if (!user) {
      throw new NotFoundException('Account not found');
    }

    if (user.isDeleted) {
      return { ok: true }; // Already deleted
    }

    // Проверка авторизации: только ROLE_PLATFORM_ACCOUNT_RW или ROLE_PLATFORM_ADMIN
    // И нельзя удалять себя
    if (command.requesterId && command.requesterRoles.length > 0) {
      const requester = {
        id: command.requesterId,
        roles: command.requesterRoles.filter((r): r is Role =>
          Object.values(Role).includes(r as Role),
        ),
      };

      const isOwner = requester.id === command.id;
      if (isOwner) {
        throw new ForbiddenException('Cannot delete your own account');
      }

      if (
        !this.authService.hasAnyRole(requester, [
          Role.ROLE_PLATFORM_ACCOUNT_RW,
          Role.ROLE_PLATFORM_ADMIN,
        ])
      ) {
        throw new ForbiddenException('Insufficient permissions to delete account');
      }
    }

    const userWithEvents = this.publisher.mergeObjectContext(user);
    userWithEvents.delete();
    await this.repo.save(userWithEvents);
    userWithEvents.commit();

    return { ok: true };
  }
}

