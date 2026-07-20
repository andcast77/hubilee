# @hubilee/shared

Utilidades **frontend** compartidas entre **hub**, **pos**, **workify** y **techservices**: cookie de sesión JWT y cliente HTTP (`fetch`) con el mismo contrato en todas las apps.

No publica `dist`: el paquete exporta **fuentes TypeScript** (`main` / `exports` → `src/*.ts`). Las apps deben resolver TS vía el bundler (p. ej. `transpilePackages` en Next.js).

## Exports

| Ruta | Contenido |
|------|-----------|
| `@hubilee/shared` | Reexporta auth + api-client |
| `@hubilee/shared/auth` | `getTokenFromCookie`, `setTokenCookie`, `clearTokenCookie` — cookie `token`, `SameSite=Strict`, `Secure` en HTTPS |
| `@hubilee/shared/api-client` | `ApiClient`, `ApiError`, `getAuthHeaders`, `createPrefixedApi`, tipos `ApiResponse`, `PaginatedResponse` |

## Uso rápido

```ts
import { ApiClient, createPrefixedApi } from '@hubilee/shared'
import { setTokenCookie } from '@hubilee/shared/auth'

const client = new ApiClient(process.env.NEXT_PUBLIC_API_URL!)
const pos = createPrefixedApi(client, '/api/pos')
```

`ApiClient` añade `Authorization: Bearer <token>` leyendo la cookie si no se pasa cabecera explícita.

## Nota respecto a `@hubilee/contracts`

Los tipos de respuesta API en backend/contratos viven en **`@hubilee/contracts`**. Aquí `ApiResponse` / `PaginatedResponse` son interfaces ligeras del cliente; alinear payloads con la API real.
