import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('password_reset')
@Index(['token'], { unique: true })
@Index(['accountId'])
export class PasswordResetEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  accountId: string;

  @Column({ type: 'text', unique: true })
  token: string;

  @Column({ type: 'timestamp', nullable: true })
  notifiedAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  usedAt?: Date;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;
}




