## Exploration: Docker / pnpm runtime in hubilee monorepo

### Current State

The stack targets **6 Next.js apps + `@hubilee/api` + Postgres + Caddy** via root `docker-compose.yml`. Each app has a thin per-app Dockerfile under `apps/*/Dockerfile`; a generic `docker/Dockerfile.nextjs` also exists but is **not wired** into compose.

**Build pattern (all Next.js app Dockerfiles):**

1. `deps` — `pnpm fetch` from lockfile + workspace package.json stubs
2. `builder` — full `COPY . .`, `pnpm install --offline`, `pnpm --filter @hubilee/{app}... build`
3. `runner` — copies app artifacts (`.next`, `public`, `package.json`, `next.config.ts`) + **root** `/app/node_modules`, sets `WORKDIR /app/apps/{app}`, runs `next start -p $PORT`

**pnpm layout (verified locally and in built hub image):**

- Root `node_modules/.bin` contains only monorepo tooling (`turbo`, `tsc`, `knip`) — **no `next` binary**
- Each app has `apps/{app}/node_modules/.bin/next` and symlinks into root `node_modules/.pnpm/`
- App `node_modules/@hubilee/*` symlinks point to `packages/*` (workspace packages)

**Runtime verification (2026-06-07):**

```text
docker build -f apps/hub/Dockerfile -t hubilee-hub:explore .   # SUCCESS (~5.5 min)
docker run --rm hubilee-hub:explore sh -c 'next start -p 3001'
# → sh: next: not found
# Image has /app/node_modules/.pnpm but NO /app/apps/hub/node_modules
```

The `next: not found` failure is **reproducible** and affects all six app Dockerfiles (identical runner pattern).

**API Dockerfile (`docker/Dockerfile.api`):**

- Copies `packages/` + root `node_modules`; runs migrations via `pnpm --filter @hubilee/database migrate:deploy` then `node packages/api/dist/server.js`
- Build reached compile success; image export failed on this host with **disk full** — environmental, not a logic error in the Dockerfile itself

**Compose vs spec:**

- `docker-compose.yml` defines all 9 services (postgres, api, caddy, 6 apps) — aligns with canonical `containerized-deployment` spec
- `Caddyfile` upstream ports match compose service ports (hub:3001 … baro:3006)
- Archived `check-structure` verify-report marked Docker as ⚠️ partial: **`docker compose up --build -d` was never executed**

**Other infra drift:**

| Area | State |
|------|--------|
| `docker/Dockerfile.nextjs` | Generic template; runner copies **zero** `node_modules` — worse than per-app files; unused by compose |
| `outputFileTracingRoot` | Only `apps/baro` and `apps/techservices`; missing on hub/shopflow/workify/balance |
| `output: 'standalone'` | Not used anywhere — no Next.js standalone deploy pattern |
| `.dockerignore` | Excludes `apps/*/node_modules` (expected for context); also excludes `.npmrc` and **balance WIP paths** (stale if balance is now tracked) |
| `NEXT_PUBLIC_*` in compose | Set at **runtime** (`NEXT_PUBLIC_API_URL=http://api:3000`); Next.js inlines `NEXT_PUBLIC_*` at **build** time — runtime env does not fix client bundle |
| Browser API URL in Docker | `http://api:3000` is internal DNS — **unreachable from browser** even if inlined correctly; needs public URL (e.g. `http://localhost:3000` or `https://${API_DOMAIN}`) at build time |
| SSR server fetch | `API_INTERNAL_URL=http://api:3000` pattern exists in baro; not consistently wired across all apps |
| Iteration cost | Full `docker compose up --build` rebuilds all dependency services; single-app build ~5+ min |

### Affected Areas

- `apps/hub/Dockerfile` — missing app-level `node_modules`; confirmed runtime failure
- `apps/shopflow/Dockerfile` — same runner pattern
- `apps/workify/Dockerfile` — same
- `apps/techservices/Dockerfile` — same
- `apps/balance/Dockerfile` — same
- `apps/baro/Dockerfile` — same (+ noop entrypoint)
- `docker/Dockerfile.nextjs` — obsolete/wrong runner (no deps copied); not referenced by compose
- `docker/Dockerfile.api` — heavy root `node_modules` copy; migration entrypoint depends on full workspace + pnpm
- `docker-compose.yml` — runtime-only `NEXT_PUBLIC_*`; internal API URL unsuitable for browser
- `.dockerignore` — stale balance exclusions; `.npmrc` excluded (blocks hoisted-linker option)
- `apps/*/next.config.ts` — missing `outputFileTracingRoot` on 4/6 apps; no `standalone` output
- `openspec/specs/containerized-deployment/spec.md` — requires running stack; scenario not met in practice
- `.env.example` — documents localhost public URLs; compose defaults differ

### Approaches

