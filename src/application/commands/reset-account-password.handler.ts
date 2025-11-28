import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { NotFoundException } from '@nestjs/common';
import { ResetAccountPasswordCommand } from './reset-account-password.command';
import { IUserRepository } from '@domain/repositories/user-repository.interface';
import { v4 as uuid } from 'uuid';

@CommandHandler(ResetAccountPasswordCommand)
export class ResetAccountPasswordHandler
  implements ICommandHandler<ResetAccountPasswordCommand>
{
  constructor(private readonly repo: IUserRepository) {}

  async execute(command: ResetAccountPasswordCommand): Promise<{ token: string }> {
    const user = await this.repo.findByEmail(command.email);
    if (!user || user.isDeleted) {
      // Не раскрываем, существует ли пользователь
      throw new NotFoundException('Account not found');
    }

    // Генерируем токен для сброса пароля
    // В реальном проекте нужно сохранить токен в БД с TTL
    const token = uuid();

    // TODO: Сохранить токен в Redis или БД с TTL (например, 1 час)
    // await this.tokenStore.save(token, user.id, 3600);

    return { token };
  }
}

