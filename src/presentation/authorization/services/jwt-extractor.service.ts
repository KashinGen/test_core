import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import * as jwt from 'jsonwebtoken';
import { RequestUser } from '../interfaces/request-user.interface';
import { Role } from '../roles.enum';

/**
 * Парсит JWT ключ из формата b64:<base64_encoded_key> или возвращает ключ как есть
 */
function parseJwtKey(key: string): string {
  if (!key) {
    throw new Error('JWT key is empty');
  }

  const trimmedKey = key.trim();

  // Если ключ начинается с b64:, декодируем base64
  if (trimmedKey.startsWith('b64:')) {
    const base64Part = trimmedKey.substring(4); // Убираем префикс "b64:"
    
    if (!base64Part) {
      throw new Error('JWT key has "b64:" prefix but no base64 content after it');
    }

    try {
      const decoded = Buffer.from(base64Part, 'base64').toString('utf8');
      
      if (!decoded.includes('BEGIN') || !decoded.includes('END')) {
        throw new Error('Decoded JWT key does not appear to be in PEM format (missing BEGIN/END markers)');
      }

      return decoded;
    } catch (error) {
      throw new Error(`Failed to parse JWT key from base64: ${error.message}`);
    }
  }

  // Если не b64:, возвращаем ключ как есть (может быть прямой PEM формат)
  return trimmedKey;
}

@Injectable()
export class JwtExtractorService {
  private readonly logger = new Logger(JwtExtractorService.name);
  private readonly jwtPublicKey: string;

  constructor(private readonly configService: ConfigService) {
    // JWT верификация всегда включена для безопасности
    const rawKey = this.configService.get<string>('JWT_PUBLIC_KEY') || '';

    // JWT_PUBLIC_KEY обязателен для работы сервиса
    if (!rawKey) {
      this.logger.error('JWT_PUBLIC_KEY is required but not configured.');
      throw new Error(
        'JWT_PUBLIC_KEY is required. Set JWT_PUBLIC_KEY environment variable.',
      );
    }

    try {
      // Парсим ключ (поддерживает формат b64: и прямой PEM)
      this.jwtPublicKey = parseJwtKey(rawKey);
      this.logger.log('JWT verification is ENABLED. All JWT tokens will be verified.');
    } catch (error) {
      this.logger.error(`Failed to parse JWT_PUBLIC_KEY: ${error.message}`);
      throw new Error(
        `Invalid JWT_PUBLIC_KEY format: ${error.message}. ` +
        'Expected format: "b64:<base64_encoded_key>" or direct PEM format.',
      );
    }
  }

  extractUserFromRequest(request: Request): RequestUser | null {
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }

    const token = authHeader.substring(7);
    try {
      // Всегда верифицируем JWT токен
      let decoded: any;
      try {
        decoded = jwt.verify(token, this.jwtPublicKey, { algorithms: ['RS256', 'HS256'] });
        this.logger.debug('JWT token verified successfully');
      } catch (verifyError: any) {
        this.logger.warn(`JWT verification failed: ${verifyError.message}`);
        return null;
      }
      if (!decoded) {
        this.logger.debug('Failed to decode JWT token');
        return null;
      }

      const userId = decoded.id || decoded.sub;
      const email = decoded.email;
      const roles: Role[] = decoded.roles || [];

      if (!userId) {
        this.logger.debug('JWT token missing user id');
        return null;
      }

      if (!email) {
        this.logger.warn('JWT token missing user email');
        return null;
      }

      const validRoles = roles.filter((r): r is Role =>
        Object.values(Role).includes(r as Role),
      );

      if (validRoles.length !== roles.length) {
        this.logger.warn(
          `User ${userId} has invalid roles: ${roles.filter(r => !Object.values(Role).includes(r as Role)).join(', ')}`,
        );
      }

      return {
        id: userId,
        email,
        roles: validRoles,
      };
    } catch (error) {
      this.logger.error(`Error extracting user from JWT: ${error.message}`, error.stack);
      return null;
    }
  }

  requireUserFromRequest(request: Request): RequestUser {
    const user = this.extractUserFromRequest(request);
    if (!user) {
      throw new UnauthorizedException('User not authenticated');
    }
    return user;
  }
}

