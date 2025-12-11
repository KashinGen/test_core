import { ICommand } from '@nestjs/cqrs';

export class GrantRoleCommand implements ICommand {
  constructor(
    public readonly id: string,
    public readonly roles: string[],
    public readonly requesterId?: string, // ID пользователя, выполняющего операцию
    public readonly requesterRoles: string[] = [], // Роли пользователя, выполняющего операцию
  ) {}
}


