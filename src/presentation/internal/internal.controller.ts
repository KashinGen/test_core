import { Controller, Post, Body } from '@nestjs/common';
import { PermissionRepository } from '@infrastructure/repos/permission.repository';
import { AccessCheckDto } from '../dto/access-check.dto';
import { Public } from '../guards/gateway-auth.guard';

/**
 * InternalController - внутренние endpoints для межсервисного взаимодействия
 * Защищен только GatewayAuthGuard (глобальный), не требует JWT
 */
@Controller('internal')
export class InternalController {
  constructor(private readonly permissionRepo: PermissionRepository) {}

  @Post('access-check')
  @Public()
  async check(@Body() body: AccessCheckDto) {
    const { userId, action, resource } = body;
    const allowed = await this.permissionRepo.check(userId, action, resource);
    const permissions = await this.permissionRepo.ofUser(userId);
    return { allowed, permissions };
  }
}



