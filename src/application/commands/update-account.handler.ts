import { CommandHandler, ICommandHandler, EventPublisher, Logger } from '@nestjs/cqrs';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { UpdateAccountCommand } from './update-account.command';
import { IUserRepository } from '@domain/repositories/user-repository.interface';
import { AuthorizationService } from '@presentation/authorization';
import { Role } from '@presentation/authorization/roles.enum';
import { PRIVILEGED_ROLES } from '@presentation/authorization/constants/privileged-roles.constant';

@CommandHandler(UpdateAccountCommand)
export class UpdateAccountHandler implements ICommandHandler<UpdateAccountCommand> {
  private readonly logger = new Logger(UpdateAccountHandler.name);

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

    // Базовая проверка ролей выполняется на уровне контроллера через SelfOrRolesGuard
    // Здесь проверяем только бизнес-логику: ограничения для self-update и привилегированные роли
    
    // RequesterId обязателен для проверки прав
    if (!command.requesterId || !command.requesterRoles || command.requesterRoles.length === 0) {
      this.logger.error(
        `UpdateAccountCommand executed without requesterId/requesterRoles for account ${command.id}`,
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
    const hasAdminRole = this.authService.hasAnyRole(requester, [
      Role.ROLE_PLATFORM_ACCOUNT_RW,
      Role.ROLE_PLATFORM_ADMIN,
    ]);

    // Defense-in-depth: дополнительная проверка (guard уже проверил, но на всякий случай)
    if (!isOwner && !hasAdminRole) {
      this.logger.warn(
        `User ${requester.id} (roles: ${requester.roles.join(', ')}) attempted to update account ${command.id} without sufficient permissions`,
      );
      throw new ForbiddenException('Insufficient permissions to update account');
    }

      // Если пользователь обновляет себя, проверяем ограничения
      if (isOwner && !hasAdminRole) {
        // Владелец не может менять email и roles
        if (command.email && command.email !== user.email) {
          this.logger.warn(
            `User ${requester.id} attempted to change their own email from ${user.email} to ${command.email}`,
          );
          throw new ForbiddenException('Cannot change your own email');
        }

        // Правильное сравнение массивов ролей (без учета порядка)
        if (command.roles) {
          const currentRoles = new Set(user.roles);
          const newRoles = new Set(command.roles);
          const rolesChanged =
            currentRoles.size !== newRoles.size ||
            ![...newRoles].every((role) => currentRoles.has(role));

          if (rolesChanged) {
            this.logger.warn(
              `User ${requester.id} attempted to change their own roles from [${user.roles.join(', ')}] to [${command.roles.join(', ')}]`,
            );
            throw new ForbiddenException('Cannot change your own roles');
          }
        }
      }

      // Проверка на назначение привилегированных ролей (только ROLE_PLATFORM_ADMIN может назначать)
      if (command.roles) {
        const hasPrivilegedRole = command.roles.some((r) =>
          PRIVILEGED_ROLES.includes(r as Role),
        );

        if (hasPrivilegedRole) {
          if (!this.authService.hasAnyRole(requester, [Role.ROLE_PLATFORM_ADMIN])) {
            this.logger.warn(
              `User ${requester.id} (roles: ${requester.roles.join(', ')}) attempted to update account ${command.id} with privileged roles: ${command.roles.join(', ')}`,
            );
            throw new ForbiddenException(
              'Only platform admin can assign privileged roles',
            );
          }
          this.logger.log(
            `User ${requester.id} updating account ${command.id} with privileged roles: ${command.roles.join(', ')}`,
          );
        }
      }

      this.logger.debug(
        `User ${requester.id} updating account ${command.id} (owner: ${isOwner}, admin: ${hasAdminRole})`,
      );
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

