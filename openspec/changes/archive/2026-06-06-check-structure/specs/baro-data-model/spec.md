# Baro Data Model Specification

## Purpose

Define baro domain persistence inside `@hubilee/database`, tenant-scoped by `companyId`, replacing the standalone baro Prisma project.

## Requirements

### Requirement: Unified Schema Location

All baro domain models MUST live in `packages/database/prisma/schema.prisma`. The baro app MUST NOT maintain a separate Prisma schema or migration history.

#### Scenario: Single migration source

- GIVEN a schema change to baro domain tables
- WHEN migrations are generated
- THEN they are created only under `packages/database/prisma/migrations/`
- AND `apps/baro/prisma/` does not exist

### Requirement: Tenant Scoping

Every baro tenant-owned row MUST include `companyId` referencing `Company`. Queries MUST filter by authenticated company context.

#### Scenario: Cross-company read denied

- GIVEN user A belongs to company X
- WHEN user A requests expediente owned by company Y
- THEN the system returns not found or forbidden
- AND no data from company Y is returned

#### Scenario: Create within tenant

- GIVEN authenticated user with company context X
- WHEN creating an Expediente
- THEN `companyId` is set to X
- AND the row is visible only to members of company X

### Requirement: Domain Model Coverage

The shared schema MUST include baro domain entities: Professional, ProfessionalRegistration, Expediente, ExpedienteColindante, ExpedienteColindanteNomenclatura, ExpedienteOrdenante, ExpedienteLinderos, ExpedienteLinderoPunto, ExpedienteActuante, ExpedienteTituloRelacion, and related enums.

#### Scenario: Expediente CRUD persistence

- GIVEN valid expediente payload for company X
- WHEN saved via baro flows
- THEN all nested relations persist with the same `companyId`
- AND reads return the complete graph for company X

### Requirement: User Reference

Baro entities MUST reference hubilee `User` (not a baro-specific user table) for audit fields such as creator where applicable.

#### Scenario: Creator linkage

- GIVEN authenticated user U in company X
- WHEN creating a baro domain record requiring creator
- THEN `createdById` references `users.id` for U
