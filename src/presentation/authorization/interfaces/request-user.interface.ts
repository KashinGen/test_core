import { Role } from '../roles.enum';

export interface RequestUser {
  id: string;
  roles: Role[];
}


