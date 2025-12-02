import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EventEntity } from './event.entity';
import { IEvent, AggregateRoot } from '@nestjs/cqrs';
import { User } from '@domain/entities/user.entity';

@Injectable()
export class EventStoreService {
  constructor(
    @InjectRepository(EventEntity)
    private readonly eventRepository: Repository<EventEntity>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async save(aggregate: AggregateRoot<IEvent>): Promise<void> {
    const events = aggregate.getUncommittedEvents();
    if (events.length === 0) {
      return;
    }

    const aggregateId = (aggregate as User).id;
    const currentVersion = await this.getCurrentVersion(aggregateId);

    const eventEntities = events.map((event, index) => {
      const entity = new EventEntity();
      entity.aggregateId = aggregateId;
      entity.eventType = event.constructor.name;
      entity.payload = event;
      entity.version = currentVersion + index + 1;
      return entity;
    });

    await this.eventRepository.save(eventEntities);
    aggregate.commit();

    // Публикуем события для проекторов
    for (const event of events) {
      this.eventEmitter.emit(event.constructor.name, event);
    }
  }

  async getEvents(aggregateId: string): Promise<IEvent[]> {
    const events = await this.eventRepository.find({
      where: { aggregateId },
      order: { version: 'ASC' },
    });

    return events.map((e) => this.deserializeEvent(e));
  }

  async getEventsByType(
    eventType: string,
    limit = 100,
    offset = 0,
  ): Promise<IEvent[]> {
    const events = await this.eventRepository.find({
      where: { eventType },
      order: { createdAt: 'ASC' },
      take: limit,
      skip: offset,
    });

    return events.map((e) => this.deserializeEvent(e));
  }

  private async getCurrentVersion(aggregateId: string): Promise<number> {
    const lastEvent = await this.eventRepository.findOne({
      where: { aggregateId },
      order: { version: 'DESC' },
    });

    return lastEvent?.version || 0;
  }

  private deserializeEvent(eventEntity: EventEntity): IEvent {
    return eventEntity.payload as IEvent;
  }
}
