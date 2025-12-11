import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('events')
@Index(['aggregateId', 'createdAt'])
export class EventEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  aggregateId: string;

  @Column()
  eventType: string;

  @Column({ type: 'jsonb' })
  payload: any;

  @Column({ type: 'bigint', default: 0 })
  version: number;

  @CreateDateColumn()
  createdAt: Date;
}





