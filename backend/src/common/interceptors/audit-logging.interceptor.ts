import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap, catchError, throwError } from 'rxjs';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Patrón Middleware / Pipeline: intercepta operaciones críticas para registrar
 * auditoría inmutable sin exponer credenciales en bitácora.
 */
@Injectable()
export class AuditLoggingInterceptor implements NestInterceptor {
  constructor(private readonly prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest();
    const method = String(req.method || 'GET').toUpperCase();
    const path = String(req.originalUrl || req.url || '');

    const shouldAudit =
      ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method) ||
      path.includes('/medical-records') ||
      path.includes('/audit-logs');

    if (!shouldAudit || path.includes('/auth/login') || path.includes('/auth/register')) {
      return next.handle();
    }

    const user = req.user;
    const ip =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.ip ||
      '127.0.0.1';

    return next.handle().pipe(
      tap(() => {
        void this.prisma.auditLog
          .create({
            data: {
              userId: user?.sub ?? null,
              userEmail: user?.email ?? 'anonymous',
              action: `${method} ${path.split('?')[0]}`,
              resource: path.split('?')[0],
              status: 'SUCCESS',
              ipAddress: ip,
              details: `Auth=${user?.authMethod ?? 'none'} Role=${user?.role ?? 'GUEST'}`,
            },
          })
          .catch(() => undefined);
      }),
      catchError((err) => {
        void this.prisma.auditLog
          .create({
            data: {
              userId: user?.sub ?? null,
              userEmail: user?.email ?? 'anonymous',
              action: `${method} ${path.split('?')[0]}`,
              resource: path.split('?')[0],
              status: err?.status === 403 || err?.status === 401 ? 'BLOCKED' : 'ERROR',
              ipAddress: ip,
              details: String(err?.message || 'Error').slice(0, 200),
            },
          })
          .catch(() => undefined);
        return throwError(() => err);
      }),
    );
  }
}
