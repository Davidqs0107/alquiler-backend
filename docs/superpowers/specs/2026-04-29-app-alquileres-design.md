# Diseño de BD — App de alquileres

Fecha: 2026-04-29

## Objetivo
Diseñar la base de datos inicial para una app de alquileres y ventas con:
- multiempresa
- multisede
- aislamiento total entre empresas
- superadmin global
- alquiler de recursos por tiempo
- cobro de exceso
- venta de productos/servicios sin inventario
- operación unificada en un solo ticket
- PostgreSQL + Prisma

## Decisiones principales
- Arquitectura multiempresa con aislamiento por `companyId`
- Cada empresa administra sus propias sedes, usuarios, recursos, tarifas, tickets y pagos
- Solo `SUPERADMIN` puede crear empresas
- Un ticket puede mezclar alquileres, productos, extras y cargos manuales
- El uso real del recurso se modela separado del cobro
- Enfoque Prisma balanceado: modelos explícitos, poco uso de JSON

## Alcance del MVP
### Organización
- `User`
- `Company`
- `Branch`
- `CompanyUser`
- `BranchUser`

### Alquileres
- `ResourceCategory`
- `Resource`

### Tarifas
- `RatePlan`
- `RatePlanRule`

### Operación comercial
- `Ticket`
- `TicketItem`
- `RentalSession`
- `Payment`

### Ventas sin inventario
- `SaleCatalogItem`

## Reglas de negocio
1. `SUPERADMIN` es el único rol global con alcance total
2. Una empresa no tiene relación con otra
3. Todas las tablas operativas deben llevar `companyId`
4. La mayoría de tablas operativas también deben llevar `branchId`
5. Los alquileres guardan inicio, fin programado, fin real y duración
6. El exceso se calcula automáticamente pero puede editarse
7. Se permite venta desde catálogo sin stock y venta manual libre
8. Un ticket puede combinar alquileres y ventas

## Enums propuestos
- `GlobalRole`: `SUPERADMIN`, `USER`
- `MembershipRole`: `ADMIN_EMPRESA`, `ADMIN_SEDE`, `CAJERO`, `RECEPCION`
- `RecordStatus`: `ACTIVE`, `INACTIVE`
- `PricingType`: `BLOCK`, `TIME_UNIT`
- `TicketStatus`: `OPEN`, `CLOSED`, `CANCELLED`
- `TicketItemType`: `RENTAL`, `PRODUCT`, `EXTRA`, `MANUAL`
- `RentalSessionStatus`: `RESERVED`, `IN_USE`, `FINISHED`, `CANCELLED`
- `CatalogItemType`: `PRODUCT`, `SERVICE`
- `PaymentMethod`: `CASH`, `CARD`, `TRANSFER`, `DIGITAL_WALLET`, `OTHER`

## Modelos y propósito
### User
Usuario del sistema. Puede ser superadmin global o usuario normal con membresías por empresa/sede.

### Company
Empresa aislada dentro del sistema.

### Branch
Sede perteneciente a una empresa.

### CompanyUser
Asigna un usuario a una empresa con rol empresarial.

### BranchUser
Asigna un usuario a una sede con rol operativo.

### ResourceCategory
Tipo de recurso alquilable, por ejemplo cuarto, piscina, gym, cancha o billar.

### Resource
Unidad concreta alquilable, por ejemplo Cancha 1 o Cuarto 2.

### RatePlan
Plan tarifario aplicable por sede, categoría o recurso específico.

### RatePlanRule
Reglas horarias o por día para ajustar precios dentro de un plan.

### Ticket
Documento comercial principal de la operación.

### TicketItem
Línea del ticket. Puede representar alquiler, producto, extra o cargo manual.

### RentalSession
Control operativo del uso real del recurso: tiempos, exceso y montos calculados.

### Payment
Pagos asociados a un ticket. Debe soportar uno o varios pagos por ticket.

### SaleCatalogItem
Producto o servicio vendible sin manejo de inventario.

## Relaciones
- `Company 1-N Branch`
- `User 1-N CompanyUser`
- `User 1-N BranchUser`
- `Company 1-N CompanyUser`
- `Branch 1-N BranchUser`
- `Company 1-N ResourceCategory`
- `Company 1-N Resource`
- `Branch 1-N Resource`
- `ResourceCategory 1-N Resource`
- `Company 1-N RatePlan`
- `RatePlan 1-N RatePlanRule`
- `Company 1-N Ticket`
- `Branch 1-N Ticket`
- `Ticket 1-N TicketItem`
- `TicketItem 1-0..1 RentalSession`
- `Resource 1-N RentalSession`
- `Ticket 1-N Payment`
- `Company 1-N SaleCatalogItem`

## Reglas de prioridad para tarifas
Aplicar por este orden:
1. tarifa específica del recurso
2. tarifa de la categoría
3. tarifa general de la sede

## Reglas de persistencia importantes
- `TicketItem` debe guardar snapshot de descripción, precio unitario, cantidad y subtotal
- `RentalSession` debe guardar snapshot de tarifa aplicada, minutos reservados, minutos usados, exceso y montos
- Los montos deben almacenarse como `Decimal`/`numeric` en PostgreSQL
- `metadata` en `TicketItem` puede ser `Json?` para flexibilidad controlada

## Unicidad recomendada
- `Company.slug` único
- `Branch` único por empresa: `[companyId, name]`
- `ResourceCategory` único por empresa: `[companyId, name]`
- `Resource` único por sede: `[branchId, name]`
- `Ticket` único por sede: `[branchId, ticketNumber]`

## Índices recomendados
- `[companyId]`
- `[companyId, branchId]`
- `[ticketId]`
- `[resourceId, startAt, scheduledEndAt]`
- `[status]`
- `[openedAt]`

## Flujo operativo principal
1. Superadmin crea empresa
2. Empresa crea sedes y usuarios
3. Empresa crea categorías, recursos y tarifas
4. Cajero o recepción abre ticket
5. Agrega líneas de alquiler o venta
6. Si la línea es alquiler, crea `RentalSession`
7. Al finalizar, calcula exceso si existe
8. Registra uno o varios pagos
9. Cierra ticket

## ER resumido
- `Ticket` concentra el cobro
- `RentalSession` concentra el uso real del recurso
- `Payment` concentra los abonos o pagos finales

## Recomendación final
El siguiente paso es implementar un `schema.prisma` MVP basado en este diseño y luego crear las primeras migraciones de PostgreSQL.

## Self-review
- Sin placeholders
- Sin contradicciones detectadas
- Alcance enfocado a MVP de BD
- Reglas clave explicitadas
