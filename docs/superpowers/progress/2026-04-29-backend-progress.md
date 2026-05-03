# Progreso backend — alquileres

Fecha: 2026-05-02

## Estado actual
Backend avanzado con sistema multiempresa completo y roles de usuario simplificados (un usuario = un rol).

## Cambios realizados hoy (2026-05-02)

### Modelo de datos - Roles simplificados

**Antes:** Un usuario podía tener `companyRole` y `branchRole` diferentes (ej: companyRole=RECEPCION, branchRole=ADMIN_SEDE)
**Ahora:** Un usuario tiene un solo rol: ADMIN_EMPRESA | ADMIN_SEDE | CAJERO | RECEPCION

**Modelo en Prisma:**
```
CompanyUser (1 rol por usuario: ADMIN_EMPRESA | ADMIN_SEDE | CAJERO | RECEPCION)
  └── BranchUser (para ADMIN_SEDE, CAJERO, RECEPCION - indica a qué branch tiene acceso)
```

**Jerarquía de permisos:**
- ADMIN_EMPRESA > ADMIN_SEDE > CAJERO > RECEPCION
- ADMIN_EMPRESA: acceso a toda la empresa y todas sus branches
- ADMIN_SEDE: acceso solo a sus branches asignadas
- CAJERO/RECEPCION: acceso a su única branch asignada

### Archivos modificados

| Archivo | Cambio |
|---------|--------|
| `src/modules/auth/auth.service.ts` | Removido `branchRole` del mapping - ya no se usa |
| `src/modules/companies/companies.access.ts` | Creada función `hasBranchAccess(userId, branchId, globalRole)` |
| `src/modules/companies/companies.service.ts` | `getCompanyById` y `listBranches` usan `ensureCompanyMemberAccess` |
| `src/scripts/seed.ts` | Reescrito para crear usuarios con roles limpios y consistency |

### Funciones de acceso

**`ensureCompanyMemberAccess`** (en `companies.access.ts`):
- Permite: ADMIN_EMPRESA, ADMIN_SEDE, CAJERO, RECEPCION
- Verifica que el usuario sea miembro activo de la empresa

**`hasBranchAccess(userId, branchId, globalRole)`** (nueva):
- ADMIN_EMPRESA: siempre true si pertenece a la empresa
- ADMIN_SEDE/CAJERO/RECEPCION: verifica BranchUser membership

### Seed actualizado

El nuevo seed crea:
- SUPERADMIN: admin@example.com
- ADMIN_EMPRESA: admin@deportesplus.com (acceso a todas las branches)
- ADMIN_SEDE: adminsede@deportesplus.com (solo Central)
- CAJERO: cajero@deportesplus.com (solo Central)
- RECEPCION: recepcion@deportesplus.com (solo Norte)

## Stack base implementado
- Node.js + Express + TypeScript
- PostgreSQL + Prisma
- JWT authentication
- CORS configurado

## Módulos implementados

### 1. Auth
- Login con email/password
- JWT access token
- `GET /auth/me` con memberships y branches

### 2. Multiempresa
- CRUD de empresas
- CRUD de branches
- Membresías de empresa y branch
- Control de acceso por rol

### 3. Recursos
- Categorías por empresa
- Recursos por branch
- Visibilidad de categorías por branch

### 4. Tarifas
- Rate plans por branch
- Tarifas por recurso o categoría

### 5. Tickets y Operaciones
- Apertura de tickets
- Alquileres con sesiones
- Pagos y reversos
- Descuentos por línea y ticket
- Cancelaciones con reversos automáticos

### 6. Catálogo
- Ítems de venta por empresa/branch

## Endpoints principales

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | /auth/login | Login |
| GET | /auth/me | Usuario con memberships |
| GET | /companies | Listar empresas |
| GET | /companies/:id | Detalle empresa |
| GET | /companies/:id/branches | Listar branches |
| POST | /companies/:id/branches | Crear branch |
| GET | /companies/:id/members | Miembros de empresa |
| POST | /companies/:id/members | Crear miembro |
| GET | /companies/:id/branches/:branchId/members | Miembros de branch |
| POST | /companies/:id/branches/:branchId/members | Crear miembro de branch |
| GET | /companies/:id/categories | Categorías |
| POST | /companies/:id/categories | Crear categoría |
| GET | /companies/:id/resources | Recursos |
| POST | /companies/:id/resources | Crear recurso |
| GET | /companies/:id/rate-plans | Tarifas |
| POST | /companies/:id/rate-plans | Crear tarifa |
| GET | /companies/:id/catalog | Catálogo |
| POST | /companies/:id/tickets | Crear ticket |
| GET | /companies/:id/tickets | Listar tickets |
| POST | /companies/:id/tickets/:ticketId/payments | Registrar pago |
| POST | /companies/:id/tickets/:ticketId/close | Cerrar ticket |

## Archivos clave

- `prisma/schema.prisma` - Modelo de datos
- `src/modules/auth/auth.service.ts` - Login y me
- `src/modules/companies/companies.access.ts` - Control de acceso
- `src/modules/companies/companies.service.ts` - Lógica de empresas
- `src/modules/resources/resources.service.ts` - Recursos y categorías
- `src/modules/operations/operations.service.ts` - Tickets y pagos
- `src/scripts/seed.ts` - Datos de prueba

## Próximo paso

1. Testear flujo completo con los nuevos usuarios del seed
2. Verificar que el frontend se integra correctamente
3. Continuar con cualquier fix de bugs encontrado

## Usuarios de test (password: admin123 para todos)

| Rol | Email | Branch |
|-----|-------|--------|
| SUPERADMIN | admin@example.com | - |
| ADMIN_EMPRESA | admin@deportesplus.com | Todas (puede elegir) |
| ADMIN_SEDE | adminsede@deportesplus.com | Central |
| CAJERO | cajero@deportesplus.com | Central |
| RECEPCION | recepcion@deportesplus.com | Norte |