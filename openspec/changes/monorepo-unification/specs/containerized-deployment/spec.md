# Containerized Deployment Specification

## Purpose

Define the Docker-based deployment infrastructure: a Dockerfile per application, a docker-compose.yml orchestrating all services (apps, per-app databases, Caddy reverse proxy), and the networking/storage contracts required for local and CI reproducibility.

## Requirements

### Requirement: Per-App Dockerfile

Each application directory MUST contain a Dockerfile that produces a production-ready image. All Dockerfiles MUST pin base image versions for deterministic builds.

#### Scenario: Full application build

- GIVEN the monorepo root and an app's source code
- WHEN `docker build -f apps/{app}/Dockerfile` runs from the monorepo root
- THEN the image contains the compiled app at the expected port
- AND the base image SHA matches the pinned digest

### Requirement: Multi-Service Orchestration

The docker-compose.yml MUST define one service per application, one Postgres service per app that requires a database, and one Caddy service as the reverse proxy.

#### Scenario: Full stack startup

- GIVEN the docker-compose.yml at the project root
- WHEN `docker compose up --build -d` is executed
- THEN all services reach "healthy" or "running" state within 120 seconds
- AND each app responds on its configured domain via Caddy

#### Scenario: Selective service rebuild

- GIVEN the stack is running
- WHEN `docker compose up --build -d baro` is executed
- THEN only the `baro` service and its database dependency are rebuilt and restarted
- AND other services remain uninterrupted

### Requirement: Per-App Database Isolation

Each app that requires persistence MUST have its own Postgres service with unique port mappings and a named volume.

#### Scenario: Dedicated database per app

- GIVEN the stack is running
- WHEN the `baro` service connects to `baro-db:5432`
- THEN it connects to its own Postgres instance, isolated from other app databases

#### Scenario: Data persistence across restarts

- GIVEN data has been written to the database
- WHEN `docker compose down && docker compose up -d` runs
- THEN the data survives via named volumes
- AND `docker compose down -v` removes it

#### Scenario: Port collision on host

- GIVEN two app databases expose the same external port
- WHEN `docker compose up` runs
- THEN Docker returns a port conflict error
- AND the operator MUST assign unique external ports

### Requirement: Network Isolation

All services MUST communicate over a dedicated internal Docker network. Caddy MUST be the only service exposing ports to the host.

#### Scenario: Internal-only service communication

- GIVEN the stack is running
- WHEN one app attempts to reach another app's database
- THEN the connection is refused unless explicitly allowed via the compose network config
- AND only Caddy is reachable from the host on ports 80 and 443

### Requirement: Environment-Based Configuration

Each service MUST load configuration from environment variables, with sensible defaults documented in a `.env.example` file.

#### Scenario: Environment-driven configuration

- GIVEN a `.env` file with `DATABASE_URL` and `PORT` values
- WHEN `docker compose up` reads the env file
- THEN each service uses its configured values
- AND missing required variables cause a clear startup error
