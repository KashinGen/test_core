import { Injectable } from '@nestjs/common';
import { IUserRepository } from '@domain/repositories/user-repository.interface';
import { User } from '@domain/entities/user.entity';
import { EventStoreService } from '../event-store/event-store.service';
import {
  UserCreatedEvent,
  UserApprovedEvent,
  UserBlockedEvent,
  RoleGrantedEvent,
} from '@domain/events';

@Injectable()
export class UserEventStoreRepository implements IUserRepository {
  constructor(private readonly eventStore: EventStoreService) {}

  async save(user: User): Promise<void> {
    await this.eventStore.save(user);
  }

  async findById(id: string): Promise<User | undefined> {
    const events = await this.eventStore.getEvents(id);
    if (events.length === 0) {
      return undefined;
    }

    const user = new User();
    user.loadFromHistory(events);
    return user;
  }

  async findByEmail(email: string): Promise<User | undefined> {
    // Для поиска по email используем read-model через специальный метод
    // В реальном проекте лучше использовать read-model напрямую
    const events = await this.eventStore.getEventsByType(
      UserCreatedEvent.name,
      1000, // Увеличиваем лимит для поиска
    );

    for (const event of events) {
      const createdEvent = event as UserCreatedEvent;
      if (createdEvent.email === email) {
        return this.findById(createdEvent.id);
      }
    }

    return undefined;
  }
}

