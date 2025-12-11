import { CommandHandler, ICommandHandler, EventPublisher } from '@nestjs/cqrs';
import { Logger, NotFoundException, ForbiddenException, Inject } from '@nestjs/common';
import { GrantRoleCommand } from './grant-role.command';
import { IUserRepository } from '@domain/repositories/user-repository.interface';
import { UserDomainService } from '@domain/services/user-domain.service';
import { User } from '@domain/entities/user.entity';
import { AuthorizationService } from '@presentation/authorization';
import { Role } from '@presentation/authorization/roles.enum';
import { PRIVILEGED_ROLES } from '@presentation/authorization/constants/privileged-roles.constant';

@CommandHandler(GrantRoleCommand)
export class GrantRoleHandler implements ICommandHandler<GrantRoleCommand> {
  private readonly logger = new Logger(GrantRoleHandler.name);

  constructor(
    @Inject('IUserRepository')
    private readonly repo: IUserRepository,
    private readonly domainService: UserDomainService,
    private readonly publisher: EventPublisher,
    private readonly authService: AuthorizationService,
  ) {}

  async execute(command: GrantRoleCommand): Promise<{ ok: boolean }> {
    const user = await this.repo.findById(command.id);
    if (!user || user.isDeleted) {
      throw new NotFoundException('User not found');
    }

    if (!command.requesterId || !command.requesterRoles || command.requesterRoles.length === 0) {
      this.logger.error(
        `GrantRoleCommand executed without requesterId/requesterRoles for account ${command.id}`,
      );
      throw new ForbiddenException('Requester information is required');
    }

    const requester = {
      id: command.requesterId,
      roles: command.requesterRoles.filter((r): r is Role =>
        Object.values(Role).includes(r as Role),
      ),
    };

    const hasPrivilegedRole = command.roles.some((r) =>
      PRIVILEGED_ROLES.includes(r as Role),
    );

    if (hasPrivilegedRole) {
      if (!this.authService.hasAnyRole(requester, [Role.ROLE_PLATFORM_ADMIN])) {
        this.logger.warn(
          `User ${requester.id} (roles: ${requester.roles.join(', ')}) attempted to grant privileged roles: ${command.roles.join(', ')} to account ${command.id}`,
        );
        throw new ForbiddenException(
          'Only platform admin can assign privileged roles',
        );
      }
      this.logger.log(
        `User ${requester.id} granting privileged roles: ${command.roles.join(', ')} to account ${command.id}`,
      );
    }

    if (!this.domainService.canGrantRoles(user, command.roles)) {
      throw new Error('Roles cannot be granted');
    }

    this.logger.debug(
      `User ${requester.id} granting roles: ${command.roles.join(', ')} to account ${command.id}`,
    );

    const userWithEvents = this.publisher.mergeObjectContext(user);
    userWithEvents.grantRoles(command.roles);
    await this.repo.save(userWithEvents);
    userWithEvents.commit();

    return { ok: true };
  }
}


