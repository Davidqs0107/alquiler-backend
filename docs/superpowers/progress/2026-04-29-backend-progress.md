# Progreso backend — alquileres

Fecha: 2026-04-30

## Estado actual
El proyecto quedó funcionando con PostgreSQL en Docker, Prisma conectado correctamente y el módulo operacional extendido con:
- fase 1 de tickets/alquileres/pagos
- fase 2 de catálogo/manual/extras/descuentos/cancelaciones simples
- mantenimiento de catálogo
- cancelación avanzada de tickets con reversos de pago
- primera tanda de tests automatizados para `operations`

Todo quedó validado con smoke tests manuales, `npm test` y compilando correctamente con `npm run build`.

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

### 7. Cancelación avanzada con reversos
- cancelar ticket completo con pagos
- generar reverso por cada pago asociado
- exponer lectura financiera con `paidGrossTotal`, `reversedTotal` y `paidNetTotal`
- reversos parciales por pago específico
- múltiples reversos parciales por pago hasta agotar remanente reversible
- cancelación avanzada de sesiones de alquiler con reversos automáticos FIFO

### 8. Tests automatizados fase 1
- runner de tests con `tsx --test`
- suite de servicio con PostgreSQL real para reglas críticas de `operations`
- smoke tests HTTP para creación de ticket, pagos y cancelación con reversos
- helpers reutilizables de cleanup y factories para tests

### 9. Tests automatizados fase 2 de permisos
- boundaries de permisos para operaciones normales vs acciones sensibles
- cobertura service para `CAJERO`, `RECEPCION`, `ADMIN_EMPRESA`, `ADMIN_SEDE` y usuario sin membresía
- smoke tests HTTP de permisos para endpoint normal y endpoint sensible

### 10. Tests automatizados fase 3 happy path de alquiler
- flujo base sin overtime cubierto en service y HTTP
- start rental → finish rental → payment → close ticket
- validación de estados, montos y cierre completo del ticket

### 11. Tests automatizados fase 4 overtime de alquiler
- overtime `TIME_UNIT` cubierto en service y HTTP
- validación de redondeo hacia arriba para bloque extra
- recálculo correcto de `usedMinutes`, `overtimeMinutes`, `overtimeAmount` y `ticket.total`

### 12. Tests automatizados fase 5 descuentos
- descuentos por línea y globales cubiertos en service y HTTP
- validación de recálculo de subtotales, `discountAmount` y `ticket.total`
- cobertura de rechazos cuando el descuento excede lo permitido

### 13. Tests automatizados fase 6 happy path de venta
- flujo no-rental cubierto con catálogo, línea manual y extra
- create ticket → add catalog → add manual → add extra → payment → close
- validación de tipos de línea, total acumulado y cierre completo del ticket

### 14. Tests automatizados fase 7 cancelaciones simples
- cancelación de línea no-rental y cancelación completa de ticket sin pagos
- validación de recálculo financiero y marcado lógico de cancelación
- cobertura de rechazos sobre rentals y tickets con pagos

### 15. Tests automatizados fase 8 filtros de catálogo
- filtros de listado de catálogo cubiertos en service y HTTP
- validación de `status`, `type`, `branchId` y `search`
- cobertura de combinación simple de filtros y scoping global/sede

### 16. Tests automatizados fase 9 reversos parciales por pago
- reverso parcial por pago específico creado y validado
- acumulación de múltiples reversos parciales por pago
- rechazo cuando el monto excede el remanente reversible
- validación de `paymentSummary` con `originalAmount`, `reversedAmount` y `remainingReversibleAmount`

