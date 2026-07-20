## Exploration: Realign hubilee with official Turborepo conventions

Reference docs (canonical):
- https://turbo.build/repo/docs/crafting-your-repository/structuring-a-repository
- https://turbo.build/repo/docs/crafting-your-repository/running-tasks
- https://turbo.build/repo/docs/crafting-your-repository/creating-an-internal-package
- https://turbo.build/repo/docs/guides/tools/docker
- https://turbo.build/repo/docs/reference/prune
- https://turbo.build/repo/docs/reference/run#--affected

### Current State

**Layout (partially aligned)**

```
hubilee/
├── apps/           # 6 Next.js deployables (@hubilee/hub … baro)
├── packages/
│   ├── api/        # deployable Fastify API (non-standard location)
│   ├── component-library/  # @hubilee/ui (folder name ≠ package name)
│   ├── contracts/, database/, shared/
├── package.json, turbo.json, pnpm-workspace.yaml (catalog)
```

**What already matches Turborepo conventions**

| Area | Status |
|------|--------|
| `apps/*` + `packages/*` workspace globs | OK |
| Root delegates to `turbo run` for build/dev/lint/test/typecheck | OK |
| `turbo.json` `build.dependsOn: ["^build"]` + outputs (`.next`, `dist`) | OK |
| `workspace:*` internal deps | OK |
| pnpm catalog for shared versions | OK (except baro drift) |
| Hub (and other apps) `vercel.json` uses monorepo-root install + `turbo run build --filter=…` | Partially OK |
| CI sets `TURBO_TOKEN` / `TURBO_TEAM` | OK (underused) |

**Gaps vs official Turborepo model**

| # | Official convention | Current state | Impact |
|---|---------------------|---------------|--------|
| 1 | **Deployables live in `apps/`** (web, docs, api) | `@hubilee/api` is under `packages/api/` | Mental model split; filters/Docker/Vercel treat API differently from frontends |
| 2 | **Libraries in `packages/` build to `dist/`** with `exports` | `@hubilee/shared` exports raw `./src/*.ts` (no `build` script) | Apps consume TS source; breaks “library package” contract; weak cache boundaries |
| 3 | **Folder name ≈ package name** | `packages/component-library` → `@hubilee/ui` | Navigation friction; prune/filter docs assume `apps/web` not `packages/component-library` |
| 4 | **Root scripts only delegate** (`turbo run <task>`) | 20+ root scripts: per-app dev/build, `knip:*`, `api:bundle`, db helpers | Many bypass Turbo or duplicate filter logic |
| 5 | **Filters use `…` for closure** | e.g. `dev:hub` uses `--filter=ui --filter=hub` instead of `--filter=hub...` | Works but non-idiomatic; easy to miss transitive deps |
| 6 | **Deploy = pruned artifact per app** (`turbo prune --docker`) | Docker copies full repo + root `node_modules`; runtime fails (`next: not found`) | See `docker-pnpm-runtime` exploration |
| 7 | **Vercel/API deploy via Turbo graph** | `api:bundle` manually `cp -r packages/database → packages/api/node_modules/…` | Fragile; not prune-based |
| 8 | **CI runs `--affected` on PRs** | CI runs full `turbo lint`, `turbo test`, `turbo build` every time | Slower CI; remote cache underused for scoped runs |
| 9 | **Shared config packages** (`packages/typescript-config`, `eslint-config`) | Single root `tsconfig.base.json`; per-app tsconfig; baro has own ESLint/TS versions | Inconsistent tooling; baro isolated from catalog |
| 10 | **Uniform task graph per package** | `@hubilee/baro#build` special-cased in `turbo.json`; baro has `test`, others vary; hub `lint` = `tsc --noEmit` only | Uneven pipeline; extra maintenance |
| 11 | **Package boundaries** (optional Turborepo 2.x) | Not configured | No enforcement apps→packages only |
| 12 | **Next.js Docker runner** | `next start` + partial `node_modules` | Should be `output: 'standalone'` + `node server.js` after prune (official Docker guide) |

**Deploy / CI specifics**

- `.github/workflows/ci.yml`: full monorepo build on every PR; no `turbo run … --affected`
- Vercel staging/production jobs reference a **single** `VERCEL_PROJECT_ID` — unclear multi-app mapping vs one project per app (Turborepo + Vercel expects per-app project or monorepo project settings)
- `apps/hub/vercel.json`: `turbo run build --filter=@hubilee/hub` (should prefer `@hubilee/hub...` or rely on `^build` — likely OK but non-documented)
- `packages/api/vercel.json`: `pnpm run api:bundle` — custom script, not `turbo build --filter=@hubilee/api...`

**Baro as outlier (absorbed standalone app)**

- Own `packageManager` pin in `apps/baro/package.json`
- Many deps **not** on pnpm catalog (next 16.2.4 vs catalog 16.2.3, separate eslint/typescript)
- Only app with dedicated `turbo.json` task overrides
- Webpack forced build (`next build --webpack`) — valid product choice but diverges from other apps

### Target state (official Turborepo pattern)

```
hubilee/
├── apps/
│   ├── hub/, pos/, workify/, techservices/, balance/, baro/
│   └── api/                    # moved from packages/api
├── packages/
│   ├── ui/                     # renamed from component-library
│   ├── contracts/, database/, shared/
│   ├── typescript-config/      # optional
│   └── eslint-config/          # optional
├── package.json                # minimal: turbo run *
├── turbo.json                  # uniform tasks, no baro-only overrides
├── pnpm-workspace.yaml
├── docker/
│   ├── Dockerfile.nextjs       # ARG PACKAGE=@hubilee/hub
│   └── Dockerfile.api          # turbo prune @hubilee/api --docker
└── .github/workflows/ci.yml    # turbo run … --affected on PR
```

