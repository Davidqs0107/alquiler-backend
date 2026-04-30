# Diseño de tests de descuentos fase 5 para operations

Fecha: 2026-04-30

## Objetivo
Agregar una quinta tanda corta de tests automatizados para cubrir descuentos por línea y descuentos globales del ticket.

## Decisión principal
Se adopta un enfoque mixto corto:
- tests de servicio para validar recálculo exacto
- smoke tests HTTP para confirmar integración

## Alcance
### Service
1. descuento por línea recalcula subtotal de línea y total del ticket
2. descuento global recalcula `discountAmount` y total del ticket
3. descuento por línea no puede exceder subtotal bruto
4. descuento global no puede exceder subtotal activo del ticket

### HTTP
1. endpoint de descuento por línea recalcula correctamente
2. endpoint de descuento global recalcula correctamente

## Datos de referencia
- línea manual de 100
- otra línea manual de 50
- descuento por línea de 20
- descuento global de 30

## Assertions clave
- `ticketItem.discountAmount`
- `ticketItem.subtotal`
- `ticket.discountAmount`
- `ticket.total`
- rechazo `409` cuando el descuento excede lo permitido

## No incluye
- descuentos sobre rentals con overtime
- combinaciones complejas de descuentos
- pago y cierre en los mismos tests
- cobertura exhaustiva de catálogo y extras en esta fase

## Criterios de éxito
- descuentos quedan protegidos en service y HTTP
- `npm test` sigue pasando
- `npm run build` sigue pasando
- se actualiza el doc de progreso

## Self-review
- Sin placeholders
- Alcance corto y enfocado en recálculo financiero
