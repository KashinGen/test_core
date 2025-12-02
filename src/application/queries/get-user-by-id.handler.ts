import { QueryHandler, IQueryHandler, Logger } from '@nestjs/cqrs';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { GetUserByIdQuery } from './get-user-by-id.query';
import { UserReadModelRepository } from '@infrastructure/read-model/user-read-model.repository';
import { AccountDto } from '@presentation/dto/account.dto';
import { AuthorizationService } from '@presentation/authorization';
import { Role } from '@presentation/authorization/roles.enum';

@QueryHandler(GetUserByIdQuery)
export class GetUserByIdHandler implements IQueryHandler<GetUserByIdQuery> {
  private readonly logger = new Logger(GetUserByIdHandler.name);

  constructor(
    private readonly readModel: UserReadModelRepository,
    private readonly authService: AuthorizationService,
  ) {}

  async execute(query: GetUserByIdQuery): Promise<AccountDto> {
    const account = await this.readModel.findById(query.id);
    if (!account) {
      throw new NotFoundException('Account not found');
    }

    // Базовая проверка ролей выполняется на уровне контроллера через RolesGuard
    // Здесь проверяем только бизнес-логику: право владельца читать себя
    
    // RequesterId опционален для этого query (может быть вызван без аутентификации в некоторых случаях)
    // Но если передан, проверяем права
    if (query.requesterId && query.requesterRoles && query.requesterRoles.length > 0) {
      const requester = {
        id: query.requesterId,
        roles: query.requesterRoles.filter((r): r is Role =>
          Object.values(Role).includes(r as Role),
        ),
      };

      const isOwner = requester.id === query.id;
      const hasReadRole = this.authService.hasAnyRole(requester, [
        Role.ROLE_PLATFORM_ACCOUNT_RO,
        Role.ROLE_PLATFORM_ADMIN,
      ]);

      if (!isOwner && !hasReadRole) {
        this.logger.warn(
          `Access denied: user ${requester.id} (roles: ${requester.roles.join(', ')}) tried to read account ${query.id}`,
        );
        throw new ForbiddenException('Insufficient permissions to read account');
      }

      this.logger.debug(
        `Access granted: user ${requester.id} reading account ${query.id} (owner: ${isOwner})`,
      );
    }

    return account;
  }
}


