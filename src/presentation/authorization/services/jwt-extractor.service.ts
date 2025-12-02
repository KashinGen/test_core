import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import * as jwt from 'jsonwebtoken';
import { RequestUser } from '../interfaces/request-user.interface';
import { Role } from '../roles.enum';

@Injectable()
export class JwtExtractorService {
  private readonly logger = new Logger(JwtExtractorService.name);
  private readonly verifyJwt: boolean;
  private readonly jwtPublicKey?: string;

  constructor(private readonly configService: ConfigService) {
    // JWT верификация включена по умолчанию для безопасности
    // Можно отключить через DISABLE_JWT_VERIFICATION=true (только для dev)
    const disableVerification = this.configService.get<string>('DISABLE_JWT_VERIFICATION') === 'true';
    this.verifyJwt = !disableVerification;
    this.jwtPublicKey = this.configService.get<string>('JWT_PUBLIC_KEY');

    // Если верификация включена, но ключ не указан - это ошибка конфигурации
    if (this.verifyJwt && !this.jwtPublicKey) {
      this.logger.error(
        'JWT verification is enabled but JWT_PUBLIC_KEY is not configured. ' +
        'Either set JWT_PUBLIC_KEY or set DISABLE_JWT_VERIFICATION=true for development.',
      );
      throw new Error(
        'JWT_PUBLIC_KEY is required when JWT verification is enabled. ' +
        'Set JWT_PUBLIC_KEY environment variable or disable verification with DISABLE_JWT_VERIFICATION=true',
      );
    }

    if (this.verifyJwt) {
      this.logger.log('JWT verification is ENABLED. All JWT tokens will be verified.');
    } else {
      this.logger.warn(
        'JWT verification is DISABLED. Tokens will be decoded without verification. ' +
        'This should only be used in development environments.',
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
      let decoded: any;

      if (this.verifyJwt) {
        // Верификация JWT (включена по умолчанию)
        if (!this.jwtPublicKey) {
          this.logger.error('JWT verification is enabled but JWT_PUBLIC_KEY is not configured');
          return null;
        }
        try {
          decoded = jwt.verify(token, this.jwtPublicKey, { algorithms: ['RS256', 'HS256'] });
          this.logger.debug('JWT token verified successfully');
        } catch (verifyError: any) {
          this.logger.warn(`JWT verification failed: ${verifyError.message}`);
          return null;
        }
      } else {
        // Decode without verification (только для dev, если DISABLE_JWT_VERIFICATION=true)
        this.logger.debug('JWT verification disabled, decoding without verification');
        decoded = jwt.decode(token, { json: true }) as any;
      }
      if (!decoded) {
        this.logger.debug('Failed to decode JWT token');
        return null;
      }

      const userId = decoded.id || decoded.sub;
      const roles: Role[] = decoded.roles || [];

      if (!userId) {
        this.logger.debug('JWT token missing user id');
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

