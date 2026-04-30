# Diseño de tests happy path de venta fase 6 para operations

Fecha: 2026-04-30

## Objetivo
Agregar una sexta tanda corta de tests automatizados para cubrir el flujo principal de venta no-rental.

## Decisión principal
Se cubre el flujo representativo con catálogo, línea manual y extra en un mismo ticket.

## Alcance
### Service
1. crear catálogo base
2. crear ticket
3. agregar item de catálogo
4. agregar item manual
5. agregar item extra
6. validar subtotal y total acumulado
7. registrar pago total
8. cerrar ticket

### HTTP
1. crear catálogo
2. crear ticket
3. agregar catálogo
4. agregar manual
5. agregar extra
6. registrar pago
7. cerrar ticket

## Datos de referencia
- catálogo: 50
- manual: 100
- extra: 25
- total esperado: 175

## Assertions clave
- tipos de línea `PRODUCT`, `MANUAL`, `EXTRA`
- `ticket.total = 175`
- `paidNetTotal = 175`
- `pendingAmount = 0`
- ticket en `CLOSED`

## No incluye
- descuentos
- cancelaciones
- pagos parciales
- mezcla con rentals

## Criterios de éxito
- happy path de venta queda protegido en service y HTTP
- `npm test` sigue pasando
- `npm run build` sigue pasando
- se actualiza el doc de progreso

## Self-review
- Sin placeholders
- Alcance corto y representativo del flujo de venta no-rental
