import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { AuthEmailDto } from '../dto/auth-email.dto';
import { AuthRefreshDto } from '../dto/auth-refresh.dto';
import { UserService } from '@infrastructure/services/user.service';
import { JwtService } from '@infrastructure/services/jwt.service';
import { Public } from '../guards/gateway-auth.guard';
import { Role } from '../authorization/roles.enum';
import * as bcrypt from 'bcrypt';

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
  ) {}

  @Post('email')
  @HttpCode(HttpStatus.OK)
  @Public()
  async authByEmail(@Body() dto: AuthEmailDto) {
    const user = await this.userService.findByEmail(dto.email);

    if (!user) {
      this.logger.warn(
        `Authentication failed: user not found for email ${dto.email}`,
      );
      throw new UnauthorizedException('Invalid email or password');
    }

    if (user.deletedAt) {
      this.logger.warn(
        `Authentication failed: account deleted for user ${user.id}`,
      );
      throw new UnauthorizedException('Account is deleted');
    }

    if (user.blockedAt) {
      this.logger.warn(
        `Authentication failed: account blocked for user ${user.id}`,
      );
      throw new UnauthorizedException('Account is blocked');
    }

    // Проверка наличия passwordHash и пароля
    if (!user.passwordHash || !dto.password) {
      this.logger.error(
        `Authentication failed: missing password hash or password for user ${user.id}`,
      );
      throw new UnauthorizedException('Invalid email or password');
    }

    const isPasswordValid = await bcrypt.compare(
      dto.password,
      user.passwordHash,
    );

    if (!isPasswordValid) {
      this.logger.warn(
        `Authentication failed: invalid password for user ${user.id}`,
      );
      throw new UnauthorizedException('Invalid email or password');
    }

    const roles = (user.roles || []).filter((r): r is Role =>
      Object.values(Role).includes(r as Role),
    );

    const tokenPair = this.jwtService.generateTokenPair(user.id, user.email, roles);

    return {
      access_token: tokenPair.accessToken,
      refresh_token: tokenPair.refreshToken,
      token_type: 'Bearer',
    };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @Public()
  async refreshToken(@Body() dto: AuthRefreshDto) {
    const payload = this.jwtService.verifyRefreshToken(dto.refresh_token);

    if (!payload) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const user = await this.userService.findById(payload.id);

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (user.deletedAt) {
      throw new UnauthorizedException('Account is deleted');
    }

    if (user.blockedAt) {
      throw new UnauthorizedException('Account is blocked');
    }

    // Генерируем новую пару токенов
    const roles = (user.roles || []).filter((r): r is Role =>
      Object.values(Role).includes(r as Role),
    );

    const tokenPair = this.jwtService.generateTokenPair(user.id, user.email, roles);

    return {
      access_token: tokenPair.accessToken,
      refresh_token: tokenPair.refreshToken,
      token_type: 'Bearer',
    };
  }
}
