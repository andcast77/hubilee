# Pos Static-Only Assessment

## 1) Functional feasibility matrix

| Area | Static-only on browser | Requires backend runtime | Reason |
|---|---|---|---|
| UI rendering / routing | Yes | No | Vite + React Router works fully static. |
| Product/customer/supplier CRUD | No | Yes | Multi-tenant writes and validations must be trusted server-side. |
| Auth/session | No | Yes | Token/session issuance and verification cannot be trusted in browser. |
| RBAC permissions | No | Yes | Permission checks must be enforced on protected API boundaries. |
| Reports/export jobs | Partial | Yes | Heavy/export flows need async jobs and protected data access. |
| Push notification delivery | No | Yes | VAPID private key and push dispatch must run outside browser. |
| Offline UX/read-only cache | Partial | Optional | Can be local-first for UX, but source-of-truth still backend. |

## 2) Target architecture (near static-only)

- Static frontend: Vite build hosted on static CDN.
- Managed authentication: external auth provider issuing secure sessions/tokens.
- Managed data API: serverless/edge functions for tenant-scoped CRUD and policy checks.
- Managed storage/jobs: background jobs for exports/backups and generated files.
- Backend ownership remains minimal but mandatory for secure multi-tenant operations.

## 3) Migration phases

1. Frontend hardening (completed in this change): remove Next/Node coupling from active app and use Vite-only env contract.
2. API boundary hardening: move all security-critical logic to backend-only paths and remove any client-side secret assumptions.
3. Managed-service adoption: introduce managed auth/data/jobs with compatible API contracts.
4. Decommission legacy: archive/remove dead Next artifacts once no longer needed as reference.

## 4) Risks and controls

- Cross-tenant leakage risk if writes/reads move to browser logic.
  - Control: enforce company/store scope on backend queries and policy checks.
- Auth bypass risk if RBAC is client-only.
  - Control: server-side RBAC checks for every protected operation.
- Data export abuse risk (large payloads / PII leakage).
  - Control: authenticated job endpoints, scoped access, expiring signed downloads.

## 5) Acceptance criteria

- Build and typecheck succeed with Vite frontend without importing `next/*` in active sources.
- `apps/pos` uses `VITE_API_URL` as the API base contract (no `NEXT_PUBLIC_*` contract in active client paths).
- Legacy Next code is isolated from lint/typecheck/build paths.
- Core user journeys (login redirect gate, list/detail navigation, CRUD entry points) work via React Router.
- Deployment artifact for Pos remains static (`dist`) and independent of Next runtime.
