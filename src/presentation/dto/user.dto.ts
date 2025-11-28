import { Role } from '@domain/common/types';

export class UserDto {
  id: string;
  email: string;
  role: Role;
  approved: boolean;
  blockedAt: string | null;
  createdAt: string;
}


