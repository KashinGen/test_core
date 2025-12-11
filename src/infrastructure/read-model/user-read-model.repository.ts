import { Injectable, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Redis } from 'ioredis';
import { UserCreatedEvent } from '@domain/events/user-created.event';
import { UserUpdatedEvent } from '@domain/events/user-updated.event';
import { UserDeletedEvent } from '@domain/events/user-deleted.event';
import { UserApprovedEvent } from '@domain/events/user-approved.event';
import { UserBlockedEvent } from '@domain/events/user-blocked.event';
import { RoleGrantedEvent } from '@domain/events/role-granted.event';
import { PasswordChangedEvent } from '@domain/events/password-changed.event';
import { AccountDto } from '@presentation/dto/account.dto';
import { GetAccountsOrder } from '@application/queries/get-accounts.query';
import { EventStoreService } from '@infrastructure/event-store/event-store.service';
import { EventEntity } from '@infrastructure/event-store/event.entity';
import { User } from '@domain/entities/user.entity';

export interface FindAllResult {
  items: AccountDto[];
  total: number;
}

@Injectable()
export class UserReadModelRepository {
  private readonly ttlSeconds: number;

  constructor(
    @Inject('REDIS_CLIENT') private readonly redis: Redis,
    private readonly configService: ConfigService,
    private readonly eventStore: EventStoreService,
    @InjectRepository(EventEntity)
    private readonly eventRepo: Repository<EventEntity>,
  ) {
    const ttlDays = parseInt(
      this.configService.get<string>('REDIS_TTL_DAYS') || '30',
      10,
    );
    this.ttlSeconds = ttlDays * 24 * 60 * 60;
  }

  private async cacheUser(dto: AccountDto): Promise<void> {
    await this.redis.set(
      `user:${dto.id}`,
      JSON.stringify(dto),
      'EX',
      this.ttlSeconds,
    );
    await this.redis.set(
      `user:email:${dto.email}`,
      dto.id,
      'EX',
      this.ttlSeconds,
    );
    await this.redis.sadd('users:index', dto.id);
    if (dto.roles?.length) {
      for (const role of dto.roles) {
        await this.redis.sadd(`users:role:${role}`, dto.id);
      }
    }
  }

