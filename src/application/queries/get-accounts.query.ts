import { IQuery } from '@nestjs/cqrs';

export interface GetAccountsOrder {
  name?: 'asc' | 'desc';
  email?: 'asc' | 'desc';
  roles?: 'asc' | 'desc';
  createdAt?: 'asc' | 'desc';
}

export class GetAccountsQuery implements IQuery {
  constructor(
    public readonly page: number,
    public readonly perPage: number,
    public readonly id?: string[],
    public readonly name?: string,
    public readonly company?: string[],
    public readonly role?: string[],
    public readonly order?: GetAccountsOrder,
  ) {}
}

