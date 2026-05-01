# App de Alquileres — Documento para Frontend

## Descripción General del Sistema

Sistema REST multiempresa para gestión de alquileres y ventas. Cada empresa opera en isolation completo con múltiples sedes. El flujo operativo central gira alrededor de **tickets** que pueden combinar alquileres de recursos y venta de productos/servicios.

---

## Stack Tecnológico

- **Frontend**: React / Next.js (a definir)
- **Backend**: Node.js + TypeScript + Express (ya implementado)
- **Base de datos**: PostgreSQL + Prisma
- **Autenticación**: JWT (email + password)

---

## Modelo de Datos

### Entidades Principales

| Entidad | Descripción |
|---------|-------------|
| **Company** | Empresa aislada en el sistema |
| **Branch** | Sede dentro de una empresa |
| **User** | Usuario global (puede ser superadmin) |
| **CompanyUser** | Relación usuario-empresa con rol |
| **BranchUser** | Relación usuario-sede con rol |
| **ResourceCategory** | Categoría de recurso (ej: "Cancha de fútbol", "Gimnasio") |
| **Resource** | Recurso alquilable concreto (ej: "Cancha 1", "Cuarto 2") |
| **RatePlan** | Plan tarifario por sede/categoría/recurso |
| **RatePlanRule** | Reglas de precio (por hora, por día, bloques) |
| **Ticket** | Documento comercial principal |
| **TicketItem** | Línea del ticket (alquiler, producto, extra, manual) |
| **RentalSession** | Control operativo del uso real del recurso |
| **Payment** | Pagos asociados al ticket |
| **PaymentReversal** | Reversos de pagos |
| **SaleCatalogItem** | Producto/servicio del catálogo |

---

## Roles del Sistema

| Rol | Alcance |
|-----|---------|
| `SUPERADMIN` | Total, global |
| `ADMIN_EMPRESA` | Nivel de empresa |
| `ADMIN_SEDE` | Nivel de sede |
| `CAJERO` | Operación de caja |
| `RECEPCION` | Recepción y alquileres |

---

## Flujo Operativo Principal

```
1. Usuario inicia sesión → JWT
2. Cajero/Recepción abre un Ticket en una sede
3. Se agregan líneas al ticket:
   - Alquiler → crea RentalSession asociada
   - Producto del catálogo
   - Extra o cargo manual
4. Se registran uno o varios pagos
5. Se cierra el ticket
```

---

## Reglas de Negocio Clave

1. **Multiempresa**: cada empresa tiene sus propios datos aislados
2. **Multisede**: cada sede tiene sus propios recursos, tarifas y tickets
3. **Solapamiento prohibido**: no se permiten alquileres con horarios que se superpongan
4. **Tickets**: no se cierran si hay saldo pendiente o sesiones activas
5. **Reversos**: pagos originales nunca se mutan; los reversos van en tabla separada
6. **Tarifas con prioridad**: recurso > categoría > sede

---

## Endpoints API Principales

### Autenticación
- `POST /auth/login` — Iniciar sesión
- `GET /auth/me` — Usuario autenticado

### Empresas y Sedes
- `POST /companies` — Crear empresa + sede principal + admin
- `GET /companies` — Listar empresas
- `POST /companies/:companyId/branches` — Crear sede adicional

### Miembros
- `POST /companies/:companyId/members` — Crear miembro de empresa
- `GET /companies/:companyId/members` — Listar miembros
- `POST /companies/:companyId/branches/:branchId/members` — Crear miembro de sede
- `GET /companies/:companyId/branches/:branchId/members` — Listar miembros de sede

### Recursos y Tarifas
- `POST /companies/:companyId/categories` — Crear categoría
- `GET /companies/:companyId/categories` — Listar categorías
- `PATCH /companies/:companyId/categories/:categoryId/branches/:branchId/visibility` — Visibilidad por sede
- `POST /companies/:companyId/branches/:branchId/resources` — Crear recurso
- `GET /companies/:companyId/branches/:branchId/resources` — Listar recursos
- `POST /companies/:companyId/branches/:branchId/rate-plans` — Crear tarifa
- `GET /companies/:companyId/branches/:branchId/rate-plans` — Listar tarifas

