# Progreso backend — alquileres

Fecha: 2026-05-01

## Estado actual
El backend sigue bastante avanzado a nivel funcional y la base del sistema ya está implementada para:
- multiempresa y membresías
- recursos, categorías y tarifas
- operaciones de tickets/alquileres/pagos
- catálogo de venta
- descuentos, cancelaciones simples y cancelaciones con reversos
- reversos parciales por pago
- cancelación de sesiones rental con reversos automáticos
- seed inicial para poblar ambiente de prueba
- endpoint para listar sedes por empresa
- CORS configurado para frontend local y despliegue

## Situación real verificada hoy
A nivel de código, el sistema llega hasta la fase operacional con reversos y cobertura de tests escrita.

Pero en este entorno actual **no quedó validado como “listo” al re-ejecutar** porque aparecieron dos bloqueos operativos:
- `npm run build` falla con `Cannot find module 'cors'`
- `npm test` falla primero por ese mismo módulo faltante y luego porque PostgreSQL no está corriendo en `localhost:5432`

O sea: la implementación está presente en el repo, pero el ambiente local necesita ajuste antes de volver a confirmar build + tests passing.

## Stack base implementado
- Node.js
- TypeScript
- Express
- PostgreSQL
- Prisma
- JWT
- Docker Compose
- CORS

## Infra y base técnica
- `docker-compose.yml` con PostgreSQL
- `.env.example`
- Prisma configurado
- migraciones creadas hasta reversos parciales
- script CLI para crear `SUPERADMIN`
- script `seed` para datos demo
- middleware de autenticación JWT
- manejo centralizado de errores

## Backend base implementado
- healthcheck
- login con email/password
- JWT access token
- endpoint `GET /auth/me`
- middleware de autenticación
- script CLI para crear `SUPERADMIN`
- seed inicial con empresa, sede, usuarios, categorías, recursos, tarifas y catálogo

## Módulos implementados
### 1. Multiempresa
- crear empresa
- crear sede principal en la misma operación
- crear `ADMIN_EMPRESA` inicial en la misma operación
- listar empresas
- ver detalle de empresa
- crear sedes adicionales
- listar sedes por empresa

### 2. Miembros
- crear miembros de empresa
- crear miembros de sede
- listar miembros por empresa
- listar miembros por sede

### 3. Categorías, recursos y tarifas
- crear categorías por empresa
- listar categorías
- ocultar categoría por sede
- crear recursos por sede
- listar recursos por sede
- crear tarifas por sede
- listar tarifas por sede

### 4. Tickets, alquileres y pagos
- abrir ticket manual por sede
- listar tickets por sede
- ver detalle de ticket
- iniciar alquiler directo creando ticket + línea + sesión
- agregar alquiler a ticket abierto
- finalizar sesión de alquiler
- registrar pagos parciales o totales
- cerrar ticket validando saldo y sesiones activas

### 5. Fase 2 operacional
- crear catálogo de venta (`SaleCatalogItem`)
- listar catálogo por empresa
- agregar ítem de catálogo a ticket abierto
- agregar línea manual a ticket abierto
- agregar línea extra a ticket abierto
- aplicar descuento por línea
- aplicar descuento global al ticket
- cancelar línea no pagada
- cancelar ticket completo sin pagos

### 6. Mantenimiento de catálogo
- editar ítems de catálogo
- activar/inactivar catálogo
- listar catálogo con filtros por `status`, `branchId`, `type` y búsqueda por nombre

### 7. Cancelación avanzada con reversos
- cancelar ticket completo con pagos
- generar reverso por cada pago asociado
- exponer lectura financiera con `paidGrossTotal`, `reversedTotal` y `paidNetTotal`
- reversos parciales por pago específico
- múltiples reversos parciales por pago hasta agotar remanente reversible
- cancelación avanzada de sesiones de alquiler con reversos automáticos FIFO

### 8. Tests automatizados escritos para operations
- runner de tests con `tsx --test`
- suite de servicio con PostgreSQL real para reglas críticas de `operations`
- smoke tests HTTP para creación de ticket, pagos, descuentos, cierres y cancelaciones
- helpers reutilizables de cleanup y factories para tests
- cobertura de permisos
- cobertura de happy path rental y venta
- cobertura de overtime
- cobertura de descuentos
- cobertura de cancelaciones simples
- cobertura de filtros de catálogo
- cobertura de reversos parciales por pago
- cobertura de cancelación de sesiones rental con reversos

