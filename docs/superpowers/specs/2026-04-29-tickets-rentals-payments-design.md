# Diseño del módulo de tickets, alquileres y pagos — alquileres

Fecha: 2026-04-29

## Objetivo
Implementar el MVP operacional de tickets, alquileres y pagos usando un enfoque híbrido:
- permitir abrir tickets manualmente y agregarles alquileres
- permitir iniciar alquileres directamente y autogenerar ticket + línea + sesión
- permitir registrar pagos parciales o totales
- permitir cerrar tickets cuando ya no existan sesiones activas ni saldo pendiente

## Decisión principal
Se adopta la opción **híbrida**:
1. flujo centrado en ticket para caja
2. flujo centrado en alquiler para recepción

Ambos flujos deben terminar en el mismo modelo transaccional:
- `Ticket` como contenedor comercial
- `TicketItem` como línea de cobro
- `RentalSession` como control operativo del uso real
- `Payment` como registro de abonos o pagos finales

## Alcance del MVP
Incluye:
- abrir ticket manual por sede
- listar tickets por sede
- ver detalle de ticket
- iniciar alquiler directo creando ticket + línea + sesión
- agregar alquiler a ticket abierto existente
- finalizar sesión de alquiler
- registrar uno o varios pagos en un ticket
- cerrar ticket

Deja preparada la estructura para una siguiente fase con:
- ventas por catálogo
- extras
- cargos manuales
- descuentos
- cancelaciones más avanzadas

## No incluye todavía
- edición arbitraria de líneas ya cobradas
- devolución o reverso de pagos
- descuentos y promociones
- productos y servicios operativos vía endpoints propios
- reubicación de sesiones entre recursos
- reservas futuras complejas
- reglas avanzadas de caja o arqueo

## Reglas de negocio
### Tickets
1. Todo ticket pertenece a una `companyId` y `branchId`
2. Todo ticket inicia con estado `OPEN`
3. La numeración del ticket es correlativa y única por sede: `[branchId, ticketNumber]`
4. Un ticket puede contener múltiples líneas `TicketItem`
5. Un ticket puede mezclar alquileres ahora y ventas/manuales en fases siguientes
6. Un ticket no puede cerrarse si:
   - tiene sesiones activas o no finalizadas
   - tiene saldo pendiente mayor que cero
7. Un ticket cerrado no admite nuevos alquileres ni pagos

### Alquileres
1. Todo alquiler crea un `TicketItem` de tipo `RENTAL`
2. Todo `TicketItem` de alquiler debe tener su `RentalSession`
3. El alquiler puede nacer de dos formas:
   - inicio directo: crea ticket + línea + sesión
   - agregado a ticket existente: crea línea + sesión
4. Al iniciar el alquiler se debe guardar snapshot de la tarifa aplicada
5. Al finalizar el alquiler se recalculan:
   - minutos usados
   - minutos de exceso
   - monto base
   - monto por exceso
   - total final
6. No se puede iniciar un alquiler sobre un recurso ocupado o con solapamiento activo
7. No se puede iniciar alquiler sobre un recurso cuya categoría esté oculta en esa sede

### Pagos
1. Un ticket puede recibir uno o varios pagos
2. Los pagos se registran siempre contra un ticket
3. La suma pagada no puede exceder el total del ticket
4. Se permite pago parcial mientras el ticket siga abierto
5. El ticket solo puede cerrarse cuando el saldo pendiente sea exactamente cero

## Modelo de operación
### Flujo A — Ticket manual
Pensado para caja.
1. operador abre ticket
2. agrega alquiler a ticket abierto
3. finaliza la sesión cuando termina el uso
4. registra uno o varios pagos
5. cierra ticket

### Flujo B — Inicio directo de alquiler
Pensado para recepción u operación rápida.
1. operador inicia alquiler sobre un recurso
2. sistema crea ticket abierto automáticamente
3. sistema crea línea de ticket tipo `RENTAL`
4. sistema crea `RentalSession`
5. al finalizar, recalcula montos
6. registra pagos
7. cierra ticket

## Persistencia reutilizada
Se reutilizan modelos ya existentes en `schema.prisma`:
- `Ticket`
- `TicketItem`
- `RentalSession`
- `Payment`
- `RatePlan`
- `RatePlanRule`
- `Resource`
- `Branch`
- `Company`

## Reglas de persistencia
### Ticket
Campos relevantes ya definidos:
- `companyId`
- `branchId`
- `openedById`
- `ticketNumber`
- `status`
- `subtotal`
- `total`
- `openedAt`
- `closedAt`