### 17. Tests automatizados fase 10 cancelación de sesiones rental con reversos
- cancelación de sesión `RESERVED` con reversos automáticos FIFO
- cancelación de sesión `FINISHED` con reversos automáticos
- rechazo de cancelación de sesión `IN_USE`
- rechazo de doble cancelación de rental
- recálculo correcto del ticket después de cancelación

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
- cancelación avanzada de ticket con pagos crea reversos dedicados por pago
- pagos permiten múltiples reversos parciales acumulados
- el sistema rechaza reversos que excedan el remanente reversible del pago
- pagos originales se preservan y no se mutan para reversar
- lectura financiera del ticket distingue pagado bruto, reversado y pagado neto
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
- `57a3f55` feat: add phase 2 catalog discounts and cancellations
- `d6a3770` feat: add catalog maintenance endpoints and filters
- `fe24353` feat: add ticket cancellation with payment reversals
- `8a93902` feat: add partial payment reversals
- `7401bc5` feat: add rental session cancellation with reversals

## Specs escritas
- `docs/superpowers/specs/2026-04-29-app-alquileres-design.md`
- `docs/superpowers/specs/2026-04-29-backend-bootstrap-design.md`
- `docs/superpowers/specs/2026-04-29-multiempresa-design.md`
- `docs/superpowers/specs/2026-04-29-memberships-design.md`
- `docs/superpowers/specs/2026-04-29-resources-rateplans-design.md`
- `docs/superpowers/specs/2026-04-29-tickets-rentals-payments-design.md`
- `docs/superpowers/specs/2026-04-29-sales-manual-extras-discounts-cancellations-design.md`
- `docs/superpowers/specs/2026-04-29-catalog-maintenance-design.md`
- `docs/superpowers/specs/2026-04-29-ticket-cancellation-with-payment-reversals-design.md`
- `docs/superpowers/specs/2026-04-30-operations-tests-phase1-design.md`
- `docs/superpowers/specs/2026-04-30-operations-permissions-tests-phase2-design.md`
- `docs/superpowers/specs/2026-04-30-operations-rental-happy-path-tests-phase3-design.md`
- `docs/superpowers/specs/2026-04-30-operations-rental-overtime-tests-phase4-design.md`
- `docs/superpowers/specs/2026-04-30-operations-discounts-tests-phase5-design.md`
- `docs/superpowers/specs/2026-04-30-operations-sales-happy-path-tests-phase6-design.md`
- `docs/superpowers/specs/2026-04-30-operations-simple-cancellations-tests-phase7-design.md`
- `docs/superpowers/specs/2026-04-30-operations-catalog-filters-tests-phase8-design.md`
- `docs/superpowers/specs/2026-04-30-partial-payment-reversals-design.md`
- `docs/superpowers/specs/2026-04-30-rental-session-cancellation-with-reversals-design.md`

## Último punto alcanzado
Se completaron los tests automatizados para reversos parciales por pago y cancelación de sesiones rental con reversos.

Se agregó:
- tests de servicio para `createPaymentReversal`: reverso parcial, rechazo por exceder remanente, acumulación de múltiples reversos
- tests HTTP para `createPaymentReversal`: endpoint funcional y rechazo correcto
- tests de servicio para `cancelRentalSession`: cancelación `RESERVED` y `FINISHED`, rechazos por `IN_USE` y doble cancelación, recálculo de ticket
- tests HTTP para `cancelRentalSession`: endpoints funcionales para cancelar sesiones y rechazo de `IN_USE`

Total: **59 tests passing**, `npm run build` pasando.

## Próximo paso recomendado
Todas las fases diseñadas están ahora implementadas y probadas. El proyecto tiene una base sólida de tests cubriendo:

- Operaciones críticas (overlap, pagos, cierres)
- Permisos y roles
- Happy paths de rental y venta
- Overtime
- Descuentos
- Cancelaciones simples
- Filtros de catálogo
- Reversos parciales por pago
- Cancelación de sesiones rental con reversos

Opciones para continuar:
- agregar más cobertura de tests si se requiere
- smoke tests manuales de las funcionalidades implementadas
- mejoras operativas según feedback funcional
- iniciar el frontend del proyecto

## Nota para retomar
Al volver, revisar primero:
1. que la base de datos esté corriendo (verificar contenedor Docker)
2. que el servidor arranque con `npm run dev`
3. correr `npm test` para validar que los 59 tests pasen
4. correr `npm run build` para verificar compilación
5. hacer smoke test manual del flujo más usado si se desea
