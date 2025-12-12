import {
  Injectable,
  ConflictException,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { UserRepository } from '../repos/user.repository';
import { AuditLogRepository } from '../repos/audit-log.repository';
import { UserEntity } from '../entities/user.entity';
import { AuditLogEntity, AuditAction } from '../entities/audit-log.entity';
import * as bcrypt from 'bcrypt';
import { v4 as uuid } from 'uuid';
import { Role } from '@presentation/authorization/roles.enum';
import { PRIVILEGED_ROLES } from '@presentation/authorization/constants/privileged-roles.constant';
import { RequestUser } from '@presentation/authorization/interfaces/request-user.interface';
import { FindUsersFilters, FindUsersResult } from '../repos/user.repository';

export interface CreateUserParams {
  name: string;
  email: string;
  password: string;
  roles: string[];
  sources?: string[];
  requesterId: string;
  requesterRoles: string[];
}

export interface UpdateUserParams {
  name?: string;
  email?: string;
  password?: string;
  roles?: string[];
  sources?: string[];
}

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    private readonly userRepo: UserRepository,
    private readonly auditLogRepo: AuditLogRepository,
  ) {}

  async create(params: CreateUserParams): Promise<UserEntity> {
    // Проверка прав на назначение привилегированных ролей
    const hasPrivilegedRole = params.roles.some((r) =>
      PRIVILEGED_ROLES.includes(r as Role),
    );
    if (hasPrivilegedRole) {
      const requesterRoles = params.requesterRoles.filter((r): r is Role =>
        Object.values(Role).includes(r as Role),
      );
      if (!requesterRoles.includes(Role.ROLE_PLATFORM_ADMIN)) {
        this.logger.warn(
          `User ${params.requesterId} attempted to create account with privileged roles: ${params.roles.join(', ')}`,
        );
        throw new ForbiddenException(
          'Only platform admin can assign privileged roles',
        );
      }
    }

    // Проверка существования
    const existing = await this.userRepo.findByEmail(params.email);
    if (existing) {
      throw new ConflictException('Account with this email already exists');
    }

    // Создание пользователя
    const user = new UserEntity();
    user.id = uuid();
    user.name = params.name;
    user.email = params.email;
    user.passwordHash = await bcrypt.hash(params.password, 12);
    user.roles = params.roles;
    user.sources = params.sources || [];
    user.approved = true; // Автоматически одобряем, т.к. создают админы

    // Используем транзакцию для атомарности операции и аудита
    const savedUser = await this.userRepo.manager.transaction(
      async (transactionalEntityManager) => {
        const saved = await transactionalEntityManager.save(UserEntity, user);

        // Создаем запись аудита в той же транзакции
        const auditLog = transactionalEntityManager.create(AuditLogEntity, {
          entityType: 'user',
          entityId: saved.id,
          action: AuditAction.CREATE,
          userId: params.requesterId,
          newValues: {
            name: saved.name,
            email: saved.email,
            roles: saved.roles,
            sources: saved.sources,
            approved: saved.approved,
          },
          description: `User created by ${params.requesterId}`,
        });
        await transactionalEntityManager.save(AuditLogEntity, auditLog);

        return saved;
      },
    );

    this.logger.log(`User created: ${savedUser.id} (${savedUser.email})`);
    return savedUser;
  }

  async update(
    id: string,
    params: UpdateUserParams,
    requester: RequestUser,
  ): Promise<UserEntity> {
    const user = await this.userRepo.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const oldValues: Record<string, any> = {
      name: user.name,
      email: user.email,
      roles: user.roles,
      sources: user.sources,
    };

    // Обновление полей
    if (params.name !== undefined) user.name = params.name;
    if (params.email !== undefined) user.email = params.email;
    if (params.roles !== undefined) {
      // Проверка прав на назначение привилегированных ролей
      const hasPrivilegedRole = params.roles.some((r) =>
        PRIVILEGED_ROLES.includes(r as Role),
      );
      if (hasPrivilegedRole) {
        const requesterRoles = requester.roles.filter((r): r is Role =>
          Object.values(Role).includes(r as Role),
        );
        if (!requesterRoles.includes(Role.ROLE_PLATFORM_ADMIN)) {
          throw new ForbiddenException(
            'Only platform admin can assign privileged roles',
          );
        }
      }
      user.roles = params.roles;
    }
    if (params.sources !== undefined) user.sources = params.sources;
    if (params.password) {
      user.passwordHash = await bcrypt.hash(params.password, 12);
    }

    // Используем транзакцию для атомарности операции и аудита
    const savedUser = await this.userRepo.manager.transaction(
      async (transactionalEntityManager) => {
        const saved = await transactionalEntityManager.save(UserEntity, user);

        // Аудит в той же транзакции
        const newValues: Record<string, any> = {
          name: saved.name,
          email: saved.email,
          roles: saved.roles,
          sources: saved.sources,
        };
        if (params.password) {
          newValues.passwordChanged = true;
        }

        const auditLog = transactionalEntityManager.create(AuditLogEntity, {
          entityType: 'user',
          entityId: saved.id,
          action: AuditAction.UPDATE,
          userId: requester.id,
          userEmail: requester.email,
          oldValues,
          newValues,
          description: `User updated by ${requester.id}`,
        });
        await transactionalEntityManager.save(AuditLogEntity, auditLog);

        return saved;
      },
    );

    this.logger.log(`User updated: ${savedUser.id} by ${requester.id}`);
    return savedUser;
  }

  async delete(id: string, requester: RequestUser): Promise<void> {
    const user = await this.userRepo.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const oldValues = {
      name: user.name,
      email: user.email,
      roles: user.roles,
      sources: user.sources,
      approved: user.approved,
      blockedAt: user.blockedAt,
    };

    // Используем транзакцию для атомарности операции и аудита
    await this.userRepo.manager.transaction(async (transactionalEntityManager) => {
      user.deletedAt = new Date();
      await transactionalEntityManager.save(UserEntity, user);

      // Аудит в той же транзакции
      const auditLog = transactionalEntityManager.create(AuditLogEntity, {
        entityType: 'user',
        entityId: user.id,
        action: AuditAction.DELETE,
        userId: requester.id,
        userEmail: requester.email,
        oldValues,
        description: `User deleted by ${requester.id}`,
      });
      await transactionalEntityManager.save(AuditLogEntity, auditLog);
    });

    this.logger.log(`User deleted: ${user.id} by ${requester.id}`);
  }

  async approve(id: string, requester: RequestUser): Promise<UserEntity> {
    const user = await this.userRepo.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const oldValues = { approved: user.approved };

    // Используем транзакцию для атомарности операции и аудита
    const savedUser = await this.userRepo.manager.transaction(
      async (transactionalEntityManager) => {
        user.approved = true;
        const saved = await transactionalEntityManager.save(UserEntity, user);

        // Аудит в той же транзакции
        const auditLog = transactionalEntityManager.create(AuditLogEntity, {
          entityType: 'user',
          entityId: saved.id,
          action: AuditAction.APPROVE,
          userId: requester.id,
          userEmail: requester.email,
          oldValues,
          newValues: { approved: true },
          description: `User approved by ${requester.id}`,
        });
        await transactionalEntityManager.save(AuditLogEntity, auditLog);

        return saved;
      },
    );

    this.logger.log(`User approved: ${savedUser.id} by ${requester.id}`);
    return savedUser;
  }

  async block(id: string, requester: RequestUser): Promise<UserEntity> {
    const user = await this.userRepo.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const oldValues = { blockedAt: user.blockedAt };

    // Используем транзакцию для атомарности операции и аудита
    const savedUser = await this.userRepo.manager.transaction(
      async (transactionalEntityManager) => {
        user.blockedAt = new Date();
        const saved = await transactionalEntityManager.save(UserEntity, user);

        // Аудит в той же транзакции
        const auditLog = transactionalEntityManager.create(AuditLogEntity, {
          entityType: 'user',
          entityId: saved.id,
          action: AuditAction.BLOCK,
          userId: requester.id,
          userEmail: requester.email,
          oldValues,
          newValues: { blockedAt: saved.blockedAt },
          description: `User blocked by ${requester.id}`,
        });
        await transactionalEntityManager.save(AuditLogEntity, auditLog);

        return saved;
      },
    );

    this.logger.log(`User blocked: ${savedUser.id} by ${requester.id}`);
    return savedUser;
  }

  async grantRoles(
    id: string,
    roles: string[],
    requester: RequestUser,
  ): Promise<UserEntity> {
    const user = await this.userRepo.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Проверка прав
    const hasPrivilegedRole = roles.some((r) =>
      PRIVILEGED_ROLES.includes(r as Role),
    );
    if (hasPrivilegedRole) {
      const requesterRoles = requester.roles.filter((r): r is Role =>
        Object.values(Role).includes(r as Role),
      );
      if (!requesterRoles.includes(Role.ROLE_PLATFORM_ADMIN)) {
        throw new ForbiddenException(
          'Only platform admin can assign privileged roles',
        );
      }
    }

    const oldValues = { roles: user.roles };

    // Используем транзакцию для атомарности операции и аудита
    const savedUser = await this.userRepo.manager.transaction(
      async (transactionalEntityManager) => {
        user.roles = roles;
        const saved = await transactionalEntityManager.save(UserEntity, user);

        // Аудит в той же транзакции
        const auditLog = transactionalEntityManager.create(AuditLogEntity, {
          entityType: 'user',
          entityId: saved.id,
          action: AuditAction.GRANT_ROLE,
          userId: requester.id,
          userEmail: requester.email,
          oldValues,
          newValues: { roles: saved.roles },
          description: `Roles granted by ${requester.id}`,
        });
        await transactionalEntityManager.save(AuditLogEntity, auditLog);

        return saved;
      },
    );

    this.logger.log(
      `Roles granted to ${savedUser.id} by ${requester.id}: ${roles.join(', ')}`,
    );
    return savedUser;
  }

  async findById(id: string): Promise<UserEntity | null> {
    return this.userRepo.findById(id);
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    return this.userRepo.findByEmail(email);
  }

  async findAll(filters: FindUsersFilters): Promise<FindUsersResult> {
    return this.userRepo.findAll(filters);
  }

  async changePassword(
    userId: string,
    newPassword: string,
    requester?: RequestUser,
  ): Promise<void> {
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Используем транзакцию для атомарности операции и аудита
    await this.userRepo.manager.transaction(async (transactionalEntityManager) => {
      user.passwordHash = await bcrypt.hash(newPassword, 12);
      await transactionalEntityManager.save(UserEntity, user);

      // Аудит в той же транзакции
      const auditLog = transactionalEntityManager.create(AuditLogEntity, {
        entityType: 'user',
        entityId: user.id,
        action: AuditAction.CHANGE_PASSWORD,
        userId: requester?.id || user.id,
        userEmail: requester?.email || user.email,
        description: requester
          ? `Password changed by ${requester.id}`
          : 'Password changed by user',
        metadata: {
          changedBySelf: !requester || requester.id === user.id,
        },
      });
      await transactionalEntityManager.save(AuditLogEntity, auditLog);
    });

    this.logger.log(
      `Password changed for user ${user.id} by ${requester?.id || 'self'}`,
    );
  }
}

