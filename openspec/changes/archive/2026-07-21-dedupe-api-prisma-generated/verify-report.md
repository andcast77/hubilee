```yaml
schema: gentle-ai.verify-result/v1
evidence_revision: sha256:a0289b7ab61b09e4c7eb10067656ec3321f4935c61cbbfe4542fed6c177bdae3
verdict: pass
blockers: 0
critical_findings: 0
requirements: 2/2
scenarios: 4/4
test_command: pnpm --filter @hubilee/api run db:generate + path/grep/tsx smoke (see Build & Tests)
test_exit_code: 0
test_output_hash: sha256:a38f571757d90a18c693a0904590c1c51d35d487f955694d0dfe96efc4dfefd2
build_command: cd apps/api && pnpm exec tsc --noEmit -p tsconfig.json
build_exit_code: 0
build_output_hash: sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
```

## Verification Report

**Change**: dedupe-api-prisma-generated
**Version**: N/A (hygiene delta; capability `api-prisma-client-location`)
**Mode**: Standard (openspec `strict_tdd: true`; design/tasks waive unit RED — smoke + absence checks)

### Completeness
| Metric | Value |
|--------|-------|
| Tasks total | 8 |
| Tasks complete | 8 |
| Tasks incomplete | 0 |

All tasks in `tasks.md` are `[x]`. Proposal success-criteria checkboxes remain unchecked (docs only; not task blockers).

### Build & Tests Execution

**Build**: ✅ Passed
```text
cd apps/api && pnpm exec tsc --noEmit -p tsconfig.json
# exit 0, empty stdout/stderr
# Note: @hubilee/api has no `typecheck` script; tsc is the verified equivalent (same as apply-progress).
```

**Tests**: ✅ Smoke suite passed (no product unit tests — by design)
```text
pnpm --filter @hubilee/api run db:generate
# ✔ Generated Prisma Client (7.7.0) to ./src/generated/prisma
legacy:ABSENT | canonical:OK | tracked_legacy:0
rg apps/api/generated → zero matches (excl. this change’s openspec docs)
seed: from '../src/generated/prisma/client'
src/db: from '../generated/prisma/client' → resolves to same tree
apps/api/README.md: zero packages/database|packages/api refs
.gitignore: /generated/ and src/generated/ both active
turbo.json outputs include src/generated/** (no stale generated/**)
tsx: seed-canonical-resolve:ok
```

**Coverage**: ➖ Not applicable — no authored product code / no unit tests for this hygiene change

### Spec Compliance Matrix

Capability: `api-prisma-client-location`

| Requirement | Scenario | Evidence / “Test” | Result |
|-------------|----------|-------------------|--------|
| Canonical Prisma generate output | Schema output points at src/generated | Inspect `schema.prisma` `output = "../src/generated/prisma"`; `db:generate` → `./src/generated/prisma` | ✅ COMPLIANT |
| Canonical Prisma generate output | Seed and runtime share one client tree | `seed.ts` → `../src/generated/prisma/client`; `src/db/*` → `../generated/prisma/client`; tsx import OK | ✅ COMPLIANT |
| No tracked legacy package-root generated tree | Legacy tree absent after cleanup | `apps/api/generated/` ABSENT; `git ls-files` count 0; `.gitignore` `/generated/` | ✅ COMPLIANT |
| No tracked legacy package-root generated tree | README matches apps/api layout | `apps/api/README.md` documents `apps/api/` + `src/generated/prisma` + local generate; no `packages/database` / `packages/api` | ✅ COMPLIANT |

**Compliance summary**: 4/4 scenarios compliant

### Correctness (Static Evidence)
| Requirement | Status | Notes |
|------------|--------|-------|
| Schema output → `src/generated/prisma` | ✅ Implemented | `apps/api/prisma/schema.prisma` L6 |
| Seed imports canonical tree | ✅ Implemented | `../src/generated/prisma/client` |
| Runtime `src/db` same tree | ✅ Implemented | Relative `../generated/prisma/client` from `src/db` |
| Legacy `apps/api/generated/` gone | ✅ Implemented | Directory absent; 0 tracked files |
| Gitignore `/generated/` + `src/generated/` | ✅ Implemented | Both present and effective via `git check-ignore` |
| README `@hubilee/api` flow | ✅ Implemented | Structure + Vercel notes use `apps/api` / `src/generated/prisma` |
| turbo build outputs | ✅ Implemented | `src/generated/**`; stale `generated/**` dropped |

### Coherence (Design)
| Decision | Followed? | Notes |
|----------|-----------|-------|
| Canonical output stays under `src/generated` | ✅ Yes | Schema unchanged |
| Seed + gitignore before delete | ✅ Yes | Apply order matches design |
| Include turbo outputs update | ✅ Yes | `src/generated/**` |
| Supersede merge leftover (process only) | ✅ Yes | No reopen of `merge-database-into-api` |
| Smoke verification, no unit RED | ✅ Yes | generate + grep + tsc/tsx |

### TDD Compliance
| Check | Result | Details |
|-------|--------|---------|
| TDD Evidence reported | ⚠️ Waived | No RED/GREEN table; design/tasks explicitly waive unit tests for deleted generated files |
| All tasks have tests | ➖ N/A | Smoke tasks 3.1–3.3 are the verification layer |
| RED confirmed | ➖ N/A | Waived |
| GREEN confirmed | ✅ | Smoke + tsc re-run exit 0 in verify |
| Triangulation | ➖ | Single hygiene behavior; multi-scenario covered by filesystem/smoke matrix |
| Safety Net | ➖ N/A | Delete/gitignore hygiene |

**TDD Compliance**: Waived per design — smoke evidence re-executed and green

### Test Layer Distribution
| Layer | Tests | Files | Tools |
|-------|-------|-------|-------|
| Unit | 0 | 0 | Vitest (unused for this change) |
| Integration / smoke | 1 suite | ad-hoc shell | prisma generate, rg, tsx, tsc |
| E2E | 0 | 0 | not installed |
| **Total** | **1 smoke** | **0 product test files** | |

### Changed File Coverage
Coverage analysis skipped — no coverage tool run for config-only / delete / docs change; no authored runtime logic.

### Assertion Quality
**Assertion quality**: ✅ N/A — no product test files; smoke asserts real paths and import resolution

### Quality Metrics
**Linter**: ➖ Not run (no authored TS logic beyond one import path string)
**Type Checker**: ✅ No errors (`tsc --noEmit` exit 0)

### Issues Found
**CRITICAL**: None

**WARNING**:
- Proposal.md success-criteria checkboxes still `[ ]` (implementation meets them; docs not updated).
- Strict TDD protocol table absent in apply-progress — accepted waiver per design/tasks (document for archive awareness).

**SUGGESTION**:
- Root `README.md` and sibling app READMEs still link to `packages/api` / `packages/database` — **out of scope** for this change; follow-up hygiene if desired.

### Verdict
**PASS**

All 8 tasks complete; 2/2 requirements and 4/4 scenarios compliant with re-run smoke + typecheck evidence. Canonical client is only under `apps/api/src/generated/prisma`; legacy tree absent and gitignored; seed/README/turbo aligned.

**Next recommended**: `sdd-archive` (do not archive in this verify run).
