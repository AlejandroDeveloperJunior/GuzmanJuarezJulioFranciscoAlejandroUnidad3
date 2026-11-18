import { Global, Module } from '@nestjs/common';
import { CacheService } from './cache/cache.service';
import { AesGcmService } from './crypto/aes-gcm.service';
import { CsrfGuard } from './guards/csrf.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { AuditLoggingInterceptor } from './interceptors/audit-logging.interceptor';

@Global()
@Module({
  providers: [
    CacheService,
    AesGcmService,
    CsrfGuard,
    JwtAuthGuard,
    RolesGuard,
    AuditLoggingInterceptor,
  ],
  exports: [
    CacheService,
    AesGcmService,
    CsrfGuard,
    JwtAuthGuard,
    RolesGuard,
    AuditLoggingInterceptor,
  ],
})
export class CommonModule {}
