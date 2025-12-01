import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { GetUserByIdQuery } from './get-user-by-id.query';
import { UserReadModelRepository } from '@infrastructure/read-model/user-read-model.repository';
import { AccountDto } from '@presentation/dto/account.dto';
import { AuthorizationService } from '@presentation/authorization';
import { Role } from '@presentation/authorization/roles.enum';

@QueryHandler(GetUserByIdQuery)
export class GetUserByIdHandler implements IQueryHandler<GetUserByIdQuery> {
  constructor(
    private readonly readModel: UserReadModelRepository,
    private readonly authService: AuthorizationService,
  ) {}

  async execute(query: GetUserByIdQuery): Promise<AccountDto> {
    const account = await this.readModel.findById(query.id);
    if (!account) {
      throw new NotFoundException('Account not found');
    }

    // Проверка авторизации: ROLE_PLATFORM_ACCOUNT_RO или владелец
    if (query.requesterId && query.requesterRoles.length > 0) {
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
        throw new ForbiddenException('Insufficient permissions to read account');
      }
    }

    return account;
  }
}


