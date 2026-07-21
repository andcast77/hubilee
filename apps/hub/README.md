# Hubilee (`@hubilee/hub`)

App **Next.js 16 (App Router) + React 19** en **`apps/hub`**: portal multi-empresa — landing pública, autenticación contra la API compartida y **dashboard** para ver empresa, módulos contratados y enlaces a **Hr**, **Pos** y **Tech**.

Forma parte del **monorepo** (`pnpm` workspaces); no es un repo aislado.

## Funcionalidad

| Área | Rutas / notas |
|------|----------------|
| Pública | `/` landing, `/login`, `/register`, `/verify-email`, `/forgot-password`, `/reset-password` |
| Protegidas (sesión HTTP-only en API; comprobación vía `/v1/auth/me`) | `/dashboard` — resumen, tarjetas de módulos habilitados, stats; `/dashboard/members` — miembros; `/dashboard/settings` — empresa y módulos (según rol) |

La API es **`@hubilee/api`** (Fastify). En desarrollo, **Next rewrites** envían `/v1/*` → `http://127.0.0.1:3000/v1/*` (misma idea que el proxy de Vite). Si `NEXT_PUBLIC_API_URL` está vacío, el cliente usa la misma origen (`/v1/...`) y evita CORS.

## SEO (landing)

Marketing `/` exposes crawlable metadata via the root layout:

- `metadataBase` from `NEXT_PUBLIC_HUB_URL` (fallback `http://localhost:3001`)
- Title `{ default, template }`, description, `applicationName`
- Open Graph + Twitter `summary` cards (absolute URLs under `metadataBase`)
- `app/robots.ts` — allow `/`; disallow auth routes (`/login`, `/register`, `/forgot-password`, `/reset-password`, `/verify-email`)
- `app/sitemap.ts` — lists `/` only
- Auth pages export `robots: { index: false, follow: false }`

## PWA (dashboard webapp)

Installability is **dashboard-scoped** so the marketing landing stays SEO-only:

- `app/manifest.ts` — `start_url` and `scope` are `/dashboard/`; icons 192×192 and 512×512 under `public/icons/`
- `public/sw.js` — install/activate only (`skipWaiting` + `clients.claim`); **no** offline fetch cache and **no** Hub Web Push/VAPID
- Registration runs only from `app/dashboard/layout.tsx` via `useRegisterHubServiceWorker` with hardcoded `{ scope: '/dashboard/' }`
- CSP includes `worker-src 'self'` so the SW can register

**Follow-up (out of scope here):** Pos still registers its SW with `scope: '/'`; that should be narrowed separately and is not required for Hub acceptance.

## Stack

- **Next.js 16** (App Router), **TanStack Query**, **react-hook-form** + **Zod**
- **Tailwind CSS 4** (PostCSS `@tailwindcss/postcss`, escaneo de `packages/component-library` vía `@source` en `src/globals.css`)
- **@hubilee/ui**, **@hubilee/contracts**, **@hubilee/shared** (reexport cookie auth en `src/lib/auth.ts`)

## Scripts (desde `apps/hub` o con filter)

| Comando | Descripción |
|---------|-------------|
| `pnpm dev` | Next dev **Turbopack**, puerto **3001** |
| `pnpm build` | `next build` → `.next/` |
| `pnpm start` | `next start` en puerto **3001** |
| `pnpm lint` | `tsc --noEmit` |
| `pnpm test` | Vitest unit tests (`src/**/*.test.ts`) |

```bash
pnpm --filter @hubilee/hub dev
```

En la raíz del monorepo: **`pnpm run dev:hub`** (levanta Hub; la API suele ir en otro terminal con `pnpm run dev:api`).

## Variables de entorno

Crear **`.env`** en `apps/hub/` usando **`.env.example`** como plantilla:

| Variable | Uso |
|----------|-----|
| `NEXT_PUBLIC_API_URL` | Base URL absoluta de la API si no usas el rewrite en dev. En **dev**, vacío o `http://localhost:3000` = mismo origen + rewrite `/v1`. En **build** sin valor, cae a `http://localhost:3000`. |
| `NEXT_PUBLIC_HUB_URL` | URL pública del Hub (p. ej. dev **`http://localhost:3001`**). Enlaces del ecosistema **y** SEO `metadataBase` / OG / sitemap absolutos. |
| `NEXT_PUBLIC_POS_URL` | Pos (p. ej. **`http://localhost:3002`**). Landing y dashboard. |
| `NEXT_PUBLIC_HR_URL` | Hr (**`http://localhost:3003`**). |
| `NEXT_PUBLIC_TECH_URL` | Tech (p. ej. `http://localhost:3004`). |

En **Vercel u otro hosting**, define las `NEXT_PUBLIC_*` del Hub en el proyecto correspondiente **antes del build** (Preview y Production); si no, los CTAs del landing y del dashboard pueden quedar con fallback `http://localhost:…`.

Asegurar que **`CORS_ORIGIN`** en la API incluya `http://localhost:3001`.

## Estructura

```
app/                        # App Router: layout, rutas, providers
src/
├── views/                  # Pantallas (Landing, Login, Dashboard, …)
├── components/             # Layout dashboard, ModuleCard, …
├── hooks/                  # useUser, useCompany, …
├── lib/                    # api-client, auth
└── providers/QueryProvider.tsx
proxy.ts                    # matcher /dashboard/* (placeholder; auth en cliente; Next.js 16+)
```

Las vistas viven en **`src/views`** (no `src/pages`) para no chocar con la convención **Pages Router** de Next.

## Despliegue

- **`vercel.json`**: `framework: nextjs`, `outputDirectory: .next`, `turbo build` (filtrar `@hubilee/hub` en el proyecto Vercel).
- Variables `NEXT_PUBLIC_*` en el panel de Vercel para el build.

## Enlaces

- [README raíz](../../README.md) — monorepo, BD, `dev:hub`
- [API](../../packages/api/README.md)
- [Shared](../../packages/shared/README.md) — cookie + cliente
