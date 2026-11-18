import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import * as crypto from 'crypto';
import { IS_PUBLIC_KEY, SKIP_CSRF_KEY } from '../decorators/public.decorator';

/**
 * Protección CSRF mediante patrón Double-Submit Token firmado con HMAC-SHA256.
 * Exige el encabezado X-CSRF-Token coincidente con la cookie mc_csrf en operaciones mutadoras
 * realizadas desde sesiones navegador (POST, PUT, PATCH, DELETE).
 */
@Injectable()
export class CsrfGuard implements CanActivate {
  private readonly secret =
    process.env.CSRF_SECRET || 'dwi_utc_mediconnect_csrf_hmac_secret_2026_dev_only';

  constructor(private readonly reflector: Reflector) {}

  generateTokenPair(): { rawToken: string; signedCookie: string } {
    const rawToken = crypto.randomBytes(24).toString('hex');
    const sig = crypto
      .createHmac('sha256', this.secret)
      .update(rawToken)
      .digest('hex');
    return { rawToken, signedCookie: `${rawToken}.${sig}` };
  }

  verifySignedCookie(cookieValue: string, headerToken: string): boolean {
    const parts = cookieValue.split('.');
    if (parts.length !== 2) return false;
    const [raw, sig] = parts;
    const expectedSig = crypto
      .createHmac('sha256', this.secret)
      .update(raw)
      .digest('hex');
    const a = Buffer.from(sig);
    const b = Buffer.from(expectedSig);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return false;
    return raw === headerToken;
  }

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const method = String(req.method || 'GET').toUpperCase();
    if (['GET', 'HEAD', 'OPTIONS'].includes(method)) return true;

    const skipCsrf = this.reflector.getAllAndOverride<boolean>(SKIP_CSRF_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (skipCsrf || isPublic) return true;

    // Clientes máquina-a-máquina con X-API-Key no usan sesión de navegador
    if (req.user?.authMethod === 'api-key') return true;

    const cookieVal = req.cookies?.mc_csrf;
    const headerVal = req.headers['x-csrf-token'];
    if (typeof cookieVal !== 'string' || typeof headerVal !== 'string') {
      throw new ForbiddenException(
        'Falta token CSRF válido (cookie mc_csrf y cabecera X-CSRF-Token requeridos)',
      );
    }

    if (!this.verifySignedCookie(cookieVal, headerVal)) {
      throw new ForbiddenException('Token CSRF inválido o alterado');
    }

    return true;
  }
}
