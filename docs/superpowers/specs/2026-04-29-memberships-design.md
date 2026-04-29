# Diseño del módulo de miembros — alquileres

Fecha: 2026-04-29

## Objetivo
Implementar la gestión inicial de miembros por empresa y sede, permitiendo alta de usuarios nuevos y asignación controlada según rol.

## Alcance
Incluye:
- creación de miembros de empresa
- creación de miembros de sede
- listado de miembros por empresa
- listado de miembros por sede
- autorización para `SUPERADMIN` y `ADMIN_EMPRESA`

No incluye todavía:
- vincular usuarios ya existentes
- edición de roles
- desactivación de membresías
- reasignación entre empresas
- recuperación de contraseña

## Reglas de negocio
1. `SUPERADMIN` y `ADMIN_EMPRESA` pueden crear usuarios y asignarlos
2. `ADMIN_EMPRESA` solo puede operar dentro de su propia empresa
3. El alta de miembro de empresa crea:
   - `User`
   - `CompanyUser`
4. El alta de miembro de sede crea en la misma transacción:
   - `User`
   - `CompanyUser`
   - `BranchUser`
5. Todo usuario asignado a sede debe pertenecer también a la empresa
6. El email del usuario nuevo debe ser único
7. La sede debe pertenecer a la empresa indicada
8. No debe permitirse duplicar membresía en la misma empresa o sede

## Endpoints iniciales
### `POST /companies/:companyId/members`
Crea usuario nuevo y lo vincula a la empresa.

### `POST /companies/:companyId/branches/:branchId/members`
Crea usuario nuevo, lo vincula a la empresa y a la sede.

### `GET /companies/:companyId/members`
Lista miembros de empresa.

### `GET /companies/:companyId/branches/:branchId/members`
Lista miembros de sede.

## Roles asignables
### Empresa
- `ADMIN_EMPRESA`
- `CAJERO`
- `RECEPCION`

### Sede
- `ADMIN_SEDE`
- `CAJERO`
- `RECEPCION`

## Autorización
- `SUPERADMIN`: acceso total
- `ADMIN_EMPRESA`: solo dentro de su empresa
- el sistema debe validar membresía activa antes de permitir operaciones de empresa o sede

## Validaciones
### Alta de miembro de empresa
- `companyId` válido
- email válido y único
- password mínimo 6 caracteres
- rol permitido para empresa

### Alta de miembro de sede
- `companyId` válido
- `branchId` válido
- la sede pertenece a la empresa
- email válido y único
- password mínimo 6 caracteres
- rol permitido para sede

## Persistencia
Se usan los modelos existentes:
- `User`
- `CompanyUser`
- `BranchUser`
- `Company`
- `Branch`

No requiere cambio estructural del schema actual.

## Flujo de alta a empresa
1. validar token
2. autorizar por `SUPERADMIN` o `ADMIN_EMPRESA` de la empresa
3. validar payload
4. verificar empresa existente
5. verificar email no existente
6. crear `User`
7. crear `CompanyUser`
8. responder con usuario y membresía

## Flujo de alta a sede
1. validar token
2. autorizar por `SUPERADMIN` o `ADMIN_EMPRESA` de la empresa
3. validar payload
4. verificar empresa y sede
5. verificar que la sede pertenezca a la empresa
6. verificar email no existente
7. iniciar transacción
8. crear `User`
9. crear `CompanyUser`
10. crear `BranchUser`
11. responder con usuario y membresías

## Listados
### Empresa
Debe devolver usuarios vinculados en `CompanyUser`, incluyendo:
- datos básicos del usuario
- rol de empresa
- estado
- fechas principales

### Sede
Debe devolver usuarios vinculados en `BranchUser`, incluyendo:
- datos básicos del usuario
- rol de sede
- estado
- fechas principales

## Errores esperados
- `400` payload inválido
- `401` token ausente o inválido
- `403` sin permisos
- `404` empresa o sede no encontrada
- `409` email duplicado
- `409` membresía duplicada si hubiera colisión

## Resultado esperado
Al terminar esta fase el backend debe permitir gestionar miembros nuevos por empresa y sede con autorización consistente y relaciones correctas entre empresa y sede.

## Self-review
- Sin placeholders
- Alcance acotado a gestión inicial de miembros
- Regla empresa+sede consistente y explícita
- Sin cambios innecesarios de schema
