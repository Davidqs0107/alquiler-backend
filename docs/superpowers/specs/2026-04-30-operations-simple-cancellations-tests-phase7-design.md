# Diseño de tests de cancelaciones simples fase 7 para operations

Fecha: 2026-04-30

## Objetivo
Agregar una séptima tanda corta de tests automatizados para cubrir cancelaciones simples sin pagos.

## Alcance
### Service
1. cancelación de línea no-rental recalcula el ticket
2. cancelación completa de ticket sin pagos deja ticket y líneas canceladas
3. rechazo de cancelación simple sobre línea `RENTAL`
4. rechazo de cancelación de línea si el ticket ya tiene pagos
5. rechazo de cancelación simple de ticket si ya tiene pagos

### HTTP
1. endpoint de cancelación de línea recalcula correctamente
2. endpoint de cancelación de ticket deja ticket cancelado correctamente

## Assertions clave
- `ticketItem.cancelledAt`
- `ticketItem.cancellationReason`
- `ticket.status = CANCELLED`
- `ticket.total = 0`
- rechazos `409` en casos no permitidos

## No incluye
- reversos
- cancelación avanzada de alquileres
- combinaciones complejas con descuentos y pagos parciales

## Criterios de éxito
- cancelaciones simples quedan protegidas en service y HTTP
- `npm test` sigue pasando
- `npm run build` sigue pasando
- se actualiza el doc de progreso

## Self-review
- Sin placeholders
- Alcance corto y alineado a las reglas actuales del módulo