Reglas:
- `subtotal` y `total` deben recalcularse desde sus líneas y no confiar en valores enviados por el cliente
- `ticketNumber` debe asignarse del lado del servidor dentro de transacción

### TicketItem
Para alquileres se usará:
- `type = RENTAL`
- `description`
- `quantity`
- `unitPrice`
- `subtotal`
- `metadata` opcional

Reglas:
- debe guardar snapshot comercial de lo cobrado
- al finalizar sesión se puede actualizar la línea para reflejar monto final real del alquiler

### RentalSession
Campos clave:
- `resourceId`
- `ticketItemId`
- `status`
- `startAt`
- `scheduledEndAt`
- `endedAt`
- `reservedMinutes`
- `usedMinutes`
- `overtimeMinutes`
- `ratePlanSnapshot`
- `baseAmount`
- `overtimeAmount`
- `totalAmount`

Reglas:
- `ratePlanSnapshot` debe guardar la tarifa aplicada al momento de inicio
- `scheduledEndAt` se calcula desde `startAt + reservedMinutes`
- `usedMinutes` y `overtimeMinutes` se completan al finalizar

### Payment
Campos clave:
- `ticketId`
- `method`
- `amount`
- `notes`

Reglas:
- cada pago se registra como movimiento independiente
- no modificar pagos previos en este MVP

## Resolución de tarifa
Al iniciar un alquiler, la tarifa se resolverá con esta prioridad:
1. tarifa específica del recurso
2. tarifa de la categoría del recurso
3. tarifa general de la sede

Si no existe tarifa aplicable:
- responder error de conflicto operativo
- no crear ticket ni sesión

## Cálculo del alquiler
### Al iniciar
Se debe resolver y congelar:
- nombre de tarifa aplicada
- tipo de pricing
- precio base
- unidad de tiempo si aplica
- minutos reservados
- hora de inicio
- hora programada de fin

### Al finalizar
Se calcula:
1. `usedMinutes`
2. `overtimeMinutes = max(usedMinutes - reservedMinutes, 0)`
3. `baseAmount` según tarifa base acordada
4. `overtimeAmount` según reglas del MVP
5. `totalAmount = baseAmount + overtimeAmount`

## Regla MVP para exceso
Para mantener esta fase simple y consistente:
- el exceso se cobrará usando la misma tarifa base del alquiler
- si la tarifa es `TIME_UNIT`, el exceso se calcula por bloques de `timeUnitMinutes`
- si la tarifa es `BLOCK`, el exceso se calcula repitiendo el valor base por cada bloque equivalente reservado

Nota:
- reglas horarias avanzadas de `RatePlanRule` quedan preparadas pero no serán explotadas completamente en este MVP inicial

## Autorización
Pueden operar este módulo:
- `SUPERADMIN`
- `ADMIN_EMPRESA`
- `ADMIN_SEDE`
- `CAJERO`
- `RECEPCION`

Regla:
- usuarios no `SUPERADMIN` solo pueden operar dentro de empresas/sedes donde tengan membresía activa

## Endpoints propuestos
### Tickets
- `POST /companies/:companyId/branches/:branchId/tickets`
- `GET /companies/:companyId/branches/:branchId/tickets`
- `GET /companies/:companyId/branches/:branchId/tickets/:ticketId`

### Alquileres
- `POST /companies/:companyId/branches/:branchId/rentals/start`
- `POST /companies/:companyId/branches/:branchId/tickets/:ticketId/rentals`
- `POST /companies/:companyId/branches/:branchId/rentals/:rentalSessionId/finish`

### Pagos
- `POST /companies/:companyId/branches/:branchId/tickets/:ticketId/payments`

### Cierre
- `POST /companies/:companyId/branches/:branchId/tickets/:ticketId/close`

## Payloads esperados
### Abrir ticket manual
Body mínimo:
- `openedByUserId` implícito desde token

Respuesta:
- ticket creado en estado `OPEN`

### Iniciar alquiler directo
Body mínimo sugerido:
- `resourceId`
- `reservedMinutes`
- `startAt?` opcional, si no usar ahora
- `notes?`

Respuesta:
- ticket creado
- línea creada
- sesión creada
- snapshot de tarifa aplicada

### Agregar alquiler a ticket
Body mínimo sugerido:
- `resourceId`
- `reservedMinutes`
- `startAt?`
- `notes?`

Respuesta:
- ticket actualizado
- línea creada
- sesión creada

### Finalizar alquiler
Body mínimo sugerido:
- `endedAt?` opcional, si no usar ahora

