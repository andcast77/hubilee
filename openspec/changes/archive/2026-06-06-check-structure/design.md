# Design: Unified Docker Stack & Baro Integration

## Technical Approach

Three phased tracks aligned to specs `baro-data-model`, `baro-auth-integration`, `containerized-deployment`, `multi-domain-routing`:

1. **Schema** — port baro domain models into `@hubilee/database` with `companyId`; drop baro auth models.
2. **API** — add `/v1/baro/*` module (workify pattern): controller → service → Prisma, `requireModuleAccess('baro')`.
3. **App + infra** — baro becomes API client; remove local auth/prisma; full Docker compose on shared Postgres.

## Architecture Decisions

### Decision: Tenant model (baro studio → Company)

| Option | Tradeoff | Verdict |
|--------|----------|---------|
| **1 Company per legacy baro account** | Simple 1:1 migration; `accountOwnerId` → `companyId` | **Chosen** |
| Shared Company for all baro users | Breaks isolation | Rejected |

**Rationale:** Baro `User` was a studio owner. Map to `User` + owned `Company` + `CompanyMember` (OWNER) + `CompanyModule(baro)`.

### Decision: Data access from baro app

| Option | Tradeoff | Verdict |
|--------|----------|---------|
| **All mutations/reads via `/v1/baro/*`** | Matches workify/pos; central RBAC | **Chosen** |
| RSC + `@hubilee/database` in baro | Faster short-term; splits authz | Rejected |

**Exception:** DOCX render routes may stay in baro as Server Actions calling API for payload, then local template render (no DB in app).

### Decision: Auth cutover

| Option | Tradeoff | Verdict |
|--------|----------|---------|
| **API httpOnly cookies (`ms_session`)** | Same as workify; delete baro JWT/cookies | **Chosen** (Option B) |
| BaroUser coexist | Spec violation | Rejected |

Baro login/register pages call `authApi` → `/v1/auth/*`. Delete `apps/baro/app/api/auth/**`, `lib/auth/jwt.ts`, `session.ts`, `RefreshToken`.

### Decision: Database deployment

| Option | Tradeoff | Verdict |
|--------|----------|---------|
| **Single `postgres` + `migrate deploy` on API start** | One migration history | **Chosen** |
| Per-app migrate | Violates spec | Rejected |

Remove `baro-db`, `baro_pgdata`, baro entrypoint migrate.

### Decision: Package rename

`baro` → `@hubilee/baro`; turbo tasks use package name filter.

## Data Flow

```
Browser ──→ Caddy (:443)
              ├── baro.hubilee.app ──→ baro:3000 (Next.js)
              ├── hub / pos / … ──→ app:N
              └── (apps call API with credentials:include)
                        │
                        ▼
                   api:3000 ──→ postgres:5432/hubilee
                        │
                   requireAuth + requireCompanyContext + requireModuleAccess('baro')
                        │
                   /v1/baro/expedientes, /v1/baro/professionals, …
```

## Schema Mapping

| Baro (remove) | Hubilee (add/modify) |
|---------------|--------------------------|
| `User`, `RefreshToken` | Use existing `User`, `Session` |
| `Professional.accountOwnerId` | `companyId` + optional `userId` (titular link) |
| `Expediente.accountOwnerId` | `companyId` |
| All child models | `companyId` on root or via expediente FK |
| Enums | `ProfessionalTitle`, `TitleGrammarGender`, `ExpedienteStatus` in shared schema |
| Tables | `@@map("baro_*")` prefix to avoid future collisions |

