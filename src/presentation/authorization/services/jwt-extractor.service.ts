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
    // Опциональная верификация JWT (по умолчанию отключена, так как gateway уже проверил)
    this.verifyJwt = this.configService.get<string>('VERIFY_JWT_IN_CORE') === 'true';
    this.jwtPublicKey = this.configService.get<string>('JWT_PUBLIC_KEY');
  }

  extractUserFromRequest(request: Request): RequestUser | null {
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }

    const token = authHeader.substring(7);
    try {
      let decoded: any;

      if (this.verifyJwt && this.jwtPublicKey) {
        // Верификация JWT (если включена)
        try {
          decoded = jwt.verify(token, this.jwtPublicKey, { algorithms: ['RS256', 'HS256'] });
        } catch (verifyError: any) {
          this.logger.warn(`JWT verification failed: ${verifyError.message}`);
          return null;
        }
      } else {
        // Decode without verification (gateway already verified it)
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

