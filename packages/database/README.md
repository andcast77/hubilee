# Hubilee Database

Paquete **@hubilee/database**: schema Prisma (PostgreSQL), migraciones, seed y **PrismaClient** exportado desde `src/client.ts`.

- **Local:** adaptador **`@prisma/adapter-pg`** cuando `DATABASE_URL` apunta a `localhost` o `127.0.0.1`.
- **Neon / cloud:** adaptador **`@prisma/adapter-neon`** en el resto de casos.

Referencias: [Prisma + Neon](https://www.prisma.io/docs/orm/overview/databases/neon), [Neon + Prisma](https://neon.com/docs/guides/prisma).

## Contenido

- **Schema:** `prisma/schema.prisma` (modelos hr, pos, techservices, usuarios, empresas, módulos, etc.)
- **Migraciones activas:** `prisma/migrations/` · histórico bajo `prisma/migrations_legacy_20260213/` · SQL manual en `prisma/migrations/manual/`
- **Cliente:** `prisma generate` escribe en `dist/generated/prisma`; el build copia a `generated/` para que compile `src/client.ts`; runtime resuelve desde `dist/`

## Estructura

```
packages/database/
├── prisma/
│   ├── schema.prisma
│   ├── seed.ts
│   ├── migrations/
│   ├── migrations_legacy_20260213/
│   ├── migrations/manual/
│   └── PRISMA_SCHEMA_SPLIT.md   # plan opcional multi-file schema
├── scripts/                     # copy-generated-for-tsc, fix-esm-extensions
├── src/client.ts
├── generated/                   # copia del client tras generate (build)
├── dist/                      # salida tsc + generated en publicación
├── package.json
├── prisma.config.ts
└── tsconfig*.json
```

## Uso

```json
{
  "dependencies": {
    "@hubilee/database": "workspace:*"
  }
}
```

```typescript
import { prisma } from '@hubilee/database'

const users = await prisma.user.findMany()
```

## Scripts

| Comando | Descripción |
|--------|-------------|
| `pnpm build` | `prisma generate` → copia a `generated/` → `tsc` → ajuste extensiones ESM |
| `pnpm generate` | Solo Prisma Client |
| `pnpm migrate` / `pnpm migrate:deploy` | Migra en **producción (Neon)** |
| `pnpm migrate:dev` / `pnpm migrate:deploy:dev` | Migra en **local (Docker)** |
| `pnpm db:push` / `pnpm db:push:dev` | `db push` en prod o local según sufijo |
| `pnpm db:seed` / `pnpm db:seed:dev` | Seed en prod o local según sufijo |
| `pnpm db:reset` / `pnpm db:reset:dev` | Reset destructivo en prod o local según sufijo |
| `pnpm db:erase` / `pnpm db:erase:dev` | Alias de reset destructivo por entorno |
| `pnpm studio` / `pnpm studio:dev` | Prisma Studio en prod o local según sufijo |

## Variables de entorno

Colocar `.env` en **`packages/database/`** (migraciones/seed/studio).

Contrato de entorno:
- Comando estándar (sin `:dev`) => **producción (Neon)**
- Comando `:dev` => **local Docker**

Variables requeridas:

```bash
# Local (Docker) - usado por comandos :dev
DATABASE_URL_DEV=postgresql://hubilee:hubilee@localhost:5432/hubilee

# Producción (Neon) - usado por comandos estándar
DATABASE_URL=postgresql://user:pass@ep-xxx-pooler.region.aws.neon.tech/dbname?sslmode=require
```

Opcionales:
- `SHADOW_DATABASE_URL_DEV`
- `SHADOW_DATABASE_URL`
- `DB_TARGET` (`prod` por defecto; usar `dev` para forzar target local en scripts compatibles)
- `NODE_ENV` (solo afecta nivel de logs del Prisma client)

La API puede seguir usando su `DATABASE_URL` propia para runtime; este paquete define su propio ruteo por comandos.

### Mapeo Vercel Postgres -> variables del proyecto

Cuando Vercel/Neon provea variables `POSTGRES_*`, mapearlas a las variables usadas en este repo:

```bash
# Runtime (pooled)
DATABASE_URL=$POSTGRES_URL
# Alternativa válida de Vercel para Prisma runtime
# DATABASE_URL=$POSTGRES_PRISMA_URL
```

Si existen `POSTGRES_URL` y `POSTGRES_PRISMA_URL`, priorizar uno de forma consistente por entorno (recomendado: `POSTGRES_URL`) y evitar mezclar ambos en el mismo servicio.

## Seguridad de credenciales

Si una credencial de producción fue compartida por chat, ticket, commit o captura, considerarla comprometida:
- Rotar inmediatamente contraseña/connection string en Neon.
- Actualizar secretos en Vercel (y cualquier otro proveedor) con los nuevos valores.
- Invalidar y eliminar valores antiguos en variables de entorno y documentación temporal.

`pnpm generate` no necesita BD. Migrate/seed/studio sí. [Neon Console](https://console.neon.tech) → Connect para ambas URLs.

## Seeds

El seed cubre **hr**, **pos** y **techservices** (registros `Module`, permisos hub, datos de ejemplo por módulo).

### Ejecutar Seeds

```bash
pnpm --filter @hubilee/database db:seed
# o: cd packages/database && pnpm db:seed
```

### Contenido del Seed

El seed incluye:

**Hr:**
- Empresa de ejemplo (Acme Inc.)
- Departamentos (Recursos Humanos, Tecnología)
- Posiciones (Gerente, Desarrollador)
- Roles (Administrador, Empleado)
- Turnos de trabajo (Mañana, Tarde)
- Usuarios de ejemplo (admin@acme.com, user@acme.com)
- Empleados vinculados a usuarios
- Días festivos

**Techservices:** módulo `techservices` en BD, permiso `techservices.access`; las empresas de ejemplo pueden tener el módulo contratado (el seed no crea aún activos/órdenes de ejemplo salvo que el script lo amplíe).

**Pos:**
- Categorías (Electrónica, Ropa)
- Proveedores (Tech Supplies Inc., Fashion Wholesale)
- Productos de ejemplo (Laptop Dell XPS 15, Camiseta Básica)
- Clientes (Juan Pérez, María García)
- Configuración de tienda
- Configuración de tickets
- Configuración de fidelidad
- Venta de ejemplo con puntos de fidelidad

**Nota**: El seed limpia todos los datos existentes antes de insertar nuevos datos.

**Locales de venta (Pos)**: El seed crea dos locales por empresa (Acme y Beta). Para que el selector "Local de venta" en Pos muestre opciones, la **API** debe usar la **misma base de datos** que usaste para el seed: configura la misma `DATABASE_URL` en `api/.env` que en `database/.env` (o la que usas al ejecutar `pnpm db:seed`).

## Migraciones

```bash
# Local Docker (desarrollo)
pnpm --filter @hubilee/database migrate:dev -- --name nombre_migracion

# Producción Neon (despliegue)
pnpm --filter @hubilee/database migrate

# Regenerar cliente
pnpm --filter @hubilee/database generate
```

## Referencias

- [Prisma + Neon](https://www.prisma.io/docs/orm/overview/databases/neon)
- [Neon – Connect from Prisma](https://neon.com/docs/guides/prisma)
- [PRISMA_SCHEMA_SPLIT.md](./prisma/PRISMA_SCHEMA_SPLIT.md) — plan para dividir el schema por dominio (el schema actual sigue en un solo archivo hasta aplicarlo).
