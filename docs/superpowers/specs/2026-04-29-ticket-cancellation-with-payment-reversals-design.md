# Diseño de cancelación avanzada de tickets con reverso de pagos

Fecha: 2026-04-29

## Objetivo
Permitir cancelar tickets completos que ya tienen pagos registrados, generando reversos internos trazables para todos los pagos asociados.

## Decisión principal
Se adopta la **opción 1: cancelación avanzada centrada en ticket**.

Esto implica:
- solo se cancela el ticket completo
- no se reversan pagos individuales en esta fase
- no hay reversos parciales
- se crea una tabla nueva de reversos de pago para trazabilidad clara

## Alcance
Incluye:
- nueva tabla de reversos de pago
- cancelar ticket completo con pagos
- generar reverso por cada pago del ticket
- marcar ticket como cancelado
- recalcular lectura financiera usando pagado bruto, reversado y pagado neto

## No incluye
- reverso de pagos individuales
- reverso parcial de un pago
- reapertura de ticket cancelado
- cancelación avanzada de alquileres como flujo separado
- devoluciones parciales o notas de crédito más complejas

## Modelo afectado
### Modelos existentes reutilizados
- `Ticket`
- `Payment`
- `TicketItem`

### Modelo nuevo propuesto
#### `PaymentReversal`
Campos sugeridos:
- `id`
- `companyId`
- `ticketId`
- `paymentId`
- `amount`
- `reason`
- `createdById`
- `createdAt`
- `updatedAt`

## Relaciones sugeridas
- `Ticket 1-N PaymentReversal`
- `Payment 1-0..1 PaymentReversal` en esta fase
- `User 1-N PaymentReversal` por `createdById`

## Regla estructural
Los pagos originales no se borran ni se mutan como mecanismo principal de reverso.

El sistema registra reversos por separado para mantener:
- trazabilidad
- auditoría
- claridad entre movimiento original y contramovimiento

## Reglas de negocio
### Cancelación avanzada de ticket
1. Solo aplica a ticket completo
2. El ticket debe existir dentro de empresa y sede
3. El ticket no debe estar ya cancelado
4. Si tiene pagos, se deben reversar todos en la misma operación
5. El ticket queda con `status = CANCELLED`
6. El ticket cancelado no admite nuevas operaciones

### Reversos de pago
1. Cada pago del ticket genera un único reverso en esta fase
2. No se permite doble reverso del mismo pago
3. El monto reversado debe ser igual al monto completo del pago original
4. Todo reverso debe guardar razón y usuario que lo creó
5. El reverso pertenece a la misma empresa y ticket del pago original

### Líneas del ticket
1. Las líneas del ticket deben preservarse para trazabilidad
2. Si no están canceladas, pueden marcarse lógicamente como canceladas por cascada al cancelar ticket
3. La cancelación del ticket no borra líneas ni pagos históricos

## Lectura financiera recomendada
A partir de esta fase conviene distinguir:
- `paidGrossTotal` = suma de `Payment.amount`
- `reversedTotal` = suma de `PaymentReversal.amount`
- `paidNetTotal` = `paidGrossTotal - reversedTotal`

Regla:
- un ticket cancelado con todos sus pagos reversados debe quedar con `paidNetTotal = 0`

## Persistencia recomendada
### `PaymentReversal`
Campos concretos recomendados:
- `id String @id @default(cuid())`
- `companyId String`
- `ticketId String`
- `paymentId String @unique`
- `amount Decimal @db.Decimal(12, 2)`
- `reason String`
- `createdById String`
- `createdAt DateTime @default(now())`
- `updatedAt DateTime @updatedAt`

### Índices sugeridos
- `@@index([companyId])`
- `@@index([ticketId])`
- `@@index([paymentId])`
- `@@index([createdById])`

## Endpoint propuesto
- `POST /companies/:companyId/branches/:branchId/tickets/:ticketId/cancel-with-reversal`

## Payload propuesto
Body mínimo:
- `reason`

## Respuesta esperada
- ticket cancelado
- pagos originales del ticket
- reversos creados
- resumen financiero:
  - `paidGrossTotal`
  - `reversedTotal`
  - `paidNetTotal`

## Validaciones
### Ticket
- debe existir
- debe pertenecer a empresa y sede
- no debe estar ya cancelado

### Permisos
Recomendado permitir solo a:
- `SUPERADMIN`
- `ADMIN_EMPRESA`
- `ADMIN_SEDE`

### Pagos
- si el ticket no tiene pagos, este endpoint no es necesario y puede rechazarse por conflicto o delegarse al flujo simple
- ningún pago del ticket debe tener reverso previo

### Reason
- requerido
- no vacío

## Flujo transaccional
Todo debe correr en una transacción Prisma:
1. validar acceso
2. cargar ticket
3. validar estado
4. cargar pagos del ticket
5. verificar que no existan reversos previos
6. crear un `PaymentReversal` por cada pago
7. marcar líneas activas como canceladas si aplica
8. marcar ticket como `CANCELLED`
9. devolver resumen final

## Manejo de saldo y consultas futuras
Las consultas de ticket deberían empezar a considerar reversos para reportar:
- pagado bruto
- reversado
- pagado neto

Esto aplica especialmente a:
- detalle de ticket
- listados si luego se amplían
- reportes futuros

## Diseño del backend
Se recomienda extender el módulo `operations`.

Archivos a tocar:
- `prisma/schema.prisma`
- nueva migración Prisma
- `src/modules/operations/operations.routes.ts`
- `src/modules/operations/operations.controller.ts`
- `src/modules/operations/operations.schemas.ts`
- `src/modules/operations/operations.service.ts`

## Errores esperados
- `400` payload inválido
- `401` token ausente o inválido
- `403` sin permisos
- `404` ticket no encontrado
- `409` ticket ya cancelado
- `409` ticket sin pagos para reversar en este flujo
- `409` algún pago ya tiene reverso

## Resultado esperado
Al terminar esta fase el backend debe permitir:
- cancelar tickets completos con pagos
- registrar reversos de todos los pagos del ticket
- mantener trazabilidad de pagos originales y reversos
- exponer lectura financiera neta correcta para el ticket cancelado

## Implementación sugerida por fases
### Fase A
- ampliar schema Prisma con `PaymentReversal`
- migración
- ajuste de consultas de ticket para incluir reversos

### Fase B
- endpoint `cancel-with-reversal`
- validaciones y transacción completa

### Fase C
- smoke test manual
- actualización de progress

## Self-review
- Sin placeholders
- Alcance acotado a ticket completo con pagos
- Coherente con la decisión del usuario y la opción 1 elegida
- Base preparada para reversos más finos en fases posteriores
