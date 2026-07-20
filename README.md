# Hubilee

Plataforma modular multi-empresa para gestión de órdenes de trabajo, ventas y servicios técnicos.

## Estructura del monorepo

Este proyecto usa **pnpm** + **Turborepo** para gestionar múltiples apps y paquetes compartidos.

```
hubilee/
├── apps/
│   ├── hub/              # @hubilee/hub — portal Next.js (login, dashboard, módulos)
│   ├── shopflow/         # @hubilee/shopflow — POS, inventario, reportes (Next.js)
│   ├── workify/          # @hubilee/workify — RRHH, fichajes, reportes (Next.js)
│   └── techservices/     # @hubilee/techservices — órdenes, activos, agenda (Next.js)
├── packages/
│   ├── api/                  # API REST Fastify compartida
│   ├── component-library/    # @hubilee/ui — componentes React compartidos
│   ├── contracts/            # Tipos y contratos compartidos
│   ├── database/           # @hubilee/database — Prisma, migraciones, cliente
│   └── shared/               # @hubilee/shared — auth cookie + ApiClient (frontends)
├── package.json
├── pnpm-workspace.yaml
└── turbo.json
```

### Apps

| App | Puerto | Descripción |
|-----|--------|-------------|
| **hub** | 3001 | Portal multi-empresa: auth, dashboard, enlaces a workify/shopflow/techservices (`Next.js`) |
| **shopflow** | 3002 | POS, inventario, reportes, admin del módulo (`Next.js`) |
| **workify** | 3003 | Empleados, turnos, fichajes, roles; API `/api/workify` (`Next.js` + Turbo) |
| **techservices** | 3004 | Órdenes de trabajo, activos, visitas; API `/api/techservices` (`Next.js`) |

### Paquetes

| Paquete | Descripción |
|---------|-------------|
| **@hubilee/api** | API Fastify: JWT, CORS, rate limit, Swagger (`/api/docs`); rutas por dominio (auth, usuarios, empresas, miembros, **shopflow**, **workify**, **techservices**); versión URL `/api/v1/*` → misma API que `/api/*` |
| **@hubilee/contracts** | Tipos TS compartidos: respuestas auth (`LoginResponse`, `MeResponse`, …), `CompanyRow` / `CompanyModules`, envoltorio **`ApiResponse<T>`**; API + apps frontend |
| **@hubilee/ui** | (`packages/component-library`) Componentes React (Radix), estilos SCSS → CSS; consumo en **hub**, **shopflow**, **workify**, **techservices** vía `workspace:*` |
| **@hubilee/database** | Schema Prisma (workify, shopflow, techservices, hub), migraciones, `prisma` exportado; adaptador **pg** en local, **Neon** en cloud |
| **@hubilee/shared** | (`packages/shared`) Cookie JWT + `ApiClient` / `createPrefixedApi` para **hub**, **shopflow**, **workify**, **techservices** (TS fuente, sin build) |

### Módulos de negocio

Las empresas pueden activar estos módulos:

- **workify** — RRHH, empleados, fichajes y reportes (app `apps/workify`)
- **shopflow** — Ventas, productos, clientes, proveedores, reportes
- **techservices** — Servicios técnicos y mantenimiento

---

## Requisitos

- Node.js 20+
- pnpm 10+
- Base de datos PostgreSQL (local con Docker o Neon)

---

## Despliegue (producción / preview)

