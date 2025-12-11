import { IEvent } from '@nestjs/cqrs';

export class PasswordResetRequestedEvent implements IEvent {
  constructor(
    public readonly id: string,
    public readonly token: string,
    public readonly expiresAt: Date,
    public readonly requestedAt: Date = new Date(),
  ) {}
}





