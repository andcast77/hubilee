# Shopflow (`@hubilee/shopflow`)

Módulo **POS e inventario** del ecosistema Hubilee: ventas, productos, categorías, clientes, proveedores, inventario, reportes y administración (usuarios del módulo, fidelidad, backup, ajustes de tienda/ticket).

## Stack

- **Next.js 16** (App Router) + **React 19**
- **TanStack Query**, **Zustand**, **react-hook-form** + **Zod**
- **Tailwind CSS 4**, **@hubilee/ui**, **@hubilee/shared**, **@hubilee/contracts**
- **Recharts**, **ExcelJS**, **jsPDF**, **react-to-print** (tickets/recibos)
- **Vitest** (tests en validaciones y similares)

La API es **`@hubilee/api`**, consumida por HTTP (cliente en `src/lib/api/client.ts`).

## Puerto y desarrollo

| Comando | Descripción |
|---------|-------------|
| `pnpm dev` | Next en **http://localhost:3002** (Turbopack) |
| `pnpm build` / `pnpm start` | Build y servidor de producción |
| `pnpm lint` / `pnpm typecheck` | Calidad |
| `pnpm test` / `pnpm test:run` | Vitest |

```bash
pnpm --filter @hubilee/shopflow dev
```

Incluir **`http://localhost:3002`** en **`CORS_ORIGIN`** de la API. El **Hub** puede enlazar aquí con **`NEXT_PUBLIC_SHOPFLOW_URL=http://localhost:3002`**.

## Variables de entorno

Crear **`apps/shopflow/.env.local`** (ver `.env.example`).

| Variable | Uso |
|----------|-----|
| **`NEXT_PUBLIC_API_URL`** | Base URL principal de la API en **`src/lib/api/client.ts`**. Fallback por defecto: **`http://localhost:3000`**. |
| **`NEXT_PUBLIC_HUB_URL`** | Enlaces al Hub cuando aplica. |
| **`NEXT_PUBLIC_VAPID_PUBLIC_KEY`** | Opcional — notificaciones push Web Push. |
| **`NEXT_PUBLIC_SHOPFLOW_URL`**, **`NEXT_PUBLIC_WORKIFY_URL`**, **`NEXT_PUBLIC_TECHSERVICES_URL`** | URLs públicas del ecosistema (landing). |

En desarrollo, **`next.config.ts`** reescribe **`/v1/*`** al API en `http://127.0.0.1:3000` (mismo criterio que Hub).

## Service Worker y notificaciones push (Web Push)

| Qué | Detalle |
|-----|--------|
| **Archivo** | `public/sw.js` se publica como **`/sw.js`**. El hook `usePushNotifications` (`src/hooks/usePushNotifications.ts`) lo registra con **`scope: '/'`**. |
| **Payload** | El cuerpo JSON enviado por la API (`web-push` en `packages/api`, p. ej. `push-sender.service.ts`) usa **`title`**, **`body`**, **`url`** opcional y **`data`** opcional. El SW muestra `showNotification` y, al hacer clic, intenta enfocar una ventana con esa URL o abrir una nueva en el mismo origen. |
| **VAPID** | En el cliente: **`NEXT_PUBLIC_VAPID_PUBLIC_KEY`** (clave pública). Debe corresponder al par **`VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY`** y **`VAPID_SUBJECT`** de la API. Sin clave pública en el build del cliente, la suscripción falla con *"Push notifications not supported or VAPID key not available"*. |
| **HTTPS** | Push y Service Worker exigen **contexto seguro** en producción (HTTPS). **`localhost`** está exento para desarrollo local. |
| **CSP** | En `next.config.ts`, `Content-Security-Policy` incluye `connect-src 'self' http://localhost:* https: wss: ws:` — compatible con la API y con los endpoints HTTPS que usa el navegador para Web Push. El SW se sirve desde el mismo origen (`default-src 'self'`). |
| **Jobs / servidor** | Los envíos push desde jobs (facturas, stock, etc.) ocurren en la **API**. Con la API en **Vercel serverless**, esos jobs se programan con **Vercel Cron** → rutas `GET /v1/internal/cron/*` y variable **`CRON_SECRET`**; sin eso, no hay ejecución periódica aunque el SW y VAPID estén bien. Detalle: [`packages/api/README.md`](../../packages/api/README.md) (*Jobs programados*). |

### Cómo probar (mínimo)

1. Configurar VAPID en la API y la clave pública en `apps/shopflow/.env.local` como `NEXT_PUBLIC_VAPID_PUBLIC_KEY`.
2. Arrancar Shopflow y la API; iniciar sesión en Shopflow.
3. En la pantalla que use `usePushNotifications`, conceder permiso de notificaciones y activar la suscripción.
4. En DevTools → **Application** → **Service Workers**, comprobar que **`/sw.js`** está registrado y activo.
5. Enviar un push de prueba desde el backend (cualquier flujo que llame a `sendPushToUser` / `sendPushToCompanyAdmins` con VAPID configurado) y verificar la notificación del sistema.

### Limitaciones / no soportado aquí

- No hay actualización forzada del SW desde la UI; el navegador gestiona actualizaciones al cambiar `sw.js`.
- Sin **`NEXT_PUBLIC_VAPID_PUBLIC_KEY`** no hay suscripción; el envío desde servidor tampoco tiene efecto si faltan **`VAPID_*`** en la API.
- Navegadores sin `PushManager` / Service Worker no mostrarán el flujo (`isSupported` en el hook).

## Estructura (`src/`)

```
src/
├── app/                    # App Router (rutas y layouts)
├── components/             # POS, reportes, backup, settings, …
├── hooks/
├── lib/
│   ├── api/client.ts       # ApiClient + rutas shopflow
│   ├── services/           # Ventas, productos, reportes, backup, impresión, …
│   ├── validations/        # Zod (+ tests Vitest)
│   └── permissions.ts
├── providers/
├── views/                  # Páginas compuestas reutilizadas por app/
└── types/
```

## Enlaces

- [README raíz](../../README.md)
- [API — área shopflow](../../packages/api/README.md)