Respuesta:
- sesión finalizada
- línea actualizada
- ticket recalculado

### Registrar pago
Body mínimo:
- `method`
- `amount`
- `notes?`

Respuesta:
- pago creado
- total pagado
- saldo pendiente

### Cerrar ticket
Sin body obligatorio.

Respuesta:
- ticket cerrado con `closedAt`

## Validaciones
### Comunes
- `companyId`, `branchId`, `ticketId`, `resourceId`, `rentalSessionId` válidos
- la sede debe pertenecer a la empresa
- el recurso debe pertenecer a la sede y empresa
- el ticket debe pertenecer a la sede y empresa

### Abrir ticket
- usuario autenticado
- membresía activa en la empresa/sede si no es `SUPERADMIN`

### Iniciar o agregar alquiler
- ticket abierto si aplica
- recurso existente y activo
- categoría visible en la sede
- `reservedMinutes > 0`
- tarifa resoluble
- recurso no ocupado ni solapado

### Finalizar alquiler
- sesión existente
- sesión perteneciente a la sede/empresa
- sesión no finalizada previamente
- `endedAt >= startAt`

### Registrar pago
- ticket abierto
- `amount > 0`
- total pagado acumulado no excede total del ticket

### Cerrar ticket
- ticket abierto
- sin sesiones activas
- saldo pendiente igual a cero

## Reglas de consistencia y transacciones
Estas operaciones deben ejecutarse en transacción Prisma:
- inicio directo de alquiler
- agregar alquiler a ticket
- finalizar alquiler + actualizar línea + recalcular ticket
- registrar pago
- cerrar ticket

Razón:
- evitar tickets sin líneas
- evitar líneas sin sesión
- evitar pagos inconsistentes con saldos
- asegurar numeración correcta por sede

## Recalculo de ticket
Después de cada cambio relevante se recalcula:
- `subtotal = suma(subtotal de TicketItem)`
- `total = subtotal`

En este MVP no habrá:
- impuestos
- descuentos
- recargos separados del subtotal

## Diseño interno del módulo
Se recomienda crear módulo nuevo:
- `src/modules/operations/operations.routes.ts`
- `src/modules/operations/operations.controller.ts`
- `src/modules/operations/operations.schemas.ts`
- `src/modules/operations/operations.service.ts`

Responsabilidades:
- `routes`: declarar endpoints y middlewares
- `controller`: traducir request/response
- `schemas`: validar payloads con Zod
- `service`: reglas de negocio, transacciones, recálculos y autorización de alcance

## Listado y detalle de tickets
### Listado
Debe devolver por sede:
- `id`
- `ticketNumber`
- `status`
- `subtotal`
- `total`
- `openedAt`
- `closedAt`
- total pagado calculado
- saldo pendiente calculado

Puede incluir filtros iniciales simples:
- `status`

### Detalle
Debe devolver:
- datos del ticket
- líneas del ticket
- pagos
- sesiones de alquiler relacionadas con líneas `RENTAL`
- total pagado
- saldo pendiente

## Errores esperados
- `400` payload inválido
- `401` token ausente o inválido
- `403` sin permisos sobre empresa o sede
- `404` ticket no encontrado
- `404` recurso no encontrado
- `404` sesión no encontrada
- `409` ticket cerrado
- `409` recurso ocupado o solapado
- `409` categoría no visible en sede
- `409` no existe tarifa aplicable
- `409` sesión ya finalizada
- `409` pago excede saldo pendiente
- `409` ticket con saldo pendiente no puede cerrarse
- `409` ticket con sesiones activas no puede cerrarse

## Resultado esperado
Al terminar esta fase el backend debe permitir:
- abrir tickets manualmente
- iniciar alquileres directos con ticket autogenerado
- agregar alquileres a tickets abiertos
- finalizar alquileres y recalcular cobro real
- registrar pagos parciales o totales
- cerrar tickets sin saldo ni sesiones activas

## Implementación sugerida por fases
### Fase 1
- abrir ticket
- listar tickets
- ver detalle de ticket
- iniciar alquiler directo
- agregar alquiler a ticket
- finalizar alquiler
- registrar pago
- cerrar ticket

### Fase 2
- productos y servicios de catálogo
- cargos manuales y extras
- descuentos
- cancelaciones
- reglas avanzadas de tarifa y exceso

## Self-review
- Sin placeholders
- Alcance enfocado al MVP operacional
- Coherente con el enfoque híbrido aprobado
- Se deja explícito qué entra ahora y qué pasa a siguiente fase
