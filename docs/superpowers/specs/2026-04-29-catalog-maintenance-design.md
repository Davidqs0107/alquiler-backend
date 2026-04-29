# Diseño de mantenimiento de catálogo — edición, activación/inactivación y filtros

Fecha: 2026-04-29

## Objetivo
Extender el catálogo `SaleCatalogItem` para permitir mantenimiento operativo seguro sin perder trazabilidad histórica:
- editar ítems
- activar/inactivar ítems
- listar con filtros útiles

## Decisión principal
Se adopta la **opción 2: mantenimiento con reglas explícitas de uso**.

Esto significa:
- se permite editar ítems aunque ya hayan sido usados
- los cambios aplican solo a ventas futuras
- el historial previo no se rompe porque `TicketItem` ya conserva snapshot comercial
- no se permite borrado físico en esta fase

## Alcance
Incluye:
- editar `name`
- editar `type`
- editar `price`
- editar `branchId` para cambiar alcance empresa/sede dentro de la misma empresa
- activar ítem
- inactivar ítem
- listar catálogo con filtros por:
  - `status`
  - `branchId`
  - `type`
  - búsqueda por nombre

## No incluye
- borrado físico
- inventario
- múltiples precios por vigencia
- categorías comerciales separadas
- ordenamiento avanzado
- métricas o estadísticas de venta
- soft delete independiente del `status`

## Modelo afectado
Se reutiliza `SaleCatalogItem` sin agregar nuevas tablas.

Campos ya relevantes:
- `id`
- `companyId`
- `branchId`
- `type`
- `name`
- `price`
- `status`
- `createdAt`
- `updatedAt`

## Reglas de negocio
### Edición
1. Un ítem de catálogo puede editarse aunque ya haya sido usado en tickets
2. La edición nunca debe alterar tickets ya emitidos
3. Los tickets históricos se preservan porque guardan snapshot en `TicketItem`
4. El cambio afecta solo operaciones futuras

### Activación/inactivación
1. Un ítem `ACTIVE` puede venderse
2. Un ítem `INACTIVE` no puede agregarse a nuevos tickets
3. Un ítem inactivo sigue existiendo en listados e historial
4. Inactivar no debe afectar tickets históricos ni líneas ya emitidas

### Alcance empresa/sede
1. Un ítem puede ser global de empresa (`branchId = null`)
2. Un ítem puede ser específico de una sede (`branchId = branchId`)
3. Si se cambia `branchId`, debe seguir perteneciendo a la misma empresa
4. El cambio de alcance afecta solo disponibilidad futura del catálogo

### Filtros
1. `status` debe permitir ver activos, inactivos o todos
2. `branchId` debe permitir:
   - ver ítems globales + de una sede específica
   - o ver todos si no se envía
3. `type` debe filtrar por `PRODUCT` o `SERVICE`
4. `search` debe buscar por coincidencia parcial en `name`

## Integridad histórica
### Regla clave
Aunque un ítem cambie de nombre, precio, tipo o alcance:
- los tickets previos no cambian
- las líneas ya emitidas permanecen con su snapshot original

### Implicación
No hace falta bloquear edición por uso previo. El historial ya queda protegido por diseño actual.

## Endpoints propuestos
### Existentes
- `POST /companies/:companyId/catalog-items`
- `GET /companies/:companyId/catalog-items`

### Nuevos
- `PATCH /companies/:companyId/catalog-items/:catalogItemId`
- `POST /companies/:companyId/catalog-items/:catalogItemId/activate`
- `POST /companies/:companyId/catalog-items/:catalogItemId/deactivate`

## Query params propuestos para listado
- `status?`
- `branchId?`
- `type?`
- `search?`

## Payloads propuestos
### Editar catálogo
Body opcional con uno o varios campos:
- `name?`
- `type?`
- `price?`
- `branchId?`

Regla:
- debe enviarse al menos un campo
- `branchId` puede ser `null` para volverlo global de empresa

### Activar
Sin body obligatorio.

### Inactivar
Sin body obligatorio.

## Validaciones
### Crear catálogo
Se mantienen las actuales:
- empresa válida
- `branchId` si existe debe pertenecer a la empresa
- nombre requerido
- precio no negativo
- tipo válido

### Editar catálogo
- empresa válida
- ítem existe y pertenece a la empresa
- al menos un campo a modificar
- `name` no vacío si se envía
- `price` no negativo si se envía
- `type` válido si se envía
- si `branchId` se envía con valor no nulo, debe pertenecer a la empresa

### Activar/inactivar
- ítem existe y pertenece a la empresa
- si ya está en el estado solicitado, responder conflicto simple

### Listado
- `status` válido si se envía
- `branchId` válido si se envía
- `type` válido si se envía
- `search` texto opcional

## Reglas de acceso
Mantener autorización del módulo operacional:
- `SUPERADMIN`
- `ADMIN_EMPRESA`
- `ADMIN_SEDE`
- `CAJERO`
- `RECEPCION`

Recomendación práctica:
- mantenimiento de catálogo debería permitirse al menos a:
  - `SUPERADMIN`
  - `ADMIN_EMPRESA`
  - `ADMIN_SEDE`
- `CAJERO` y `RECEPCION` pueden seguir viendo y usando catálogo, pero no necesariamente administrarlo

## Recomendación de autorización
Para esta fase, recomiendo:
- crear/editar/activar/inactivar catálogo: `SUPERADMIN`, `ADMIN_EMPRESA`, `ADMIN_SEDE`
- listar catálogo: todos los roles operacionales con acceso a empresa/sede

## Implementación sugerida en backend
Se puede extender el módulo actual `operations`.

Archivos a tocar:
- `src/modules/operations/operations.routes.ts`
- `src/modules/operations/operations.controller.ts`
- `src/modules/operations/operations.schemas.ts`
- `src/modules/operations/operations.service.ts`

Si el service sigue creciendo, conviene empezar a separar helpers internos de catálogo dentro del mismo módulo.

## Reglas de listado
### Sin `branchId`
Devuelve todos los ítems de la empresa que cumplan filtros.

### Con `branchId`
Devuelve:
- ítems globales (`branchId = null`)
- más ítems específicos de esa sede

Esto mantiene utilidad operativa para una sede concreta.

## Manejo de errores
- `400` payload inválido
- `401` token ausente o inválido
- `403` sin permisos
- `404` catálogo no encontrado
- `404` sede no encontrada si `branchId` no pertenece a la empresa
- `409` ítem ya activo
- `409` ítem ya inactivo

## Resultado esperado
Al terminar esta fase el backend debe permitir:
- editar ítems de catálogo sin romper historial
- activar/inactivar catálogo para controlar disponibilidad futura
- filtrar catálogo por estado, sede, tipo y búsqueda textual
- seguir vendiendo solo ítems activos

## Implementación sugerida por fases
### Fase A
- ampliar schemas de listado
- ampliar `GET /catalog-items` con filtros

### Fase B
- `PATCH /catalog-items/:catalogItemId`
- validaciones de edición segura

### Fase C
- `POST /catalog-items/:catalogItemId/activate`
- `POST /catalog-items/:catalogItemId/deactivate`
- smoke tests manuales

## Self-review
- Sin placeholders
- Alcance controlado y coherente con la decisión del usuario
- Sin borrado físico para proteger trazabilidad
- Reglas de uso histórico explicitadas
