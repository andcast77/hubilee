# Verify Report: Turborepo Conventions — PR3 (Slice C)

**Change**: `turborepo-conventions`  
**Slice**: C — Docker & Vercel  
**Date**: 2026-06-07  
**Branch**: `plan/turborepo-conventions-slice-c` → merge to `v2`

## Spec Scenarios (containerized-deployment)

| Requirement | Status | Evidence |
|-------------|--------|----------|
| Next.js image uses `turbo prune` | PASS | `docker/Dockerfile.nextjs` runs `turbo prune "${PACKAGE}" --docker` |
| API image uses `turbo prune` | PASS | `docker/Dockerfile.api` runs `turbo prune @multisystem/api --docker` |
| Hub standalone runtime | PASS | CMD `node apps/$APP_DIR/server.js`; smoke HTTP 200 |
| Standalone + tracing root in next.config | PASS | hub, shopflow, workify, techservices, baro |
| Compose passes `NEXT_PUBLIC_*` build args | PASS | `docker-compose.yml` `x-next-build-args` |
| Shared Dockerfiles (no per-app Dockerfile) | PASS | Deleted `apps/{hub,shopflow,workify,techservices,baro}/Dockerfile` |
| API serves from `apps/api/dist/server.js` | PASS | `docker/Dockerfile.api` CMD + entrypoint migrations |
| Vercel API via turbo graph | PASS | `apps/api/vercel.json` → `turbo run build --filter=@multisystem/api...` |

## Automated / Manual Tests

| Suite | Result |
|-------|--------|
| `pnpm turbo run build --filter=@multisystem/hub...` | **PASS** (standalone artifact at `apps/hub/.next/standalone/apps/hub/server.js`) |
| `docker build -f docker/Dockerfile.nextjs` (hub) | **PASS** |
| `docker run multisystem-hub-test` → `curl /` | **200** (Next.js 16.2.3 ready, no `next: not found`) |
| `docker build -f docker/Dockerfile.api` | **PASS** |

## Notes

- `turbo prune --docker` omits root `tsconfig.base.json`; Dockerfiles copy it explicitly from prepare stage.
- Balance compose service uses generic Dockerfile; `@multisystem/balance` remains out of product scope (not in tracked workspace).

## Verdict

**PASS** — Slice C ready to merge to `v2`.
