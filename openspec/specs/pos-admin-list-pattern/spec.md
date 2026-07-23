# pos-admin-list-pattern Specification

Canonical spec (created from change `pos-webapp-shell-remodel`, archived 2026-07-23).

## Purpose

Scoped Pos lists: Spike chrome via Hubilee tokens. No new APIs.

## Requirements

### Requirement: Scoped lists adopt Spike list chrome

Scoped `/app` routes: customers, products, suppliers, admin/users, categories, inventory, inventory/low-stock, admin/backup. MUST show title; search if supported; CTA if present; table; soft pills for status/role/tag; icon actions when present. Colors MUST use Hubilee tokens.

#### Scenario: Customer list landmarks

- GIVEN signed-in user opens `/app/customers`
- WHEN `CustomerList` renders
- THEN title, search/CTA if already present, and table are visible; soft pills for categorical values

#### Scenario: All scoped routes share pattern

- GIVEN each scoped list route
- WHEN list renders
- THEN Spike list chrome applies without new routes

### Requirement: Existing behavior; no new APIs

Lists MUST keep load/filter/CRUD/backup via current `apps/api` clients. MUST NOT add REST endpoints. Empty/error MUST remain usable.

#### Scenario: Products keep existing API

- GIVEN user on `/app/products`
- WHEN products load or filter
- THEN existing product APIs are used; no new list endpoint

#### Scenario: Empty/error remain usable

- GIVEN scoped list empty or error
- WHEN UI renders
- THEN empty/error stays clear; existing retry remains

### Requirement: Soft pills and icon actions

Status/role/tag cells SHOULD be soft pastel pills. Row edit/delete SHOULD be compact icons without removing permissions/confirmations.

#### Scenario: Soft pill and icon actions

- GIVEN a row with categorical value and edit/delete
- WHEN cells/actions render
- THEN soft Hubilee pill + compact icons; gates/confirmations unchanged

### Requirement: Out-of-scope screens not forced into list pattern

`/app/pos`, caja, vendor, charts, settings/loyalty, detail CRUD out of scope. MAY use content card only; MUST NOT use Spike list table.

#### Scenario: Checkout not forced into list pattern

- GIVEN user opens `/app/pos`
- WHEN page renders
- THEN Spike list table MUST NOT replace checkout

### Requirement: List landmark smoke coverage

Pos MUST Vitest-smoke title+table (search/CTA if present) on ≥1 scoped list; SHOULD parameterize others (strict TDD).

#### Scenario: Representative list smoke

- GIVEN Vitest smoke for a scoped list
- WHEN it runs
- THEN it asserts title+table; search/CTA if already present
