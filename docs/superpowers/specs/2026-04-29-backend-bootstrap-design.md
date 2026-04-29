# Diseño de backend base — alquileres

Fecha: 2026-04-29

## Objetivo
Preparar el backend base del sistema de alquileres usando Node.js, TypeScript, Express, PostgreSQL propio en Docker, Prisma ORM con migraciones locales y autenticación JWT con email/password.

## Alcance
Incluye:
- scaffold del proyecto backend
- PostgreSQL en Docker Compose
- configuración de Prisma
- migración inicial basada en el diseño de BD MVP existente
- autenticación con email + password + JWT
- script CLI para crear el primer `SUPERADMIN`
- estructura modular inicial para crecer sin refactor inmediato

No incluye todavía:
- refresh tokens
- recuperación de contraseña
- permisos finos por pantalla
- inventario
- despliegue productivo
- tests de integración amplios

## Decisiones principales
- Arquitectura monolítica modular
- Express como framework HTTP
- Prisma como fuente principal del esquema y de migraciones
- PostgreSQL propio corriendo en Docker
- JWT stateless para autenticación
- `bcrypt` para hash de contraseñas
- bootstrap administrativo por script CLI, no por endpoint público

## Stack técnico
- Node.js
- TypeScript
- Express
- PostgreSQL
- Prisma ORM
- JWT
- bcrypt
- Docker Compose

## Arquitectura propuesta
### Aplicación
Backend REST organizado por módulos de dominio. Cada módulo expone rutas, capa de aplicación y acceso a datos usando Prisma.

### Persistencia
`schema.prisma` define el modelo fuente. Los cambios de base salen de migraciones de Prisma con `prisma migrate dev`.

### Autenticación
El usuario inicia sesión con email y password. Si las credenciales son válidas, el backend emite un access token JWT. Las rutas protegidas usan middleware para validar token y cargar identidad.

## Estructura inicial sugerida
```text
src/
  app.ts
  server.ts
  config/
  lib/
    prisma.ts
  middlewares/
    auth.middleware.ts
    error.middleware.ts
  modules/
    auth/
    users/
    companies/
    branches/
    resources/
    tickets/
  scripts/
    create-superadmin.ts
  types/
prisma/
  schema.prisma
  migrations/
docker-compose.yml
.env
.env.example
```

## Modelado de datos base
Se toma como base el spec ya definido en:
- `docs/superpowers/specs/2026-04-29-app-alquileres-design.md`

### Extensión mínima para autenticación
El modelo `User` debe incluir como mínimo:
- `id`
- `email`
- `passwordHash`
- `globalRole`
- `status`
- `createdAt`
- `updatedAt`

### Modelos MVP a implementar
- `User`
- `Company`
- `Branch`
- `CompanyUser`
- `BranchUser`
- `ResourceCategory`
- `Resource`
- `RatePlan`
- `RatePlanRule`
- `Ticket`
- `TicketItem`
- `RentalSession`
- `Payment`
- `SaleCatalogItem`

### Regla de tenancy
Todas las tablas operativas deben mantener `companyId` según el spec. La autorización inicial debe impedir acceso fuera de la empresa/sede asignada, incluso si después se amplía el sistema de permisos.

## API inicial
### Públicas
- `GET /health`
- `POST /auth/login`

### Protegidas básicas
- `GET /auth/me`

### Bootstrap administrativo
No habrá endpoint público para crear `SUPERADMIN`. Se usará un script CLI.

## JWT
### Payload mínimo recomendado
- `sub`: userId
- `email`
- `globalRole`

### Comportamiento
- token firmado con secreto desde `.env`
- expiración configurable
- middleware que rechaza token ausente, inválido o expirado

## Script CLI de SUPERADMIN
Comando sugerido:
```bash
npm run superadmin:create
```

### Responsabilidades
- pedir email y password por prompt o aceptar argumentos
- validar formato mínimo
- hashear password con bcrypt
- crear usuario con `globalRole = SUPERADMIN`
- fallar si ya existe un usuario con ese email

## Infraestructura local
### Docker Compose
Un servicio `postgres` con:
- imagen oficial de PostgreSQL
- volumen persistente
- puerto expuesto localmente
- variables `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`

### Variables de entorno mínimas
- `PORT`
- `DATABASE_URL`
- `JWT_SECRET`
- `JWT_EXPIRES_IN`
- `NODE_ENV`

## Flujo de arranque local
1. levantar PostgreSQL con Docker Compose
2. instalar dependencias
3. configurar `.env`
4. generar cliente Prisma
5. correr migración inicial
6. ejecutar script de `SUPERADMIN`
7. iniciar servidor
8. probar login y endpoint protegido

## Manejo de errores
- middleware central de errores
- respuestas JSON consistentes
- códigos `400`, `401`, `403`, `404`, `409`, `500`
- no exponer stack traces en producción

## Validación
Se recomienda validar payloads de entrada desde el inicio para login y futuros endpoints CRUD. La implementación puede usar una librería liviana de validación, manteniendo errores claros y consistentes.

## Testing inicial
Cobertura mínima sugerida:
- `GET /health` responde OK
- `POST /auth/login` autentica con credenciales válidas
- `POST /auth/login` rechaza credenciales inválidas
- `GET /auth/me` requiere token válido
- script de `SUPERADMIN` crea usuario correctamente

## Riesgos y mitigaciones
### Riesgo
Arrancar con demasiada complejidad arquitectónica.
### Mitigación
Mantener monolito modular y separar solo lo necesario.

### Riesgo
Errores de aislamiento multiempresa en etapas tempranas.
### Mitigación
Modelar `companyId` desde el primer schema y contemplarlo en servicios/middlewares.

### Riesgo
Exponer bootstrap sensible por HTTP.
### Mitigación
Usar exclusivamente script CLI para creación del primer `SUPERADMIN`.

## Resultado esperado
Al terminar esta fase debe existir un backend local ejecutable con:
- PostgreSQL en Docker
- schema Prisma migrado
- usuario `SUPERADMIN` creable por CLI
- login funcional con JWT
- al menos un endpoint protegido operativo
- base lista para seguir con módulos de negocio

## Self-review
- Sin placeholders
- Alcance acotado al backend base
- Consistente con el spec de BD existente
- Sin dependencias de features fuera del MVP inicial
