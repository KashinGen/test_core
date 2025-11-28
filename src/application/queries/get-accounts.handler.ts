import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { GetAccountsQuery } from './get-accounts.query';
import { UserReadModelRepository, FindAllResult } from '@infrastructure/read-model/user-read-model.repository';

@QueryHandler(GetAccountsQuery)
export class GetAccountsHandler implements IQueryHandler<GetAccountsQuery> {
  constructor(private readonly readModel: UserReadModelRepository) {}

  async execute(query: GetAccountsQuery): Promise<FindAllResult> {
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

