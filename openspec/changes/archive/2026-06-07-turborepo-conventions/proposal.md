# Proposal: Turborepo Conventions Realignment

## Intent

Align hubilee with **official Turborepo conventions** for workspace layout, task orchestration, CI, and Docker deploy. Today deploy is broken (`next: not found`), API lives under `packages/`, deploy uses manual `node_modules` copies and `api:bundle` hacks — all incompatible with [Turborepo structuring](https://turbo.build/repo/docs/crafting-your-repository/structuring-a-repository) and [Docker + `turbo prune`](https://turbo.build/repo/docs/guides/tools/docker).

## Scope

### In Scope
- **Phase A — Workspace:** `@hubilee/shared` builds to `dist/`; root scripts use `turbo run … --filter=<pkg>...`; remove baro-only `turbo.json` overrides; CI `--affected` + `fetch-depth: 0` (base `v2` + `main`)
- **Phase B — Layout:** move `packages/api` → `apps/api`; rename `packages/component-library` → `packages/ui`; update path refs (Tailwind `@source`, cursor rules, scripts)
- **Phase C — Deploy:** one `docker/Dockerfile.nextjs` + `docker/Dockerfile.api` using `turbo prune --docker`; Next `output: 'standalone'` + `outputFileTracingRoot` on hub/shopflow/workify/techservices/baro; remove per-app Dockerfiles; drop `api:bundle`; standardize `vercel.json` build commands; compose build-args for `NEXT_PUBLIC_*`
- Update canonical **`containerized-deployment`** spec deltas

### Out of Scope
- **Balance product** (app scaffold, API routes, Prisma models) — add later
- `packages/typescript-config` / `eslint-config` shared packages (optional follow-up)
- Turborepo package boundaries enforcement
- Full baro catalog/version alignment (only remove structural outliers: nested `packageManager`, turbo overrides)
- Vercel multi-project inventory / production domain cutover

## Capabilities

### New Capabilities
- `turborepo-workspace-conventions`: standard `apps/` vs `packages/` layout, internal library build contract, root script delegation, `--filter=…...` dev/build, CI `--affected`

### Modified Capabilities
- `containerized-deployment`: deploy via `turbo prune --docker`, Next standalone runner (`node apps/{app}/server.js`), generic Dockerfiles (not per-app COPY hacks), API at `apps/api`

## Approach

Single change, three apply slices (chained PRs if >400 lines):

1. **A** — `shared` build, `turbo.json`, root `package.json`, CI
2. **B** — git mv API + UI folder; fix imports/paths
3. **C** — Dockerfiles + `next.config.ts` standalone + compose + Vercel; verify hub image starts

**No** manual `node_modules` COPY. **No** `next start` on workspace symlinks in production images.

Input: `openspec/changes/turborepo-conventions/exploration.md`, `openspec/changes/docker-pnpm-runtime/exploration.md` (deploy findings absorbed here).

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `apps/api/` | New (from `packages/api`) | Deployable API location |
| `packages/ui/` | Renamed | Was `component-library` |
| `packages/shared/` | Modified | `build` → `dist/` |
| `package.json`, `turbo.json` | Modified | Delegation + uniform tasks |
| `docker/Dockerfile.*`, `docker-compose.yml` | Modified | `turbo prune` + standalone |
| `apps/*/next.config.ts` (5 apps) | Modified | standalone + tracing root |
| `apps/*/vercel.json`, `apps/api/vercel.json` | Modified | `turbo build --filter=…...` |
| `.github/workflows/ci.yml` | Modified | `--affected` |
| `openspec/specs/containerized-deployment/` | Modified | Post-archive merge |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| API move breaks paths | Med | grep + typecheck; update Docker/Vercel/scripts in same slice |
| `shared` dist breaks apps | Med | `^build` + transpilePackages; verify hub build |
| Docker build time / disk | Med | prune reduces context; build one app in verify |
| `NEXT_PUBLIC_*` wrong at build | Med | compose build-args; document in `.env.example` |

## Rollback Plan

Revert branch commits per slice. `git mv` reversed restores `packages/api` and `packages/component-library`. Docker/compose revert restores previous (non-working) images. No DB migrations.

## Dependencies

- Turborepo 2.x + pnpm 10 workspace (existing)
- Official refs: [structuring](https://turbo.build/repo/docs/crafting-your-repository/structuring-a-repository), [docker](https://turbo.build/repo/docs/guides/tools/docker), [prune](https://turbo.build/repo/docs/reference/prune), [--affected](https://turbo.build/repo/docs/reference/run#--affected)

## Success Criteria

- [ ] `pnpm turbo run build --filter=@hubilee/hub...` succeeds
- [ ] `docker build -f docker/Dockerfile.nextjs --build-arg PACKAGE=@hubilee/hub --build-arg APP_DIR=hub --build-arg PORT=3001 .` produces image where `node apps/hub/server.js` starts
- [ ] `docker build -f docker/Dockerfile.api .` succeeds; API runs migrations + serves
- [ ] CI uses `turbo run lint typecheck test build --affected` on PRs to `v2`/`main`
- [ ] `api:bundle` removed; API Vercel uses `turbo build --filter=@hubilee/api...`
- [ ] No per-app Dockerfiles under `apps/*/Dockerfile`
- [ ] `containerized-deployment` spec scenarios updated and verified in `sdd-verify`
