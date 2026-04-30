# Diseño de tests de overtime de alquiler fase 4 para operations

Fecha: 2026-04-30

## Objetivo
Agregar una cuarta tanda corta de tests automatizados para cubrir overtime de alquiler con `TIME_UNIT` y redondeo hacia arriba.

## Caso a cubrir
Reserva:
- `reservedMinutes = 60`
- `timeUnitMinutes = 60`
- `basePrice = 100`

Uso real:
- `usedMinutes = 90`

Resultado esperado:
- `baseAmount = 100`
- `overtimeMinutes = 30`
- `overtimeAmount = 100`
- `totalAmount = 200`
- `ticket.total = 200`

## Alcance
### Service
1. iniciar alquiler
2. finalizar alquiler a los 90 minutos
3. validar cálculo de overtime y total del ticket

### HTTP
1. iniciar alquiler por endpoint
2. finalizar alquiler con overtime por endpoint
3. validar montos recalculados

## No incluye
- `BLOCK` pricing
- múltiples bloques extra en un mismo test
- pago y cierre en este mismo caso
- descuentos sobre rental con overtime

## Criterios de éxito
- cálculo de overtime queda protegido en service y HTTP
- `npm test` sigue pasando
- `npm run build` sigue pasando
- se actualiza el doc de progreso

## Self-review
- Sin placeholders
- Alcance corto y enfocado en el caso más importante primero
