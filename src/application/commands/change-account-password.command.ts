import { ICommand } from '@nestjs/cqrs';

export class ChangeAccountPasswordCommand implements ICommand {
  constructor(
    public readonly token: string,
    public readonly password: string,
  ) {}
}

