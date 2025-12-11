import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { PasswordResetEntity } from '../entities/password-reset.entity';

@Injectable()
export class PasswordResetRepository {
  constructor(
    @InjectRepository(PasswordResetEntity)
    private readonly repo: Repository<PasswordResetEntity>,
  ) {}

  async save(entity: PasswordResetEntity): Promise<PasswordResetEntity> {
    return this.repo.save(entity);
  }

  async findOneByToken(token: string): Promise<PasswordResetEntity | null> {
    return this.repo.findOne({ where: { token } });
  }

  async findActiveByToken(
    token: string,
    lifetimeHours: number = 1,
  ): Promise<PasswordResetEntity | null> {
    const expirationDate = new Date();
    expirationDate.setHours(expirationDate.getHours() - lifetimeHours);

    return this.repo.findOne({
      where: {
        token,
        createdAt: MoreThan(expirationDate),
        usedAt: null,
      },
    });
  }

  async hasActivePasswordReset(
    accountId: string,
    lifetimeHours: number = 1,
  ): Promise<boolean> {
    const expirationDate = new Date();
    expirationDate.setHours(expirationDate.getHours() - lifetimeHours);

    const count = await this.repo.count({
      where: {
        accountId,
        createdAt: MoreThan(expirationDate),
        usedAt: null,
      },
    });

    return count > 0;
  }

  async markAsNotified(token: string): Promise<void> {
    await this.repo.update({ token }, { notifiedAt: new Date() });
  }

  async markAsUsed(token: string): Promise<void> {
    await this.repo.update({ token }, { usedAt: new Date() });
  }
}




