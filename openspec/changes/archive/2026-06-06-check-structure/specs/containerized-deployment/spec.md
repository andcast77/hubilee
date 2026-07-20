# Delta for Containerized Deployment

## ADDED Requirements

### Requirement: Shared Database

All services requiring persistence MUST connect to a single shared Postgres service (`postgres`) using one `DATABASE_URL` targeting the `hubilee` database.

#### Scenario: Single database connection

- GIVEN the stack is running
- WHEN `api` and `baro` connect to the database
- THEN both use the same Postgres host and database name
- AND no per-app Postgres services exist in compose

### Requirement: API Service in Compose

The docker-compose.yml MUST include an `@hubilee/api` service reachable by apps on the internal network.

#### Scenario: App reaches API internally

- GIVEN the stack is running
- WHEN baro calls `/v1/auth/login`
- THEN the request reaches the `api` service on the compose network
- AND baro does not require a host-published API port for internal traffic

### Requirement: Centralized Migration

Database migrations MUST run from `@hubilee/database` at stack startup (typically via the API service), not from individual app containers.

#### Scenario: Baro container startup

- GIVEN baro image starts
- WHEN the container entrypoint runs
- THEN it does not execute `prisma migrate deploy` locally
- AND schema is already applied by the database migration step

## MODIFIED Requirements

### Requirement: Multi-Service Orchestration

The docker-compose.yml MUST define one service per application, one shared Postgres service, one API service, and one Caddy reverse proxy.

(Previously: one Postgres service per app that requires a database.)

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

## REMOVED Requirements

### Requirement: Per-App Database Isolation

(Reason: User confirmed single shared `hubilee` database; baro schema merges into `@hubilee/database`.)
