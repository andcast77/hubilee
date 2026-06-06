# Containerized Deployment Specification

Canonical spec (merged from changes `monorepo-unification`, `check-structure`). See `docker-compose.yml`, `docker/Dockerfile.api`, and per-app Dockerfiles under `apps/*/`.

## Purpose

Define the Docker-based deployment infrastructure: a Dockerfile per application (plus `@multisystem/api`), a docker-compose.yml orchestrating all services (six Next.js apps, shared Postgres, central API, Caddy reverse proxy), and the networking/storage contracts required for local and CI reproducibility.

## Requirements

### Requirement: Per-App Dockerfile

Each application directory MUST contain a Dockerfile that produces a production-ready image. The monorepo MUST provide `docker/Dockerfile.api` for `@multisystem/api`. All Dockerfiles MUST pin base image versions for deterministic builds.

#### Scenario: Full application build

- GIVEN the monorepo root and an app's source code
- WHEN `docker build -f apps/{app}/Dockerfile` runs from the monorepo root
- THEN the image contains the compiled app at the expected port
- AND the base image SHA matches the pinned digest

#### Scenario: API image build

- GIVEN the monorepo root
- WHEN `docker build -f docker/Dockerfile.api` runs
- THEN the image contains the compiled API and can run database migrations on startup

### Requirement: Shared Database

All services requiring persistence MUST connect to a single shared Postgres service (`postgres`) using one `DATABASE_URL` targeting the `multisystem` database.

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

The docker-compose.yml MUST include an `@multisystem/api` service reachable by apps on the internal network.

#### Scenario: App reaches API internally

- GIVEN the stack is running
- WHEN a product app calls `/v1/auth/login` from server-side fetch
- THEN the request MAY reach the `api` service on the compose network via internal DNS
- AND browser clients MAY use a host-published API URL documented in app env

### Requirement: Centralized Migration

Database migrations MUST run from `@multisystem/database` at stack startup (typically via the API service entrypoint), not from individual app containers.

#### Scenario: Baro container startup

- GIVEN the baro image starts
- WHEN the container entrypoint runs
- THEN it does not execute `prisma migrate deploy` locally
- AND schema is already applied by the database migration step

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
