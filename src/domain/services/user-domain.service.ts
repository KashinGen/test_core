import { Injectable } from '@nestjs/common';
import { User } from '../entities/user.entity';

@Injectable()
export class UserDomainService {
  canGrantRoles(user: User, newRoles: string[]): boolean {
    if (user.isBlocked || user.isDeleted) {
      return false;
    }
    // Дополнительная бизнес-логика проверки ролей
    return true;
  }

  canApprove(user: User): boolean {
    return !user.approved && !user.isBlocked && !user.isDeleted;
  }

  canBlock(user: User): boolean {
    return !user.isBlocked && !user.isDeleted;
  }
}


