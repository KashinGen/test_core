import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';
import { Role } from '@presentation/authorization/roles.enum';

/**
 * Парсит JWT ключ из формата b64:<base64_encoded_key> или возвращает ключ как есть
 */
function parseJwtKey(key: string): string {
  if (!key) {
    throw new Error('JWT key is empty');
  }

  const trimmedKey = key.trim();

  // Если ключ начинается с b64:, декодируем base64
  if (trimmedKey.startsWith('b64:')) {
    const base64Part = trimmedKey.substring(4); // Убираем префикс "b64:"
    
    if (!base64Part) {
      throw new Error('JWT key has "b64:" prefix but no base64 content after it');
    }

    try {
      const decoded = Buffer.from(base64Part, 'base64').toString('utf8');
      
      if (!decoded.includes('BEGIN') || !decoded.includes('END')) {
        throw new Error('Decoded JWT key does not appear to be in PEM format (missing BEGIN/END markers)');
      }

      return decoded;
    } catch (error) {
      throw new Error(`Failed to parse JWT key from base64: ${error.message}`);
    }
  }

  return trimmedKey;
}

export interface TokenPayload {
  id: string;
  email: string;
  roles: Role[];
  type: 'access' | 'refresh';
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class JwtService {
  private readonly logger = new Logger(JwtService.name);
  private readonly jwtPrivateKey: jwt.Secret;
  private readonly accessTokenExpiresIn: jwt.SignOptions['expiresIn'];
  private readonly refreshTokenExpiresIn: jwt.SignOptions['expiresIn'];

  constructor(private readonly configService: ConfigService) {
    const rawKey = this.configService.get<string>('JWT_PRIVATE_KEY') || '';

    if (!rawKey) {
      this.logger.error('JWT_PRIVATE_KEY is required but not configured.');
      throw new Error(
        'JWT_PRIVATE_KEY is required. Set JWT_PRIVATE_KEY environment variable.',
      );
    }

    try {
      this.jwtPrivateKey = parseJwtKey(rawKey);
      this.logger.log('JWT token generation is ENABLED.');
    } catch (error) {
      this.logger.error(`Failed to parse JWT_PRIVATE_KEY: ${error.message}`);
      throw new Error(
        `Invalid JWT_PRIVATE_KEY format: ${error.message}`,
      );
    }

    // Время жизни токенов (по умолчанию: 15 минут для access, 7 дней для refresh)
    const accessExp =
      this.configService.get<string>('JWT_ACCESS_TOKEN_EXPIRES_IN') || '15m';
    const refreshExp =
      this.configService.get<string>('JWT_REFRESH_TOKEN_EXPIRES_IN') || '7d';

    this.accessTokenExpiresIn = accessExp as jwt.SignOptions['expiresIn'];
    this.refreshTokenExpiresIn = refreshExp as jwt.SignOptions['expiresIn'];
  }

  generateTokenPair(userId: string, email: string, roles: Role[]): TokenPair {
    const accessToken = this.generateAccessToken(userId, email, roles);
    const refreshToken = this.generateRefreshToken(userId, email, roles);

    return {
      accessToken,
      refreshToken,
    };
  }

  generateAccessToken(userId: string, email: string, roles: Role[]): string {
    const payload: TokenPayload = {
      id: userId,
      email,
      roles,
      type: 'access',
    };

    const options: jwt.SignOptions = {
      algorithm: 'RS256',
      expiresIn: this.accessTokenExpiresIn,
    };

    return jwt.sign(payload, this.jwtPrivateKey, options);
  }

  generateRefreshToken(userId: string, email: string, roles: Role[]): string {
    const payload: TokenPayload = {
      id: userId,
      email,
      roles,
      type: 'refresh',
    };

    const options: jwt.SignOptions = {
      algorithm: 'RS256',
      expiresIn: this.refreshTokenExpiresIn,
    };

    return jwt.sign(payload, this.jwtPrivateKey, options);
  }

  verifyRefreshToken(token: string): TokenPayload | null {
    try {
      const decoded = jwt.verify(token, this.jwtPrivateKey, {
        algorithms: ['RS256'],
      }) as TokenPayload;

      if (decoded.type !== 'refresh') {
        this.logger.warn('Token is not a refresh token');
        return null;
      }

      return decoded;
    } catch (error) {
      this.logger.warn(`Refresh token verification failed: ${error.message}`);
      return null;
    }
  }
}

