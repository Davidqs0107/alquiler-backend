# Diseño del módulo de categorías, recursos y tarifas — alquileres

Fecha: 2026-04-29

## Objetivo
Implementar la gestión inicial de categorías, recursos y tarifas con categorías a nivel empresa, recursos por sede y tarifas por sede.

## Alcance
Incluye:
- creación y listado de categorías por empresa
- visibilidad de categorías por sede
- creación y listado de recursos por sede
- creación y listado de tarifas por sede
- autorización para `SUPERADMIN` y `ADMIN_EMPRESA`

No incluye todavía:
- edición y baja completa
- calendarios avanzados de tarifa
- validación de conflictos horarios
- desactivación masiva de recursos
- reglas automáticas complejas de pricing

## Reglas de negocio
1. Las categorías pertenecen a la empresa
2. Una categoría nueva queda visible en todas las sedes por defecto
3. Una categoría puede ocultarse por sede
4. Si una categoría está oculta en una sede, sus recursos en esa sede no deben mostrarse ni usarse
5. Los recursos pertenecen a una sede
6. Distintas sedes pueden tener distinta cantidad de recursos para una misma categoría
7. Las tarifas se definen por sede
8. Una tarifa de sede puede ser:
   - general de sede
   - por categoría
   - por recurso
9. `SUPERADMIN` y `ADMIN_EMPRESA` pueden operar este módulo
10. `ADMIN_EMPRESA` solo dentro de su empresa

## Persistencia
### Modelos existentes reutilizados
- `ResourceCategory`
- `Resource`
- `RatePlan`
- `RatePlanRule`
- `Company`
- `Branch`

### Cambio requerido de schema
Agregar una tabla de visibilidad por sede:
- `BranchCategoryVisibility`

Propósito:
- registrar excepciones de visibilidad por sede
- por defecto una categoría se considera visible si no existe excepción activa de ocultamiento

## Propuesta para `BranchCategoryVisibility`
Campos mínimos:
- `id`
- `companyId`
- `branchId`
- `resourceCategoryId`
- `isVisible`
- `createdAt`
- `updatedAt`

Regla:
- no crear registros al alta de categoría
- solo crear o actualizar registro cuando una sede cambie la visibilidad por defecto

## Endpoints iniciales
### Categorías
- `POST /companies/:companyId/categories`
- `GET /companies/:companyId/categories`

### Visibilidad por sede
- `PATCH /companies/:companyId/categories/:categoryId/branches/:branchId/visibility`

### Recursos
- `POST /companies/:companyId/branches/:branchId/resources`
- `GET /companies/:companyId/branches/:branchId/resources`

### Tarifas
- `POST /companies/:companyId/branches/:branchId/rate-plans`
- `GET /companies/:companyId/branches/:branchId/rate-plans`

## Validaciones
### Crear categoría
- `companyId` válido
- nombre requerido
- unicidad por empresa: `[companyId, name]`

### Cambiar visibilidad
- empresa, categoría y sede deben existir
- sede debe pertenecer a la empresa
- categoría debe pertenecer a la empresa
- valor booleano `isVisible`

### Crear recurso
- empresa y sede válidas
- categoría válida y perteneciente a la empresa
- nombre requerido
- unicidad por sede: `[branchId, name]`
- no permitir alta operativa si la categoría está oculta en la sede

### Crear tarifa
- empresa y sede válidas
- nombre requerido
- `pricingType` válido
- `basePrice` válido
- si referencia categoría, debe pertenecer a la empresa
- si referencia recurso, debe pertenecer a la sede

## Autorización
- `SUPERADMIN`: acceso total
- `ADMIN_EMPRESA`: acceso solo dentro de su empresa

## Flujo de categorías
1. validar token
2. autorizar acceso a empresa
3. crear categoría en empresa
4. responder sin crear excepciones de visibilidad

## Flujo de visibilidad
1. validar token
2. autorizar acceso a empresa
3. validar empresa, sede y categoría
4. crear o actualizar excepción en `BranchCategoryVisibility`
5. si queda oculta, los listados operativos de recursos deben excluir recursos de esa categoría en esa sede

## Flujo de recursos
1. validar token
2. autorizar acceso a empresa
3. validar sede y categoría
4. verificar visibilidad efectiva de la categoría en la sede
5. crear recurso por sede
6. listar recursos filtrando categorías ocultas

## Flujo de tarifas
1. validar token
2. autorizar acceso a empresa
3. validar sede
4. crear tarifa general, por categoría o por recurso
5. listar tarifas de la sede

## Errores esperados
- `400` payload inválido
- `401` token ausente o inválido
- `403` sin permisos
- `404` empresa, sede, categoría o recurso no encontrado
- `409` categoría duplicada por empresa
- `409` recurso duplicado por sede
- `409` configuración inválida de tarifa

## Resultado esperado
Al terminar esta fase el backend debe permitir:
- crear categorías compartidas por empresa
- ocultarlas por sede sin borrarlas
- crear recursos distintos por sede para una misma categoría
- crear tarifas por sede con alcance general, por categoría o por recurso

## Self-review
- Sin placeholders
- Alcance enfocado al módulo inicial
- Reglas de visibilidad explícitas
- Coherente con decisiones del usuario
