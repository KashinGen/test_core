import { Role } from '../roles.enum';

export interface RequestUser {
  id: string;
  email: string;
  roles: Role[];
}






