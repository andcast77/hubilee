# Delta for Multi-Domain Routing

## ADDED Requirements

### Requirement: Compose Service Parity

Every domain block in the Caddyfile MUST have a corresponding Docker Compose service on `caddy_network` at the declared port.

#### Scenario: All configured domains routable

- GIVEN the full compose stack is running
- WHEN Caddy receives requests for hub, shopflow, workify, techservices, balance, and baro domains
- THEN each request proxies to a healthy upstream container
- AND no domain returns 502 due to a missing compose service

#### Scenario: Missing service fails fast

- GIVEN a domain block references service `balance` but compose omits it
- WHEN a request arrives at `balance.hubilee.app`
- THEN Caddy returns 502
- AND compose parity check in CI MUST fail before merge

## MODIFIED Requirements

### Requirement: Domain-to-Container Routing

The Caddyfile MUST define one `{domain}` block per app, routing to `{service_name}:{port}` via Docker Compose internal DNS. All six product apps MUST be represented.

(Previously: spec examples referenced baro only; compose did not require all six services.)

#### Scenario: All apps served on their domains

- GIVEN Caddy is running with all six app containers healthy
- WHEN a request arrives at any configured `*.hubilee.app` app domain
- THEN Caddy proxies to the matching service and port
- AND requests to other domains route to their respective containers

#### Scenario: Unknown domain receives no match

- GIVEN a request arrives at an unconfigured domain
- WHEN Caddy evaluates the domain
- THEN Caddy returns 404 with no upstream match
