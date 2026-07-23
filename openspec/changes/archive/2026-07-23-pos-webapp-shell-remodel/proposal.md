# Proposal: Pos webapp shell remodel

## What “shell” means

**Shell** = authenticated layout chrome: **sidebar** + **header** + **content container** (rounded card). Wraps `/app/*`. Not POS checkout, forms, reports, or new domains.

## Intent

Remodel Pos `/app/*` to Spike-Admin-like light UI (patterns, not brand/pixels): shell + existing list tables. Today: dark Sidebar, no header, dated lists.

## Locked decisions

| Topic | Decision |
|-------|----------|
| Surface | **Pos only** — Hub/HR/Tech out |
| Depth | **Shell + all existing** `/app/*` list/admin tables |
| Lists | Existing only — no new domains |
| Theme | **Light**; no dark-mode in this change |
| Success | Spike-pattern fidelity via Hubilee tokens; avoid generic look |
| Shared UI | Pos wrappers first; `@hubilee/ui` additive only |

## Scope

### In Scope
- Shell: light sidebar, header, content card; PWA `/app/` vs landing SEO kept
- Existing lists (search, CTA if any, table, soft pills, icon actions):

| Route | UI |
|-------|-----|
| `/app/customers` | `CustomerList` |
| `/app/products` | `ProductList` |
| `/app/suppliers` | `SupplierList` |
| `/app/admin/users` | `UserList` |
| `/app/categories` | `CategoriesPage` list |
| `/app/inventory`, `/app/inventory/low-stock` | `LowStockAlert` |
| `/app/admin/backup` | `BackupList` |

### Out of Scope
- Spike brand/pixel clone; Hub/HR; auth/landing; API; dark mode; new domains
- `/pos`, caja, vendor, charts, settings/loyalty forms, detail CRUD (PageFrame wrap OK)
- Electron / Vite / Tauri

## Capabilities

### New Capabilities
- `pos-webapp-admin-shell`: `/app/*` MUST use light Spike-pattern shell; landing/auth outside
- `pos-admin-list-pattern`: scoped existing lists MUST match Spike list patterns; no new APIs

### Modified Capabilities
- None

## Approach

1. Spike patterns → Hubilee + Pos tokens.
2. Pos light shell; additive `@hubilee/ui` if needed.
3. Shared list chrome on scoped screens.
4. TDD smokes: shell + list landmarks.

## Affected Areas

| Area | Impact |
|------|--------|
| `ProtectedAppLayout`, Pos `Sidebar`, `PageFrame` | Shell |
| Scoped list components | List pattern |
| `packages/ui/sidebar` (+ header?) | Optional additive |
| Auth / API / Hub/HR | Unchanged |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Shared Sidebar breaks Hub/HR | Med | Pos-first; additive |
| Large multi-list surface | High | Shared chrome; slice tasks |
| Generic look | Med | Spike bar + Hubilee tokens |

## Rollback Plan

Revert Pos shell + lists (+ additive UI). No DB/API.

## Dependencies

`@hubilee/ui`; Pos `/app/` PWA; Hubilee tokens; Spike ref only.

## Success Criteria

- [ ] Light Spike-like shell on `/app/*` (Hubilee brand)
- [ ] Scoped lists match Spike list patterns
- [ ] Landing/auth/API/Hub/HR unchanged
- [ ] Vitest smokes for shell + lists
