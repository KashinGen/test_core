import { Injectable, Inject, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom, timeout, catchError, of } from 'rxjs';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private readonly configService: ConfigService,
    @Inject('NOTIFICATION_SERVICE') private readonly client: ClientProxy,
  ) {}

  async sendPasswordResetEmail(
    email: string,
    name: string,
    token: string,
  ): Promise<void> {
    try {
      const adminPanelUrl = this.configService.get<string>('ADMIN_PANEL_URL');
      const senderEmail = this.configService.get<string>(
        'EMAIL_NOTIFICATION_SENDER_EMAIL',
        'noreply@bemymedia.com',
      );
      const senderName = this.configService.get<string>(
        'EMAIL_NOTIFICATION_SENDER_NAME',
        'BeMyMedia',
      );
      const template = this.configService.get<string>(
        'RESET_PASSWORD_EMAIL_TEMPLATE',
        'Reset your password by using this code token: {{token}}',
      );
      const title = this.configService.get<string>(
        'RESET_PASSWORD_EMAIL_TITLE',
        'Reset your password',
      );

      const resetUrl = adminPanelUrl
        ? `${adminPanelUrl}/password-reset/${token}`
        : null;

      const emailBody = template
        .replace(/{{token}}/g, token)
        .replace(/{{resetUrl}}/g, resetUrl || token)
        .replace(/{{adminPanelUrl}}/g, adminPanelUrl || '');

      // Используем NOTIFICATIONS_INTEGRATION_ID, если задан, иначе fallback на INTEGRATION_ID
      const integrationId =
        this.configService.get<string>('NOTIFICATIONS_INTEGRATION_ID') ||
        this.configService.get<string>('INTEGRATION_ID');

      const htmlContent = this.generateHtmlEmail(title, emailBody, resetUrl, token);
      
      // Формат для notification service через ClientProxy напрямую
      // TcpClientHelper в gateway добавляет integration автоматически, но мы используем ClientProxy напрямую
      const payload = {
        email: {
          email, // to email
          title,
          from: senderEmail,
          sender: senderName,
          text: emailBody, // Plain text версия
          html: htmlContent, // HTML версия
        },
        integration: {
          integrationId,
        },
      };

      await firstValueFrom(
        this.client.send({ cmd: 'create_notification' }, payload).pipe(
          timeout(5000),
          catchError((error) => {
            this.logger.error('Failed to send notification', error);
            // Не бросаем ошибку, чтобы не блокировать процесс сброса пароля
            // Токен уже создан, email можно отправить позже
            return of(null);
          }),
        ),
      );

      this.logger.log(`Password reset email sent to ${email}`);
    } catch (error) {
      this.logger.error(`Failed to send password reset email to ${email}`, error);
      // Не бросаем ошибку, чтобы не блокировать процесс
      // В production можно добавить retry механизм или очередь
    }
  }

  private generateHtmlEmail(
    title: string,
    body: string,
    resetUrl: string | null,
    token: string,
  ): string {
    const linkHtml = resetUrl
      ? `<p><a href="${resetUrl}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Reset Password</a></p>`
      : `<p><strong>Token:</strong> <code>${token}</code></p>`;

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${title}</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #007bff;">${title}</h1>
          <p>You're receiving this e-mail because you or someone else has requested a password reset for your user account.</p>
          <p>${body}</p>
          ${linkHtml}
          <p>If you did not request a password reset you can safely ignore this email.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="color: #666; font-size: 12px;">This is an automated message, please do not reply.</p>
        </div>
      </body>
      </html>
    `;
  }
}

