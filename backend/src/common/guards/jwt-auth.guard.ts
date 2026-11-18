import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import * as jwt from 'jsonwebtoken';
import { CacheService } from '../cache/cache.service';
import { PrismaService } from '../prisma/prisma.service';
import { AesGcmService } from '../crypto/aes-gcm.service';
import { ALLOW_API_KEY, IS_PUBLIC_KEY } from '../decorators/public.decorator';

export interface AuthenticatedUser {
  sub: string;
  email: string;
  role: string;
  fullName: string;
  jti?: string;
  authMethod: 'jwt' | 'api-key';
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly cache: CacheService,
    private readonly prisma: PrismaService,
    private readonly cryptoService: AesGcmService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const req = context.switchToHttp().getRequest();
    const allowApiKey = this.reflector.getAllAndOverride<boolean>(ALLOW_API_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const apiKeyHeader = req.headers['x-api-key'];
    if (typeof apiKeyHeader === 'string' && apiKeyHeader.trim()) {
      if (!allowApiKey) {
        throw new UnauthorizedException('Este endpoint requiere Bearer JWT (no X-API-Key)');
      }
      const keyHash = this.cryptoService.sha256(apiKeyHeader.trim());
      const keyRecord = await this.prisma.apiKey.findFirst({
        where: { keyHash, isActive: true },
        include: { user: true },
      });
      if (!keyRecord) {
        throw new UnauthorizedException('API Key inválida o revocada');
      }
      await this.prisma.apiKey.update({
        where: { id: keyRecord.id },
        data: { lastUsedAt: new Date() },
      });
      req.user = {
        sub: keyRecord.user.id,
        email: keyRecord.user.email,
        role: keyRecord.user.role,
        fullName: keyRecord.user.fullName,
        authMethod: 'api-key',
      } satisfies AuthenticatedUser;
      return true;
    }

    const authHeader: string | undefined = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Token de acceso Bearer faltante');
    }

    const token = authHeader.slice(7).trim();
    const secret =
      process.env.JWT_ACCESS_SECRET || 'dwi_utc_mediconnect_access_secret_2026_dev_only';

    try {
      const payload = jwt.verify(token, secret) as jwt.JwtPayload & {
        sub: string;
        email: string;
        role: string;
        fullName: string;
        jti?: string;
      };
      if (payload.jti && this.cache.isTokenBlacklisted(payload.jti)) {
        throw new UnauthorizedException('Token revocado (sesión cerrada)');
      }
      req.user = {
        sub: payload.sub,
        email: payload.email,
        role: payload.role,
        fullName: payload.fullName,
        jti: payload.jti,
        authMethod: 'jwt',
      } satisfies AuthenticatedUser;
      return true;
    } catch (err) {
      if (err instanceof UnauthorizedException) throw err;
      throw new UnauthorizedException('Token JWT inválido o expirado');
    }
  }
}
