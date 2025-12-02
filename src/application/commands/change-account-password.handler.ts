import { CommandHandler, ICommandHandler, EventPublisher } from '@nestjs/cqrs';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { ChangeAccountPasswordCommand } from './change-account-password.command';
import { IUserRepository } from '@domain/repositories/user-repository.interface';
import { User } from '@domain/entities/user.entity';
import * as bcrypt from 'bcrypt';

@CommandHandler(ChangeAccountPasswordCommand)
export class ChangeAccountPasswordHandler
  implements ICommandHandler<ChangeAccountPasswordCommand>
{
  constructor(
    private readonly repo: IUserRepository,
    private readonly publisher: EventPublisher,
  ) {}

  async execute(
    command: ChangeAccountPasswordCommand,
  ): Promise<{ ok: boolean }> {
    // TODO: Получить userId из токена (из Redis или БД)
    // const userId = await this.tokenStore.getUserId(command.token);
    // if (!userId) {
    //   throw new BadRequestException('Invalid or expired token');
    // }

    // Временная реализация - нужно добавить токен-стор
    // Для примера используем токен как ID (небезопасно, только для демо)
    let userId: string | undefined;
    try {
      // В реальном проекте токен должен быть в формате UUID и храниться в Redis
      userId = command.token; // ВРЕМЕННО - только для демо
    } catch {
      throw new BadRequestException('Invalid token format');
    }

    const user = await this.repo.findById(userId);
    if (!user || user.isDeleted) {
      throw new NotFoundException('Account not found');
    }

    const hash = await bcrypt.hash(command.password, 12);

    const userWithEvents = this.publisher.mergeObjectContext(user);
    (userWithEvents as any).changePassword(hash);
    await this.repo.save(userWithEvents as any);
    userWithEvents.commit();

    // TODO: Удалить использованный токен
    // await this.tokenStore.delete(command.token);

    return { ok: true };
  }
}