### Catálogo
- `POST /companies/:companyId/catalog-items` — Crear ítem
- `GET /companies/:companyId/catalog-items` — Listar (con filtros)
- `PATCH /companies/:companyId/catalog-items/:catalogItemId` — Editar
- `POST /companies/:companyId/catalog-items/:catalogItemId/activate` — Activar
- `POST /companies/:companyId/catalog-items/:catalogItemId/deactivate` — Inactivar

### Operaciones (Flujo Principal)
- `POST /companies/:companyId/branches/:branchId/tickets` — Abrir ticket
- `GET /companies/:companyId/branches/:branchId/tickets` — Listar tickets
- `GET /companies/:companyId/branches/:branchId/tickets/:ticketId` — Detalle de ticket
- `POST /companies/:companyId/branches/:branchId/rentals/start` — Iniciar alquiler directo
- `POST /companies/:companyId/branches/:branchId/tickets/:ticketId/rentals` — Agregar alquiler a ticket
- `POST /companies/:companyId/branches/:branchId/rentals/:rentalSessionId/finish` — Finalizar alquiler
- `POST /companies/:companyId/branches/:branchId/tickets/:ticketId/payments` — Registrar pago
- `POST /companies/:companyId/branches/:branchId/tickets/:ticketId/close` — Cerrar ticket

### Cancelaciones y Reversos
- `POST /companies/:companyId/branches/:branchId/tickets/:ticketId/items/:ticketItemId/cancel` — Cancelar línea
- `POST /companies/:companyId/branches/:branchId/tickets/:ticketId/cancel` — Cancelar ticket sin pagos
- `POST /companies/:companyId/branches/:branchId/tickets/:ticketId/cancel-with-reversal` — Cancelar ticket con reversos
- `POST /companies/:companyId/branches/:branchId/tickets/:ticketId/payments/:paymentId/reversals` — Reverso parcial por pago
- `POST /companies/:companyId/branches/:branchId/rentals/:rentalSessionId/cancel` — Cancelar sesión rental

---

## Tipos de Datos (Enums)

```typescript
GlobalRole: SUPERADMIN | USER
MembershipRole: ADMIN_EMPRESA | ADMIN_SEDE | CAJERO | RECEPCION
RecordStatus: ACTIVE | INACTIVE
PricingType: BLOCK | TIME_UNIT
TicketStatus: OPEN | CLOSED | CANCELLED
TicketItemType: RENTAL | PRODUCT | EXTRA | MANUAL
RentalSessionStatus: RESERVED | IN_USE | FINISHED | CANCELLED
CatalogItemType: PRODUCT | SERVICE
PaymentMethod: CASH | CARD | TRANSFER | DIGITAL_WALLET | OTHER
```

---

## Patrón de URLs

Todas las rutas operativas siguen el patrón:
```
/companies/:companyId/branches/:branchId/...
```

Las rutas de autenticación y datos propios del usuario no llevan companyId.

---

## Autenticación

El backend usa JWT. El frontend debe:
1. Guardar el token (localStorage o httpOnly cookie)
2. Enviarlo en header `Authorization: Bearer <token>` en todas las requests
3. Manejar 401 para hacer logout y redirigir a login

---

## Consideraciones para el Frontend

1. **Multi-tenant**: siempre tener en cuenta la empresa y sede seleccionada
2. **Snapshot de datos**: TicketItem y RentalSession guardan el estado en el momento de creación (precio, descripción, etc.)
3. **Decimal**: montos almacenados como Decimal en PostgreSQL, manejar con cuidado en JavaScript
4. **Estado de tickets**: OPEN → CLOSED o CANCELLED (no volver a OPEN)
5. **Sesiones activas**: no se puede cerrar ticket con sesiones IN_USE

---

## Screens Principales a Implementar

1. **Login** — Email + password
2. **Dashboard** — Selección de empresa/sede
3. **Gestión de recursos** — CRUD de categorías y recursos
4. **Gestión de tarifas** — Crear y editar planes tarifarios
5. **Catálogo** — CRUD de productos/servicios
6. **Punto de venta** — Abrir ticket, agregar líneas, procesar pagos
7. **Cierre de ticket** — Ver detalle, pagar, cerrar
8. **Cancelaciones** — Cancelar líneas, tickets, generar reversos
9. **Reportes** — Tickets abiertos/cerrados, pagos, alquileres

---

## Para Más Detalle

Ver `docs/superpowers/specs/2026-04-29-app-alquileres-design.md` para el diseño completo de la base de datos.