1. **Minimal patch — copy app `node_modules` + `packages/` into runner**
   - Add to each app Dockerfile runner stage:
     - `COPY ... /app/apps/${APP_DIR}/node_modules`
     - `COPY ... /app/packages ./packages` (or minimal built `dist/` trees)
   - Pros: Smallest diff; preserves current multi-stage layout; fixes `next` binary immediately; workspace symlinks resolve
   - Cons: Duplicated COPY lines across 6 Dockerfiles; large images (full `.pnpm` store + packages); still misses build-time `NEXT_PUBLIC_*`; fragile if tracing omits deps
   - Effort: Low–Medium

2. **Consolidate on generic Dockerfile + `ARG APP` (fix template, delete duplication)**
   - Fix `docker/Dockerfile.nextjs` runner to copy root + app `node_modules`, `packages/`, set correct `WORKDIR`
   - Replace 6 thin Dockerfiles with `dockerfile: docker/Dockerfile.nextjs` + `build.args.APP=hub` etc.
   - Pros: Single place to maintain pnpm runtime contract; aligns with archived monorepo-unification design intent
   - Cons: Same image-size concerns; baro-specific entrypoint needs conditional or override; still needs env/build-arg strategy
   - Effort: Medium

3. **Next.js `output: 'standalone'` + pruned runner (recommended)**
   - Add `output: 'standalone'` and `outputFileTracingRoot` to all app `next.config.ts`
   - Runner copies only `.next/standalone`, `.next/static`, `public` — Next traces required node_modules automatically
   - Pass `NEXT_PUBLIC_*` and `API_INTERNAL_URL` as `ARG`/`ENV` at **build** time (compose `build.args` or BuildKit secrets)
   - Pros: Smaller images; official Next.js Docker pattern; avoids manual pnpm symlink archaeology; fixes tracing gaps
   - Cons: Touches all 6 `next.config.ts`; requires build-time env contract documented in `.env.example`; baro webpack vs turbopack build notes must be respected
   - Effort: Medium–High

4. **`pnpm deploy` production directory**
   - After build, `pnpm --filter @hubilee/{app} deploy --prod /app/deploy`
   - Runner uses pruned deploy folder with resolved deps (no broken symlinks)
   - Pros: Purpose-built for containers; explicit prod dependency closure
   - Cons: Less common in this repo; still need Next standalone or `next start` wiring; learning curve
   - Effort: Medium–High

### Recommendation

**Approach 3 (standalone output + build-time public env)** as the durable fix, delivered in two PR slices:

| Slice | Scope | Outcome |
|-------|--------|---------|
| **A — Unblock runtime** | Fix runner to start containers (standalone or minimal patch) for one app (hub) + verify `next start` | Proves pnpm/runtime contract |
| **B — Standardize stack** | Roll pattern to all 6 apps; fix `docker/Dockerfile.nextjs` or remove it; add compose `build.args` for `NEXT_PUBLIC_*`; document SSR `API_INTERNAL_URL` vs browser URL; run full `docker compose up --build -d` verify |

If speed matters more than image size, **Approach 1** unblocks today but should be treated as **temporary** — it does not fix build-time env or image bloat.

**Do not** mark `containerized-deployment` scenarios as satisfied until a full compose bring-up succeeds end-to-end.

### Risks

- **P0 — All app containers crash on start** (`next: not found`) — confirmed on hub image
- **P1 — Client API calls broken in Docker** — `NEXT_PUBLIC_*` baked at build with localhost fallback; compose runtime env ineffective for browser bundle
- **P1 — Workspace symlinks** — copying only root `node_modules` leaves broken `@hubilee/*` resolution even after `next` binary fix
- **P2 — Missing `outputFileTracingRoot`** on 4 apps may cause subtle missing-file errors at runtime after binary fix
- **P2 — `.dockerignore` balance exclusions** may hide new API/contract files from API image builds
- **P2 — Disk/build time** — full stack rebuild is slow; CI may need layer caching or per-service build matrix
- **Process — Spec debt** — archived verify-report PASS WITH WARNINGS masked that compose was never run successfully
- **Environmental** — API image export failed here with `no space left on device`; operators need adequate disk for multi-image builds

### Ready for Proposal

**Yes** — proceed to `sdd-propose` with change name **`docker-pnpm-runtime`**.

Scope questions for the user before propose:

1. **Quick unblock vs proper fix** — Accept temporary Approach 1 patch first, or go directly to standalone (Approach 3)?
2. **Local Docker API URL** — For browser clients, should build-time `NEXT_PUBLIC_API_URL` be `http://localhost:3000` (host-published API port) or proxied via Caddy `https://${API_DOMAIN}`?
3. **Dockerfile consolidation** — Keep 6 thin Dockerfiles or migrate to one generic `docker/Dockerfile.nextjs` with build args?
