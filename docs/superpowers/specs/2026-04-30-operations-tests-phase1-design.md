# Diseño de primera tanda de tests automatizados para operations

Fecha: 2026-04-30

## Objetivo
Agregar una primera suite automatizada para el módulo `operations` que proteja reglas de negocio críticas y valide el wiring básico HTTP.

## Decisión principal
Se adopta un enfoque **mixto mínimo**:
- pocos tests HTTP de humo
- cobertura principal en `operations.service.ts`
- ejecución contra PostgreSQL real de prueba usando Prisma real
- sin mocks de Prisma en esta fase

## Motivo de la decisión
Este enfoque da mejor balance entre:
- confianza alta en reglas transaccionales reales
- feedback razonablemente rápido
- menor fragilidad que una suite grande sólo HTTP
- menor ceguera que una suite sólo de servicio

## Alcance
Incluye:
- runner de tests en TypeScript
- script `npm test`
- setup reutilizable para tests
- limpieza de datos entre casos
- factories mínimas para preparar datos
- tests de servicio enfocados en reglas críticas
- tests HTTP smoke del módulo `operations`
- validación final con `npm run build`
- actualización del documento de progreso

## No incluye
- cobertura completa de todos los endpoints
- matriz completa de permisos y roles
- mocks de Prisma
- CI/CD
- performance testing
- fixtures complejas o seeds masivas
- cobertura total de flujos felices

## Estrategia general
### Capa principal a cubrir
La mayor parte de la lógica crítica vive en:
- `src/modules/operations/operations.service.ts`

Por eso la suite principal se centrará allí.

### Capa secundaria a cubrir
Se agregarán pocos tests HTTP para confirmar:
- rutas conectadas
- validación básica activa
- middlewares y controladores integrados
- app importable para pruebas sin levantar proceso externo

## Base de datos de test
Se usará la base PostgreSQL de prueba ya disponible.

### Reglas para esta decisión
- los tests deben usar Prisma real
- las transacciones deben ejercerse de verdad
- los conflictos de integridad deben detectarse igual que en runtime real

### Riesgos controlados
Para evitar contaminación entre tests:
- limpiar tablas antes o después de cada caso
- crear datos mínimos por test
- no compartir fixtures mutables entre casos

## Estructura propuesta
### Archivos a tocar
- `package.json`
- `tsconfig.json` si hace falta ajuste menor para tests
- `src/app.ts` sólo si hiciera falta facilitar import estable para pruebas
- `docs/superpowers/progress/2026-04-29-backend-progress.md`

### Archivos nuevos sugeridos
- `tests/setup.ts`
- `tests/helpers/db.ts`
- `tests/helpers/factories.ts`
- `tests/operations.service.test.ts`
- `tests/operations.http.test.ts`

## Infraestructura de tests
### Runner
Agregar un runner liviano compatible con TypeScript y Node actual del proyecto.

### Script npm
Agregar al menos:
- `test`

Opcionalmente se puede dejar preparado luego:
- `test:watch`
- `test:run`

Pero en esta fase sólo `test` es obligatorio.

## Setup y limpieza
### `tests/setup.ts`
Responsabilidades:
- inicializar entorno de test
- registrar hooks globales si el runner lo permite
- cerrar Prisma al terminar

### `tests/helpers/db.ts`
Responsabilidades:
- limpieza ordenada de tablas
- utilidades para reset mínimo de estado

### Orden de limpieza
Debe respetar dependencias relacionales para evitar errores por FKs.

La limpieza debe contemplar al menos entidades relacionadas con:
- `PaymentReversal`
- `Payment`
- `RentalSession`
- `TicketItem`
- `Ticket`
- `RatePlan`
- `Resource`
- `BranchCategoryVisibility`
- `ResourceCategory`
- `SaleCatalogItem`
- `BranchUser`
- `CompanyUser`
- `Branch`
- `Company`
- `User`

Si aparecen restricciones adicionales, el helper debe centralizar el orden correcto.

## Factories mínimas
### `tests/helpers/factories.ts`
Debe exponer creadores pequeños y explícitos para preparar lo justo en cada caso.

Factories mínimas esperadas:
- empresa activa
- sede activa
- usuario
- membresía de empresa o sede
- categoría activa
- recurso activo
- tarifa activa
- ticket abierto
- pago asociado

