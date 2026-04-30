# Diseño de tests de permisos fase 2 para operations

Fecha: 2026-04-30

## Objetivo
Agregar una segunda tanda corta de tests automatizados para validar los boundaries de permisos más importantes del módulo `operations`.

## Decisión principal
Se adopta un enfoque **mixto corto**:
- tests de servicio para confirmar reglas de acceso reales
- pocos tests HTTP para confirmar que los endpoints aplican esas reglas correctamente

## Alcance
Incluye:
- cobertura de operaciones normales vs acciones sensibles
- validación de roles permitidos y rechazados en casos representativos
- extensión de factories si hace falta para membresías de empresa y sede
- actualización del doc de progreso

## No incluye
- matrix completa por todos los endpoints
- cobertura exhaustiva de permisos para catálogo
- todas las combinaciones de estados inactivos
- permisos detallados de todos los módulos

## Boundary a proteger
### Operaciones normales
Deben permitir:
- `SUPERADMIN`
- `ADMIN_EMPRESA`
- `ADMIN_SEDE`
- `CAJERO`
- `RECEPCION`

Deben rechazar:
- usuario sin membresía activa
- usuario con rol global `USER` sin acceso en empresa o sede

### Acciones sensibles
Deben permitir:
- `SUPERADMIN`
- `ADMIN_EMPRESA`
- `ADMIN_SEDE`

Deben rechazar:
- `CAJERO`
- `RECEPCION`
- usuario sin membresía activa

## Flujos representativos
### Operación normal representativa
- `createTicket`

### Acción sensible representativa
- `cancelTicketWithReversal`

## Cobertura propuesta
### Service
1. `CAJERO` puede crear ticket
2. `RECEPCION` puede crear ticket
3. usuario sin membresía no puede crear ticket
4. `ADMIN_EMPRESA` puede cancelar con reverso
5. `ADMIN_SEDE` puede cancelar con reverso
6. `CAJERO` no puede cancelar con reverso
7. `RECEPCION` no puede cancelar con reverso

### HTTP smoke de permisos
1. endpoint normal acepta `CAJERO`
2. endpoint sensible rechaza `CAJERO`
3. endpoint sensible acepta `ADMIN_SEDE`

## Estrategia de implementación
- reutilizar setup y cleanup existentes
- reutilizar factories actuales y extenderlas con memberships explícitas donde haga falta
- mantener los casos pequeños y con datos mínimos
- preparar ticket con pago sólo en los casos que ejercen `cancelTicketWithReversal`

## Criterios de éxito
- queda validada la separación entre operación normal y acción sensible
- la suite sigue corta y mantenible
- `npm test` sigue pasando
- `npm run build` sigue pasando
- el progress doc queda actualizado

## Self-review
- Sin placeholders
- Alcance acotado
- Cubre los boundaries más importantes sin expandirse a una matrix grande
