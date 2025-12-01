import { CanActivate, ExecutionContext, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { JwtExtractorService } from '../services/jwt-extractor.service';
import { RequestUser } from '../interfaces/request-user.interface';
import { REQUEST_USER_KEY } from './roles.guard';

/**
 * Базовый guard с общей логикой для извлечения и проверки пользователя
 */
export abstract class BaseAuthGuard implements CanActivate {
  protected readonly logger: Logger;

  constructor(
    protected readonly reflector: Reflector,
    protected readonly jwtExtractor: JwtExtractorService,
    loggerName: string,
  ) {
    this.logger = new Logger(loggerName);
  }

  /**
   * Извлекает пользователя из request (использует кеш, если есть)
   */
  protected extractUser(request: Request & { [REQUEST_USER_KEY]?: RequestUser }): RequestUser | null {
    // Оптимизация: используем уже извлеченного пользователя, если он есть
    if (request[REQUEST_USER_KEY]) {
      return request[REQUEST_USER_KEY];
    }

    const user = this.jwtExtractor.extractUserFromRequest(request);
    if (user) {
      // Сохраняем пользователя в request для использования в других guards/handlers
      request[REQUEST_USER_KEY] = user;
    }

    return user;
  }

  abstract canActivate(context: ExecutionContext): boolean;
}

