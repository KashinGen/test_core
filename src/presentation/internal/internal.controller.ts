import { Controller, Post, Body } from '@nestjs/common';
import { PermissionRepository } from '@infrastructure/repos/permission.repository';
import { AccessCheckDto } from '../dto/access-check.dto';

@Controller('internal')
export class InternalController {
  constructor(private readonly permissionRepo: PermissionRepository) {}

  @Post('access-check')
  async check(@Body() body: AccessCheckDto) {
    const { userId, action, resource } = body;
    const allowed = await this.permissionRepo.check(userId, action, resource);
    const permissions = await this.permissionRepo.ofUser(userId);
    return { allowed, permissions };
  }
}


