# Diseño de tests happy path de alquiler fase 3 para operations

Fecha: 2026-04-30

## Objetivo
Agregar una tercera tanda corta de tests automatizados para cubrir el happy path principal de alquiler sin overtime.

## Decisión principal
Se adopta un enfoque **mixto corto**:
- test de servicio para validar el flujo completo y los montos
- smoke test HTTP para confirmar la integración del flujo principal

## Alcance
### Service
1. `startRental` crea ticket abierto, línea `RENTAL`, sesión `RESERVED` y total inicial correcto
2. `finishRental` dentro del tiempo reservado marca sesión `FINISHED`, deja `overtimeMinutes = 0` y recalcula correctamente
3. `createPayment` por el total deja `pendingAmount = 0`
4. `closeTicket` cambia ticket a `CLOSED`

### HTTP smoke
1. flujo corto completo por endpoint:
- iniciar alquiler
- finalizar alquiler
- registrar pago
- cerrar ticket

## Assertions clave
- estados del ticket y de la sesión
- `baseAmount`
- `overtimeAmount = 0`
- `totalAmount`
- `paidNetTotal`
- `pendingAmount = 0`

## No incluye
- overtime
- descuentos sobre rentals
- cancelación operativa de alquiler
- múltiples rentals en un mismo ticket
- combinación con catálogo o extras

## Criterios de éxito
- queda protegido el flujo principal de alquiler
- `npm test` sigue pasando
- `npm run build` sigue pasando
- se actualiza el doc de progreso

## Self-review
- Sin placeholders
- Alcance corto y consistente con la fase previa
