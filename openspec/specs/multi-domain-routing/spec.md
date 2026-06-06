# Multi-Domain Routing Specification

Canonical spec (merged from changes `monorepo-unification`, `check-structure`). See root `Caddyfile` and `docker-compose.yml`.

## Purpose

Define the Caddy reverse proxy configuration that routes incoming HTTP(S) requests per domain to the corresponding app or API container in the Docker Compose network. Each product app retains its own subdomain — no path-based routing.

## Requirements

### Requirement: Domain-to-Container Routing

The Caddyfile MUST define one `{domain}` block per product app and the API, routing to `{service_name}:{port}` via Docker Compose internal DNS. All six product apps MUST be represented (hub, shopflow, workify, techservices, balance, baro).

#### Scenario: All apps served on their domains

- GIVEN Caddy is running with all app containers healthy
- WHEN a request arrives at any configured `*.multisystem.app` app domain
- THEN Caddy proxies to the matching service and port
- AND requests to other domains route to their respective containers

#### Scenario: Baro upstream port

- GIVEN Caddy is running and baro listens on port 3006
- WHEN a request arrives at `baro.multisystem.app`
- THEN Caddy proxies the request to `baro:3006`

#### Scenario: Unknown domain receives no match

- GIVEN a request arrives at an unconfigured domain
- WHEN Caddy evaluates the domain
- THEN Caddy returns 404 with no upstream match

### Requirement: Compose Service Parity

Every domain block in the Caddyfile MUST have a corresponding Docker Compose service on `caddy_network` at the declared port.

#### Scenario: All configured domains routable

- GIVEN the full compose stack is running
- WHEN Caddy receives requests for api, hub, shopflow, workify, techservices, balance, and baro domains
- THEN each request proxies to a healthy upstream container
- AND no domain returns 502 due to a missing compose service

#### Scenario: Missing service fails fast

- GIVEN a domain block references service `balance` but compose omits it
- WHEN a request arrives at `balance.multisystem.app`
- THEN Caddy returns 502
- AND compose parity check in CI SHOULD fail before merge

### Requirement: TLS Termination

Caddy MUST terminate TLS for every configured domain using automatic Let's Encrypt certificates.

#### Scenario: Automatic certificate provisioning

- GIVEN a domain block has no `tls` directive overriding defaults
- WHEN Caddy starts and the domain is publicly resolvable
- THEN Caddy obtains and serves a valid Let's Encrypt certificate

#### Scenario: Certificate renewal on expiry

- GIVEN Caddy is already serving a domain with an active certificate
- WHEN the certificate approaches expiry (30 days)
- THEN Caddy renews it automatically without service interruption

### Requirement: Upstream Error Handling

Caddy MUST return 502 Bad Gateway when an upstream container is unreachable and SHOULD log the failure.

#### Scenario: Unreachable upstream container

- GIVEN the `baro` container is stopped or crashed
- WHEN a request arrives at `baro.multisystem.app`
- THEN Caddy returns HTTP 502
- AND Caddy logs the upstream connection failure

### Requirement: Container DNS Resolution

Caddy MUST resolve upstream services by their Docker Compose service name over the internal network.

#### Scenario: Internal DNS resolution via service name

- GIVEN Caddy and `baro` are on the same Docker network (`caddy_network`)
- WHEN Caddy proxies to `baro:3006`
- THEN Docker DNS resolves `baro` to the container's internal IP

### Requirement: Configuration Hot-Reload

Caddy SHOULD support configuration reload via `caddy reload` without dropping active connections.

#### Scenario: Graceful config reload

- GIVEN Caddy is actively serving traffic
- WHEN the Caddyfile is modified and `caddy reload` is executed
- THEN Caddy applies the new configuration with zero downtime
- AND in-flight requests complete without interruption
