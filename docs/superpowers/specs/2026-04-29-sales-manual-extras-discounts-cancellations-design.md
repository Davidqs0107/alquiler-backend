# Diseño de la fase 2 operacional — ventas por catálogo, cargos manuales, extras, descuentos y cancelaciones

Fecha: 2026-04-29

## Objetivo
Extender el módulo operacional actual para soportar dentro del mismo ticket abierto:
- ventas por catálogo
- cargos manuales
- extras
- descuentos por línea
- descuentos a nivel ticket
- cancelación simple de líneas no pagadas
- cancelación simple de tickets sin pagos

## Decisión principal
Se adopta la opción **3: mixto por fases**.

### En esta fase
- catálogo, extras y manuales entran como `TicketItem`
- descuentos por línea y por ticket se implementan con reglas acotadas
- cancelaciones se permiten solo si no existen pagos que rompan la consistencia contable del MVP

### En una fase posterior
- reversos de pagos
- notas de crédito
- auditoría de ajustes más sofisticada
- promociones complejas
- cancelaciones avanzadas de alquileres ya operados

## Alcance de esta fase
Incluye:
- alta y listado de `SaleCatalogItem`
- agregar línea de catálogo a ticket abierto
- agregar línea manual a ticket abierto
- agregar línea extra a ticket abierto
- aplicar descuento a una línea del ticket
- aplicar descuento global al ticket
- cancelar línea no pagada en ticket abierto
- cancelar ticket completo sin pagos
- recalcular ticket usando montos netos

## No incluye todavía
- reverso o anulación de pagos
- cancelación de tickets con pagos
- cancelación avanzada de alquileres ya finalizados o cobrados
- promociones automáticas
- impuestos
- combinaciones complejas de campañas o cupones
- trazabilidad contable avanzada separada en tablas de ajustes

## Reutilización del modelo actual
La fase se apoya sobre modelos ya existentes:
- `Ticket`
- `TicketItem`
- `SaleCatalogItem`
- `Payment`
- `RentalSession`

La decisión central es **no crear nuevas tablas operativas mayores** en esta fase. El comportamiento se extiende sobre el ticket existente.

## Regla estructural
Todo nuevo cobro entra como `TicketItem` dentro de un `Ticket` abierto.

Tipos de línea usados:
- `PRODUCT`: venta desde `SaleCatalogItem`
- `EXTRA`: cobro adicional operativo
- `MANUAL`: cargo libre ingresado por operador
- `RENTAL`: ya existente del módulo actual

## Persistencia propuesta
Para soportar descuentos y cancelaciones de forma explícita y simple, se propone extender persistencia con campos adicionales.

### En `TicketItem`
Agregar:
- `discountAmount Decimal @default(0)`
- `discountReason String?`
- `cancelledAt DateTime?`
- `cancellationReason String?`

### En `Ticket`
Agregar:
- `discountAmount Decimal @default(0)`
- `discountReason String?`
- `cancelledAt DateTime?`
- `cancellationReason String?`

## Sentido de estos campos
- `discountAmount` guarda el descuento explícito aplicado
- `discountReason` explica el motivo
- `cancelledAt` marca cancelación lógica
- `cancellationReason` conserva trazabilidad mínima

Esto evita introducir tablas nuevas de ajustes en esta fase y mantiene el MVP legible.

## Reglas de negocio
### Ventas por catálogo
1. Un `SaleCatalogItem` pertenece a una empresa
2. Puede ser global de empresa o específico de sede
3. Solo se pueden vender ítems activos
4. Al agregarse al ticket, la línea debe guardar snapshot comercial:
   - nombre
   - tipo
   - precio unitario
   - cantidad
   - subtotal bruto

### Extras
1. Un extra se registra como `TicketItem` tipo `EXTRA`
2. No requiere catálogo
3. Debe guardar descripción, cantidad y precio unitario
4. Se usa para cobros adicionales operativos simples

### Manuales
1. Un cargo manual se registra como `TicketItem` tipo `MANUAL`
2. No requiere catálogo
3. Debe guardar descripción, cantidad y precio unitario
4. El operador es responsable del texto comercial visible en ticket

