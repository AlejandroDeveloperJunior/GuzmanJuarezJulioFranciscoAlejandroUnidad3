# Backlog Ágil (Metodología Scrumban) — MediConnect Pro

Basado en la planeación del **Saber Hacer Unidad 1 (DWI - UTC)** para la red de clínicas privadas de Coahuila **MediConnect Pro**.

## Roles
- **Product Owner:** Definición de valor clínico y priorización de historias de usuario.
- **Scrum Master:** Facilitación de ceremonias, remoción de bloqueos y control de DoR/DoD.
- **Equipo de Desarrollo:** Especialidades Frontend (React 18), Backend (NestJS), Persistencia (Prisma), QA (Jest/Vitest/Supertest/Playwright).

## Plan de Sprints
| Sprint | Objetivo Técnico | Entregables / Historias de Usuario | Estado |
|---|---|---|---|
| **Sprint 0** | Arquitectura base, monorepo, Docker Compose y CI/CD | Estructura `backend/` + `frontend/`, esquema Prisma, `.env.example`, GitHub Actions | Completado |
| **Sprint 1** | Seguridad, Autenticación y RBAC | Registro/Login con `bcrypt`, JWT + Refresh `HttpOnly`, CSRF, bloqueo por 5 intentos, Rate Limiting, MFA TOTP y AES-256-GCM | En progreso |
| **Sprint 2** | Patrones de Diseño y Dominio Clínico | Singleton, Factory Method, Repository, Adapter, Observer, Strategy, DI y Middleware en citas y expedientes | Planificado |
| **Sprint 3** | Web Services de Terceros y Propios | NIH ICD-10-CM, OpenStreetMap Nominatim + Leaflet, Open-Meteo, Nager.Date MX, reCAPTCHA v2, API REST Swagger y SOAP XML WSDL | Planificado |
| **Sprint 4** | Frontend SPA, Esquema de Pruebas y Documentación | Interfaz React 18 + Tailwind, pruebas unitarias/integración/E2E y entrega PDF | Planificado |

## Criterios DoR / DoD
- **Definition of Ready (DoR):** Historia en formato estándar, criterios de aceptación verificables y modelo de datos definido.
- **Definition of Done (DoD):** Tipado TypeScript limpio, pruebas unitarias/integración aprobadas, escaneo de cabeceras/validación activo y commit trazable en GitHub.
