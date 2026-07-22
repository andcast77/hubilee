# Pos (`@hubilee/pos`)

Módulo **POS e inventario** del ecosistema Hubilee: ventas, productos, categorías, clientes, proveedores, inventario, reportes y administración (usuarios del módulo, fidelidad, backup, ajustes de tienda/ticket).

## Stack

- **Next.js 16** (App Router) + **React 19** — web + shell Electron
- **PWA** móvil (`/app/` scope) · **Electron** desktop
- **TanStack Query**, **Zustand**, **react-hook-form** + **Zod**
- **Tailwind CSS 4**, **@hubilee/ui**, **@hubilee/shared**, **@hubilee/contracts**
- **Recharts**, **ExcelJS**, **jsPDF**, **react-to-print** (tickets/recibos)
- **Vitest** (unit tests)

La API es **`@hubilee/api`**, consumida por HTTP (cliente en `src/lib/api/client.ts`).

## Puerto y desarrollo

| Comando | Descripción |
|---------|-------------|
| `pnpm dev` | Next en **http://localhost:3002** (Turbopack) |
| `pnpm build` / `pnpm start` | Build y servidor de producción |
| `pnpm dev:electron` | Shell Electron → Next `/app/` (Next debe estar corriendo) |
| `pnpm lint` / `pnpm typecheck` | Calidad |
| `pnpm test` / `pnpm test:run` | Vitest |

```bash
pnpm --filter @hubilee/pos dev
```

Incluir **`http://localhost:3002`** en **`CORS_ORIGIN`** de la API. El **Hub** puede enlazar aquí con **`NEXT_PUBLIC_POS_URL=http://localhost:3002`**.

## Variables de entorno

Crear **`apps/pos/.env.local`** (ver `.env.example`).

| Variable | Uso |
|----------|-----|
| **`NEXT_PUBLIC_API_URL`** | Base URL principal de la API en **`src/lib/api/client.ts`**. Fallback por defecto: **`http://localhost:3000`**. |
| **`NEXT_PUBLIC_HUB_URL`** | Enlaces al Hub cuando aplica. |
| **`NEXT_PUBLIC_VAPID_PUBLIC_KEY`** | Opcional — notificaciones push Web Push. |
| **`NEXT_PUBLIC_POS_URL`**, **`NEXT_PUBLIC_HR_URL`**, **`NEXT_PUBLIC_TECH_URL`** | URLs públicas del ecosistema (landing). |
| **`ELECTRON_START_URL`** | Opcional — URL que abre Electron (default `http://localhost:3002/app/`). |

En desarrollo, **`next.config.ts`** reescribe **`/v1/*`** al API en `http://127.0.0.1:3000` (mismo criterio que Hub).

## Service Worker y PWA

| Qué | Detalle |
|-----|--------|
| **Manifest** | Next `src/app/manifest.ts` — `start_url` / `scope` = **`/app/`** (webapp autenticada). Landing `/` no es la PWA. |
| **Registro SW** | `useRegisterPosServiceWorker` en el layout de `/app` (`ProtectedAppLayout`). Scope **`/app/`**. |
| **Push** | `public/sw.js` + `usePushNotifications` reutiliza el mismo helper de registro. |
| **VAPID** | `NEXT_PUBLIC_VAPID_PUBLIC_KEY` en el cliente; par en la API. |
| **HTTPS** | Requerido en prod (`localhost` OK en dev). |
| **Offline** | No en este producto aún (futuro). |

Rutas autenticadas viven bajo **`/app/*`** (p. ej. `/app/pos`). Paths legacy (`/pos`, `/products`, …) redirigen a `/app/...`.

## Electron (desktop)

| Qué | Detalle |
|-----|--------|
| **Main / preload** | `electron/main.cjs`, `electron/preload.cjs` |
| **Dev** | Con Next en `:3002`: `pnpm --filter @hubilee/pos dev:electron` |
| **Auth** | Bearer + `safeStorage` vía `window.hubileeDesktop` (`platform.ts`) |
| **URL** | `ELECTRON_START_URL` o `NEXT_PUBLIC_POS_URL` (default `http://localhost:3002/app/`) |

Nota: tras instalar, puede hacer falta `pnpm approve-builds` para el binario de Electron.

## Estructura (`src/`)

```
src/
├── app/                    # App Router (landing + /app webapp)
├── components/
├── hooks/
├── lib/                    # api, pwa, platform, app-paths, services, …
├── providers/
├── views/
└── types/
electron/                   # Desktop shell (Next host)
```

## Enlaces

- [README raíz](../../README.md)
- [API — área pos](../../packages/api/README.md)
