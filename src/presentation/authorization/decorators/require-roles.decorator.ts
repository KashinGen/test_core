import { SetMetadata } from '@nestjs/common';
import { Role } from '../roles.enum';

export const REQUIRE_ROLES_KEY = 'require_roles';
export const RequireRoles = (...roles: Role[]) => SetMetadata(REQUIRE_ROLES_KEY, roles);

