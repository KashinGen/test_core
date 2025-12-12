import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLogEntity, AuditAction } from '../entities/audit-log.entity';

export interface CreateAuditLogParams {
  entityType: string;
  entityId: string;
  action: AuditAction;
  userId?: string | null;
  userEmail?: string | null;
  oldValues?: Record<string, any> | null;
  newValues?: Record<string, any> | null;
  description?: string | null;
  metadata?: Record<string, any> | null;
}

@Injectable()
export class AuditLogRepository {
  constructor(
    @InjectRepository(AuditLogEntity)
    private readonly repo: Repository<AuditLogEntity>,
  ) {}

  async create(params: CreateAuditLogParams): Promise<AuditLogEntity> {
    const log = this.repo.create({
      entityType: params.entityType,
      entityId: params.entityId,
      action: params.action,
      userId: params.userId || null,
      userEmail: params.userEmail || null,
      oldValues: params.oldValues || null,
      newValues: params.newValues || null,
      description: params.description || null,
      metadata: params.metadata || null,
    });

    return this.repo.save(log);
  }

  async findByEntity(
    entityType: string,
    entityId: string,
    limit = 100,
  ): Promise<AuditLogEntity[]> {
    return this.repo.find({
      where: { entityType, entityId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async findByUser(userId: string, limit = 100): Promise<AuditLogEntity[]> {
    return this.repo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  /**
   * Получить EntityManager для работы с транзакциями
   */
  get manager() {
    return this.repo.manager;
  }
}

