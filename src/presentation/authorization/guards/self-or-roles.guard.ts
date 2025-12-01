import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { Role } from '../roles.enum';
import { REQUIRE_ROLES_KEY } from '../decorators/require-roles.decorator';
import { JwtExtractorService } from '../services/jwt-extractor.service';
import { RequestUser } from '../interfaces/request-user.interface';
import { REQUEST_USER_KEY } from './roles.guard';
import { BaseAuthGuard } from './base-auth.guard';

/**
 * Guard для проверки прав на обновление аккаунта:
 * - Пользователь может обновлять себя (self-update)
 * - Или пользователь должен иметь одну из указанных ролей
 */
@Injectable()
export class SelfOrRolesGuard extends BaseAuthGuard implements CanActivate {
  constructor(
    reflector: Reflector,
    jwtExtractor: JwtExtractorService,
  ) {
    super(reflector, jwtExtractor, SelfOrRolesGuard.name);
  }

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(REQUIRE_ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // Если роли не требуются, пропускаем проверку
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request & { [REQUEST_USER_KEY]?: RequestUser }>();
    const user = this.extractUser(request);

    if (!user) {
      this.logger.warn(
        `Unauthorized access attempt to ${request.method} ${request.url} from ${request.ip}`,
      );
      throw new ForbiddenException('User not authenticated');
    }

    // Получаем ID из параметров маршрута
    const accountId = request.params?.id;
    const isSelfUpdate = accountId && user.id === accountId;

    // Если это self-update, разрешаем (детальная проверка будет в handler)
    if (isSelfUpdate) {
      this.logger.debug(
        `Self-update allowed for user ${user.id} on account ${accountId}`,
      );
      return true;
    }

    // Если не self-update, проверяем роли
    const hasRole = requiredRoles.some((role) => user.roles.includes(role));
    if (!hasRole) {
      this.logger.warn(
        `Access denied for user ${user.id} (roles: ${user.roles.join(', ')}) to ${request.method} ${request.url}. Required roles: ${requiredRoles.join(', ')}`,
      );
      throw new ForbiddenException('Insufficient permissions');
    }

    this.logger.debug(
      `Access granted for user ${user.id} (roles: ${user.roles.join(', ')}) to ${request.method} ${request.url}`,
    );

    return true;
  }
}

