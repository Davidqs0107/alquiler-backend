# Diseño de tests de filtros de catálogo fase 8 para operations

Fecha: 2026-04-30

## Objetivo
Agregar una octava tanda corta de tests automatizados para cubrir el listado de catálogo con filtros.

## Decisión principal
Se cubren primero los filtros de lectura antes del mantenimiento mutante del catálogo.

## Alcance
### Service
1. filtro por `status`
2. filtro por `type`
3. filtro por `branchId` devuelve globales + sede pedida y excluye otras sedes
4. filtro `search` encuentra coincidencias parciales por nombre
5. combinación simple de filtros funciona correctamente

### HTTP
1. listado con `branchId`
2. listado con `status` + `type`
3. listado con `search`

## Dataset sugerido
- global activo `Water Bottle` `PRODUCT`
- sede A activo `Towel Rental` `SERVICE`
- sede B activo `Snacks Combo` `PRODUCT`
- global inactivo `Old Service` `SERVICE`

## Assertions clave
- cantidad devuelta
- nombres incluidos y excluidos
- scoping correcto por sede
- `status` correcto
- `type` correcto
- búsqueda parcial case-insensitive

## No incluye
- edición de catálogo
- activación/inactivación
- conflictos de estado
- permisos finos de administración de catálogo

## Criterios de éxito
- filtros de catálogo quedan protegidos en service y HTTP
- `npm test` sigue pasando
- `npm run build` sigue pasando
- se actualiza el doc de progreso

## Self-review
- Sin placeholders
- Alcance corto y enfocado en comportamiento de lectura
