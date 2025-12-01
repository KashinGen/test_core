import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { Role } from '../roles.enum';
import { REQUIRE_ROLES_KEY } from '../decorators/require-roles.decorator';
import { JwtExtractorService } from '../services/jwt-extractor.service';
import { RequestUser } from '../interfaces/request-user.interface';

export const REQUEST_USER_KEY = 'user';

@Injectable()
export class RolesGuard implements CanActivate {
  private readonly logger = new Logger(RolesGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly jwtExtractor: JwtExtractorService,
  ) {}

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
    const user = this.jwtExtractor.extractUserFromRequest(request);

    if (!user) {
      this.logger.warn(
        `Unauthorized access attempt to ${request.method} ${request.url} from ${request.ip}`,
      );
      throw new ForbiddenException('User not authenticated');
    }

    // Сохраняем пользователя в request для использования в handlers
    request[REQUEST_USER_KEY] = user;

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

