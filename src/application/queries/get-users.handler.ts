import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { GetUsersQuery } from './get-users.query';
import { UserReadModelRepository } from '@infrastructure/read-model/user-read-model.repository';

@QueryHandler(GetUsersQuery)
export class GetUsersHandler implements IQueryHandler<GetUsersQuery> {
  constructor(private readonly readModel: UserReadModelRepository) {}

  async execute(query: GetUsersQuery) {
    // Конвертируем limit/offset в page/perPage для обратной совместимости
    const page = Math.floor(query.offset / query.limit) + 1;
    const perPage = query.limit;
    
    const result = await this.readModel.findAll(page, perPage);
    
    // Возвращаем только items для обратной совместимости
    return result.items;
  }
}


