# Hr (`@hubilee/hr`)

Módulo **RRHH y asistencia** del monorepo Hubilee: empleados, cargos, turnos, fichajes, reportes, usuarios/roles de empresa y ajustes (festivos, etc.). Los datos salen de la API central **`/api/hr/*`** (Fastify); **no** usa Prisma ni API Routes propias para el dominio de negocio.

## Stack

- **Next.js 16** (App Router, **Turbopack** en `dev`), **React 19**, **Tailwind 4**
- **TanStack Query**, **Zustand**, **react-hook-form** + **Zod**
- **@hubilee/ui** (`transpilePackages`), **@hubilee/shared**, **@hubilee/contracts**
- **Recharts**, **ExcelJS**, **jsPDF**, **react-to-print**, **Vitest**

Cliente HTTP: **`src/lib/api/client.ts`** — `hrApi` (`/api/hr`), `authApi` (`/api/auth`), `companiesApi` (miembros `/api/companies/:id/members`). Cookie **`token`** (JWT), alineada con Hub / Pos.

## Puerto y scripts

| Comando | Descripción |
|---------|-------------|
| `pnpm dev` | `next dev -p **3003** --turbo` |
| `pnpm build` / `pnpm start` | Producción |
| `pnpm lint` / `pnpm typecheck` | Calidad |
| `pnpm test` / `pnpm test:run` | Vitest |

```bash
pnpm --filter @hubilee/hr dev
```

Añadir **`http://localhost:3003`** a **`CORS_ORIGIN`** en la API. En el Hub: **`VITE_HR_URL=http://localhost:3003`**.

### No confundir con Pos

| App | Puerto | URL local típica |
|-----|--------|------------------|
| **Hr** (esta app) | **3003** | `http://localhost:3003` |
| **Pos** (POS) | **3002** | `http://localhost:3002` |

Si en el navegador ves branding **POS POS** o landing de tienda, casi seguro estás en **:3002**, no en Hr.

### Verificación local (rápida)

1. Arranca el dev de Hr (`pnpm dev:hr` desde la raíz del monorepo o `pnpm dev` dentro de `apps/hr`).
2. Abre **`http://localhost:3003`**. En `/`, el header debe decir **Hr** (no POS POS). El título de pestaña debe ser **Hr** (metadata en `src/app/layout.tsx`).
3. Si tras cambiar código la raíz no se actualiza, borra la caché de Next: elimina el directorio **`apps/hr/.next`** y reinicia el servidor de desarrollo.

### Deploy (Vercel u otro host)

- El proyecto debe construir y servir el paquete **`@hubilee/hr`** (directorio **`apps/hr`**). Si el proyecto de Vercel apunta por error a **`apps/pos`**, desplegarás el POS, no RRHH.
- En monorepos, suele configurarse **Root Directory** `apps/hr` o build desde la raíz con **Turborepo** filtrando `@hubilee/hr` (coherente con [`vercel.json`](vercel.json) y el resto de apps).
- En producción, define **`NEXT_PUBLIC_APP_URL`** con la URL pública de Hr (para `metadataBase` y Open Graph en `layout.tsx`).

## Variables de entorno

Crear **`apps/hr/.env.local`** (ver `.env.example`):

| Variable | Descripción |
|----------|-------------|
| **`NEXT_PUBLIC_API_URL`** | Base de la API (p. ej. `http://localhost:3000`). |

## Rutas (resumen)

Autenticación: `/login`, `/register`. Tras login, áreas bajo layout con sidebar: `/dashboard`, `/employees` (altas, edición, asistencia, horario, asignaciones especiales), `/time-entries`, `/work-shifts`, `/positions`, `/users`, `/roles`, `/reports`, `/settings` (incl. festivos).

Detalle en `src/lib/constants/routes.ts`.

## Monorepo

`next.config.ts` define **`turbopack.root`** en la raíz del repo para resolver workspaces. La BD y migraciones están en **`@hubilee/database`**; la API en **`@hubilee/api`**.

## Enlaces

- [README raíz](../../README.md)
- [API — hr](../../packages/api/README.md)

---

*Documentación histórica que hablaba de Next 14 + Prisma dentro de Hr quedó obsoleta; este archivo describe el estado actual en `apps/hr`.*
