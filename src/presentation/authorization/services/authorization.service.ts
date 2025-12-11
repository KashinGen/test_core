import { Injectable, ForbiddenException } from '@nestjs/common';
import { Request } from 'express';
import { Role } from '../roles.enum';
import { RequestUser } from '../interfaces/request-user.interface';
import { JwtExtractorService } from './jwt-extractor.service';

@Injectable()
export class AuthorizationService {
  constructor(private readonly jwtExtractor: JwtExtractorService) {}

  /**
   * Check if user has any of the required roles
   */
  hasAnyRole(user: RequestUser, roles: Role[]): boolean {
    return roles.some((role) => user.roles.includes(role));
  }

  /**
   * Check if user has all required roles
   */
  hasAllRoles(user: RequestUser, roles: Role[]): boolean {
    return roles.every((role) => user.roles.includes(role));
  }

  /**
   * Check if user is the owner of the resource
   */
  isOwner(user: RequestUser, resourceId: string): boolean {
    return user.id === resourceId;
  }

  /**
   * Require user to have any of the roles, throw if not
   */
  requireAnyRole(user: RequestUser, roles: Role[], message?: string): void {
    if (!this.hasAnyRole(user, roles)) {
      throw new ForbiddenException(message || 'Insufficient permissions');
    }
  }

  /**
   * Require user to be owner or have any of the roles
   */
  requireOwnerOrRole(
    user: RequestUser,
    resourceId: string,
    roles: Role[],
    message?: string,
  ): void {
    if (this.isOwner(user, resourceId)) {
      return;
    }
    this.requireAnyRole(user, roles, message);
  }

  /**
   * Get user from request
   */
  getUserFromRequest(request: Request): RequestUser {
    return this.jwtExtractor.requireUserFromRequest(request);
  }

  /**
   * Check account access rules based on Voter logic
   */
  canAccessAccount(
    user: RequestUser,
    accountId: string,
    action: 'read' | 'create' | 'update' | 'delete' | 'list',
  ): boolean {
    switch (action) {
      case 'create':
        return this.hasAnyRole(user, [Role.ROLE_PLATFORM_ACCOUNT_RW, Role.ROLE_PLATFORM_ADMIN]);

      case 'read':
        return (
          this.hasAnyRole(user, [Role.ROLE_PLATFORM_ACCOUNT_RO, Role.ROLE_PLATFORM_ADMIN]) ||
          this.isOwner(user, accountId)
        );

      case 'update':
        // Owner can update themselves, but with restrictions (handled in handler)
        return (
          this.hasAnyRole(user, [Role.ROLE_PLATFORM_ACCOUNT_RW, Role.ROLE_PLATFORM_ADMIN]) ||
          this.isOwner(user, accountId)
        );

      case 'delete':
        // Cannot delete yourself
        return (
          this.hasAnyRole(user, [Role.ROLE_PLATFORM_ACCOUNT_RW, Role.ROLE_PLATFORM_ADMIN]) &&
          !this.isOwner(user, accountId)
        );

      case 'list':
        return this.hasAnyRole(user, [
          Role.ROLE_PLATFORM_ACCOUNT_RO,
          Role.ROLE_PLATFORM_ADMIN,
        ]);

      default:
        return false;
    }
  }

  /**
   * Require account access, throw if not allowed
   */
  requireAccountAccess(
    user: RequestUser,
    accountId: string,
    action: 'read' | 'create' | 'update' | 'delete' | 'list',
  ): void {
    if (!this.canAccessAccount(user, accountId, action)) {
      throw new ForbiddenException(`Cannot ${action} account`);
    }
  }
}






