# Delta for Containerized Deployment

## ADDED Requirements

### Requirement: Turborepo Prune Docker Build

Production Docker images MUST be built using `turbo prune <package> --docker` to produce a minimal workspace subset before install and build. Images MUST NOT copy the full monorepo followed by manual `node_modules` extraction.

#### Scenario: Next.js image uses prune

- GIVEN the monorepo root
- WHEN `docker build -f docker/Dockerfile.nextjs` runs with `PACKAGE=@hubilee/hub`
- THEN the build MUST execute `turbo prune @hubilee/hub --docker`
- AND MUST install dependencies only from the pruned `out/json` and `out/full` artifacts

#### Scenario: API image uses prune

- GIVEN the monorepo root
- WHEN `docker build -f docker/Dockerfile.api` runs
- THEN the build MUST execute `turbo prune @hubilee/api --docker`

### Requirement: Next.js Standalone Runtime

Next.js product apps in Docker MUST use `output: 'standalone'` and `outputFileTracingRoot` pointing at the monorepo root. Production containers MUST start with `node apps/{app}/server.js`. Containers MUST NOT invoke `next start` relying on workspace `node_modules` symlinks.

#### Scenario: Hub container starts standalone server

- GIVEN a built hub Docker image
- WHEN the container starts
- THEN it MUST run `node apps/hub/server.js`
- AND MUST NOT fail with missing `next` binary on PATH

#### Scenario: Standalone tracing root

- GIVEN a Next.js app included in Docker deploy (hub, pos, workify, techservices, baro)
- WHEN its production image is built
- THEN `next.config` MUST declare `output: 'standalone'` and monorepo `outputFileTracingRoot`

### Requirement: Docker Build-Time Public Env

`NEXT_PUBLIC_*` variables consumed by Next.js client bundles MUST be supplied at Docker **build** time via build args documented in `.env.example`. Runtime-only env MUST NOT be assumed to rewrite inlined client values.

#### Scenario: Compose passes build args

- GIVEN `docker compose build hub`
- WHEN the image is built
- THEN compose MUST pass `NEXT_PUBLIC_*` build args to the Docker build
- AND the built client bundle MUST reflect those values

## MODIFIED Requirements

### Requirement: Per-App Dockerfile

Production images MUST be built from shared Dockerfiles at `docker/Dockerfile.nextjs` (Next.js apps) and `docker/Dockerfile.api` (`@hubilee/api`). Dockerfiles MUST NOT exist under individual `apps/{app}/` directories. All Dockerfiles MUST pin base image versions for deterministic builds.

(Previously: each application directory contained its own Dockerfile; builds used `apps/{app}/Dockerfile` and manual root `node_modules` copy.)

#### Scenario: Full application build

- GIVEN the monorepo root and build args `PACKAGE`, `APP_DIR`, `PORT`
- WHEN `docker build -f docker/Dockerfile.nextjs` runs from the monorepo root
- THEN the image contains the compiled standalone app reachable on the expected port
- AND the base image version MUST be pinned

#### Scenario: API image build

- GIVEN the monorepo root
- WHEN `docker build -f docker/Dockerfile.api` runs
- THEN the image contains the compiled API at `apps/api/dist/server.js`
- AND the entrypoint MUST run `@hubilee/database` migrations before serving

### Requirement: Centralized Migration

Database migrations MUST run from `@hubilee/database` at stack startup via the API service entrypoint, not from individual app containers.

(Previously: API path referenced `packages/api/dist/server.js`.)

#### Scenario: Baro container startup

- GIVEN the baro image starts
- WHEN the container entrypoint runs
- THEN it MUST NOT execute `prisma migrate deploy` locally
- AND schema MUST already be applied by the API migration step

#### Scenario: API serves from apps path

- GIVEN the API container starts after migrations
- WHEN the process executes
- THEN it MUST serve from `apps/api/dist/server.js`

## REMOVED Requirements

None.
