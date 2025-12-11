import { IEvent } from '@nestjs/cqrs';

export class UserUpdatedEvent implements IEvent {
  constructor(
    public readonly id: string,
    public readonly name?: string,
    public readonly email?: string,
    public readonly roles?: string[],
    public readonly sources?: string[],
    public readonly updatedAt: Date = new Date(),
  ) {}
}




