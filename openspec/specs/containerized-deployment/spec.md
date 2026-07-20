# Containerized Deployment Specification

Canonical spec (merged from changes `monorepo-unification`, `check-structure`, `turborepo-conventions`). See `docker-compose.yml`, `docker/Dockerfile.api`, `docker/Dockerfile.nextjs`.

## Purpose

Define the Docker-based deployment infrastructure: shared Dockerfiles for Next.js apps and `@hubilee/api`, a docker-compose.yml orchestrating all services (six Next.js apps, shared Postgres, central API, Caddy reverse proxy), and the networking/storage contracts required for local and CI reproducibility.

## Requirements

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

### Requirement: Shared Dockerfiles (No Per-App Dockerfile)

Production images MUST be built from shared Dockerfiles at `docker/Dockerfile.nextjs` (Next.js apps) and `docker/Dockerfile.api` (`@hubilee/api`). Dockerfiles MUST NOT exist under individual `apps/{app}/` directories. All Dockerfiles MUST pin base image versions for deterministic builds.

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

### Requirement: Next.js Standalone Runtime

Next.js product apps in Docker MUST use `output: 'standalone'` and `outputFileTracingRoot` pointing at the monorepo root. Production containers MUST start with `node apps/{app}/server.js`. Containers MUST NOT invoke `next start` relying on workspace `node_modules` symlinks.

#### Scenario: Hub container starts standalone server

- GIVEN a built hub Docker image
- WHEN the container starts
- THEN it MUST run `node apps/hub/server.js`
- AND MUST NOT fail with missing `next` binary on PATH

#### Scenario: Standalone tracing root

- GIVEN a Next.js app included in Docker deploy (hub, shopflow, workify, techservices, baro)
- WHEN its production image is built
- THEN `next.config` MUST declare `output: 'standalone'` and monorepo `outputFileTracingRoot`

### Requirement: Docker Build-Time Public Env

`NEXT_PUBLIC_*` variables consumed by Next.js client bundles MUST be supplied at Docker **build** time via build args documented in `.env.example`. Runtime-only env MUST NOT be assumed to rewrite inlined client values.

#### Scenario: Compose passes build args

- GIVEN `docker compose build hub`
- WHEN the image is built
- THEN compose MUST pass `NEXT_PUBLIC_*` build args to the Docker build
- AND the built client bundle MUST reflect those values

### Requirement: Shared Database

All services requiring persistence MUST connect to a single shared Postgres service (`postgres`) using one `DATABASE_URL` targeting the `hubilee` database.

#### Scenario: Single database connection

- GIVEN the stack is running
- WHEN `api` and product apps connect to the database
- THEN they use the same Postgres host and database name
- AND no per-app Postgres services exist in compose

#### Scenario: Data persistence across restarts

- GIVEN data has been written to the database
- WHEN `docker compose down && docker compose up -d` runs
- THEN the data survives via named volumes
- AND `docker compose down -v` removes it

### Requirement: API Service in Compose

The docker-compose.yml MUST include an `@hubilee/api` service reachable by apps on the internal network.

#### Scenario: App reaches API internally

- GIVEN the stack is running
- WHEN a product app calls `/v1/auth/login` from server-side fetch
- THEN the request MAY reach the `api` service on the compose network via internal DNS
- AND browser clients MAY use a host-published API URL documented in app env

### Requirement: Centralized Migration

Database migrations MUST run from `@hubilee/database` at stack startup via the API service entrypoint, not from individual app containers.

#### Scenario: Baro container startup

- GIVEN the baro image starts
- WHEN the container entrypoint runs
- THEN it MUST NOT execute `prisma migrate deploy` locally
- AND schema MUST already be applied by the API migration step

#### Scenario: API serves from apps path

- GIVEN the API container starts after migrations
- WHEN the process executes
- THEN it MUST serve from `apps/api/dist/server.js`

### Requirement: Multi-Service Orchestration

The docker-compose.yml MUST define one service per product application, one shared Postgres service, one API service, and one Caddy reverse proxy.

#### Scenario: Full stack startup

- GIVEN the docker-compose.yml at the project root
- WHEN `docker compose up --build -d` is executed
- THEN postgres, api, caddy, and all six app services reach running state within 120 seconds
- AND each app responds on its configured domain via Caddy

#### Scenario: Selective service rebuild

- GIVEN the stack is running
- WHEN `docker compose up --build -d baro` is executed
- THEN only the `baro` service is rebuilt and restarted
- AND postgres, api, and other apps remain uninterrupted

### Requirement: Network Isolation

All services MUST communicate over a dedicated internal Docker network. Caddy MUST expose HTTP(S) to the host; other services SHOULD NOT publish host ports except where documented for local development (e.g. API on 3000).

#### Scenario: Internal-only service communication

- GIVEN the stack is running
- WHEN one app reaches another service by compose service name on `caddy_network`
- THEN Docker DNS resolves the target container
- AND Caddy is reachable from the host on ports 80 and 443

### Requirement: Environment-Based Configuration

Each service MUST load configuration from environment variables, with sensible defaults documented in `.env.example` files.

#### Scenario: Environment-driven configuration

- GIVEN env files with `DATABASE_URL`, `NEXT_PUBLIC_API_URL`, and `PORT` values
- WHEN `docker compose up` reads the env configuration
- THEN each service uses its configured values
- AND missing required variables cause a clear startup error
