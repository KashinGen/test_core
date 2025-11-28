import { Injectable, Inject } from '@nestjs/common';
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

export interface FindAllResult {
  items: AccountDto[];
  total: number;
}

@Injectable()
export class UserReadModelRepository {
  constructor(@Inject('REDIS_CLIENT') private readonly redis: Redis) {}

  async projectUserCreated(event: UserCreatedEvent): Promise<void> {
    const dto: AccountDto = {
      id: event.id,
      name: event.name,
      email: event.email,
      roles: event.roles || [],
      sources: event.sources || [], // Всегда массив
      createdAt: event.createdAt.toISOString(),
      updatedAt: event.createdAt.toISOString(),
    };

    await this.redis.set(`user:${event.id}`, JSON.stringify(dto));
    await this.redis.set(`user:email:${event.email}`, event.id);
    
    // Индексы для фильтрации
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
      // Обновляем индекс email
      const oldEmail = user.email;
      await this.redis.del(`user:email:${oldEmail}`);
      await this.redis.set(`user:email:${event.email}`, event.id);
      user.email = event.email;
    }
    if (event.roles !== undefined) {
      // Обновляем индексы ролей
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
      user.sources = event.sources || []; // Всегда массив
    }
    
    user.updatedAt = event.updatedAt.toISOString();
    await this.redis.set(`user:${event.id}`, JSON.stringify(user));
  }

  async projectUserDeleted(event: UserDeletedEvent): Promise<void> {
    const userJson = await this.redis.get(`user:${event.id}`);
    if (!userJson) {
      return;
    }

    const user: AccountDto = JSON.parse(userJson);
    user.updatedAt = event.deletedAt.toISOString();
    
    // Помечаем как удаленный, но не удаляем из индексов для фильтрации
    await this.redis.set(`user:${event.id}`, JSON.stringify(user));
    await this.redis.set(`user:${event.id}:deleted`, '1');
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
    
    // Обновляем индексы ролей
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
      return null; // Не возвращаем удаленные
    }
    
    const json = await this.redis.get(`user:${id}`);
    return json ? JSON.parse(json) : null;
  }

  async findByEmail(email: string): Promise<AccountDto | null> {
    const id = await this.redis.get(`user:email:${email}`);
    if (!id) {
      return null;
    }
    return this.findById(id);
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
    // Начинаем с общего индекса
    let candidateIds: string[] = [];
    
    // Фильтр по ID
    if (id && id.length > 0) {
      candidateIds = id;
    } else {
      // Получаем все ID из индекса
      candidateIds = await this.redis.smembers('users:index');
    }

    // Фильтр по ролям
    if (role && role.length > 0) {
      const roleIds: string[] = [];
      for (const r of role) {
        const ids = await this.redis.smembers(`users:role:${r}`);
        roleIds.push(...ids);
      }
      // Пересечение множеств
      candidateIds = candidateIds.filter(id => roleIds.includes(id));
    }

    // Загружаем все кандидаты
    const candidates: AccountDto[] = [];
    for (const userId of candidateIds) {
      const deleted = await this.redis.get(`user:${userId}:deleted`);
      if (deleted) {
        continue; // Пропускаем удаленные
      }
      
      const json = await this.redis.get(`user:${userId}`);
      if (json) {
        const user: AccountDto = JSON.parse(json);
        
        // Фильтр по имени (частичное совпадение)
        if (name && !user.name.toLowerCase().includes(name.toLowerCase())) {
          continue;
        }
        
        // Фильтр по company (через sources, если нужно)
        if (company && company.length > 0) {
          const hasCompany = company.some(c => user.sources.includes(c));
          if (!hasCompany) {
            continue;
          }
        }
        
        candidates.push(user);
      }
    }

    // Сортировка
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
          const cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          return order.createdAt === 'asc' ? cmp : -cmp;
        }
        return 0;
      });
    } else {
      // По умолчанию сортируем по createdAt desc
      candidates.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    }

    const total = candidates.length;
    const start = (page - 1) * perPage;
    const end = start + perPage;
    const items = candidates.slice(start, end);

    return { items, total };
  }

  // Обратная совместимость
  async findAllOld(limit = 100, offset = 0): Promise<AccountDto[]> {
    const result = await this.findAll(
      Math.floor(offset / limit) + 1,
      limit,
    );
    return result.items;
  }
}
