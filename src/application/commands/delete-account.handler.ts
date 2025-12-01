import { CommandHandler, ICommandHandler, EventPublisher, Logger } from '@nestjs/cqrs';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { DeleteAccountCommand } from './delete-account.command';
import { IUserRepository } from '@domain/repositories/user-repository.interface';
import { AuthorizationService } from '@presentation/authorization';
import { Role } from '@presentation/authorization/roles.enum';

@CommandHandler(DeleteAccountCommand)
export class DeleteAccountHandler implements ICommandHandler<DeleteAccountCommand> {
  private readonly logger = new Logger(DeleteAccountHandler.name);

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

    // Базовая проверка ролей выполняется на уровне контроллера через RolesGuard
    // Здесь проверяем только бизнес-логику: запрет на удаление себя
    
    // RequesterId обязателен для проверки прав
    if (!command.requesterId || !command.requesterRoles || command.requesterRoles.length === 0) {
      this.logger.error(
        `DeleteAccountCommand executed without requesterId/requesterRoles for account ${command.id}`,
      );
      throw new ForbiddenException('Requester information is required');
    }

    const requester = {
      id: command.requesterId,
      roles: command.requesterRoles.filter((r): r is Role =>
        Object.values(Role).includes(r as Role),
      ),
    };

    const isOwner = requester.id === command.id;
    if (isOwner) {
      this.logger.warn(`User ${requester.id} attempted to delete their own account`);
      throw new ForbiddenException('Cannot delete your own account');
    }

    // Defense-in-depth: дополнительная проверка (guard уже проверил, но на всякий случай)
    if (
      !this.authService.hasAnyRole(requester, [
        Role.ROLE_PLATFORM_ACCOUNT_RW,
        Role.ROLE_PLATFORM_ADMIN,
      ])
    ) {
      this.logger.warn(
        `User ${requester.id} (roles: ${requester.roles.join(', ')}) attempted to delete account ${command.id} without sufficient permissions`,
      );
      throw new ForbiddenException('Insufficient permissions to delete account');
    }

    this.logger.log(`User ${requester.id} deleting account ${command.id}`);

    const userWithEvents = this.publisher.mergeObjectContext(user);
    userWithEvents.delete();
    await this.repo.save(userWithEvents);
    userWithEvents.commit();

    return { ok: true };
  }
}

