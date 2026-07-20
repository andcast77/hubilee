# Tech (`@hubilee/tech`)

App **Next.js 16** (App Router) para el módulo **servicios técnicos**: órdenes de trabajo, activos y agenda. Consume la API compartida en **`/api/tech/*`** y **`/api/auth/*`**.

El usuario debe tener el módulo activo para la empresa (`technicalServicesEnabled`); si no, el layout del dashboard muestra aviso. La sesión usa la misma cookie **`token`** (JWT) que el **Hub** u otras apps.

## Rutas principales

| Ruta | Descripción |
|------|-------------|
| `/` | Redirige a `/dashboard` |
| `/login` | Login (misma API que el ecosistema) |
| `/dashboard` | Inicio del módulo |
| `/work-orders` | Órdenes de trabajo |
| `/assets` | Activos técnicos |
| `/schedule` | Visitas / agenda |

## Stack

- **Next.js 16**, **React 19**, **Tailwind CSS 4**
- **@hubilee/ui**, **@hubilee/shared**, **@hubilee/contracts**
- Cliente HTTP en **`src/lib/api/client.ts`**: `techApi` (prefijo `/api/tech`), `authApi` (`/api/auth`)

`next.config.ts` fija **`turbopack.root`** y **`outputFileTracingRoot`** en la raíz del monorepo para desarrollo/build desde el workspace.

## Scripts

| Comando | Descripción |
|---------|-------------|
| `pnpm dev` | `next dev -p **3004**` |
| `pnpm build` / `pnpm start` | Producción |
| `pnpm lint` / `pnpm type-check` | Calidad |

```bash
pnpm --filter @hubilee/tech dev
```

Incluir **`http://localhost:3004`** en **`CORS_ORIGIN`** de la API. Desde el **Hub**: `VITE_TECH_URL=http://localhost:3004`.

## Variables de entorno

Crear **`apps/tech/.env.local`** (o `.env`):

| Variable | Descripción |
|----------|-------------|
| **`NEXT_PUBLIC_API_URL`** | URL base de la API (p. ej. `http://localhost:3000`). Sin slash final. |

Ver `.env.example`.

## Enlaces

- [README raíz](../../README.md)
- [API](../../packages/api/README.md) — rutas tech en Swagger `/api/docs`
