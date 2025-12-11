import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EventEntity } from './event.entity';
import { IEvent, AggregateRoot } from '@nestjs/cqrs';
import { User } from '@domain/entities/user.entity';
import {
  UserCreatedEvent,
  UserApprovedEvent,
  UserBlockedEvent,
  RoleGrantedEvent,
  PasswordChangedEvent,
  UserUpdatedEvent,
  UserDeletedEvent,
} from '@domain/events';

@Injectable()
export class EventStoreService {
  private readonly logger = new Logger(EventStoreService.name);

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
    const payload = eventEntity.payload as any;
    switch (eventEntity.eventType) {
      case 'UserCreatedEvent':
        const hash = payload.hash;
        if (!hash) {
          this.logger.error(
            'UserCreatedEvent deserialization - hash is missing:',
            {
              id: payload.id,
              email: payload.email,
              payloadKeys: Object.keys(payload),
              fullPayload: JSON.stringify(payload),
            },
          );
        } else {
          this.logger.debug('UserCreatedEvent deserialized successfully', {
            id: payload.id,
            email: payload.email,
            hashPrefix: hash.substring(0, 10),
            hashLength: hash.length,
          });
        }
        return Object.assign(
          new UserCreatedEvent(
            payload.id,
            payload.name,
            payload.email,
            hash,
            payload.roles,
            payload.sources,
            payload.createdAt ? new Date(payload.createdAt) : new Date(),
          ),
          payload,
        );
      case 'UserApprovedEvent':
        return Object.assign(
          new UserApprovedEvent(
            payload.id,
            payload.approvedAt ? new Date(payload.approvedAt) : new Date(),
          ),
          payload,
        );
      case 'UserBlockedEvent':
        return Object.assign(
          new UserBlockedEvent(
            payload.id,
            payload.blockedAt ? new Date(payload.blockedAt) : new Date(),
          ),
          payload,
        );
      case 'RoleGrantedEvent':
        return Object.assign(
          new RoleGrantedEvent(
            payload.id,
            payload.roles,
            payload.grantedAt ? new Date(payload.grantedAt) : new Date(),
          ),
          payload,
        );
      case 'PasswordChangedEvent':
        return Object.assign(
          new PasswordChangedEvent(
            payload.id,
            payload.hash,
            payload.changedAt ? new Date(payload.changedAt) : new Date(),
          ),
          payload,
        );
      case 'UserUpdatedEvent':
        return Object.assign(
          new UserUpdatedEvent(
            payload.id,
            payload.name,
            payload.email,
            payload.roles,
            payload.sources,
            payload.updatedAt ? new Date(payload.updatedAt) : new Date(),
          ),
          payload,
        );
      case 'UserDeletedEvent':
        return Object.assign(
          new UserDeletedEvent(
            payload.id,
            payload.deletedAt ? new Date(payload.deletedAt) : new Date(),
          ),
          payload,
        );
      default:
        return payload as IEvent;
    }
  }
}
