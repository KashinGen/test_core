import { ICommand } from '@nestjs/cqrs';

export class CreateAccountCommand implements ICommand {
  constructor(
    public readonly name: string,
    public readonly email: string,
    public readonly password: string,
    public readonly roles: string[],
    public readonly sources: string[] = [],
    public readonly requesterId?: string, // ID пользователя, выполняющего операцию
    public readonly requesterRoles: string[] = [], // Роли пользователя, выполняющего операцию
  ) {}
}

export class CreateUserCommand extends CreateAccountCommand {
  constructor(
    email: string,
    plainPassword: string,
    role: string,
  ) {
    super('', email, plainPassword, [role], []);
  }
}


