import { QueryHandler, IQueryHandler, Logger } from '@nestjs/cqrs';
import { GetAccountsQuery } from './get-accounts.query';
import { UserReadModelRepository, FindAllResult } from '@infrastructure/read-model/user-read-model.repository';

@QueryHandler(GetAccountsQuery)
export class GetAccountsHandler implements IQueryHandler<GetAccountsQuery> {
  private readonly logger = new Logger(GetAccountsHandler.name);

  constructor(private readonly readModel: UserReadModelRepository) {}

  async execute(query: GetAccountsQuery): Promise<FindAllResult> {
    // Проверка авторизации выполняется на уровне контроллера через RolesGuard
    this.logger.debug(`Fetching accounts list: page=${query.page}, perPage=${query.perPage}`);

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

