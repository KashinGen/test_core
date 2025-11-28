import { ICommand } from '@nestjs/cqrs';

export class UpdateAccountCommand implements ICommand {
  constructor(
    public readonly id: string,
    public readonly name?: string,
    public readonly email?: string,
    public readonly roles?: string[],
    public readonly sources?: string[],
    public readonly passwordHash?: string, // Хеш пароля, если нужно изменить
  ) {}
}