**User migration SQL (offline script):** for each baro user → insert `users` (email, `password` ← `passwordHash`), create `companies` (name from titular `displayName`), `company_members`, enable `baro` module, rewrite FKs to `companyId`.

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `packages/database/prisma/schema.prisma` | Modify | Baro models + enums |
| `packages/database/prisma/migrations/*` | Create | Squashed baro tables + data migration |
| `packages/database/prisma/seed.ts` | Modify | `baro` module + permissions |
| `packages/api/src/core/modules.ts` | Modify | Add `baro` to `MODULE_KEYS` |
| `packages/api/src/controllers/v1/baro/**` | Create | Routes (expedientes, professionals, profile) |
| `packages/api/src/services/baro.service.ts` | Create | Business logic from baro lib |
| `packages/api/src/controllers/v1/index.ts` | Modify | Register baro routes |
| `packages/contracts/src/baro.ts` | Create | DTOs (port from baro schemas) |
| `apps/baro/lib/api/client.ts` | Create | `baroApi` + `authApi` (workify pattern) |
| `apps/baro/app/api/auth/**` | Delete | Replaced by API auth |
| `apps/baro/lib/prisma.ts`, `apps/baro/prisma/**` | Delete | |
| `apps/baro/lib/auth/**` | Delete | Keep only re-export to `@hubilee/shared` if needed |
| `apps/baro/package.json` | Modify | `@hubilee/baro`, drop prisma deps |
| `docker-compose.yml` | Modify | postgres, api, caddy, 6 apps; no baro-db |
| `docker/Dockerfile.api` | Create | API production image |
| `apps/{hub,pos,workify,techservices,balance,baro}/Dockerfile` | Create | Thin wrappers |
| `apps/baro/docker-entrypoint.sh` | Modify | Remove prisma; `next start` only |
| `package.json`, `turbo.json` | Modify | Scripts, `NEXT_PUBLIC_*`, CORS for baro domain |

## Interfaces / Contracts

```typescript
// packages/contracts/src/baro.ts — expediente, professional DTOs
// API prefix: /v1/baro
GET    /v1/baro/expedientes
POST   /v1/baro/expedientes
GET    /v1/baro/expedientes/:id
PUT    /v1/baro/expedientes/:id
DELETE /v1/baro/expedientes/:id
GET    /v1/baro/professionals
POST   /v1/baro/professionals
// … mirror existing baro auth/profile routes as /v1/baro/profile
```

PreHandler stack: `[requireAuth, requireCompanyContext, requireModuleAccess('baro')]`.

## Testing Strategy

| Layer | What | Approach |
|-------|------|----------|
| Unit | baro.service validation, tenant filters | Vitest in `packages/api` |
| Integration | `/v1/baro/*` cross-company 403, module disabled 403 | Existing API integration setup + Postgres |
| Migration | Legacy user → company mapping | Script dry-run test on snapshot DB |
| Docker | `docker compose config`, stack health | CI step |

## Migration / Rollout

1. **Dev:** schema migration + seed `baro` module → API routes → baro app auth swap → data script on local baro-db dump.
2. **Docker:** compose full stack; verify Caddy → all 6 apps + API.
3. **Prod:** backup baro-db → run migration script → deploy API → deploy baro → disable baro-db.

Rollback: restore DB backup; revert git; re-point baro to archived standalone stack if before cutover.

## Decision Log

- **Baro register:** Use **Hub** company registration — baro login/register pages link to Hub; new tenants get `Company` + modules via existing Hub/OTP flow; `baro` module enabled during or after registration (Hub module picker or post-registration admin).
- **CORS (verified):** `packages/api/.env` sets `CORS_ORIGIN` to localhost **3001–3004 only** (hub, pos, workify, techservices). **Baro (3000) and balance (3005) are missing**; production `*.hubilee.app` domains are not listed. Baro today uses separate `AUTH_ALLOWED_ORIGINS` in `apps/baro/.env` — removed with Option B. **Task:** extend `CORS_ORIGIN` in `packages/api/.env`, `.env.example`, and `docker-compose.yml` for baro + balance + Docker hostnames.

## Open Questions

None blocking tasks — CORS is a documented env update during apply.

## Next Step

Ready for **sdd-tasks** — implement in order: schema → seed/RBAC → API → migration script → baro app → Docker.
