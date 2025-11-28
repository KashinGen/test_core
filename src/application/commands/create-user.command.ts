import { ICommand } from '@nestjs/cqrs';

export class CreateAccountCommand implements ICommand {
  constructor(
    public readonly name: string,
    public readonly email: string,
    public readonly password: string,
    public readonly roles: string[],
    public readonly sources: string[] = [],
  ) {}
}

// Обратная совместимость
export class CreateUserCommand extends CreateAccountCommand {
  constructor(
    email: string,
    plainPassword: string,
    role: string,
  ) {
    super('', email, plainPassword, [role], []);
  }
}


