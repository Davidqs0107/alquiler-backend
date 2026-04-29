# Diseño del módulo multiempresa — alquileres

Fecha: 2026-04-29

## Objetivo
Implementar el módulo inicial multiempresa para permitir alta de empresas y sedes con reglas de acceso alineadas al modelo de negocio.

## Alcance
Incluye:
- creación de empresa por `SUPERADMIN`
- creación obligatoria de sede principal en la misma operación
- creación obligatoria del `ADMIN_EMPRESA` inicial en la misma operación
- creación de sedes adicionales por `ADMIN_EMPRESA`
- consulta básica de empresas
- autorización por rol global y membresía de empresa

No incluye todavía:
- asignación automática del admin inicial a sede
- CRUD completo de usuarios
- edición/baja de empresas
- edición/baja de sedes
- gestión de permisos finos por endpoint

## Reglas de negocio
1. Solo `SUPERADMIN` puede crear empresas
2. Crear empresa requiere en la misma operación:
   - datos de empresa
   - datos de sede principal
   - datos del `ADMIN_EMPRESA` inicial
3. El email del admin inicial debe ser nuevo
4. Si el email ya existe, la operación falla
5. El admin inicial se crea con `globalRole = USER`
6. El admin inicial queda vinculado a la empresa con rol `ADMIN_EMPRESA`
7. El admin inicial no queda asignado automáticamente a la sede principal
8. `ADMIN_EMPRESA` puede crear sedes de su propia empresa
9. `SUPERADMIN` también puede crear sedes

## Endpoints iniciales
### `POST /companies`
Solo `SUPERADMIN`.

Crea en una transacción:
- `Company`
- `Branch` principal
- `User` admin inicial
- `CompanyUser` con rol `ADMIN_EMPRESA`

### `POST /companies/:companyId/branches`
Permitido para:
- `SUPERADMIN`
- `ADMIN_EMPRESA` de esa empresa

### `GET /companies`
- `SUPERADMIN`: lista todas las empresas
- `ADMIN_EMPRESA`: lista solo empresas donde tiene membresía activa

### `GET /companies/:companyId`
- `SUPERADMIN`: acceso total
- `ADMIN_EMPRESA` de esa empresa: acceso permitido

## Validaciones
### Crear empresa
- `company.name` requerido
- `company.slug` requerido y único
- `branch.name` requerido
- `admin.email` válido y único
- `admin.password` mínimo 6 caracteres

### Crear sede
- `companyId` existente
- `name` requerido
- unicidad por empresa: `[companyId, name]`
- si no es `SUPERADMIN`, debe tener membresía activa `ADMIN_EMPRESA` en esa empresa

## Autorización
### Rol global
Se agrega middleware reutilizable para exigir `SUPERADMIN` en endpoints administrativos globales.

### Membresía empresarial
Se agrega validación de membresía activa en `CompanyUser` para permitir acciones sobre la empresa correspondiente.

## Persistencia
Se reutilizan modelos existentes:
- `User`
- `Company`
- `Branch`
- `CompanyUser`

No requiere cambios estructurales de schema para este paso.

## Flujo de creación de empresa
1. validar token y rol `SUPERADMIN`
2. validar payload
3. verificar unicidad de `slug`
4. verificar inexistencia del email del admin inicial
5. iniciar transacción
6. crear usuario admin inicial
7. crear empresa
8. crear sede principal
9. crear membresía `CompanyUser`
10. confirmar transacción
11. responder con resumen de empresa, sede principal y admin creado

## Flujo de creación de sede
1. validar token
2. validar payload
3. verificar existencia de empresa
4. autorizar por `SUPERADMIN` o membresía `ADMIN_EMPRESA`
5. crear sede
6. responder con la sede creada

## Errores esperados
- `400` payload inválido
- `401` token ausente o inválido
- `403` sin permisos suficientes
- `404` empresa no encontrada
- `409` slug de empresa duplicado
- `409` email del admin inicial duplicado
- `409` nombre de sede duplicado dentro de la empresa

## Resultado esperado
Al terminar esta fase el backend debe permitir:
- crear empresas completas desde `SUPERADMIN`
- crear sedes adicionales con autorización correcta
- consultar empresas con visibilidad acorde al rol

## Self-review
- Sin placeholders
- Alcance acotado al módulo multiempresa inicial
- Reglas alineadas con decisiones del usuario
- Sin cambios innecesarios al schema actual
