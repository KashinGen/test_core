import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { ForbiddenException } from '@nestjs/common';
import { GetAccountsQuery } from './get-accounts.query';
import { UserReadModelRepository, FindAllResult } from '@infrastructure/read-model/user-read-model.repository';
import { AuthorizationService } from '@presentation/authorization';
import { Role } from '@presentation/authorization/roles.enum';

@QueryHandler(GetAccountsQuery)
export class GetAccountsHandler implements IQueryHandler<GetAccountsQuery> {
  constructor(
    private readonly readModel: UserReadModelRepository,
    private readonly authService: AuthorizationService,
  ) {}

  async execute(query: GetAccountsQuery): Promise<FindAllResult> {
    // Проверка авторизации: только ROLE_PLATFORM_ACCOUNT_RO или ROLE_PLATFORM_ADMIN
    if (query.requesterId && query.requesterRoles.length > 0) {
      const requester = {
        id: query.requesterId,
        roles: query.requesterRoles.filter((r): r is Role =>
          Object.values(Role).includes(r as Role),
        ),
      };

      if (
        !this.authService.hasAnyRole(requester, [
          Role.ROLE_PLATFORM_ACCOUNT_RO,
          Role.ROLE_PLATFORM_ADMIN,
        ])
      ) {
        throw new ForbiddenException('Insufficient permissions to list accounts');
      }
    }

    return this.readModel.findAll(
      query.page,
      query.perPage,
      query.id,
      query.name,
      query.company,
      query.role,
      query.order,
    );
  }
}

