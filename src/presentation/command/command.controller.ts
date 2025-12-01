import {
  Controller,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { CreateAccountDto } from '../dto/create-account.dto';
import { UpdateAccountDto } from '../dto/update-account.dto';
import { ResetAccountPasswordDto } from '../dto/reset-account-password.dto';
import { ChangeAccountPasswordDto } from '../dto/change-account-password.dto';
import { CreateAccountCommand } from '@application/commands/create-user.command';
import { UpdateAccountCommand } from '@application/commands/update-account.command';
import { DeleteAccountCommand } from '@application/commands/delete-account.command';
import { ResetAccountPasswordCommand } from '@application/commands/reset-account-password.command';
import { ChangeAccountPasswordCommand } from '@application/commands/change-account-password.command';
import { ApproveUserCommand } from '@application/commands/approve-user.command';
import { BlockUserCommand } from '@application/commands/block-user.command';
import { GrantRoleCommand } from '@application/commands/grant-role.command';
import { HydraMapper } from '../mappers/hydra.mapper';
import { QueryBus } from '@nestjs/cqrs';
import { GetUserByIdQuery } from '@application/queries/get-user-by-id.query';
import {
  RolesGuard,
  RequireRoles,
  CurrentUser,
  RequestUser,
  Role,
  SelfOrRolesGuard,
} from '../authorization';
import { Public } from '../guards/gateway-auth.guard';

@Controller('accounts')
@UseGuards(RolesGuard)
export class CommandController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
    private readonly hydraMapper: HydraMapper,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequireRoles(Role.ROLE_PLATFORM_ACCOUNT_RW, Role.ROLE_PLATFORM_ADMIN)
  async create(@Body() dto: CreateAccountDto, @CurrentUser() user: RequestUser) {
    const result = await this.commandBus.execute(
      new CreateAccountCommand(
        dto.name,
        dto.email,
        dto.password,
        dto.roles,
        dto.sources || [],
        user.id,
        user.roles,
      ),
    );
    
    // Возвращаем созданный аккаунт в Hydra формате
    const account = await this.queryBus.execute(
      new GetUserByIdQuery(result.id, user.id, user.roles),
    );
    return this.hydraMapper.toMember(account);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @RequireRoles(Role.ROLE_PLATFORM_ACCOUNT_RW, Role.ROLE_PLATFORM_ADMIN)
  // SelfOrRolesGuard заменяет RolesGuard для этого метода, разрешая self-update
  // Детальная проверка прав (ограничения для self-update) выполняется в UpdateAccountHandler
  @UseGuards(SelfOrRolesGuard)
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateAccountDto,
    @CurrentUser() user: RequestUser,
  ) {
    // Если передан password, нужно его захешировать
    let passwordHash: string | undefined;
    if (dto.password) {
      const bcrypt = await import('bcrypt');
      passwordHash = await bcrypt.hash(dto.password, 12);
    }

    const result = await this.commandBus.execute(
      new UpdateAccountCommand(
        id,
        dto.name,
        dto.email,
        dto.roles,
        dto.sources,
        passwordHash,
        user.id,
        user.roles,
      ),
    );

    // Возвращаем обновленный аккаунт в Hydra формате
    const account = await this.queryBus.execute(
      new GetUserByIdQuery(result.id, user.id, user.roles),
    );
    return this.hydraMapper.toMember(account);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequireRoles(Role.ROLE_PLATFORM_ACCOUNT_RW, Role.ROLE_PLATFORM_ADMIN)
  async delete(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    await this.commandBus.execute(new DeleteAccountCommand(id, user.id, user.roles));
  }

  @Post('password/reset')
  @HttpCode(HttpStatus.ACCEPTED)
  @Public() // Публичный endpoint - не требует JWT
  async resetPassword(@Body() dto: ResetAccountPasswordDto) {
    return this.commandBus.execute(new ResetAccountPasswordCommand(dto.email));
  }

  @Post('password/change')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Public() // Публичный endpoint - не требует JWT (использует токен сброса)
  async changePassword(@Body() dto: ChangeAccountPasswordDto) {
    await this.commandBus.execute(
      new ChangeAccountPasswordCommand(dto.token, dto.password),
    );
  }

  @Patch(':id/approve')
  @HttpCode(HttpStatus.OK)
  @RequireRoles(Role.ROLE_PLATFORM_ACCOUNT_RW, Role.ROLE_PLATFORM_ADMIN)
  async approve(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    await this.commandBus.execute(new ApproveUserCommand(id));
    const account = await this.queryBus.execute(
      new GetUserByIdQuery(id, user.id, user.roles),
    );
    return this.hydraMapper.toMember(account);
  }

  @Patch(':id/block')
  @HttpCode(HttpStatus.OK)
  @RequireRoles(Role.ROLE_PLATFORM_ACCOUNT_RW, Role.ROLE_PLATFORM_ADMIN)
  async block(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    await this.commandBus.execute(new BlockUserCommand(id));
    const account = await this.queryBus.execute(
      new GetUserByIdQuery(id, user.id, user.roles),
    );
    return this.hydraMapper.toMember(account);
  }

  @Patch(':id/role')
  @HttpCode(HttpStatus.OK)
  @RequireRoles(Role.ROLE_PLATFORM_ACCOUNT_RW, Role.ROLE_PLATFORM_ADMIN)
  async grantRole(
    @Param('id') id: string,
    @Body('roles') roles: string[],
    @CurrentUser() user: RequestUser,
  ) {
    await this.commandBus.execute(new GrantRoleCommand(id, roles));
    const account = await this.queryBus.execute(
      new GetUserByIdQuery(id, user.id, user.roles),
    );
    return this.hydraMapper.toMember(account);
  }
}
