import { CommandHandler, ICommandHandler, EventPublisher } from '@nestjs/cqrs';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { UpdateAccountCommand } from './update-account.command';
import { IUserRepository } from '@domain/repositories/user-repository.interface';
import { AuthorizationService } from '@presentation/authorization';
import { Role } from '@presentation/authorization/roles.enum';

@CommandHandler(UpdateAccountCommand)
export class UpdateAccountHandler implements ICommandHandler<UpdateAccountCommand> {
  constructor(
    private readonly repo: IUserRepository,
    private readonly publisher: EventPublisher,
    private readonly authService: AuthorizationService,
  ) {}

  async execute(command: UpdateAccountCommand): Promise<{ id: string }> {
    const user = await this.repo.findById(command.id);
    if (!user) {
      throw new NotFoundException('Account not found');
    }

    if (user.isDeleted) {
      throw new NotFoundException('Account is deleted');
    }

    // Проверка авторизации
    if (command.requesterId && command.requesterRoles.length > 0) {
      const requester = {
        id: command.requesterId,
        roles: command.requesterRoles.filter((r): r is Role =>
          Object.values(Role).includes(r as Role),
        ),
      };

      const isOwner = requester.id === command.id;
      const hasAdminRole = this.authService.hasAnyRole(requester, [
        Role.ROLE_PLATFORM_ACCOUNT_RW,
        Role.ROLE_PLATFORM_ADMIN,
      ]);

      if (!isOwner && !hasAdminRole) {
        throw new ForbiddenException('Insufficient permissions to update account');
      }

      // Если пользователь обновляет себя, проверяем ограничения
      if (isOwner && !hasAdminRole) {
        // Владелец не может менять email и roles
        if (command.email && command.email !== user.email) {
          throw new ForbiddenException('Cannot change your own email');
        }
        if (command.roles && JSON.stringify(command.roles) !== JSON.stringify(user.roles)) {
          throw new ForbiddenException('Cannot change your own roles');
        }
      }
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

