# MediConnect Pro — Plataforma Web Integral de Gestión Clínica y Telemedicina

**Universidad Tecnológica de Coahuila (UTC)**  
**Ingeniería en Desarrollo y Gestión de Software Multiplataforma**  
**Asignatura:** Desarrollo Web Integral (DWI) — **Unidad 3 (Saber Hacer)**  
**Alumno:** Guzmán Juárez Julio Francisco Alejandro (`9IDGS`)  
**Docente:** M.A.Y.L. Gabriel Alejandro Reyes Morales  

---

## 1. Trazabilidad con Unidad 1 (Caso de Estudio y Metodología)

Esta aplicación web materializa de punta a punta la propuesta diseñada en el **Saber Hacer Unidad 1** para el caso de estudio **MediConnect Pro** (red de clínicas privadas en Coahuila):

- **Metodología Ágil:** **Scrum / Scrumban** en 5 Sprints trazables en el historial de commits y en [`docs/BACKLOG_SCRUM.md`](docs/BACKLOG_SCRUM.md).
- **Arquitectura de Software:** Arquitectura **desacoplada de 3 capas orientada a servicios** (`frontend/` React SPA + `backend/` NestJS RESTful/SOAP + `prisma/` SQLite/PostgreSQL + Caché Singleton en memoria/Redis).
- **Frameworks Seleccionados:**
  - **Frontend:** React 18 + TypeScript + Vite + Tailwind CSS + TanStack Query + Leaflet.
  - **Backend:** NestJS 10 + TypeScript + Swagger OpenAPI + Helmet + Throttler.
  - **Persistencia:** Prisma ORM 5 (SQLite para ejecución local inmediata sin Docker y `docker-compose.yml` para PostgreSQL 16 + Redis 7).
- **Patrones de Diseño Implementados:**
  1. **Singleton:** `PrismaService` (`backend/src/common/prisma/prisma.service.ts`) y `CacheService` (`backend/src/common/cache/cache.service.ts`).
  2. **Factory Method:** `NotificationSenderFactory` (`EmailNotificationSender`, `SmsNotificationSender`, `WhatsAppNotificationSender`).
  3. **Repository:** `AppointmentRepository` y `MedicalRecordRepository`.
  4. **Adapter / Facade:** `PaymentGatewayAdapter` (interfaz agnóstica de cobros y reembolsos).
  5. **Observer (Pub-Sub):** `EventEmitter2` con evento `appointment.confirmed` (`NotificationEventListener`).
  6. **Strategy:** `FeeCalculatorContext` (`StandardFeeStrategy`, `InsuranceFeeStrategy`, `CorporateFeeStrategy`).
  7. **Inyección de Dependencias (IoC / DI):** Contenedor nativo NestJS.
  8. **Middleware / Pipeline:** `Helmet`, `SanitizeInputPipe`, `ValidationPipe`, `JwtAuthGuard`, `RolesGuard`, `CsrfGuard` y `AuditLoggingInterceptor`.

---

## 2. Requerimientos de Unidad 3 Implementados

### A. Mecanismos de Seguridad
- **Hashing de contraseñas:** `bcryptjs` con factor de costo `12` (`backend/src/modules/auth/auth.service.ts`).
- **Autenticación Stateless + Revocación:** Tokens JWT (`accessToken` 15m) + `refreshToken` en cookie `HttpOnly; SameSite=Strict` + lista negra de `jti` al cerrar sesión en `CacheService`.
- **Bloqueo ante Fuerza Bruta y Rate Limiting:** Bloqueo temporal de 15 minutos (`HTTP 423 Locked`) tras **5 intentos fallidos** de login + `@nestjs/throttler`.
- **Protección CSRF Double-Submit:** Cookie `mc_csrf` firmada con HMAC-SHA256 validada contra cabecera `X-CSRF-Token` en `CsrfGuard`.
- **Control de Acceso Basado en Roles (RBAC) y Anti-IDOR:** Roles `ADMIN`, `DOCTOR`, `RECEPTIONIST`, `PATIENT` aplicados en `RolesGuard` y filtros por propietario.
- **Cifrado en Reposo AES-256-GCM + Sello SHA-256 (NOM-004-SSA3-2012):** Diagnósticos, notas de evolución y recetas médicas cifrados antes de persistirse (`AesGcmService`).
- **MFA Multifactor TOTP (RFC-6238):** Generación y verificación de códigos de 6 dígitos cada 30 segundos.
- **Defensa XSS / SQLi y Cabeceras HTTP:** `Helmet` (CSP, `X-Frame-Options`, `X-Content-Type-Options`), `SanitizeInputPipe`, DTOs estrictos con `class-validator` y consultas parametrizadas de Prisma ORM.
- **Bitácora de Auditoría:** Registro automático de accesos, bloqueos y operaciones en tabla `AuditLog`.

