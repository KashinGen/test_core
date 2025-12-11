import { IQuery } from '@nestjs/cqrs';

export class GetUsersQuery implements IQuery {
  constructor(
    public readonly limit: number = 100,
    public readonly offset: number = 0,
  ) {}
}


