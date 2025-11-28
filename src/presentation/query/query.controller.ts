import { Controller, Get, Query, Param } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { GetUserByIdQuery } from '@application/queries/get-user-by-id.query';
import { GetUserByEmailQuery } from '@application/queries/get-user-by-email.query';
import { GetAccountsQuery } from '@application/queries/get-accounts.query';
import { GetAccountsDto } from '../dto/get-accounts.dto';
import { HydraMapper } from '../mappers/hydra.mapper';

@Controller('accounts')
export class QueryController {
  constructor(
    private readonly queryBus: QueryBus,
    private readonly hydraMapper: HydraMapper,
  ) {}

  @Get(':id')
  async getOne(@Param('id') id: string) {
    const account = await this.queryBus.execute(new GetUserByIdQuery(id));
    return this.hydraMapper.toMember(account);
  }

  @Get('email/:email')
  async getByEmail(@Param('email') email: string) {
    const account = await this.queryBus.execute(new GetUserByEmailQuery(email));
    return this.hydraMapper.toMember(account);
  }

  @Get()
  async getAccounts(@Query() query: GetAccountsDto) {
    const result = await this.queryBus.execute(
      new GetAccountsQuery(
        query.page || 1,
        query.perPage || 20,
        query.id,
        query.name,
        query.company,
        query.role,
        query.order,
      ),
    );

    return this.hydraMapper.toCollection(
      result.items,
      result.total,
      query.page || 1,
      query.perPage || 20,
    );
  }
}
