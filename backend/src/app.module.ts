import { Controller, Get, Module, RequestMethod } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { CacheService } from './common/cache/cache.service';
import { CommonModule } from './common/common.module';
import { Public } from './common/decorators/public.decorator';
import { CsrfGuard } from './common/guards/csrf.guard';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { AuditLoggingInterceptor } from './common/interceptors/audit-logging.interceptor';
import { PrismaModule } from './common/prisma/prisma.module';
import { AppointmentsModule } from './modules/appointments/appointments.module';
import { AuditModule } from './modules/audit/audit.module';
import { AuthModule } from './modules/auth/auth.module';
import { BillingModule } from './modules/billing/billing.module';
import { ClinicsModule } from './modules/clinics/clinics.module';
import { DoctorsModule } from './modules/doctors/doctors.module';
import { IntegrationsModule } from './modules/integrations/integrations.module';
import { MedicalRecordsModule } from './modules/medical-records/medical-records.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { SoapModule } from './modules/soap/soap.module';

@ApiTags('Estado del Sistema')
@Controller('health')
export class HealthController {
  constructor(private readonly cache: CacheService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Verifica estado de la API, arquitectura, patrones y caché' })
  status() {
    return {
      status: 'ok',
      service: 'MediConnect Pro API (NestJS + Prisma)',
      architecture: '3-Layer Decoupled (React SPA + NestJS REST/SOAP + Prisma/SQLite-PostgreSQL)',
      patterns: [
        'Singleton',
        'Factory Method',
        'Repository',
        'Adapter / Facade',
        'Observer (EventEmitter2)',
        'Strategy',
        'Dependency Injection (IoC)',
        'Middleware / Pipeline',
      ],
      cache: this.cache.getStats(),
      timestamp: new Date().toISOString(),
    };
  }
}

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 120 }]),
    EventEmitterModule.forRoot(),
    PrismaModule,
    CommonModule,
    AuthModule,
    ClinicsModule,
    DoctorsModule,
    BillingModule,
    NotificationsModule,
    AppointmentsModule,
    MedicalRecordsModule,
    IntegrationsModule,
    SoapModule,
    AuditModule,
  ],
  controllers: [HealthController],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: CsrfGuard },
    { provide: APP_INTERCEPTOR, useClass: AuditLoggingInterceptor },
  ],
})
export class AppModule {
  static readonly excludedGlobalPrefix = [{ path: 'soap/(.*)', method: RequestMethod.ALL }];
}
