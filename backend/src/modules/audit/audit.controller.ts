import { Controller, Get, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { CacheService } from '../../common/cache/cache.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuthenticatedUser } from '../../common/guards/jwt-auth.guard';
import { PrismaService } from '../../common/prisma/prisma.service';

@ApiTags('Auditoría y Telemetría de Seguridad')
@ApiBearerAuth()
@Controller('audit')
export class AuditController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  @Roles('ADMIN', 'DOCTOR', 'RECEPTIONIST')
  @Get('logs')
  @ApiOperation({ summary: 'Consulta la bitácora de auditoría de seguridad (RBAC)' })
  async listLogs() {
    return this.prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 30,
    });
  }

  @Get('security-summary')
  @ApiOperation({ summary: 'Resumen de controles de seguridad activos y estadísticas de caché' })
  async securitySummary(@Req() req: Request & { user: AuthenticatedUser }) {
    const [totalUsers, totalRecords, totalLogs, blockedAttempts, patients] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.medicalRecord.count(),
      this.prisma.auditLog.count(),
      this.prisma.auditLog.count({ where: { status: 'BLOCKED' } }),
      this.prisma.user.findMany({
        where: { role: 'PATIENT' },
        select: { id: true, fullName: true, email: true },
      }),
    ]);

    const recentNotifications = this.cache.get<unknown[]>('notifications:recent') || [];

    return {
      currentSession: {
        email: req.user.email,
        role: req.user.role,
        authMethod: req.user.authMethod,
      },
      controls: [
        { name: 'Hashing de Contraseñas', standard: 'bcrypt (12 rounds)', status: 'ACTIVO' },
        { name: 'Autenticación Stateless', standard: 'JWT Access (15m) + HttpOnly Refresh (7d)', status: 'ACTIVO' },
        { name: 'Protección CSRF', standard: 'Double-Submit Token HMAC-SHA256', status: 'ACTIVO' },
        { name: 'Cifrado en Reposo (ECE)', standard: 'AES-256-GCM + Firma SHA-256 (NOM-004)', status: 'ACTIVO' },
        { name: 'Control de Acceso (RBAC)', standard: 'Roles ADMIN / DOCTOR / RECEPTIONIST / PATIENT', status: 'ACTIVO' },
        { name: 'Anti Fuerza Bruta', standard: 'Bloqueo 15 min tras 5 fallos + Throttler HTTP', status: 'ACTIVO' },
        { name: 'Cabeceras & XSS/SQLi', standard: 'Helmet CSP + SanitizeInputPipe + Prisma ORM', status: 'ACTIVO' },
        { name: 'MFA Multifactor', standard: 'TOTP RFC-6238 (6 dígitos / 30s)', status: 'ACTIVO' },
      ],
      metrics: {
        totalUsers,
        totalRecords,
        totalLogs,
        blockedAttempts,
        cacheStats: this.cache.getStats(),
      },
      recentNotifications,
      patients,
    };
  }
}
