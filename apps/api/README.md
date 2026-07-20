# Hubilee API

API compartida **Fastify 5** para Hubilee: JWT, multi-empresa (contexto de compañía/miembro) y rutas agrupadas por módulo (**shopflow**, **workify**, **techservices**). Acceso a datos con **@hubilee/database** (Prisma).

**Producción / preview:** el camino oficial es **Vercel** (esta API) + **Neon** (PostgreSQL). Otros hosts (p. ej. Render) y **`.env.render.example`** se documentan como **legado**; no sustituyen esa historia de despliegue.

## 📄 Swagger / OpenAPI

- **No producción:** **`/v1/docs`**.
- **Producción:** UI **off** salvo **`ENABLE_API_DOCS=true`** (usar solo en entornos controlados).

- [Swagger UI](https://swagger.io/tools/swagger-ui/) · [OpenAPI Specification](https://swagger.io/specification/)

## 🔑 Sesión y auth

- Tras **login / register / POST /v1/auth/context**, la API envía cookie **`ms_session`** (**httpOnly**, **Secure**, **SameSite=None**) en el host de la API. Los frontends deben usar **`credentials: 'include'`** y tener su origen en **`CORS_ORIGIN`**.
- **`Authorization: Bearer`** sigue soportado (tests, scripts).
- **`JWT_SECRET`:** obligatorio en **Vercel**, **`NODE_ENV=production`**, **`staging`** y cualquier despliegue; en desarrollo local se avisa si falta. Ver [ADR-auth-token-storage.md](../../docs/ADR-auth-token-storage.md).

## ⏱ Rate limiting

- **Global:** 100 req/min por IP en el resto de rutas.
- **`POST /v1/auth/login`**, **`register`**, **`verify`:** excluidas del bucket global; bucket dedicado **20 req/min** (`ms-auth-public`).

## 🚀 Inicio Rápido

### Prerrequisitos

- Node.js 20+
- pnpm (gestor de paquetes)
- Base de datos Neon PostgreSQL (o PostgreSQL local)

### Instalación

```bash
# Instalar dependencias
pnpm install

# Configurar variables de entorno
cp .env.example .env
# Edita .env con tus configuraciones
```

### Desarrollo Local

```bash
# Iniciar servidor en modo desarrollo
pnpm dev

# El servidor estará disponible en http://localhost:3000
```

### Build y Producción

```bash
# Compilar TypeScript
pnpm build

# Iniciar servidor de producción
pnpm start
```

## 📁 Estructura del paquete

```
packages/api/
├── api/index.ts              # Handler serverless (Vercel)
├── src/
│   ├── server.ts             # Fastify: env, CORS, rate limit, registro de controllers
│   ├── swagger.ts
│   ├── db/                   # Acceso Prisma
│   ├── controllers/          # health (raíz); v1/* — auth, users, companies, shopflow/*, workify, techservices
│   ├── services/
│   ├── repositories/
│   ├── dto/
│   ├── core/                 # auth, config, permisos, módulos por empresa (`modules.ts`)
│   ├── common/               # errores, caché (Redis opcional), helpers DB
│   ├── helpers/
│   ├── modules/              # (legacy) re-exports por dominio
│   ├── plugins/              # Fastify: core (cors, rate-limit, swagger, …) + health
│   └── __tests__/            # Vitest (unit + integration)
├── vercel.json
├── package.json
├── tsconfig.json
└── .env.example
```

## 🧩 Arquitectura por plugins (Fastify)

La API sigue siendo **un solo deployable** (`src/server.ts`), pero las rutas se registran mediante plugins por dominio para reducir el “blast radius” y mantener límites claros.

### Orden de registro (importante)

1. **Core**: `env` → `cors` → `rate-limit` (incluye scope público de auth) → `schema-sanitizer` → `errors` → `swagger`
2. **Rutas**: `health` (sin versión) → `registerV1` (`controllers/v1/*`, prefijo **`/v1`**)

### Versión en URL

Las rutas de negocio viven bajo **`/v1/...`** (p. ej. `/v1/auth/login`, `/v1/shopflow/products`). **`/health`** y la UI de Swagger **`/v1/docs`** quedan fuera de ese prefijo de dominio donde aplica.

## 🔧 Scripts Disponibles

| Comando | Descripción |
|---------|-------------|
| `pnpm dev` | Inicia servidor en modo desarrollo con hot-reload |
| `pnpm build` | Compila TypeScript a JavaScript |
| `pnpm start` | Inicia servidor de producción |
| `pnpm test` | Ejecuta todos los tests |
| `pnpm test:unit` | Ejecuta solo tests unitarios |
| `pnpm test:integration` | Ejecuta solo tests de integración |

## 🔐 Variables de Entorno

Copia `.env.example` a `.env` y configura:

```bash
# Puerto del servidor
PORT=3000

# Orígenes CORS permitidos (separados por coma)
CORS_ORIGIN=http://localhost:3001,http://localhost:3002,http://localhost:3003,http://localhost:3004

# URL de conexión a Neon PostgreSQL
# Formato: postgresql://user:pass@ep-xxx-pooler.region.aws.neon.tech/dbname?sslmode=require
DATABASE_URL=postgresql://user:pass@ep-xxx-pooler.region.aws.neon.tech/dbname?sslmode=require

# Entorno de ejecución
NODE_ENV=development

# JWT (obligatorio en producción)
JWT_SECRET=tu-secreto
JWT_ACCESS_EXPIRES_IN=15m

# Opcional: caché (Upstash Redis), p. ej. módulos por empresa. Sin Redis, no hay caché (siempre BD).
# UPSTASH_REDIS_REST_URL=
# UPSTASH_REDIS_REST_TOKEN=

# Opcional: feature flags
# ENABLE_API_DOCS=false
# AUTH_SESSION_INSECURE=0

# Variables de plataforma/test (normalmente las define el entorno)
# VERCEL=1
# VITEST=true

```

### Variables para Render (legado)

Si aún despliegas fuera de Vercel, ver **`.env.render.example`** en este paquete. El despliegue objetivo del monorepo es **Vercel + Neon** (sección *Despliegue* abajo).

## 🌐 Áreas de endpoints (detalle en Swagger)

| Prefijo / área | Contenido (resumen) |
|----------------|---------------------|
| `GET /health` | Health check |
| `/v1/auth/*` | Registro, login, logout, sesión, empresas del usuario |
| `/v1/users` | Usuarios (protegido) |
| `/v1/companies`, miembros | Empresas y membresías |
| `/v1/shopflow/*` | Ventas, productos, clientes, tiendas, reportes, export, notificaciones, etc. |
| `/v1/workify/*` | RRHH / asistencia (módulo habilitado por empresa) |
| `/v1/techservices/*` | Servicios técnicos / mantenimiento (módulo habilitado) |

Muchas rutas exigen **sesión (cookie) o Bearer JWT** y contexto de compañía. Listado y esquemas: **`/v1/docs`** (si está habilitado).

| Rutas internas | Uso |
|----------------|-----|
| `GET /v1/internal/cron/*` | Solo **Vercel Cron** (o operadores con `Authorization: Bearer CRON_SECRET`). Ejecutan los mismos jobs que `src/jobs/runner.ts`. No uses estas URLs desde el navegador. |

## ⏰ Jobs programados: Node largo vs Vercel serverless

- **`pnpm start` / Docker / Render:** `startJobRunner()` registra **node-cron** en `src/jobs/runner.ts` (mismas ventanas horarias que antes).
- **Vercel (funciones serverless):** no hay proceso persistente; **`vercel.json`** define **`crons`** que hacen **GET** a `/v1/internal/cron/...`. Debes definir **`CRON_SECRET`** en el proyecto Vercel; la plataforma envía **`Authorization: Bearer <CRON_SECRET>`** en esas peticiones ([Cron Jobs](https://vercel.com/docs/cron-jobs)).
- Los horarios en `vercel.json` están en **UTC**. Ajusta si necesitas hora local fija en otra zona.
- **`functions.api/index.ts.maxDuration`**: 60s — si un job supera el límite en tenants muy grandes, sube el plan o trocea el trabajo.
- Prueba manual: `curl -H "Authorization: Bearer $CRON_SECRET" "https://<tu-api>/v1/internal/cron/backup"`

Los jobs que envían **Web Push** (p. ej. facturas, stock bajo) dependen de que estos cron se ejecuten en Vercel **y** de **VAPID** en la API.

## 🧪 Testing

```bash
# Ejecutar todos los tests
pnpm test

# Tests unitarios
pnpm test:unit

# Tests de integración
pnpm test:integration

# Modo watch
pnpm test:watch

# Con cobertura
pnpm test:coverage
```

## 🚀 Despliegue

### Vercel (monorepo, Root Directory = `packages/api`)

1. **Root Directory**: deja **Root Directory** = `packages/api` en el proyecto de Vercel.
2. **Incluir el paquete database**: en el proyecto Vercel → **Settings** → **General** → **Root Directory** → activa **"Include source files outside of the Root Directory"**. Así el build que se ejecuta desde la raíz del repo (`cd ../.. && pnpm run api:bundle`) puede incluir `packages/database` en el despliegue y se evita el error `Cannot find module '.../packages/database/dist/generated/prisma/client'`.
3. El `vercel.json` de `packages/api` define **`buildCommand`** → **`pnpm run api:bundle`** (el script histórico `vercel:build` en la raíz es un alias del mismo pipeline), la función `api/index.ts`, los rewrites y los crons.
4. **Variables de entorno obligatorias** en Vercel para **Production** y **Preview** (en Preview también se define `VERCEL=1`; si falta alguna, el arranque falla): `DATABASE_URL` (pooled runtime), `JWT_SECRET`, `FIELD_ENCRYPTION_KEY`, `CORS_ORIGIN`. Opcional: `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`. Para que los **jobs programados** (y por tanto **Web Push** desde cron) corran en serverless: **`CRON_SECRET`** (mismo valor que usa Vercel Cron en `Authorization: Bearer …`; ver sección *Jobs programados* arriba). Sin `CRON_SECRET`, las rutas `/v1/internal/cron/*` responderán 401.
5. **`FIELD_ENCRYPTION_KEY`**: clave simétrica en base64 de 32 bytes. Generar: `openssl rand -base64 32`. Añádela en Vercel → Settings → Environment Variables (mismos entornos que arriba). Detalle del formato y rotación: [`docs/field-level-encryption.md`](../../docs/field-level-encryption.md).
6. **Base de datos ya cifrada**: si ya existen filas cifradas con una clave anterior, usa **esa misma** `FIELD_ENCRYPTION_KEY` en Vercel. Cambiar la clave sin re-cifrar rompe la lectura; ver `packages/api/scripts/rotate-field-key.ts` y el doc anterior.
7. Tras crear o editar variables, **vuelve a desplegar** para que el runtime las cargue.

### Render.com (legado / no objetivo)

Alternativa PaaS documentada solo por compatibilidad. Desde la raíz del monorepo suele hacer falta instalar y compilar con el workspace. **Health check:** `GET /health`. Variables mínimas: `DATABASE_URL`, `JWT_SECRET`, `JWT_ACCESS_EXPIRES_IN`, `NODE_ENV` y `CORS_ORIGIN` (ver `.env.render.example`).

## 📝 Notas

- **Fastify 5**, TypeScript, **Zod** donde aplica.
- **Prisma** vía `@hubilee/database`; adaptadores Neon/pg según entorno.
- **Rate limit:** ver sección arriba.
- CORS desde `CORS_ORIGIN` (lista separada por comas).

## 🔗 Enlaces útiles

- [Fastify](https://www.fastify.io/)
- [Neon PostgreSQL](https://neon.tech/)
