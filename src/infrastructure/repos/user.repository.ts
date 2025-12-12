import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from '../entities/user.entity';

export interface FindUsersFilters {
  page?: number;
  perPage?: number;
  ids?: string[];
  name?: string;
  roles?: string[];
  company?: string[];
}

export interface FindUsersResult {
  items: UserEntity[];
  total: number;
}

@Injectable()
export class UserRepository {
  constructor(
    @InjectRepository(UserEntity)
    private readonly repo: Repository<UserEntity>,
  ) {}

  async findById(id: string): Promise<UserEntity | null> {
    return this.repo.findOne({
      where: { id, deletedAt: null },
    });
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    return this.repo.findOne({
      where: { email, deletedAt: null },
    });
  }

  async save(user: UserEntity): Promise<UserEntity> {
    return this.repo.save(user);
  }

  async findAll(filters: FindUsersFilters): Promise<FindUsersResult> {
    const query = this.repo
      .createQueryBuilder('user')
      .where('user.deletedAt IS NULL');

    if (filters.ids?.length) {
      query.andWhere('user.id IN (:...ids)', { ids: filters.ids });
    }

    if (filters.name) {
      query.andWhere('user.name ILIKE :name', { name: `%${filters.name}%` });
    }

    if (filters.roles?.length) {
      query.andWhere('user.roles && :roles', { roles: filters.roles });
    }

    // company фильтр пока не используется, но оставляем для совместимости
    if (filters.company?.length) {
      // Можно добавить логику фильтрации по company, если нужно
    }

    const total = await query.getCount();

    const page = filters.page || 1;
    const perPage = filters.perPage || 20;

    const items = await query
      .orderBy('user.createdAt', 'DESC')
      .skip((page - 1) * perPage)
      .take(perPage)
      .getMany();

    return { items, total };
  }

  async exists(email: string): Promise<boolean> {
    const count = await this.repo.count({
      where: { email, deletedAt: null },
    });
    return count > 0;
  }

  /**
   * Получить EntityManager для работы с транзакциями
   */
  get manager() {
    return this.repo.manager;
  }
}

