# Diseño de reversos parciales por pago

Fecha: 2026-04-30

## Objetivo
Permitir reversar parcialmente un pago específico, múltiples veces si hace falta, hasta agotar su remanente reversible.

## Decisión principal
Se adopta reverso parcial por pago específico con múltiples reversos parciales acumulables.

## Alcance
Incluye:
- reverso parcial por `paymentId`
- múltiples reversos parciales por pago
- validación de remanente reversible
- actualización de lecturas financieras del ticket
- compatibilidad con cancelación completa con reversos

## No incluye
- reverso por ticket sin elegir pago
- repartos automáticos entre múltiples pagos
- notas de crédito
- reapertura de tickets

## Modelo de datos
### Cambio principal
`PaymentReversal` pasa de relación 1-0..1 con `Payment` a relación 1-N.

### Ajustes
- quitar unicidad de `paymentId`
- mantener índices por `companyId`, `ticketId`, `paymentId`, `createdById`
- cada reverso conserva `amount`, `reason`, `createdById`

## Regla financiera por pago
Para cada pago:
- `originalAmount = payment.amount`
- `reversedAmount = suma(paymentReversals.amount)`
- `remainingReversibleAmount = payment.amount - reversedAmount`

Si un nuevo reverso excede el remanente reversible:
- responder `409`

## Endpoint nuevo
- `POST /companies/:companyId/branches/:branchId/tickets/:ticketId/payments/:paymentId/reversals`

## Payload
- `amount`
- `reason`

## Respuesta esperada
- reverso creado
- pago afectado
- resumen del pago:
  - `originalAmount`
  - `reversedAmount`
  - `remainingReversibleAmount`
- resumen financiero del ticket:
  - `paidGrossTotal`
  - `reversedTotal`
  - `paidNetTotal`

## Reglas de negocio
### Validaciones base
1. ticket existe y pertenece a empresa y sede
2. payment existe y pertenece a ese ticket
3. `amount > 0`
4. `reason` requerido
5. `amount <= remainingReversibleAmount`

### Permisos
- `SUPERADMIN`
- `ADMIN_EMPRESA`
- `ADMIN_SEDE`

### Reglas importantes
1. un pago puede tener varios reversos parciales
2. nunca se puede exceder el monto original del pago
3. pagos originales no se mutan
4. el ticket siempre refleja pagado neto correcto
5. si un pago queda totalmente reversado, su remanente queda en `0`

## Compatibilidad con cancelación completa
La cancelación completa con reversos debe seguir funcionando.

Si un pago ya tiene reversos parciales:
- el sistema crea sólo el reverso restante de ese pago
- no duplica monto ya reversado
- si ya no queda nada reversible en ningún pago, debe rechazar el flujo

## Lecturas afectadas
Deben actualizarse las lecturas que hoy asumen un solo reverso por pago.

Especialmente:
- `listTickets`
- `getTicketDetail`
- resúmenes financieros de ticket

Ahora deben sumar `paymentReversals[]` por pago y por ticket.

## Backend a tocar
- `prisma/schema.prisma`
- nueva migración Prisma
- `src/modules/operations/operations.schemas.ts`
- `src/modules/operations/operations.controller.ts`
- `src/modules/operations/operations.routes.ts`
- `src/modules/operations/operations.service.ts`

## Errores esperados
- `400` payload inválido
- `403` sin permisos
- `404` ticket o payment no encontrado
- `409` monto excede remanente reversible
- `409` ticket ya cancelado si aplica
- `409` ticket sin monto reversible restante en cancelación completa

## Implementación sugerida
1. migración Prisma para permitir múltiples reversos por pago
2. ajustar lecturas financieras
3. agregar endpoint de reverso parcial por pago
4. adaptar cancelación completa para completar sólo remanentes
5. agregar tests al final

## Self-review
- Sin placeholders
- Alcance acotado a reverso parcial por pago
- Compatible con el flujo actual de cancelación completa