Historia única objetivo: **API + frontends en [Vercel](https://vercel.com/)**, **PostgreSQL en [Neon](https://neon.tech/)**. Cada app (`packages/api`, `apps/hub`, `apps/shopflow`, `apps/workify`, `apps/techservices`) tiene su proyecto Vercel con `vercel.json`; el build de la API desde el monorepo usa **`pnpm run api:bundle`** (ver [`packages/api/README.md`](./packages/api/README.md)). **GitHub Actions** puede usar Postgres en contenedor para CI; no es el hosting de producción.

Variables críticas en Vercel (Production + Preview): en la API, `DATABASE_URL` (URL **pooled** de Neon para runtime serverless), `JWT_SECRET`, `FIELD_ENCRYPTION_KEY`, `CORS_ORIGIN`; en cada frontend, las `NEXT_PUBLIC_*` alineadas con las URLs públicas del ecosistema. Migraciones contra Neon: `pnpm migrate:deploy` desde la raíz con `DATABASE_URL` apuntando a Neon (flujo en [`packages/database/README.md`](./packages/database/README.md)).

---

## Base de datos local (desarrollo)

Con **Docker** instalado:

```bash
# Levantar PostgreSQL en el puerto 5432
docker compose up -d postgres

# Configurar .env en packages/api/ con:
DATABASE_URL=postgresql://hubilee:hubilee@localhost:5432/hubilee

# Aplicar migraciones
pnpm --filter @hubilee/database migrate:deploy

# Opcional: cargar datos iniciales
pnpm --filter @hubilee/database db:seed
```

Credenciales por defecto: usuario `hubilee`, contraseña `hubilee`, base `hubilee`.

> **Nota:** Asegúrate de que `DATABASE_URL` esté en `packages/api/.env`. Si las migraciones no encuentran la variable, crea también `packages/database/.env` con el mismo `DATABASE_URL`.

Para usar **Neon** (cloud) en lugar de local: cambia `DATABASE_URL` por tu connection string de Neon.

---

## Instalación

```bash
# Instalar dependencias
pnpm install

# Configurar variables de entorno
# Crear .env en packages/api/ (o raíz) con:
# DATABASE_URL, PORT, CORS_ORIGIN, JWT_SECRET
```

---

## Desarrollo

```bash
# Iniciar todos los servicios (API + apps + @hubilee/ui en watch) en paralelo
pnpm dev
```

`turbo run dev` ejecuta el script `dev` de cada paquete que lo define; **`@hubilee/ui`** usa `vite build --watch` para recompilar `dist/` al cambiar `packages/component-library/src`.

- **API:** http://localhost:3000  
- **Swagger:** http://localhost:3000/api/docs  
- **Hub:** http://localhost:3001  
- **Shopflow:** http://localhost:3002  
- **Workify:** http://localhost:3003  
- **Techservices:** http://localhost:3004  

### Levantar solo Hub + API + BD local

1. Levantar PostgreSQL: `docker compose up -d postgres`
2. Tener `.env` en `packages/api/` y opcionalmente en `packages/database/` (ver Base de datos local).
3. Migraciones: `pnpm --filter @hubilee/database migrate:deploy`
4. Levantar API y Hub (incluye `@hubilee/ui` en watch junto al Hub):
   ```bash
   pnpm run dev:hub
   ```
   En otra terminal, la API: `pnpm run dev:api` si aún no está en marcha.
   - **Hub:** http://localhost:3001  
   - **API:** http://localhost:3000  
   - **Swagger:** http://localhost:3000/api/docs  

Si el puerto 3000 está en uso, cierra el proceso que lo use o ejecuta en otra terminal solo la API cuando esté libre.  

---

## Scripts

| Comando | Descripción |
|---------|-------------|
| `pnpm dev` | Inicia API y apps en modo desarrollo |
| `pnpm build` | Compila todos los paquetes |
| `pnpm run api:bundle` | Build monorepo de la API para Vercel (desde la raíz: DB + copia bajo `packages/api`; en CI/Vercel usa shell POSIX) |
| `pnpm lint` | Ejecuta lint en todo el monorepo |
| `pnpm typecheck` | Ejecuta typecheck (continúa si hay errores) |

### Scripts por paquete

```bash
# API
pnpm --filter @hubilee/api dev      # Solo API
pnpm --filter @hubilee/api test     # Tests

# UI compartida (antes de hub si hace falta dist fresco)
pnpm --filter @hubilee/ui build

# Base de datos (generar cliente tras cambios de schema)
pnpm --filter @hubilee/database build

# Hub (puerto 3001; API en 3000)
pnpm --filter @hubilee/hub dev

# Shopflow (puerto 3002)
pnpm --filter @hubilee/shopflow dev

# Workify (puerto 3003)
pnpm --filter @hubilee/workify dev

# Techservices
pnpm --filter @hubilee/techservices dev
```

---

## Variables de entorno

Crear `.env` en `packages/api/` o en la raíz:

| Variable | Descripción | Por defecto |
|----------|-------------|-------------|
| `PORT` | Puerto del servidor API | 3000 |
| `DATABASE_URL` | URL de conexión PostgreSQL | (requerido) |
| `CORS_ORIGIN` | Orígenes CORS separados por coma | hub **3001**, shopflow **3002**, workify **3003**, techservices **3004** |
| `JWT_SECRET` | Clave para firmar tokens | (requerido en prod) |
| `JWT_ACCESS_EXPIRES_IN` | TTL del access JWT (p. ej. `15m`) | `15m` |
| `NODE_ENV` | Entorno | development |

#### CORS (desarrollo)

Fuente de verdad para orígenes de desarrollo (para que los frontends puedan hacer requests autenticados con cookie):
- `http://localhost:3001` (hub)
- `http://localhost:3002` (shopflow)
- `http://localhost:3003` (workify)
- `http://localhost:3004` (techservices)

Asegúrate de que `packages/api/.env` tenga `CORS_ORIGIN` con esa lista (en el ejemplo y en el fallback del código).

#### Al añadir una nueva app (frontend)

- Añadir la app a la tabla de “Apps” con su puerto.
- Incluir `http://localhost:<puerto>` en la lista de “CORS (desarrollo)” y en `CORS_ORIGIN` de `packages/api/.env`.
- Añadir/actualizar el `env.example` de la app con URLs públicas vía **`NEXT_PUBLIC_*`** (las cuatro apps son **Next.js**).
- Verificar si el módulo requiere headers adicionales (ejemplo: `X-Store-Id` en rutas de Shopflow).

Las apps **hub**, **shopflow**, **workify** y **techservices** usan `NEXT_PUBLIC_API_URL` cuando hace falta URL absoluta de la API; en Hub además `NEXT_PUBLIC_HUB_URL`, `NEXT_PUBLIC_SHOPFLOW_URL`, `NEXT_PUBLIC_WORKIFY_URL`, `NEXT_PUBLIC_TECHSERVICES_URL` para enlaces del ecosistema. Ver [Hub](./apps/hub/README.md) y [Shopflow](./apps/shopflow/README.md).

---

## Stack tecnológico

- **Monorepo:** pnpm workspaces, Turborepo. Versiones compartidas: bloque `catalog:` en [`pnpm-workspace.yaml`](./pnpm-workspace.yaml) y referencias `"paquete": "catalog:"` en cada `package.json` que consuma esa versión. Alineación semver entre workspaces: [PLAN-32](docs/plans/%5Bcompleted%5D%20PLAN-32-monorepo-dependency-alignment.md). Gobierno del catálogo pnpm: [PLAN-34](docs/plans/%5Bcompleted%5D%20PLAN-34-pnpm-catalog.md); procedimiento corto para añadir entradas: [SYNC.md — pnpm workspace catalog](./docs/plans/SYNC.md#pnpm-workspace-catalog).
- **API:** Fastify 5, Zod, JWT, Swagger
- **Frontend:** **hub**, **shopflow**, **workify** y **techservices** con Next.js (App Router donde aplica); Tailwind; **@hubilee/ui**
- **BD:** Prisma (vía `@hubilee/database`)
- **Contratos:** `@hubilee/contracts` (tipos API ↔ frontend)
- **Front compartido:** `@hubilee/shared` (fetch + cookie token)
- **Lenguaje:** TypeScript (strict)

---

## Documentación adicional

- [API - README](./packages/api/README.md) — Estructura del paquete, Swagger, variables de entorno (incl. Redis opcional para caché de módulos), despliegue
- [Component library - README](./packages/component-library/README.md) — `@hubilee/ui`: imports, estilos, build, lista de componentes
- [Contracts - README](./packages/contracts/README.md) — `@hubilee/contracts`: tipos auth/empresa/API, build `tsc`
- [Database - README](./packages/database/README.md) — Prisma, migraciones, seed, variables `DATABASE_URL` / `DIRECT_URL`, cliente
- [Prisma schema split (plan)](./packages/database/prisma/PRISMA_SCHEMA_SPLIT.md) — notas para dividir el schema por dominio
- [Shared - README](./packages/shared/README.md) — `@hubilee/shared`: auth por cookie, cliente API
- [Hub - README](./apps/hub/README.md) — `@hubilee/hub`: dashboard, variables `NEXT_PUBLIC_*`, rewrites `/v1`
- [Shopflow - README](./apps/shopflow/README.md) — POS, API `/v1/shopflow`, puerto 3002, `NEXT_PUBLIC_*`
- [Workify - README](./apps/workify/README.md) — RRHH, `/api/workify`, puerto 3003
- [Techservices - README](./apps/techservices/README.md) — Next.js, `/api/techservices`, puerto 3004
