# Verify Report: check-structure

**Date:** 2026-06-06  
**Branch:** `v2` (PR1–PR4 merged)  
**Change:** Unified Docker stack & Baro integration

## Summary

| Phase | Status | Notes |
|-------|--------|-------|
| 1 — Schema / seed / legacy script | ✅ | Baro models in `@hubilee/database`, migration, seed, legacy script |
| 2 — `/v1/baro/*` API + tests | ✅ | Integration tests: module 403, cross-tenant 404; Vitest Upstash skip in test env |
| 3 — Baro app → central API | ✅ | Auth Option B, `baroApi`, Prisma removed from app |
| 4 — Docker / CORS / wiring | ✅ | `docker compose config` OK; baro-db removed; 6 app + api + caddy services |
| 5 — Verification | ⚠️ Partial | Automated checks below; manual E2E + full compose build pending |

## Automated checks

### API baro tests (strict TDD PR2)

```
pnpm --filter @hubilee/api vitest run \
  src/__tests__/unit/baro.dto.test.ts \
  src/__tests__/integration/baro-tenant-isolation.test.ts
```

**Result:** 8/8 passed (2026-06-06)

### Docker compose config

```
docker compose config -q
```

**Result:** exit 0 — valid YAML, all services defined (postgres, api, caddy, hub, shopflow, workify, techservices, balance, baro)

### CORS

- `packages/api/.env.example` — localhost 3000–3006 + `https://*.hubilee.app` subdomains listed explicitly
- `docker-compose.yml` api service — same CORS list in `CORS_ORIGIN`

## Spec scenarios

| Scenario | Automated | Manual follow-up |
|----------|-----------|------------------|
| Baro module disabled → 403 | ✅ integration test | — |
| Cross-company expediente → 404 | ✅ integration test | — |
| Single shared Postgres (no baro-db) | ✅ compose definition | `docker compose up --build -d` |
| Baro container no `prisma migrate` | ✅ entrypoint is `exec "$@"` only | — |
| All six Caddy domains → upstream | ✅ Caddyfile + compose parity | Hit domains after stack up |
| Hub register → baro login → CRUD | — | Required before production |

## Known gaps / risks

1. **Full `docker compose up --build -d`** — not executed in this verify run (multi-app build is long). Run locally before archive.
2. **Baro app unit tests** — 10 pre-existing failures (schemas, router mocks, manifest disk test); not blocking API tenant tests.
3. **SSR in Docker** — baro uses `API_INTERNAL_URL=http://api:3000` for server fetch; browser uses `NEXT_PUBLIC_API_URL=http://localhost:3000`.
4. **Unrelated working tree** — `openspec/changes/monorepo-unification/*` deletions and `apps/balance` API WIP remain outside this change set.

## Recommendation

**Ready for archive after:**

1. Operator runs `docker compose up --build -d` and confirms no 502 on configured domains.
2. Manual smoke: Hub register → enable baro module → login on baro (:3006) → list/create expediente.

**Do not merge to `master` until team promotes `v2`.**