### Descuento por línea
1. Se puede aplicar a cualquier `TicketItem` no cancelado
2. No puede hacer que la línea quede en negativo
3. El descuento se guarda explícitamente en la línea
4. El subtotal neto de la línea será:
   - `subtotal bruto - discountAmount`

### Descuento global de ticket
1. Se aplica sobre el ticket abierto
2. No puede exceder el neto acumulado de sus líneas activas
3. Se guarda explícitamente en el ticket
4. El total final del ticket será:
   - `suma neta de líneas - descuento global del ticket`

### Cancelación de línea
1. Solo se puede cancelar una línea si el ticket sigue abierto
2. No se permite cancelar líneas si el ticket ya tiene pagos registrados
3. La cancelación es lógica, no física
4. Una línea cancelada deja de computar en totales
5. Debe conservar su información histórica

### Cancelación de ticket
1. Solo se puede cancelar un ticket si está `OPEN`
2. Solo se puede cancelar si no tiene pagos
3. La cancelación es lógica, no física
4. Un ticket cancelado no admite nuevas líneas, pagos ni descuentos
5. Sus líneas quedan preservadas para trazabilidad

### Restricción especial para alquileres
Para mantener esta fase simple:
- no se permitirá cancelar de forma libre una línea `RENTAL` que ya tenga una sesión operativa iniciada o finalizada
- si se habilita cancelación de alquiler en el futuro, deberá tratarse como flujo separado

## Cálculo de montos
### Línea
Cada línea manejará conceptualmente:
- `quantity`
- `unitPrice`
- `grossSubtotal`
- `discountAmount`
- `netSubtotal`

Como el modelo actual ya tiene `subtotal`, en esta fase se recomienda:
- seguir usando `subtotal` como **subtotal neto persistido**
- calcular `grossSubtotal = quantity * unitPrice`
- guardar `discountAmount` aparte
- recalcular `subtotal = grossSubtotal - discountAmount`

### Ticket
El ticket manejará:
- suma neta de líneas activas
- descuento global `discountAmount`
- total final neto

Reglas:
- `subtotal` del ticket = suma neta de líneas activas
- `total` del ticket = `subtotal - discountAmount`
- nunca debe resultar negativo

## Autorización
Se mantienen los roles del módulo operacional:
- `SUPERADMIN`
- `ADMIN_EMPRESA`
- `ADMIN_SEDE`
- `CAJERO`
- `RECEPCION`

Regla:
- usuarios no `SUPERADMIN` solo pueden operar dentro de su empresa/sede con membresía activa

## Endpoints propuestos
### Catálogo
- `POST /companies/:companyId/catalog-items`
- `GET /companies/:companyId/catalog-items`

### Agregar líneas al ticket
- `POST /companies/:companyId/branches/:branchId/tickets/:ticketId/items/catalog`
- `POST /companies/:companyId/branches/:branchId/tickets/:ticketId/items/manual`
- `POST /companies/:companyId/branches/:branchId/tickets/:ticketId/items/extra`

### Descuentos
- `POST /companies/:companyId/branches/:branchId/tickets/:ticketId/items/:ticketItemId/discount`
- `POST /companies/:companyId/branches/:branchId/tickets/:ticketId/discount`

### Cancelaciones
- `POST /companies/:companyId/branches/:branchId/tickets/:ticketId/items/:ticketItemId/cancel`
- `POST /companies/:companyId/branches/:branchId/tickets/:ticketId/cancel`

## Payloads propuestos
### Crear catálogo
Body mínimo:
- `name`
- `type` (`PRODUCT` o `SERVICE`)
- `price`
- `branchId?`

### Agregar ítem de catálogo
Body mínimo:
- `catalogItemId`
- `quantity`

### Agregar línea manual
Body mínimo:
- `description`
- `quantity`
- `unitPrice`

### Agregar extra
Body mínimo:
- `description`
- `quantity`
- `unitPrice`

### Descuento por línea
Body mínimo:
- `discountAmount`
- `reason?`

