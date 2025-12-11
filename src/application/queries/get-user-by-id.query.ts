import { IQuery } from '@nestjs/cqrs';

export class GetUserByIdQuery implements IQuery {
  constructor(
    public readonly id: string,
    public readonly requesterId?: string, // ID пользователя, выполняющего запрос
    public readonly requesterRoles: string[] = [], // Роли пользователя, выполняющего запрос
  ) {}
}




