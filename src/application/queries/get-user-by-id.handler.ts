import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { NotFoundException } from '@nestjs/common';
import { GetUserByIdQuery } from './get-user-by-id.query';
import { UserReadModelRepository } from '@infrastructure/read-model/user-read-model.repository';
import { AccountDto } from '@presentation/dto/account.dto';

@QueryHandler(GetUserByIdQuery)
export class GetUserByIdHandler implements IQueryHandler<GetUserByIdQuery> {
  constructor(private readonly readModel: UserReadModelRepository) {}

  async execute(query: GetUserByIdQuery): Promise<AccountDto> {
    const account = await this.readModel.findById(query.id);
    if (!account) {
      throw new NotFoundException('Account not found');
    }
    return account;
  }
}


