import { Injectable, Inject } from '@nestjs/common';
import { Redis } from 'ioredis';
import { Permission } from '@domain/common/types';

@Injectable()
export class PermissionRepository {
  constructor(@Inject('REDIS_CLIENT') private readonly redis: Redis) {}

  async check(userId: string, action: string, resource: string): Promise<boolean> {
    const permissions = await this.ofUser(userId);
    return permissions.some(
      (p) => p.action === action && p.resource === resource,
    );
  }

  async ofUser(userId: string): Promise<Permission[]> {
    const key = `permissions:${userId}`;
    const json = await this.redis.get(key);
    if (!json) {
      return [];
    }
    return JSON.parse(json);
  }

  async setPermissions(userId: string, permissions: Permission[]): Promise<void> {
    const key = `permissions:${userId}`;
    await this.redis.set(key, JSON.stringify(permissions));
  }
}


