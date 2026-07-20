## Exploration: Baro Turbopack build + auth proxy alignment

### Problem

`pnpm turbo run build --filter=@hubilee/baro...` fails because `apps/baro/proxy.ts` imports a missing module:

```ts
import { ACCESS_COOKIE, isAuthenticatedRequest, isAuthEnabled } from '@/lib/auth/client'
```

`apps/baro/lib/auth/client.ts` does not exist (removed during hubilee auth integration). Webpack and Turbopack both fail with the same unresolved import.

Baro is the only Next app forcing webpack (`"build": "next build --webpack"`) due to a historical ChunkLoadError workaround on Windows/IIS + `next start`. After `turborepo-conventions` Slice C, production uses **standalone** + `node apps/baro/server.js`, so the webpack override is no longer justified for Docker/Vercel.

### Current state

| Area | State |
|------|--------|
| `proxy.ts` | Edge auth check on `ACCESS_COOKIE` + `isAuthenticatedRequest` — **upstream standalone model** |
| `lib/auth/session.ts` | Server-only; calls API via `lib/api/server.ts` |
| `lib/auth/client.ts` | **Missing** — build blocker |
| Client components | Still fetch `/api/auth/*` (removed local BFF routes) |
| API | Auth at `/v1/auth/*`; baro domain at `/v1/baro/*` (`/me`, `/profile`, `/professionals/*`) |
| ADR auth | `ms_session` httpOnly on **API host** — app-origin proxy cannot read it |
| Hub pattern | `proxy.ts` passthrough; client `AppSessionGate` + `/v1/auth/me` |

### Root causes

1. **Build:** incomplete auth migration left `proxy.ts` importing deleted upstream module.
2. **Turbopack:** `--webpack` flag kept for obsolete `next start` deployment path.
3. **Runtime (secondary):** UI still calls `/api/auth/*` instead of `@hubilee/api` endpoints — login/session/professionals broken even if build passes.

### Risks

| Risk | Mitigation |
|------|------------|
| Turbopack build regresses on monorepo root tracing | Keep existing `turbopack.root` + `outputFileTracingRoot`; verify `turbo run build` |
| Proxy redirect loop | Align with Hub/ADR: no cookie check at edge; `AppSessionGate` enforces session |
| Cross-origin cookies (baro ≠ API) | Use `credentials: 'include'` + `NEXT_PUBLIC_API_URL` like other apps |
| Password change still on `/api/auth/password` | No API endpoint yet — document follow-up; out of scope |

### Out of scope

- Balance product
- New API password-change endpoint
- Full baro catalog/eslint unification (only `next` version for build parity)