### Principios de factories
- devolver entidades creadas ya listas para usar
- permitir overrides sólo en campos necesarios
- evitar crear grafos más grandes de lo necesario
- mantener nombres y defaults simples

## Suite de servicio
### Archivo
- `tests/operations.service.test.ts`

### Casos a cubrir primero
1. rechaza alquiler con recurso ocupado o solapado
2. rechaza pago mayor al pendiente
3. rechaza cierre de ticket con saldo pendiente
4. rechaza cierre de ticket con sesión activa
5. rechaza segunda cancelación con reverso sobre el mismo ticket
6. rechaza cancelación simple si el ticket ya tiene pagos

### Intención de estos casos
Cubrir primero las reglas que más fácilmente rompen caja, disponibilidad o consistencia operativa.

## Suite HTTP smoke
### Archivo
- `tests/operations.http.test.ts`

### Casos mínimos
1. `POST /companies/:companyId/branches/:branchId/tickets` crea ticket correctamente
2. `POST /companies/:companyId/branches/:branchId/tickets/:ticketId/payments` registra pago correctamente
3. `POST /companies/:companyId/branches/:branchId/tickets/:ticketId/cancel-with-reversal` cancela ticket con reversos correctamente

### Objetivo de estos smoke tests
No buscan cubrir todas las variantes, sino confirmar que:
- routing funciona
- auth/wiring básico está conectado
- controladores llaman a servicios correctamente
- serialización de respuestas principales sigue viva

## Datos y autenticación en tests HTTP
Los tests HTTP deben preparar usuarios y credenciales de forma que puedan invocar la app real en memoria.

Si el proyecto ya expone login reutilizable, puede usarse.

Si resulta más estable emitir JWTs de prueba con la misma utilidad interna del proyecto, también es válido, siempre que no se altere el comportamiento productivo.

La decisión concreta debe favorecer menor fricción y mayor estabilidad.

## Reutilización de la app
Se debe reutilizar `src/app.ts` para pruebas HTTP.

No se debe depender de levantar `src/server.ts` ni abrir puerto real si no es necesario.

Si hiciera falta un ajuste pequeño para facilitar importación o composición de middleware, debe ser:
- pequeño
- compatible hacia atrás
- sin cambiar comportamiento en producción

## Manejo de errores esperado en assertions
Los tests de servicio deben verificar preferentemente:
- tipo de error esperado si ya existe una clase de error uniforme
- código HTTP lógico o status equivalente cuando aplique
- mensaje relevante sólo cuando aporte valor y no vuelva frágil el test

## Criterios de éxito
La primera tanda se considera completa cuando:
- existe `npm test`
- la suite corre localmente contra PostgreSQL real
- la DB se limpia automáticamente entre casos
- los 6 casos críticos de servicio quedan cubiertos
- los 3 smoke tests HTTP quedan cubiertos
- `npm run build` sigue pasando
- el doc de progreso queda actualizado

## Orden de implementación
1. agregar dependencias y script de test
2. crear setup global y cleanup DB
3. crear factories mínimas
4. escribir tests de servicio críticos
5. escribir smoke tests HTTP
6. ejecutar tests y corregir issues de setup
7. correr `npm run build`
8. actualizar `docs/superpowers/progress/2026-04-29-backend-progress.md`

## Riesgos principales
### 1. Limpieza incompleta de DB
Mitigación:
- centralizar cleanup en helper único
- borrar en orden controlado

### 2. Fixtures demasiado pesadas
Mitigación:
- factories mínimas
- un caso crea sólo lo que usa

### 3. Fragilidad por depender de mensajes exactos
Mitigación:
- afirmar status/tipo/condición de fallo antes que textos completos

### 4. Dificultad para auth en HTTP tests
Mitigación:
- reutilizar utilidades internas existentes
- evitar hacks que dupliquen lógica innecesariamente

## Resultado esperado
Al terminar esta fase, el proyecto tendrá una base confiable de tests automatizados para `operations` enfocada en reglas operativas críticas y en el wiring básico del módulo.

## Self-review
- Sin placeholders
- Alcance acotado a una primera tanda realista
- Prioriza reglas críticas sobre cobertura superficial
- Mantiene consistencia con el estado actual del proyecto y con la decisión de usar PostgreSQL real
