import { Role } from '../roles.enum';

/**
 * Привилегированные роли, которые может назначать только ROLE_PLATFORM_ADMIN
 */
export const PRIVILEGED_ROLES: Role[] = [
  Role.ROLE_PLATFORM_ADMIN,
  Role.ROLE_PLATFORM_MANAGER,
  Role.ROLE_PLATFORM_SUPPORT,
];


