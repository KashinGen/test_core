import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  Logger,
  SetMetadata,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';

// Gateway может отправлять токен в разных заголовках
// 'integrationAuthToken' - из INTEGRATION_AUTH_TOKEN константы (camelCase)
// 'integrationauthtoken' - альтернативный вариант (lowercase)
// 'x-gateway-auth' - дополнительный заголовок для совместимости
const HEADER_CANDIDATES = ['x-gateway-auth', 'integrationAuthToken', 'integrationauthtoken'];
export const PUBLIC_ENDPOINT_KEY = 'isPublic';

/**
 * Декоратор для пометки публичных endpoints (не требующих gateway auth)
 */
export const Public = () => SetMetadata(PUBLIC_ENDPOINT_KEY, true);

@Injectable()
export class GatewayAuthGuard implements CanActivate {
  private readonly logger = new Logger(GatewayAuthGuard.name);
  private readonly expectedToken: string | undefined;

  constructor(
    private readonly configService: ConfigService,
    private readonly reflector: Reflector,
  ) {
    this.expectedToken = this.configService.get<string>('GATEWAY_AUTH_TOKEN');
  }

  canActivate(context: ExecutionContext): boolean {
    // Проверяем, является ли endpoint публичным
    const isPublic = this.reflector.getAllAndOverride<boolean>(PUBLIC_ENDPOINT_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    if (!this.expectedToken) {
      this.logger.error('Gateway auth token is not configured');
      throw new UnauthorizedException('Gateway auth token is not configured');
    }

    const request = context.switchToHttp().getRequest();
    const providedToken: string | undefined = HEADER_CANDIDATES.map(
      (header) => request.headers[header],
    ).find((value) => typeof value === 'string');

    if (typeof providedToken !== 'string') {
      this.logger.warn(
        `Gateway auth header missing for ${request.method} ${request.url} from ${request.ip}`,
      );
      throw new UnauthorizedException('Gateway auth header is missing');
    }

    if (providedToken.trim() !== this.expectedToken) {
      this.logger.warn(
        `Invalid gateway auth token for ${request.method} ${request.url} from ${request.ip}`,
      );
      throw new UnauthorizedException('Invalid gateway auth token');
    }

    return true;
  }
}


