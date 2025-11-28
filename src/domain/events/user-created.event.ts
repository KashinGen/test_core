import { IEvent } from '@nestjs/cqrs';

export class UserCreatedEvent implements IEvent {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly email: string,
    public readonly hash: string,
    public readonly roles: string[],
    public readonly sources: string[] = [],
    public readonly createdAt: Date = new Date(),
  ) {}
}
