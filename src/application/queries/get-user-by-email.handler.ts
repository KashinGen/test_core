import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { NotFoundException } from '@nestjs/common';
import { GetUserByEmailQuery } from './get-user-by-email.query';
import { UserReadModelRepository } from '@infrastructure/read-model/user-read-model.repository';
import { AccountDto } from '@presentation/dto/account.dto';

@QueryHandler(GetUserByEmailQuery)
export class GetUserByEmailHandler implements IQueryHandler<GetUserByEmailQuery> {
  constructor(private readonly readModel: UserReadModelRepository) {}

  async execute(query: GetUserByEmailQuery): Promise<AccountDto> {
    const account = await this.readModel.findByEmail(query.email);
    if (!account) {
      throw new NotFoundException('Account not found');
    }
    return account;
  }
}


