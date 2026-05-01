# Alquiler Backend

Backend REST para el sistema de alquileres y ventas, construido con Node.js, TypeScript, Express, PostgreSQL y Prisma.

## Stack

- **Runtime**: Node.js
- **Lenguaje**: TypeScript
- **Framework HTTP**: Express
- **ORM**: Prisma
- **Base de datos**: PostgreSQL
- **Autenticación**: JWT (email + password)
- **Contenedor**: Docker Compose

## Inicio rápido

### Requisitos

- Node.js 20+
- Docker y Docker Compose
- npm o yarn

### 1. Levantar la base de datos

```bash
docker compose up -d
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Configurar entorno

Copia `.env.example` a `.env` y ajusta las variables si es necesario.

### 4. Generar cliente Prisma y correr migraciones

```bash
npx prisma generate
npx prisma migrate deploy
```

### 5. Crear el primer SUPERADMIN

```bash
npm run superadmin:create
```

### 6. Iniciar el servidor

```bash
npm run dev
```

El servidor queda disponible en `http://localhost:3000`.

## Scripts disponibles

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Iniciar servidor en modo desarrollo |
| `npm run build` | Compilar TypeScript |
| `npm run start` | Iniciar servidor en producción |
| `npm run superadmin:create` | Crear usuario SUPERADMIN via CLI |
| `npm test` | Ejecutar suite de tests automatizados |
| `npm run lint` | Ejecutar linter |

## Estructura del proyecto

```
src/
├── app.ts                    # Configuración de Express
├── server.ts                 # Punto de entrada
├── lib/
│   └── prisma.ts             # Cliente Prisma
├── middlewares/
│   ├── auth.middleware.ts    # Validación de JWT
│   ├── error.middleware.ts   # Manejo centralizado de errores
│   └── require-global-role.middleware.ts
├── modules/
│   ├── auth/                 # Login y autenticación
│   ├── companies/            # Multiempresa
│   ├── resources/            # Categorías, recursos y tarifas
│   └── operations/           # Tickets, alquileres, pagos y reversos
├── scripts/
│   └── create-superadmin.ts  # CLI para crear SUPERADMIN
└── utils/
    └── jwt.ts                # Utilidades JWT
```

## Modelo de datos

### Entidades principales

- **Company / Branch**: estructura multiempresa con sedes
- **User / CompanyUser / BranchUser**: membresías y roles por empresa y sede
- **ResourceCategory / Resource**: categorías y recursos alquilables
- **RatePlan / RatePlanRule**: tarifas por sede, categoría o recurso
- **Ticket / TicketItem**: documento comercial con líneas de cobro
- **RentalSession**: control operativo del uso real del recurso
- **Payment / PaymentReversal**: pagos y reversos parciales
- **SaleCatalogItem**: catálogo de productos y servicios

### Roles

- `SUPERADMIN`: acceso total al sistema
- `ADMIN_EMPRESA`: administración a nivel de empresa
- `ADMIN_SEDE`: administración a nivel de sede
- `CAJERO`: operación de caja
- `RECEPCION`: recepción y alquileres

## API principal

### Autenticación

- `POST /auth/login` — Iniciar sesión
- `GET /auth/me` — Datos del usuario autenticado

### Empresas y sedes

- `POST /companies` — Crear empresa + sede principal + admin
- `GET /companies` — Listar empresas
- `POST /companies/:companyId/branches` — Crear sede adicional

### Miembros

- `POST /companies/:companyId/members` — Crear miembro de empresa
- `GET /companies/:companyId/members` — Listar miembros de empresa
- `POST /companies/:companyId/branches/:branchId/members` — Crear miembro de sede
- `GET /companies/:companyId/branches/:branchId/members` — Listar miembros de sede

### Recursos y tarifas

- `POST /companies/:companyId/categories` — Crear categoría
- `GET /companies/:companyId/categories` — Listar categorías
- `PATCH /companies/:companyId/categories/:categoryId/branches/:branchId/visibility` — Visibilidad por sede
- `POST /companies/:companyId/branches/:branchId/resources` — Crear recurso
- `GET /companies/:companyId/branches/:branchId/resources` — Listar recursos
- `POST /companies/:companyId/branches/:branchId/rate-plans` — Crear tarifa
- `GET /companies/:companyId/branches/:branchId/rate-plans` — Listar tarifas

### Catálogo

- `POST /companies/:companyId/catalog-items` — Crear ítem
- `GET /companies/:companyId/catalog-items` — Listar catálogo (con filtros)
- `PATCH /companies/:companyId/catalog-items/:catalogItemId` — Editar ítem
- `POST /companies/:companyId/catalog-items/:catalogItemId/activate` — Activar
- `POST /companies/:companyId/catalog-items/:catalogItemId/deactivate` — Inactivar

### Operaciones

- `POST /companies/:companyId/branches/:branchId/tickets` — Abrir ticket
- `GET /companies/:companyId/branches/:branchId/tickets` — Listar tickets
- `GET /companies/:companyId/branches/:branchId/tickets/:ticketId` — Detalle de ticket
- `POST /companies/:companyId/branches/:branchId/rentals/start` — Iniciar alquiler directo
- `POST /companies/:companyId/branches/:branchId/tickets/:ticketId/rentals` — Agregar alquiler a ticket
- `POST /companies/:companyId/branches/:branchId/rentals/:rentalSessionId/finish` — Finalizar alquiler
- `POST /companies/:companyId/branches/:branchId/tickets/:ticketId/payments` — Registrar pago
- `POST /companies/:companyId/branches/:branchId/tickets/:ticketId/close` — Cerrar ticket

### Cancelaciones y reversos

- `POST /companies/:companyId/branches/:branchId/tickets/:ticketId/items/:ticketItemId/cancel` — Cancelar línea
- `POST /companies/:companyId/branches/:branchId/tickets/:ticketId/cancel` — Cancelar ticket sin pagos
- `POST /companies/:companyId/branches/:branchId/tickets/:ticketId/cancel-with-reversal` — Cancelar ticket con reversos
- `POST /companies/:companyId/branches/:branchId/tickets/:ticketId/payments/:paymentId/reversals` — Reverso parcial por pago
- `POST /companies/:companyId/branches/:branchId/rentals/:rentalSessionId/cancel` — Cancelar sesión rental con reversos

## Tests

```bash
npm test
```

Suite de **59 tests** covering operations critical rules, permissions, rental happy path, overtime, discounts, cancellations, catalog filters, partial payment reversals, and rental session cancellation with reversals.

## Reglas de negocio implementadas

- Categorías visibles en todas las sedes por defecto, ocultables por sede
- Tarifas con prioridad: recurso > categoría > sede
- No se permiten alquileres con solapamiento de horarios
- Tickets no cierran con saldo pendiente ni sesiones activas
- Descuentos por línea y globales recalculan totales
- Cancelaciones simples solo en tickets sin pagos
- Reversos parciales múltiples acumulables por pago
- Cancelación de sesiones rental genera reversos FIFO automáticos
- Pagos originales nunca se mutan; los reversos van en tabla separada
