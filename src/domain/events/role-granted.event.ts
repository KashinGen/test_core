import { IEvent } from '@nestjs/cqrs';

export class RoleGrantedEvent implements IEvent {
  constructor(
    public readonly id: string,
    public readonly roles: string[],
    public readonly grantedAt: Date = new Date(),
  ) {}
}