### B. Web Services de Terceros (Integración en Vivo)
1. **NIH Clinical Tables ICD-10-CM API** (`https://clinicaltables.nlm.nih.gov/api/icd10cm/v3/search`): Búsqueda en vivo de códigos de diagnóstico médico CIE-10 desde el Expediente Clínico.
2. **OpenStreetMap Nominatim + Leaflet** (`https://nominatim.openstreetmap.org/search`): Geocodificación y mapa interactivo de sedes clínicas en Coahuila.
3. **Open-Meteo Weather REST API** (`https://api.open-meteo.com/v1/forecast`): Telemetría ambiental y alertas térmicas/respiratorias para las clínicas.
4. **Nager.Date Public Holidays API** (`https://date.nager.at/api/v3/PublicHolidays/2026/MX`): Validación de días festivos oficiales en México al agendar citas.

### C. Web Services Propios
- **API RESTful (NestJS + Swagger OpenAPI 3.0):**
  - Documentación interactiva: `http://localhost:4000/api/docs`
  - Endpoints principales (`/api/v1`): `/health`, `/auth/*`, `/clinics`, `/doctors`, `/appointments`, `/appointments/quote`, `/medical-records`, `/integrations/*`, `/audit/*`.
  - Autenticación remota dual: `Authorization: Bearer <JWT>` y `X-API-Key: <llave>` (almacenada como hash **SHA-256** en base de datos).
- **Web Service SOAP 1.1 (XML + Contrato WSDL):**
  - Contrato WSDL: `http://localhost:4000/soap/clinical?wsdl`
  - Operaciones SOAP XML (`POST /soap/clinical`): `VerifyAppointmentFolio` y `GetDoctorCatalog`.

---

## 3. Esquema de Pruebas (Pirámide de Pruebas)
- **Unitarias Backend (Jest):** `backend/test/unit/patterns-and-crypto.spec.ts` (Singleton, Strategy, Factory Method, Adapter, AES-256-GCM, TOTP, SanitizeInputPipe y AppointmentsService con Repository Mock).
- **Integración Backend (Supertest):** `backend/test/integration/api.integration.spec.ts` (Health/Helmet, CSRF `403`, RBAC `403`/`201`, `X-API-Key`, SOAP XML/WSDL, Lockout `423` tras 5 fallos y JWT blacklist tras logout).
- **Unitarias Frontend (Vitest + Testing Library):** `frontend/src/__tests__/login-and-api.test.tsx`.
- **E2E Navegador (Playwright):** `tests/e2e/run-e2e.mjs`.

---

## 4. Instalación y Ejecución Local

```bash
# 1. Instalar dependencias de raíz, backend y frontend
npm run install:all

# 2. Configurar variables de entorno
cp .env.example .env
cp .env.example backend/.env

# 3. Generar cliente Prisma, crear base SQLite y sembrar datos iniciales
npm run prisma:setup

# 4. Iniciar Backend (:4000) y Frontend (:3000) simultáneamente
npm run dev
```

*(Opcional con Docker para PostgreSQL 16 + Redis 7: `docker compose up -d` y habilitar `DATABASE_URL` de PostgreSQL en `.env`.)*

### Cuentas de Demostración (Seed)
| Rol | Correo | Contraseña |
|---|---|---|
| **PATIENT** | `paciente@mediconnect.mx` | `Paciente2026!` |
| **DOCTOR** | `dra.martinez@mediconnect.mx` | `Doctor2026!` |
| **ADMIN** | `admin@mediconnect.mx` | `Admin2026!` |
| **RECEPTIONIST** | `recepcion@mediconnect.mx` | `Recep2026!` |

- **X-API-Key de demostración:** `mc_live_utc_dwi_demo_key_2026`

### Comandos de Pruebas
```bash
npm run test:backend   # Jest + Supertest + Cobertura
npm run test:frontend  # Vitest + React Testing Library
npm run test:e2e       # Playwright E2E (con servidores activos)
```
