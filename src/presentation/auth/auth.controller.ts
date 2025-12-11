import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
  Inject,
  Logger,
} from '@nestjs/common';
import { AuthEmailDto } from '../dto/auth-email.dto';
import { AuthRefreshDto } from '../dto/auth-refresh.dto';
import { IUserRepository } from '@domain/repositories/user-repository.interface';
import { JwtService } from '@infrastructure/services/jwt.service';
import { Public } from '../guards/gateway-auth.guard';
import { Role } from '../authorization/roles.enum';
import * as bcrypt from 'bcrypt';

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    @Inject('IUserRepository')
    private readonly userRepository: IUserRepository,
    private readonly jwtService: JwtService,
  ) {}

  @Post('email')
  @HttpCode(HttpStatus.OK)
  @Public()
  async authByEmail(@Body() dto: AuthEmailDto) {
    const user = await this.userRepository.findByEmail(dto.email);

    if (!user) {
      this.logger.warn(
        `Authentication failed: user not found for email ${dto.email}`,
      );
      throw new UnauthorizedException('Invalid email or password');
    }

    if (user.isDeleted) {
      this.logger.warn(
        `Authentication failed: account deleted for user ${user.id}`,
      );
      throw new UnauthorizedException('Account is deleted');
    }

    if (user.isBlocked) {
      this.logger.warn(
        `Authentication failed: account blocked for user ${user.id}`,
      );
      throw new UnauthorizedException('Account is blocked');
    }

    // Проверка наличия passwordHash и пароля
    if (!user.passwordHash || !dto.password) {
      this.logger.error(
        `Authentication failed: missing password hash or password`,
        {
          userId: user.id,
          email: user.email,
          hasPasswordHash: !!user.passwordHash,
          passwordHashType: typeof user.passwordHash,
          passwordHashLength: user.passwordHash?.length,
          hasPassword: !!dto.password,
        },
      );
      throw new UnauthorizedException('Invalid email or password');
    }

    this.logger.debug(`Attempting password comparison for user ${user.id}`, {
      email: user.email,
      passwordHashPrefix: user.passwordHash.substring(0, 10),
    });

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

    const tokenPair = this.jwtService.generateTokenPair(user.id, roles);

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

    const user = await this.userRepository.findById(payload.id);

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (user.isDeleted) {
      throw new UnauthorizedException('Account is deleted');
    }

    if (user.isBlocked) {
      throw new UnauthorizedException('Account is blocked');
    }

    // Генерируем новую пару токенов
    const roles = (user.roles || []).filter((r): r is Role =>
      Object.values(Role).includes(r as Role),
    );

    const tokenPair = this.jwtService.generateTokenPair(user.id, roles);

    return {
      access_token: tokenPair.accessToken,
      refresh_token: tokenPair.refreshToken,
      token_type: 'Bearer',
    };
  }
}
