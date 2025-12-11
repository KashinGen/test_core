import { IEvent } from '@nestjs/cqrs';

export class UserDeletedEvent implements IEvent {
  constructor(
    public readonly id: string,
    public readonly deletedAt: Date = new Date(),
  ) {}
}




