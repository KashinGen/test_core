import { ICommand } from '@nestjs/cqrs';

export class GrantRoleCommand implements ICommand {
  constructor(
    public readonly id: string,
    public readonly roles: string[],
  ) {}
}


