# @hubilee/contracts

Paquete **solo TypeScript**: tipos compartidos entre la **API** y las apps (**hub**, **shopflow**, **workify**, **techservices**). No incluye runtime ni dependencias de producción.

## Contenido (`src/`)

| Módulo | Exporta (resumen) |
|--------|-------------------|
| `auth.ts` | `LoginResponse`, `RegisterResponse`, `MeResponse`, `ContextResponse`, `CompaniesResponse`, **`ApiResponse<T>`** |
| `company.ts` | `CompanyModules` (flags `workify` / `shopflow` / `techservices`), `CompanyRow` |

El entry **`index.ts`** reexporta todo.

## Uso

```ts
import type { ApiResponse, LoginResponse, CompanyRow } from '@hubilee/contracts'
```

Tras cambios, compilar el paquete para actualizar `dist/` (p. ej. vía `pnpm build` en el workspace o el pipeline de Turbo):

```bash
pnpm --filter @hubilee/contracts build
```

## Scripts

| Comando | Descripción |
|---------|-------------|
| `pnpm build` | `tsc` → `dist/*.js` + `.d.ts` |
