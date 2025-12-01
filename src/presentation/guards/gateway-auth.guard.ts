import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const HEADER_CANDIDATES = ['x-gateway-auth', 'integrationauthtoken'];

@Injectable()
export class GatewayAuthGuard implements CanActivate {
  private readonly expectedToken: string | undefined;

  constructor(private readonly configService: ConfigService) {
    this.expectedToken = this.configService.get<string>('GATEWAY_AUTH_TOKEN');
  }

  canActivate(context: ExecutionContext): boolean {
    if (!this.expectedToken) {
      throw new UnauthorizedException('Gateway auth token is not configured');
    }

    const request = context.switchToHttp().getRequest();
    const providedToken: string | undefined = HEADER_CANDIDATES.map(
      header => request.headers[header],
    ).find(value => typeof value === 'string');

    if (typeof providedToken !== 'string') {
      throw new UnauthorizedException('Gateway auth header is missing');
    }

    if (providedToken.trim() !== this.expectedToken) {
      throw new UnauthorizedException('Invalid gateway auth token');
    }

    return true;
  }
}


