import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';
import { NotificationService } from './notification.service';

@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: 'NOTIFICATION_SERVICE',
        inject: [ConfigService],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.TCP,
          options: {
            host: configService.get<string>('NOTIFICATION_SERVICE_HOST', 'localhost'),
            port: parseInt(configService.get<string>('NOTIFICATION_SERVICE_PORT', '3001'), 10),
          },
        }),
      },
    ]),
  ],
  providers: [NotificationService],
  exports: [NotificationService],
})
export class NotificationModule {}


