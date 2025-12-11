import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { NotFoundException, Inject, Logger } from '@nestjs/common';
import { ResetAccountPasswordCommand } from './reset-account-password.command';
import { IUserRepository } from '@domain/repositories/user-repository.interface';
import { PasswordResetRepository } from '@infrastructure/repos/password-reset.repository';
import { NotificationService } from '@infrastructure/services/notification.service';
import { PasswordResetEntity } from '@infrastructure/entities/password-reset.entity';
import { randomBytes } from 'crypto';

@CommandHandler(ResetAccountPasswordCommand)
export class ResetAccountPasswordHandler
  implements ICommandHandler<ResetAccountPasswordCommand>
{
  private readonly logger = new Logger(ResetAccountPasswordHandler.name);
  private readonly TOKEN_LIFETIME_HOURS = 1;

  constructor(
    @Inject('IUserRepository')
    private readonly repo: IUserRepository,
    private readonly passwordResetRepo: PasswordResetRepository,
    private readonly notificationService: NotificationService,
  ) {}

  async execute(command: ResetAccountPasswordCommand): Promise<void> {
    const user = await this.repo.findByEmail(command.email);
    if (!user || user.isDeleted) {
      return;
    }

    const hasActive = await this.passwordResetRepo.hasActivePasswordReset(
      user.id,
      this.TOKEN_LIFETIME_HOURS,
    );
    if (hasActive) {
      return;
    }

    const token = this.generateToken();

    const passwordReset = new PasswordResetEntity();
    passwordReset.accountId = user.id;
    passwordReset.token = token;
    await this.passwordResetRepo.save(passwordReset);

    this.notificationService
      .sendPasswordResetEmail(user.email, user.name, token)
      .then(() => {
        this.passwordResetRepo.markAsNotified(token).catch((err) => {
          this.logger.error('Failed to mark token as notified', err);
        });
      })
      .catch((err) => {
        this.logger.error('Failed to send password reset email', err);
      });
  }

  private generateToken(): string {
    return randomBytes(32).toString('hex');
  }
}


