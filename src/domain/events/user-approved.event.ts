import { IEvent } from '@nestjs/cqrs';

export class UserApprovedEvent implements IEvent {
  constructor(
    public readonly id: string,
    public readonly approvedAt: Date = new Date(),
  ) {}
}

// Оставляем для обратной совместимости, но не используем в новой модели


