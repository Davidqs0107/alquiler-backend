# Progreso backend — alquileres

Fecha: 2026-04-29

## Estado actual
El proyecto quedó funcionando con PostgreSQL en Docker, Prisma conectado correctamente y el MVP de operaciones ya implementado y validado con smoke test manual.

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

## Specs escritas
- `docs/superpowers/specs/2026-04-29-app-alquileres-design.md`
- `docs/superpowers/specs/2026-04-29-backend-bootstrap-design.md`
- `docs/superpowers/specs/2026-04-29-multiempresa-design.md`
- `docs/superpowers/specs/2026-04-29-memberships-design.md`
- `docs/superpowers/specs/2026-04-29-resources-rateplans-design.md`
- `docs/superpowers/specs/2026-04-29-tickets-rentals-payments-design.md`

## Último punto alcanzado
Se diseñó, implementó y validó el MVP del módulo operacional de:
- `tickets`
- `rental sessions`
- `payments`

Se hizo smoke test manual exitoso cubriendo:
1. login de `SUPERADMIN`
2. creación de empresa y sede
3. creación de categoría, recurso y tarifa
4. inicio directo de alquiler
5. finalización de sesión
6. pago parcial + pago final
7. cierre de ticket
8. apertura de ticket manual
9. agregado de alquiler a ticket existente
10. listado y detalle de tickets

## Próximo paso recomendado
Continuar con la fase 2 del módulo operacional:
- ventas por catálogo
- cargos manuales
- extras
- descuentos
- cancelaciones

## Nota para retomar
Al volver, revisar primero:
1. que Docker siga levantado
2. que Prisma esté migrado
3. que el servidor arranque con `npm run dev`
4. probar de nuevo el flujo híbrido completo de tickets/alquileres/pagos
5. diseñar la fase 2 de ventas/manuales/extras antes de implementarla
