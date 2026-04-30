# Diseño de cancelación avanzada de sesiones de alquiler con reversos

Fecha: 2026-04-30

## Objetivo
Permitir cancelar una sesión/línea rental específica sobre tickets abiertos, tanto si la sesión está `RESERVED` como `FINISHED`, generando reversos financieros automáticos cuando ya existan pagos netos aplicados al ticket.

## Decisión principal
Se adopta cancelación por sesión/línea rental específica con ajuste financiero explícito y reparto automático FIFO sobre pagos reversables.

## Alcance
Incluye:
- cancelación de `RentalSession` específica
- aplica a sesiones `RESERVED` y `FINISHED`
- marca lógica de cancelación sobre `RentalSession` y `TicketItem`
- recálculo del ticket
- reversos automáticos parciales sobre pagos del ticket cuando haga falta
- distribución FIFO por `createdAt` sobre pagos con remanente reversible

## No incluye
- cancelación de sesiones `IN_USE`
- reapertura de tickets
- cancelación automática del ticket completo cuando quede en cero
- redistribución manual de pagos
- tests en esta fase

## Regla funcional
Al cancelar una rental:
1. se marca la `RentalSession` como `CANCELLED`
2. se marca el `TicketItem` rental como cancelado
3. se recalcula el ticket
4. se calcula el impacto financiero neto de esa línea
5. si el ticket ya tiene pagos netos cubriendo ese importe, se generan reversos financieros automáticos

## Regla financiera base
El impacto de cancelación se calcula con el neto actual de esa línea rental:
- `lineCancelableNetAmount = ticketItem.subtotal`

## Monto a reversar
- `reversalNeeded = min(lineCancelableNetAmount, paidNetTotal actual del ticket)`

## Regla de pagos
Si hace falta reverso:
- el backend toma pagos del ticket en orden FIFO por `createdAt`
- usa sólo pagos con remanente reversible
- crea uno o varios `PaymentReversal` parciales hasta cubrir `reversalNeeded`
- si no alcanza remanente reversible suficiente, responde `409`

## Estados permitidos
### `RentalSession`
Permitido cancelar desde:
- `RESERVED`
- `FINISHED`

No permitido desde:
- `IN_USE`
- `CANCELLED`

### `Ticket`
Debe estar:
- `OPEN`

No permitido si está:
- `CLOSED`
- `CANCELLED`

## Endpoint nuevo
- `POST /companies/:companyId/branches/:branchId/rentals/:rentalSessionId/cancel`

## Payload
- `reason`

## Respuesta esperada
- `rentalSession` cancelada
- `ticketItem` cancelado
- `ticket` recalculado
- `paymentReversals` creados en la operación
- resumen financiero:
  - `paidGrossTotal`
  - `reversedTotal`
  - `paidNetTotal`
  - `pendingAmount`

## Validaciones
1. la sesión existe en empresa y sede
2. la sesión pertenece a una línea rental válida
3. el ticket de esa línea está `OPEN`
4. la sesión no está ya cancelada
5. la sesión no está `IN_USE`
6. `reason` requerido
7. si hace falta reverso, debe existir remanente reversible suficiente en pagos del ticket

## Permisos
- `SUPERADMIN`
- `ADMIN_EMPRESA`
- `ADMIN_SEDE`

## Backend a tocar
- `src/modules/operations/operations.schemas.ts`
- `src/modules/operations/operations.controller.ts`
- `src/modules/operations/operations.routes.ts`
- `src/modules/operations/operations.service.ts`

## Helpers sugeridos
- resolver payment pool reversible del ticket
- distribuir reverso FIFO entre pagos
- crear múltiples `PaymentReversal`
- construir resumen financiero final

## Orden transaccional
1. validar acceso
2. cargar sesión + línea + ticket
3. validar estado
4. calcular monto cancelable de la línea
5. calcular monto a reversar según pagos netos del ticket
6. generar reversos parciales FIFO si hace falta
7. cancelar sesión
8. cancelar línea
9. recalcular ticket
10. devolver resumen

## Errores esperados
- `400` payload inválido
- `403` sin permisos
- `404` sesión no encontrada
- `409` ticket no abierto
- `409` sesión ya cancelada
- `409` sesión `IN_USE`
- `409` saldo reversible insuficiente para soportar la cancelación

## Implementación sugerida
1. agregar endpoint y schema
2. crear lógica transaccional de cancelación por sesión
3. reutilizar soporte de reversos parciales por pago
4. ajustar progress
5. dejar tests para el bloque final

## Self-review
- Sin placeholders
- Alcance acotado a sesión/línea rental específica
- Compatible con reversos parciales por pago ya implementados