  private mapUserToDto(user: User): AccountDto {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      roles: user.roles,
      sources: user.sources,
      createdAt: user.createdAt?.toISOString() ?? new Date().toISOString(),
      updatedAt: user.updatedAt?.toISOString() ?? new Date().toISOString(),
    };
  }

  async projectUserCreated(event: UserCreatedEvent): Promise<void> {
    const dto: AccountDto = {
      id: event.id,
      name: event.name,
      email: event.email,
      roles: event.roles || [],
      sources: event.sources || [],
      createdAt: event.createdAt.toISOString(),
      updatedAt: event.createdAt.toISOString(),
    };

    await this.redis.set(
      `user:${event.id}`,
      JSON.stringify(dto),
      'EX',
      this.ttlSeconds,
    );
    await this.redis.set(
      `user:email:${event.email}`,
      event.id,
      'EX',
      this.ttlSeconds,
    );

    await this.redis.sadd('users:index', event.id);
    if (event.roles.length > 0) {
      for (const role of event.roles) {
        await this.redis.sadd(`users:role:${role}`, event.id);
      }
    }
  }

  async projectUserUpdated(event: UserUpdatedEvent): Promise<void> {
    const userJson = await this.redis.get(`user:${event.id}`);
    if (!userJson) {
      return;
    }

    const user: AccountDto = JSON.parse(userJson);

    if (event.name !== undefined) {
      user.name = event.name;
    }
    if (event.email !== undefined) {
      const oldEmail = user.email;
      await this.redis.del(`user:email:${oldEmail}`);
      await this.redis.set(
        `user:email:${event.email}`,
        event.id,
        'EX',
        this.ttlSeconds,
      );
      user.email = event.email;
    }
    if (event.roles !== undefined) {
      const oldRoles = user.roles;
      for (const role of oldRoles) {
        await this.redis.srem(`users:role:${role}`, event.id);
      }
      for (const role of event.roles) {
        await this.redis.sadd(`users:role:${role}`, event.id);
      }
      user.roles = event.roles;
    }
    if (event.sources !== undefined) {
      user.sources = event.sources || [];
    }

    user.updatedAt = event.updatedAt.toISOString();
    await this.redis.set(
      `user:${event.id}`,
      JSON.stringify(user),
      'EX',
      this.ttlSeconds,
    );
  }

  async projectUserDeleted(event: UserDeletedEvent): Promise<void> {
    const userJson = await this.redis.get(`user:${event.id}`);
    if (!userJson) {
      return;
    }

    const user: AccountDto = JSON.parse(userJson);
    user.updatedAt = event.deletedAt.toISOString();

    await this.redis.set(
      `user:${event.id}`,
      JSON.stringify(user),
      'EX',
      this.ttlSeconds,
    );
    await this.redis.set(
      `user:${event.id}:deleted`,
      '1',
      'EX',
      this.ttlSeconds,
    );
  }

  async projectPasswordChanged(event: PasswordChangedEvent): Promise<void> {
    const userJson = await this.redis.get(`user:${event.id}`);
    if (!userJson) {
      return;
    }

    const user: AccountDto = JSON.parse(userJson);
    user.updatedAt = event.changedAt.toISOString();
    await this.redis.set(`user:${event.id}`, JSON.stringify(user));
  }

  async projectUserApproved(event: UserApprovedEvent): Promise<void> {
    const userJson = await this.redis.get(`user:${event.id}`);
    if (!userJson) {
      return;
    }

    const user: AccountDto = JSON.parse(userJson);
    user.updatedAt = event.approvedAt.toISOString();
    await this.redis.set(`user:${event.id}`, JSON.stringify(user));
  }

  async projectUserBlocked(event: UserBlockedEvent): Promise<void> {
    const userJson = await this.redis.get(`user:${event.id}`);
    if (!userJson) {
      return;
    }

    const user: AccountDto = JSON.parse(userJson);
    user.updatedAt = event.blockedAt.toISOString();
    await this.redis.set(`user:${event.id}`, JSON.stringify(user));
  }

  async projectRoleGranted(event: RoleGrantedEvent): Promise<void> {
    const userJson = await this.redis.get(`user:${event.id}`);
    if (!userJson) {
      return;
    }

    const user: AccountDto = JSON.parse(userJson);

    const oldRoles = user.roles;
    for (const role of oldRoles) {
      await this.redis.srem(`users:role:${role}`, event.id);
    }
    for (const role of event.roles) {
      await this.redis.sadd(`users:role:${role}`, event.id);
    }

    user.roles = event.roles;
    user.updatedAt = event.grantedAt.toISOString();
    await this.redis.set(`user:${event.id}`, JSON.stringify(user));
  }

  async findById(id: string): Promise<AccountDto | null> {
    const deleted = await this.redis.get(`user:${id}:deleted`);
    if (deleted) {
      return null;
    }

    const json = await this.redis.get(`user:${id}`);
    if (json) {
      return JSON.parse(json);
    }

    // Fallback: достаем события и восстанавливаем пользователя
    const events = await this.eventStore.getEvents(id);
    if (!events || events.length === 0) {
      return null;
    }

    const user = new User();
    user.loadFromHistory(events);
    if (user.isDeleted) {
      return null;
    }

    const dto = this.mapUserToDto(user);
    await this.cacheUser(dto);
    return dto;
  }

  async findByEmail(email: string): Promise<AccountDto | null> {
    const id = await this.redis.get(`user:email:${email}`);
    if (id) {
      return this.findById(id);
    }

    // Fallback: ищем создание пользователя по email в event store
    const createdEvent = await this.eventRepo
      .createQueryBuilder('e')
      .where('e.eventType = :type', { type: 'UserCreatedEvent' })
      .andWhere(`e.payload->>'email' = :email`, { email })
      .orderBy('e.createdAt', 'DESC')
      .getOne();

    if (!createdEvent) {
      return null;
    }

    return this.findById(createdEvent.aggregateId);
  }

  async findAll(
    page: number = 1,
    perPage: number = 20,
    id?: string[],
    name?: string,
    company?: string[],
    role?: string[],
    order?: GetAccountsOrder,
  ): Promise<FindAllResult> {
    let candidateIds: string[] = [];

    if (id && id.length > 0) {
      candidateIds = id;
    } else {
      candidateIds = await this.redis.smembers('users:index');
    }

    if (role && role.length > 0) {
      const roleIds: string[] = [];
      for (const r of role) {
        const ids = await this.redis.smembers(`users:role:${r}`);
        roleIds.push(...ids);
      }
      candidateIds = candidateIds.filter((id) => roleIds.includes(id));
    }

    const candidates: AccountDto[] = [];
    for (const userId of candidateIds) {
      const deleted = await this.redis.get(`user:${userId}:deleted`);
      if (deleted) {
        continue;
      }

      const json = await this.redis.get(`user:${userId}`);
      if (json) {
        const user: AccountDto = JSON.parse(json);

        if (name && !user.name.toLowerCase().includes(name.toLowerCase())) {
          continue;
        }

        if (company && company.length > 0) {
          const hasCompany = company.some((c) => user.sources.includes(c));
          if (!hasCompany) {
            continue;
          }
        }

        candidates.push(user);
      }
    }

    if (order) {
      candidates.sort((a, b) => {
        if (order.name) {
          const cmp = a.name.localeCompare(b.name);
          return order.name === 'asc' ? cmp : -cmp;
        }
        if (order.email) {
          const cmp = a.email.localeCompare(b.email);
          return order.email === 'asc' ? cmp : -cmp;
        }
        if (order.createdAt) {
          const cmp =
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          return order.createdAt === 'asc' ? cmp : -cmp;
        }
        return 0;
      });
    } else {
      candidates.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
    }

    const total = candidates.length;
    const start = (page - 1) * perPage;
    const end = start + perPage;
    const items = candidates.slice(start, end);

    return { items, total };
  }

  async findAllOld(limit = 100, offset = 0): Promise<AccountDto[]> {
    const result = await this.findAll(Math.floor(offset / limit) + 1, limit);
    return result.items;
  }
}
