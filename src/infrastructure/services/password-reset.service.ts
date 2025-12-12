import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { UserService } from './user.service';
import { PasswordResetRepository } from '../repos/password-reset.repository';
import { NotificationService } from './notification.service';
import { PasswordResetEntity } from '../entities/password-reset.entity';
import { randomBytes } from 'crypto';

@Injectable()
export class PasswordResetService {
  private readonly logger = new Logger(PasswordResetService.name);
  private readonly TOKEN_LIFETIME_HOURS = 1;

  constructor(
    private readonly userService: UserService,
    private readonly passwordResetRepo: PasswordResetRepository,
    private readonly notificationService: NotificationService,
  ) {}

  async requestPasswordReset(email: string): Promise<void> {
    const user = await this.userService.findByEmail(email);
    if (!user || user.deletedAt) {
      // Не раскрываем, существует ли пользователь
      return;
    }

    const hasActive = await this.passwordResetRepo.hasActivePasswordReset(
      user.id,
      this.TOKEN_LIFETIME_HOURS,
    );
    if (hasActive) {
      // Уже есть активный токен
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

  async changePasswordByToken(token: string, newPassword: string): Promise<void> {
    const passwordReset = await this.passwordResetRepo.findActiveByToken(
      token,
      this.TOKEN_LIFETIME_HOURS,
    );

    if (!passwordReset) {
      throw new BadRequestException('Invalid or expired password reset token');
    }

    if (passwordReset.usedAt) {
      throw new BadRequestException('Password reset token has already been used');
    }

    const user = await this.userService.findById(passwordReset.accountId);
    if (!user || user.deletedAt) {
      throw new NotFoundException('Account not found');
    }

    await this.userService.changePassword(user.id, newPassword);
    await this.passwordResetRepo.markAsUsed(token);
  }

  private generateToken(): string {
    return randomBytes(32).toString('hex');
  }
}

