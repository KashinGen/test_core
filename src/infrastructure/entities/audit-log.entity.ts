import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

export enum AuditAction {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  APPROVE = 'APPROVE',
  BLOCK = 'BLOCK',
  GRANT_ROLE = 'GRANT_ROLE',
  CHANGE_PASSWORD = 'CHANGE_PASSWORD',
}

@Entity('audit_logs')
@Index(['entityType', 'entityId'])
@Index(['userId'])
@Index(['createdAt'])
export class AuditLogEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  entityType: string; // 'user', 'account', etc.

  @Column('uuid')
  entityId: string;

  @Column({
    type: 'varchar',
    length: '50',
  })
  action: AuditAction;

  @Column('uuid', { nullable: true })
  userId: string | null; // Кто выполнил действие

  @Column('text', { nullable: true })
  userEmail: string | null;

  @Column('jsonb', { nullable: true })
  oldValues: Record<string, any> | null; // Старые значения

  @Column('jsonb', { nullable: true })
  newValues: Record<string, any> | null; // Новые значения

  @Column('text', { nullable: true })
  description: string | null;

  @Column('jsonb', { nullable: true })
  metadata: Record<string, any> | null; // Дополнительная информация

  @CreateDateColumn()
  createdAt: Date;
}

