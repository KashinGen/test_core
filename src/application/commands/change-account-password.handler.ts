import { CommandHandler, ICommandHandler, EventPublisher } from '@nestjs/cqrs';
import { NotFoundException, BadRequestException, Inject } from '@nestjs/common';
import { ChangeAccountPasswordCommand } from './change-account-password.command';
import { IUserRepository } from '@domain/repositories/user-repository.interface';
import { PasswordResetRepository } from '@infrastructure/repos/password-reset.repository';
import { User } from '@domain/entities/user.entity';
import * as bcrypt from 'bcrypt';

@CommandHandler(ChangeAccountPasswordCommand)
export class ChangeAccountPasswordHandler
  implements ICommandHandler<ChangeAccountPasswordCommand>
{
  private readonly TOKEN_LIFETIME_HOURS = 1;

  constructor(
    @Inject('IUserRepository')
    private readonly repo: IUserRepository,
    private readonly passwordResetRepo: PasswordResetRepository,
    private readonly publisher: EventPublisher,
  ) {}

  async execute(
    command: ChangeAccountPasswordCommand,
  ): Promise<void> {
    const passwordReset = await this.passwordResetRepo.findActiveByToken(
      command.token,
      this.TOKEN_LIFETIME_HOURS,
    );

    if (!passwordReset) {
      throw new BadRequestException('Invalid or expired password reset token');
    }

    if (passwordReset.usedAt) {
      throw new BadRequestException('Password reset token has already been used');
    }

    const user = await this.repo.findById(passwordReset.accountId);
    if (!user || user.isDeleted) {
      throw new NotFoundException('Account not found');
    }

    const hash = await bcrypt.hash(command.password, 12);

    const userWithEvents = this.publisher.mergeObjectContext(user);
    userWithEvents.changePassword(hash);
    await this.repo.save(userWithEvents);
    userWithEvents.commit();

    await this.passwordResetRepo.markAsUsed(command.token);
  }
}


