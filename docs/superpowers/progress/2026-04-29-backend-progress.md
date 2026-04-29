# Progreso backend — alquileres

Fecha: 2026-04-29

## Estado actual
El proyecto quedó funcionando con PostgreSQL en Docker, Prisma conectado correctamente y el módulo operacional ya extendido hasta fase 2 con catálogo, líneas manuales/extras, descuentos y cancelaciones simples, validado con smoke tests manuales.

## Stack base implementado
- Node.js
- TypeScript
- Express
- PostgreSQL
- Prisma
- JWT
- Docker Compose

## Infra lista
- `docker-compose.yml` con PostgreSQL
- `.env.example`
- `.env`
- Prisma configurado
- migraciones iniciales creadas

## Backend base implementado
- healthcheck
- login con email/password
- JWT access token
- middleware de autenticación
- script CLI para crear `SUPERADMIN`

## Módulos implementados
### 1. Multiempresa
- crear empresa
- crear sede principal en la misma operación
- crear `ADMIN_EMPRESA` inicial en la misma operación
- listar empresas
- ver detalle de empresa
- crear sedes adicionales

### 2. Miembros
- crear miembros de empresa
- crear miembros de sede
- listar miembros por empresa
- listar miembros por sede

### 3. Categorías, recursos y tarifas
- crear categorías por empresa
- listar categorías
- ocultar categoría por sede
- crear recursos por sede
- listar recursos por sede
- crear tarifas por sede
- listar tarifas por sede

### 4. Tickets, alquileres y pagos
- abrir ticket manual por sede
- listar tickets por sede
- ver detalle de ticket
- iniciar alquiler directo creando ticket + línea + sesión
- agregar alquiler a ticket abierto
- finalizar sesión de alquiler
- registrar pagos parciales o totales
- cerrar ticket validando saldo y sesiones activas

### 5. Fase 2 operacional
- crear catálogo de venta (`SaleCatalogItem`)
- listar catálogo por empresa
- agregar ítem de catálogo a ticket abierto
- agregar línea manual a ticket abierto
- agregar línea extra a ticket abierto
- aplicar descuento por línea
- aplicar descuento global al ticket
- cancelar línea no pagada
- cancelar ticket completo sin pagos

### 6. Mantenimiento de catálogo
- editar ítems de catálogo
- activar/inactivar catálogo
- listar catálogo con filtros por `status`, `branchId`, `type` y búsqueda por nombre

## Reglas ya aplicadas
- categorías por empresa
- visibles en todas las sedes por defecto
- se pueden ocultar por sede
- si una categoría se oculta en una sede, sus recursos no se muestran ni se usan allí
- recursos por sede
- tarifas por sede
- prioridad de tarifa: recurso > categoría > sede
- flujo híbrido de operaciones: ticket manual o inicio directo de alquiler
- no se permite alquilar recursos ocupados o con solapamiento activo
- los tickets no cierran con saldo pendiente
- los tickets no cierran con sesiones activas
- todo cobro adicional entra como `TicketItem`
- descuentos por línea y por ticket recalculan montos netos
- cancelaciones simples solo se permiten en tickets sin pagos
- tickets cancelados no aceptan nuevas operaciones
- líneas `RENTAL` no se cancelan libremente en esta fase 2
- catálogo se puede editar sin romper historial de ventas
- catálogo se puede activar/inactivar sin borrar trazabilidad
- listado de catálogo soporta filtros por estado, sede, tipo y búsqueda textual
- `SUPERADMIN`, `ADMIN_EMPRESA`, `ADMIN_SEDE`, `CAJERO` y `RECEPCION` operan el módulo operacional según alcance

## Archivos clave
- `prisma/schema.prisma`
- `src/modules/auth/*`
- `src/modules/companies/*`
- `src/modules/resources/*`
- `src/modules/operations/*`
- `src/scripts/create-superadmin.ts`
- `docker-compose.yml`

## Últimos commits importantes
- `a5635b8` feat: bootstrap express prisma jwt backend
- `420cad5` feat: add multiempresa module endpoints
- `e57498e` feat: add company and branch memberships management
- `5f02429` feat: add categories resources and rate plans module
- `a000d66` docs: add tickets rentals payments design spec
- `b7b207f` feat: add tickets rentals payments operations module
- `b8046cc` docs: add phase 2 operations design spec

## Specs escritas
- `docs/superpowers/specs/2026-04-29-app-alquileres-design.md`
- `docs/superpowers/specs/2026-04-29-backend-bootstrap-design.md`
- `docs/superpowers/specs/2026-04-29-multiempresa-design.md`
- `docs/superpowers/specs/2026-04-29-memberships-design.md`
- `docs/superpowers/specs/2026-04-29-resources-rateplans-design.md`
- `docs/superpowers/specs/2026-04-29-tickets-rentals-payments-design.md`
- `docs/superpowers/specs/2026-04-29-sales-manual-extras-discounts-cancellations-design.md`
- `docs/superpowers/specs/2026-04-29-catalog-maintenance-design.md`

## Último punto alcanzado
Se diseñó, implementó y validó el mantenimiento de catálogo con:
- edición de `SaleCatalogItem`
- activación e inactivación
- filtros por `status`, `branchId`, `type` y `search`

Se hizo smoke test manual exitoso cubriendo:
1. creación de catálogo global y por sede
2. listado general
3. listado filtrado por sede
4. listado filtrado por tipo
5. búsqueda por nombre
6. edición de nombre, precio y cambio de alcance a global
7. inactivación de ítem
8. rechazo de venta de ítem inactivo
9. reactivación de ítem
10. venta exitosa tras reactivar

## Próximo paso recomendado
Continuar con una de estas rutas:
- tests automatizados del módulo operations
- cancelaciones/reversos más avanzados
- mantenimiento adicional de catálogo con ordenamiento o métricas simples

## Nota para retomar
Al volver, revisar primero:
1. que Docker siga levantado
2. que Prisma esté migrado
3. que el servidor arranque con `npm run dev`
4. reprobar smoke tests de fase 1, fase 2 y mantenimiento de catálogo
5. decidir si el siguiente bloque será tests automatizados o cancelaciones avanzadas
