import { Injectable, Inject } from '@nestjs/common';
import { IUserRepository } from '@domain/repositories/user-repository.interface';
import { User } from '@domain/entities/user.entity';
import { EventStoreService } from '../event-store/event-store.service';
import { Redis } from 'ioredis';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEntity } from '@infrastructure/event-store/event.entity';

@Injectable()
export class UserEventStoreRepository implements IUserRepository {
  constructor(
    private readonly eventStore: EventStoreService,
    @Inject('REDIS_CLIENT') private readonly redis: Redis,
    @InjectRepository(EventEntity)
    private readonly eventRepo: Repository<EventEntity>,
  ) {}

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
    // 1) Быстрый путь — Redis read model
    const userId = await this.redis.get(`user:email:${email}`);
    if (userId) {
      return this.findById(userId);
    }

    // 2) Fallback — ищем событие создания пользователя в event store
    const createdEvent = await this.eventRepo
      .createQueryBuilder('e')
      .where('e.eventType = :type', { type: 'UserCreatedEvent' })
      .andWhere(`e.payload->>'email' = :email`, { email })
      .orderBy('e.createdAt', 'DESC')
      .getOne();

    if (!createdEvent) {
      return undefined;
    }

    return this.findById(createdEvent.aggregateId);
  }
}
