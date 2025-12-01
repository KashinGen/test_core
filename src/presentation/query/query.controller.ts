import { Controller, Get, Query, Param, Req } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { Request } from 'express';
import { GetUserByIdQuery } from '@application/queries/get-user-by-id.query';
import { GetUserByEmailQuery } from '@application/queries/get-user-by-email.query';
import { GetAccountsQuery } from '@application/queries/get-accounts.query';
import { GetAccountsDto } from '../dto/get-accounts.dto';
import { HydraMapper } from '../mappers/hydra.mapper';
import { AuthorizationService } from '../authorization';

@Controller('accounts')
export class QueryController {
  constructor(
    private readonly queryBus: QueryBus,
    private readonly hydraMapper: HydraMapper,
    private readonly authService: AuthorizationService,
  ) {}

  @Get(':id')
  async getOne(@Param('id') id: string, @Req() req: Request) {
    const user = this.authService.getUserFromRequest(req);
    const account = await this.queryBus.execute(
      new GetUserByIdQuery(id, user.id, user.roles),
    );
    return this.hydraMapper.toMember(account);
  }

  @Get('email/:email')
  async getByEmail(@Param('email') email: string, @Req() req: Request) {
    const user = this.authService.getUserFromRequest(req);
    const account = await this.queryBus.execute(new GetUserByEmailQuery(email));
    return this.hydraMapper.toMember(account);
  }

  @Get()
  async getAccounts(@Query() query: GetAccountsDto, @Req() req: Request) {
    const user = this.authService.getUserFromRequest(req);
    const result = await this.queryBus.execute(
      new GetAccountsQuery(
        query.page || 1,
        query.perPage || 20,
        query.id,
        query.name,
        query.company,
        query.role,
        query.order,
        user.id,
        user.roles,
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
