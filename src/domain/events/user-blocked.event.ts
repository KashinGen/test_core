import { IEvent } from '@nestjs/cqrs';

export class UserBlockedEvent implements IEvent {
  constructor(
    public readonly id: string,
    public readonly blockedAt: Date = new Date(),
  ) {}
}


