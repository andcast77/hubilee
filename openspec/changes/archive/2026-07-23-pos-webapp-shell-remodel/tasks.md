# Tasks: Pos webapp shell remodel

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 900–1600 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR1 shell → PR2 helpers+pilot → PR3 remaining lists → PR4 optional UI |
| Delivery strategy | force-chained |
| Chain strategy | feature-branch-chain |

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 1 | Light shell + landmarks | PR 1 | ✅ `pnpm --filter @hubilee/pos exec vitest run src/components/layout/__tests__/admin-shell.landmarks.test.tsx` | Manual `/app/customers` chrome | Revert layout/header/PageFrame/Sidebar + shell test |
| 2 | Helpers + customers pilot | PR 2 | ✅ `pnpm --filter @hubilee/pos exec vitest run src/components/features/customers/__tests__/CustomerList.landmarks.test.tsx` | Manual customers list | Revert `components/admin/*` + CustomerList + smoke |
| 3 | Remaining scoped lists | PR 3 | ✅ `pnpm --filter @hubilee/pos exec vitest run src/components/admin/__tests__/scoped-lists.landmarks.test.tsx` | Spot products/users/backup | Revert 6 lists + parameterized smoke |
| 4 | Optional additive `@hubilee/ui` | PR 4 | NO-OP — Pos helpers sufficient | N/A | N/A |

## Phase 1: Shell + landmark smoke (TDD) ✅

- [x] 1.1 RED: `apps/pos/src/components/layout/__tests__/admin-shell.landmarks.test.tsx` — sidebar/header/content-card on `ProtectedAppLayout`.
- [x] 1.2 GREEN: create `AppAdminHeader.tsx` (hamburger, bell, user; no fake search/theme); wire `ProtectedAppLayout.tsx` landmarks.
- [x] 1.3 GREEN: light Hubilee `Sidebar.tsx` selectors; move bell off append.
- [x] 1.4 GREEN: `PageFrame.tsx` (+ optional `globals.css`) muted canvas + rounded card; no `.dark` shell.
- [x] 1.5 Verify `/`, `/login` outside shell; PWA `/app/` unchanged.

## Phase 2: List helpers + pilot (customers) ✅

- [x] 2.1 RED: `CustomerList.landmarks.test.tsx` — title/search/CTA/table.
- [x] 2.2 GREEN: add `apps/pos/src/components/admin/{AdminListToolbar,SoftStatusPill,IdentityCell}.tsx` per design.
- [x] 2.3 GREEN: remodel `CustomerList.tsx` with helpers; keep hooks/sort/pagination/dialogs.

## Phase 3: Remaining scoped lists ✅

- [x] 3.1 RED: `scoped-lists.landmarks.test.tsx` parameterized for products, suppliers, users, categories, inventory/low-stock, backup.
- [x] 3.2 GREEN: helpers on `ProductList.tsx`, `SupplierList.tsx`, `UserList.tsx`.
- [x] 3.3 GREEN: helpers on `CategoriesPage`, `LowStockAlert.tsx`, `BackupList.tsx` (CTA only if present).

## Phase 4: Optional UI + closeout ✅

- [x] 4.1 ONLY IF needed: additive `@hubilee/ui` sidebar/badge (no breaking API). NO-OP — Pos helpers sufficient.
- [x] 4.2 Confirm `/app/pos` not list-patterned; non-lists keep PageFrame only.
- [x] 4.3 Run new Pos landmark smokes; tick success criteria. DONE: 67/67 pass on verify 2026-07-23.