## Reglas ya aplicadas
- categorías por empresa
- visibles en todas las sedes por defecto
- se pueden ocultar por sede
- si una categoría se oculta en una sede, sus recursos no se muestran ni se usan allí
- recursos por sede
- tarifas por sede
- prioridad de tarifa: recurso > categoría > sede
- flujo híbrido de operaciones: ticket manual o inicio directo de alquiler
- no se permite alquilar recursos ocupados o con solapamiento activo
- los tickets no cierran con saldo pendiente
- los tickets no cierran con sesiones activas
- todo cobro adicional entra como `TicketItem`
- descuentos por línea y por ticket recalculan montos netos
- cancelaciones simples solo se permiten en tickets sin pagos
- tickets cancelados no aceptan nuevas operaciones
- líneas `RENTAL` no se cancelan libremente en la fase simple
- catálogo se puede editar sin romper historial de ventas
- catálogo se puede activar/inactivar sin borrar trazabilidad
- listado de catálogo soporta filtros por estado, sede, tipo y búsqueda textual
- cancelación avanzada de ticket con pagos crea reversos dedicados por pago
- pagos permiten múltiples reversos parciales acumulados
- el sistema rechaza reversos que excedan el remanente reversible del pago
- pagos originales se preservan y no se mutan para reversar
- lectura financiera del ticket distingue pagado bruto, reversado y pagado neto
- cancelación de sesión rental rechaza `IN_USE` y doble cancelación
- `SUPERADMIN`, `ADMIN_EMPRESA`, `ADMIN_SEDE`, `CAJERO` y `RECEPCION` operan el módulo operacional según alcance

## Endpoints relevantes confirmados en código
- `GET /health`
- `POST /auth/login`
- `GET /auth/me`
- `POST /companies`
- `GET /companies`
- `GET /companies/:companyId`
- `POST /companies/:companyId/branches`
- `GET /companies/:companyId/branches`
- `POST /companies/:companyId/members`
- `GET /companies/:companyId/members`
- `POST /companies/:companyId/branches/:branchId/members`
- `GET /companies/:companyId/branches/:branchId/members`
- endpoints de `resources/*`
- endpoints de `operations/*`

## Archivos clave
- `prisma/schema.prisma`
- `src/app.ts`
- `src/modules/auth/*`
- `src/modules/companies/*`
- `src/modules/resources/*`
- `src/modules/operations/*`
- `src/scripts/create-superadmin.ts`
- `src/scripts/seed.ts`
- `docker-compose.yml`
- `tests/operations.service.test.ts`
- `tests/operations.http.test.ts`

## Últimos commits importantes
- `a5635b8` feat: bootstrap express prisma jwt backend
- `420cad5` feat: add multiempresa module endpoints
- `e57498e` feat: add company and branch memberships management
- `5f02429` feat: add categories resources and rate plans module
- `b7b207f` feat: add tickets rentals payments operations module
- `57a3f55` feat: add phase 2 catalog discounts and cancellations
- `d6a3770` feat: add catalog maintenance endpoints and filters
- `fe24353` feat: add ticket cancellation with payment reversals
- `8a93902` feat: add partial payment reversals
- `7401bc5` feat: add rental session cancellation with reversals
- `cf2fb11` feat: implement partial payment reversals and rental session cancellation with automatic reversals
- `423e8b4` feat: add CORS support and new endpoints for listing branches in companies

## Último punto alcanzado
Funcionalmente, el repo ya llegó a:
- operaciones completas de alquiler/venta
- reversos parciales y cancelaciones avanzadas
- cancelación de rental sessions con reversos automáticos
- endpoint de listado de sedes por empresa
- integración básica pensada para frontend vía CORS

## Bloqueos actuales para retomar
1. instalar o corregir dependencias para que `cors` esté realmente disponible en el entorno local
2. levantar PostgreSQL (`docker compose up -d`)
3. correr migraciones si hace falta
4. volver a ejecutar `npm run build`
5. volver a ejecutar `npm test`
6. recién ahí reconfirmar el número real de tests passing en este entorno

## Próximo paso recomendado
Primero estabilizar el ambiente local y revalidar:
- `npm install`
- `docker compose up -d`
- `npx prisma migrate deploy` o flujo equivalente
- `npm run build`
- `npm test`

Si eso queda verde, el siguiente frente natural es:
- mejorar cobertura en módulos no testeados fuera de `operations`
- empezar/integrar frontend
- agregar más endpoints de consulta operativa según necesidad de UI

## Nota para retomar
Al volver, revisar primero:
1. dependencias instaladas correctamente
2. que PostgreSQL esté corriendo
3. que Prisma conecte
4. que `npm run build` pase
5. que `npm test` pase
6. luego hacer smoke test manual del flujo principal
