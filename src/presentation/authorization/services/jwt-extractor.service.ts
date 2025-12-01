import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { Request } from 'express';
import * as jwt from 'jsonwebtoken';
import { RequestUser } from '../interfaces/request-user.interface';
import { Role } from '../roles.enum';

@Injectable()
export class JwtExtractorService {
  private readonly logger = new Logger(JwtExtractorService.name);

  extractUserFromRequest(request: Request): RequestUser | null {
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }

    const token = authHeader.substring(7);
    try {
      // Decode without verification (gateway already verified it)
      // Optional: can add verification here if needed for extra security
      const decoded = jwt.decode(token, { json: true }) as any;
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

