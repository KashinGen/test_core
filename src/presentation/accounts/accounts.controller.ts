import {
  Controller,
  Post,
  Patch,
  Delete,
  Get,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import { UserService } from '@infrastructure/services/user.service';
import { HydraMapper } from '../mappers/hydra.mapper';
import {
  RolesGuard,
  RequireRoles,
  CurrentUser,
  RequestUser,
  Role,
  SelfOrRolesGuard,
} from '../authorization';
import { Public } from '../guards/gateway-auth.guard';
import { CreateAccountDto } from '../dto/create-account.dto';
import { UpdateAccountDto } from '../dto/update-account.dto';
import { GetAccountsDto } from '../dto/get-accounts.dto';
import { AccountDto } from '../dto/account.dto';
import { ResetAccountPasswordDto } from '../dto/reset-account-password.dto';
import { ChangeAccountPasswordDto } from '../dto/change-account-password.dto';
import { PasswordResetService } from '@infrastructure/services/password-reset.service';

@Controller('accounts')
@UseGuards(RolesGuard)
export class AccountsController {
  constructor(
    private readonly userService: UserService,
    private readonly passwordResetService: PasswordResetService,
    private readonly hydraMapper: HydraMapper,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequireRoles(Role.ROLE_PLATFORM_ACCOUNT_RW, Role.ROLE_PLATFORM_ADMIN)
  async create(
    @Body() dto: CreateAccountDto,
    @CurrentUser() user: RequestUser,
  ) {
    const entity = await this.userService.create({
      name: dto.name,
      email: dto.email,
      password: dto.password,
      roles: dto.roles,
      sources: dto.sources || [],
      requesterId: user.id,
      requesterRoles: user.roles,
    });

    return this.hydraMapper.toMember(this.mapEntityToDto(entity));
  }

  @Get(':id')
  async getOne(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    const entity = await this.userService.findById(id);
    if (!entity) {
      throw new NotFoundException('Account not found');
    }

    return this.hydraMapper.toMember(this.mapEntityToDto(entity));
  }

  @Get('email/:email')
  @RequireRoles(Role.ROLE_PLATFORM_ACCOUNT_RO, Role.ROLE_PLATFORM_ADMIN)
  async getByEmail(@Param('email') email: string) {
    const entity = await this.userService.findByEmail(email);
    if (!entity) {
      throw new NotFoundException('Account not found');
    }

    return this.hydraMapper.toMember(this.mapEntityToDto(entity));
  }

  @Get()
  @RequireRoles(Role.ROLE_PLATFORM_ACCOUNT_RO, Role.ROLE_PLATFORM_ADMIN)
  async getAccounts(@Query() query: GetAccountsDto) {
    const result = await this.userService.findAll({
      page: query.page || 1,
      perPage: query.perPage || 20,
      ids: query.id,
      name: query.name,
      roles: query.role,
      company: query.company,
    });

    return this.hydraMapper.toCollection(
      result.items.map((e) => this.mapEntityToDto(e)),
      result.total,
      query.page || 1,
      query.perPage || 20,
    );
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @RequireRoles(Role.ROLE_PLATFORM_ACCOUNT_RW, Role.ROLE_PLATFORM_ADMIN)
  @UseGuards(SelfOrRolesGuard)
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateAccountDto,
    @CurrentUser() user: RequestUser,
  ) {
    const entity = await this.userService.update(id, dto, user);
    return this.hydraMapper.toMember(this.mapEntityToDto(entity));
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequireRoles(Role.ROLE_PLATFORM_ACCOUNT_RW, Role.ROLE_PLATFORM_ADMIN)
  async delete(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    await this.userService.delete(id, user);
  }

  @Patch(':id/approve')
  @HttpCode(HttpStatus.OK)
  @RequireRoles(Role.ROLE_PLATFORM_ACCOUNT_RW, Role.ROLE_PLATFORM_ADMIN)
  async approve(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    const entity = await this.userService.approve(id, user);
    return this.hydraMapper.toMember(this.mapEntityToDto(entity));
  }

  @Patch(':id/block')
  @HttpCode(HttpStatus.OK)
  @RequireRoles(Role.ROLE_PLATFORM_ACCOUNT_RW, Role.ROLE_PLATFORM_ADMIN)
  async block(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    const entity = await this.userService.block(id, user);
    return this.hydraMapper.toMember(this.mapEntityToDto(entity));
  }

  @Patch(':id/role')
  @HttpCode(HttpStatus.OK)
  @RequireRoles(Role.ROLE_PLATFORM_ACCOUNT_RW, Role.ROLE_PLATFORM_ADMIN)
  async grantRole(
    @Param('id') id: string,
    @Body('roles') roles: string[],
    @CurrentUser() user: RequestUser,
  ) {
    const entity = await this.userService.grantRoles(id, roles, user);
    return this.hydraMapper.toMember(this.mapEntityToDto(entity));
  }

  @Post('password/reset')
  @HttpCode(HttpStatus.ACCEPTED)
  @Public()
  async resetPassword(@Body() dto: ResetAccountPasswordDto): Promise<void> {
    await this.passwordResetService.requestPasswordReset(dto.email);
  }

  @Post('password/change')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Public()
  async changePassword(@Body() dto: ChangeAccountPasswordDto): Promise<void> {
    await this.passwordResetService.changePasswordByToken(dto.token, dto.password);
  }

  private mapEntityToDto(entity: any): AccountDto {
    return {
      id: entity.id,
      name: entity.name,
      email: entity.email,
      roles: entity.roles || [],
      sources: entity.sources || [],
      createdAt: entity.createdAt?.toISOString() || new Date().toISOString(),
      updatedAt: entity.updatedAt?.toISOString() || new Date().toISOString(),
    };
  }
}