### Descuento global de ticket
Body mínimo:
- `discountAmount`
- `reason?`

### Cancelar línea
Body mínimo:
- `reason`

### Cancelar ticket
Body mínimo:
- `reason`

## Validaciones
### Catálogo
- empresa válida
- si se informa `branchId`, debe pertenecer a la empresa
- nombre requerido
- precio no negativo
- ítem activo para poder venderse

### Agregar líneas
- ticket existente
- ticket abierto
- ticket no cancelado
- cantidad positiva
- montos no negativos
- en catálogo, el ítem debe pertenecer a la empresa y estar activo
- si el catálogo es de sede, debe corresponder a la sede o a nivel empresa

### Descuento por línea
- ticket abierto
- línea perteneciente al ticket
- línea no cancelada
- línea sin pagos aplicados indirectamente porque el ticket no debe tener pagos para esta operación simple
- `discountAmount >= 0`
- `discountAmount <= grossSubtotal`

### Descuento global
- ticket abierto
- ticket sin pagos para mantener consistencia simple del MVP
- `discountAmount >= 0`
- `discountAmount <= subtotal actual del ticket`

### Cancelación de línea
- ticket abierto
- ticket sin pagos
- línea no cancelada previamente
- si la línea es `RENTAL`, rechazar cuando exista sesión operativa asociada

### Cancelación de ticket
- ticket abierto
- ticket sin pagos
- ticket no cancelado previamente

## Reglas de consistencia
Estas operaciones deben correr en transacción Prisma:
- crear `SaleCatalogItem`
- agregar línea de catálogo
- agregar línea manual
- agregar extra
- aplicar descuento por línea
- aplicar descuento global
- cancelar línea
- cancelar ticket

Razón:
- asegurar consistencia de totales
- evitar descuentos y cancelaciones parciales
- evitar tickets con montos desalineados

## Recalculo del ticket
Se recomienda centralizar helper de recálculo.

Debe considerar solo líneas:
- del ticket
- no canceladas

Proceso:
1. sumar `subtotal` neto de líneas activas
2. asignar eso a `ticket.subtotal`
3. restar `ticket.discountAmount`
4. guardar `ticket.total`
5. validar que `ticket.total >= 0`

## Diseño del módulo
Se recomienda extender el módulo ya existente `operations`.

Archivos a tocar:
- `src/modules/operations/operations.routes.ts`
- `src/modules/operations/operations.controller.ts`
- `src/modules/operations/operations.schemas.ts`
- `src/modules/operations/operations.service.ts`

No hace falta crear módulo separado porque esta fase sigue perteneciendo al flujo operacional del ticket.

## Errores esperados
- `400` payload inválido
- `401` token ausente o inválido
- `403` sin permisos
- `404` ticket no encontrado
- `404` ticketItem no encontrado
- `404` catalog item no encontrado
- `409` ticket cerrado
- `409` ticket cancelado
- `409` línea cancelada
- `409` ticket con pagos no admite descuento/cancelación simple
- `409` descuento excede monto permitido
- `409` línea de alquiler no cancelable en esta fase
- `409` catalog item inactivo

## Resultado esperado
Al terminar esta fase el backend debe permitir:
- mantener un catálogo simple vendible
- agregar ventas, extras y manuales al mismo ticket abierto
- aplicar descuentos por línea y por ticket
- cancelar líneas no pagadas
- cancelar tickets completos sin pagos
- recalcular correctamente los totales netos del ticket

## Implementación sugerida por fases
### Fase 2.1
- migración Prisma para descuentos/cancelaciones en `Ticket` y `TicketItem`
- alta y listado de `SaleCatalogItem`
- agregar línea de catálogo
- agregar línea manual
- agregar línea extra

### Fase 2.2
- descuento por línea
- descuento global de ticket
- helper sólido de recálculo neto

### Fase 2.3
- cancelación de línea
- cancelación de ticket
- pruebas manuales de consistencia

## Self-review
- Sin placeholders
- Alcance acotado a la fase 2
- Coherente con la decisión de opción 3 aplicada
- Se explicita qué se posterga para no mezclar complejidad contable avanzada
