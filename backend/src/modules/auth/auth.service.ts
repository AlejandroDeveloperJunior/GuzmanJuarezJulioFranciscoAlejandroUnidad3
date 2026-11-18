import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import * as jwt from 'jsonwebtoken';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CacheService } from '../../common/cache/cache.service';
import { AesGcmService } from '../../common/crypto/aes-gcm.service';
import { LoginDto, RegisterDto } from './auth.dto';

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_MS = 15 * 60 * 1000;

@Injectable()
export class AuthService {
  private readonly accessSecret =
    process.env.JWT_ACCESS_SECRET || 'dwi_utc_mediconnect_access_secret_2026_dev_only';
  private readonly refreshSecret =
    process.env.JWT_REFRESH_SECRET || 'dwi_utc_mediconnect_refresh_secret_2026_dev_only';

  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
    private readonly cryptoService: AesGcmService,
  ) {}

  async register(dto: RegisterDto, ipAddress: string) {
    const normalizedEmail = dto.email.toLowerCase().trim();
    const existing = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });
    if (existing) {
      throw new ConflictException('El correo electrónico ya se encuentra registrado');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const assignedRole = dto.role === 'DOCTOR' ? 'DOCTOR' : 'PATIENT';

    const user = await this.prisma.user.create({
      data: {
        email: normalizedEmail,
        passwordHash,
        fullName: dto.fullName,
        phone: dto.phone ?? null,
        role: assignedRole,
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        mfaEnabled: true,
        createdAt: true,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: user.id,
        userEmail: user.email,
        action: 'AUTH_REGISTER',
        resource: '/api/v1/auth/register',
        status: 'SUCCESS',
        ipAddress,
        details: `Nuevo usuario registrado con rol ${user.role} (bcrypt salt=12)`,
      },
    });

    return {
      message: 'Cuenta creada con éxito bajo cifrado bcrypt',
      user,
    };
  }

  async login(dto: LoginDto, ipAddress: string) {
    const normalizedEmail = dto.email.toLowerCase().trim();
    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      await this.prisma.auditLog.create({
        data: {
          userEmail: normalizedEmail,
          action: 'AUTH_LOGIN_FAILED',
          resource: '/api/v1/auth/login',
          status: 'BLOCKED',
          ipAddress,
          details: 'Usuario inexistente',
        },
      });
      throw new UnauthorizedException('Credenciales inválidas');
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const minutesLeft = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
      await this.prisma.auditLog.create({
        data: {
          userId: user.id,
          userEmail: user.email,
          action: 'AUTH_LOGIN_LOCKED',
          resource: '/api/v1/auth/login',
          status: 'BLOCKED',
          ipAddress,
          details: `Cuenta bloqueada temporalmente (${minutesLeft} min restantes)`,
        },
      });
      throw new HttpException(
        `Cuenta bloqueada por múltiples intentos fallidos. Intente en ${minutesLeft} minuto(s).`,
        HttpStatus.LOCKED,
      );
    }

    const passwordMatches = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordMatches) {
      const nextAttempts = user.failedLoginAttempts + 1;
      const shouldLock = nextAttempts >= MAX_FAILED_ATTEMPTS;
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: nextAttempts,
          lockedUntil: shouldLock ? new Date(Date.now() + LOCK_DURATION_MS) : null,
        },
      });

      await this.prisma.auditLog.create({
        data: {
          userId: user.id,
          userEmail: user.email,
          action: shouldLock ? 'AUTH_ACCOUNT_LOCKED' : 'AUTH_LOGIN_FAILED',
          resource: '/api/v1/auth/login',
          status: 'BLOCKED',
          ipAddress,
          details: shouldLock
            ? `Bloqueo activado tras ${nextAttempts} intentos fallidos`
            : `Intento fallido ${nextAttempts} de ${MAX_FAILED_ATTEMPTS}`,
        },
      });

      if (shouldLock) {
        throw new HttpException(
          'Cuenta bloqueada durante 15 minutos tras 5 intentos fallidos de acceso.',
          HttpStatus.LOCKED,
        );
      }

      throw new UnauthorizedException(
        `Contraseña incorrecta. Intento ${nextAttempts} de ${MAX_FAILED_ATTEMPTS}.`,
      );
    }

    // Validación MFA (TOTP RFC-6238) si el usuario lo activó
    if (user.mfaEnabled && user.mfaSecret) {
      if (!dto.mfaCode) {
        return {
          mfaRequired: true,
          message: 'Se requiere código MFA de 6 dígitos para completar el acceso.',
        };
      }
      const validMfa = this.cryptoService.verifyTotpCode(user.mfaSecret, dto.mfaCode);
      if (!validMfa) {
        throw new UnauthorizedException('Código MFA TOTP inválido o expirado');
      }
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { failedLoginAttempts: 0, lockedUntil: null },
    });

    const tokens = this.issueTokens(user);

    await this.prisma.auditLog.create({
      data: {
        userId: user.id,
        userEmail: user.email,
        action: 'AUTH_LOGIN_SUCCESS',
        resource: '/api/v1/auth/login',
        status: 'SUCCESS',
        ipAddress,
        details: `JWT emitido (jti=${tokens.jti}) para rol ${user.role}`,
      },
    });

    return {
      mfaRequired: false,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        mfaEnabled: user.mfaEnabled,
      },
    };
  }

  async refresh(refreshToken: string) {
    try {
      const payload = jwt.verify(refreshToken, this.refreshSecret) as jwt.JwtPayload & {
        sub: string;
        jti?: string;
      };
      if (payload.jti && this.cache.isTokenBlacklisted(payload.jti)) {
        throw new UnauthorizedException('Refresh token revocado');
      }
      const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
      if (!user) {
        throw new UnauthorizedException('Usuario no encontrado');
      }
      const tokens = this.issueTokens(user);
      return {
        accessToken: tokens.accessToken,
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
          mfaEnabled: user.mfaEnabled,
        },
      };
    } catch {
      throw new UnauthorizedException('Refresh token inválido o expirado');
    }
  }

  async logout(jti: string | undefined, userId: string, email: string, ipAddress: string) {
    if (jti) {
      this.cache.blacklistToken(jti, 900);
    }
    await this.prisma.auditLog.create({
      data: {
        userId,
        userEmail: email,
        action: 'AUTH_LOGOUT',
        resource: '/api/v1/auth/logout',
        status: 'SUCCESS',
        ipAddress,
        details: jti ? `Token jti=${jti} agregado a lista negra en caché` : 'Cierre de sesión',
      },
    });
    return { message: 'Sesión cerrada y token JWT revocado en caché' };
  }

  async getProfile(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        phone: true,
        mfaEnabled: true,
        failedLoginAttempts: true,
        createdAt: true,
      },
    });
  }

  async setupMfa(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new BadRequestException('Usuario no encontrado');

    const secret = user.mfaSecret || this.cryptoService.generateTotpSecret();
    if (!user.mfaSecret) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { mfaSecret: secret },
      });
    }
    const currentPreviewCode = this.cryptoService.generateTotpCode(secret);
    const otpauthUri = `otpauth://totp/MediConnectPro:${encodeURIComponent(user.email)}?secret=${secret}&issuer=MediConnectPro`;

    return {
      mfaEnabled: user.mfaEnabled,
      secret,
      otpauthUri,
      currentPreviewCode,
    };
  }

  async enableMfa(userId: string, code: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.mfaSecret) {
      throw new BadRequestException('Primero genere un secreto MFA en /auth/mfa/setup');
    }
    if (!this.cryptoService.verifyTotpCode(user.mfaSecret, code)) {
      throw new UnauthorizedException('Código TOTP incorrecto');
    }
    await this.prisma.user.update({
      where: { id: userId },
      data: { mfaEnabled: true },
    });
    return { mfaEnabled: true, message: 'Autenticación MFA (TOTP) activada correctamente' };
  }

  async disableMfa(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { mfaEnabled: false },
    });
    return { mfaEnabled: false, message: 'MFA desactivado' };
  }

  async createApiKey(userId: string, name: string) {
    const plainKey = `mc_live_${crypto.randomBytes(20).toString('hex')}`;
    const keyHash = this.cryptoService.sha256(plainKey);
    const keyPrefix = plainKey.slice(0, 15);

    const created = await this.prisma.apiKey.create({
      data: {
        userId,
        name,
        keyPrefix,
        keyHash,
      },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        isActive: true,
        createdAt: true,
      },
    });

    return {
      ...created,
      plainKey,
      note: 'Guarda esta X-API-Key ahora; en base de datos solo se almacena su hash SHA-256.',
    };
  }

  async listApiKeys(userId: string) {
    return this.prisma.apiKey.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        isActive: true,
        lastUsedAt: true,
        createdAt: true,
      },
    });
  }

  async revokeApiKey(userId: string, keyId: string) {
    const existing = await this.prisma.apiKey.findFirst({
      where: { id: keyId, userId },
    });
    if (!existing) throw new BadRequestException('API Key no encontrada');

    await this.prisma.apiKey.update({
      where: { id: keyId },
      data: { isActive: false },
    });
    return { revoked: true };
  }

  private issueTokens(user: {
    id: string;
    email: string;
    role: string;
    fullName: string;
  }) {
    const jti = crypto.randomUUID();
    const accessToken = jwt.sign(
      {
        sub: user.id,
        email: user.email,
        role: user.role,
        fullName: user.fullName,
        jti,
      },
      this.accessSecret,
      { expiresIn: '15m' },
    );

    const refreshToken = jwt.sign(
      {
        sub: user.id,
        jti: crypto.randomUUID(),
      },
      this.refreshSecret,
      { expiresIn: '7d' },
    );

    return { accessToken, refreshToken, jti };
  }
}