**Workflow contracts**

| Phase | Official command |
|-------|------------------|
| Dev one app | `turbo dev --filter=@hubilee/hub...` |
| Build one app | `turbo build --filter=@hubilee/hub...` |
| CI (PR) | `turbo run lint typecheck test build --affected` |
| Docker image | `turbo prune @hubilee/hub --docker` → install → build → standalone runner |
| Vercel app | Root install + `turbo build --filter=@hubilee/hub...` |
| Vercel API | Root install + `turbo build --filter=@hubilee/api...` (drop `api:bundle` cp) |

### Affected Areas

- `package.json` (root) — script surface, remove/replace `api:bundle`, align dev/build shortcuts
- `turbo.json` — remove baro-specific overrides; add build `env` for `NEXT_PUBLIC_*`; optional boundaries
- `pnpm-workspace.yaml` — unchanged globs; catalog alignment for baro
- `packages/api/` → `apps/api/` — move deployable (high churn: imports, Docker, Vercel, docs)
- `packages/component-library/` → `packages/ui/` — rename directory to match `@hubilee/ui`
- `packages/shared/package.json` — add `build` → `dist/`, update `exports`
- `apps/baro/package.json` — catalog alignment, drop nested `packageManager`, unify lint/typecheck
- `apps/*/vercel.json`, `packages/api/vercel.json` — standardize build commands
- `docker/Dockerfile.api`, `apps/*/Dockerfile`, `docker/Dockerfile.nextjs` — turbo prune + standalone
- `.github/workflows/ci.yml` — `--affected`, fetch-depth for merge base
- `openspec/specs/containerized-deployment/spec.md` — update paths if API moves
- Related change: `openspec/changes/docker-pnpm-runtime/` — deploy slice; merge or sequence with this change

### Approaches

1. **Phased realignment (recommended)** — Structure and conventions first, deploy second.
   - **Phase A — Workspace conventions (low risk):** shared build for `@hubilee/shared`; root scripts → `--filter=…...`; remove baro `turbo.json` overrides; CI `--affected`; optional `packages/typescript-config`
   - **Phase B — Layout (medium risk):** rename `component-library` → `ui`; move `packages/api` → `apps/api`; update all path references
   - **Phase C — Deploy (medium–high risk):** turbo prune Dockerfiles; Next `standalone`; replace `api:bundle`; verify full compose + Vercel per app
   - Pros: Reviewable slices; matches Turborepo docs without big-bang; 400-line PR budget friendly
   - Cons: Temporary overlap with old paths during migration
   - Effort: High (total), Medium per phase

2. **Deploy-first (turbo prune + standalone only)** — Fix Docker/Vercel using official prune pattern without moving folders.
   - Pros: Fastest path to working containers; minimal file moves
   - Cons: Leaves structural debt (`api` in packages, shared raw TS, baro drift); conventions still wrong
   - Effort: Medium

3. **Big-bang restructure** — Move api, rename ui, shared build, Docker, CI, baro catalog sync in one change.
   - Pros: Clean end state quickly
   - Cons: Huge PR; high regression risk; violates review budget and SDD slice discipline
   - Effort: Very High

4. **Greenfield template merge** — Re-scaffold from `create-turbo` / next-forge and port apps.
   - Pros: Perfect convention match
   - Cons: Disproportionate cost; loses history and custom infra (Caddy, multi-domain)
   - Effort: Very High — not recommended

### Recommendation

**Approach 1 (phased realignment)**, sequenced as three SDD changes or one change with three task phases:

| Phase | Change focus | Turborepo doc alignment |
|-------|--------------|-------------------------|
| A | `turborepo-conventions` — scripts, shared package build, turbo.json, CI `--affected`, baro catalog | Structuring, running tasks, internal packages |
| B | Same or follow-up — `apps/api` move, `packages/ui` rename | Standard layout |
| C | `docker-pnpm-runtime` — prune + standalone + Vercel build cleanup | Docker guide, prune reference |

**Do not** adopt manual `node_modules` COPY patches — incompatible with official Turborepo + pnpm model.

**Baro:** bring onto catalog and shared task graph in Phase A; do not exempt via per-package `turbo.json` overrides unless strictly required (document why in design.md).

### Risks

- **Moving `packages/api` → `apps/api`** touches Docker, Vercel, docs, OpenSpec paths, and mental models — highest churn item
- **Renaming `component-library` → `ui`** breaks deep links and import paths if any tooling references folder name (package name already `@hubilee/ui`)
- **`@hubilee/shared` build step** may require app tsconfig / transpilePackages updates
- **Baro version drift** (next/eslint/typescript off catalog) may surface latent type or lint failures when aligned
- **CI `--affected`** needs `fetch-depth: 0` and correct base branch (`v2` vs `main` — workflow currently targets `main`)
- **Vercel multi-app** — single project ID in CI may not match Turborepo’s one-project-per-app model; needs inventory before Phase C
- **Scope coupling with Docker** — convention work without deploy fix leaves production still broken until Phase C

### Ready for Proposal

**Yes** — proceed to `sdd-propose` for change name **`turborepo-conventions`** (Phase A scope).

Orchestrator should confirm with user:

1. **Include Phase B (move API to `apps/api`, rename ui folder) in v1 proposal** or defer to a second change after Phase A?
2. **Sequence with `docker-pnpm-runtime`** — same program of work or separate PR chain?
3. **CI base branch** — align workflow to `v2` (current dev branch) for `--affected`?
4. **Baro catalog alignment** — in scope for Phase A or separate follow-up?

Official references to cite in proposal/design:
- https://turbo.build/repo/docs/crafting-your-repository/structuring-a-repository
- https://turbo.build/repo/docs/guides/tools/docker
- https://turbo.build/repo/docs/reference/run#--affected
