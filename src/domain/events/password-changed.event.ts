import { IEvent } from '@nestjs/cqrs';

export class PasswordChangedEvent implements IEvent {
  constructor(
    public readonly id: string,
    public readonly hash: string,
    public readonly changedAt: Date = new Date(),
  ) {}
}




