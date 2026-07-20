# @hubilee/ui

Biblioteca de componentes React compartida para las apps Hubilee. **Carpeta del repo:** `packages/component-library`. **Nombre npm:** `@hubilee/ui`.

## En este monorepo

Las apps **hub**, **shopflow**, **workify** y **techservices** declaran `"@hubilee/ui": "workspace:*"`. Tras clonar, `pnpm install` en la raíz enlaza el paquete local.

En desarrollo, `pnpm run dev:hub` (Turbo) levanta **`@hubilee/ui` en watch** (`vite build --watch`) y el Hub a la vez; no hace falta un `build` manual previo salvo CI o primera vez.

### Consumo externo (opcional)

Fuera del monorepo se puede instalar desde releases GitHub (p. ej. `github:…/hubilee-components#v1.x`) o `file:../component-library`, según cómo publiques el paquete.

## Uso

Tras el build, `dist/index.js` incluye `import './index.css'` al inicio: **basta con importar componentes desde `@hubilee/ui`** para que el bundler cargue el CSS. Opcionalmente puedes seguir importando `@hubilee/ui/styles` o `@hubilee/ui/index.css` explícitamente (p. ej. orden de capas).

```tsx
import { Button, Card, Input, Badge } from "@hubilee/ui";

export function MyComponent() {
  return (
    <Card>
      <Input placeholder="Enter text" />
      <Button>Submit</Button>
      <Badge>New</Badge>
    </Card>
  );
}
```

En **Next.js**, suele hacer falta `transpilePackages: ["@hubilee/ui"]` en `next.config`. Las apps que usan **Tailwind** pueden incluir `./node_modules/@hubilee/ui/dist/**/*.{js,ts,jsx,tsx}` en `content` si mezclas utilidades con la UI.

## Componentes

Primitivas **Radix UI**; estilos con **SCSS** (clases tipo `ui-btn`, `ui-card`, …) compilados a un CSS único en `dist/`. Patrón cercano a shadcn (composición, `cn()` con **clsx**).

| Área | Componentes |
|------|----------------|
| Feedback | Alert, Alert Dialog, Progress, Skeleton |
| Formulario | Button, Checkbox, Input, **InputField**, Label, Select, Switch, Textarea |
| Layout / navegación | Card, Dialog, Dropdown Menu, Scroll Area, **Sidebar** (nav + tipos `NavGroup`, `SidebarUser`), Separator, Tabs |
| Datos | Badge, Table |

También se exporta **`cn`** desde `lib/utils`.

## Temas

Variables CSS y partials SCSS en `src/styles/` (`_variables.scss`, `_theme.scss`, `components/_*.scss`). Tras `vite build`, el plugin `inject-css-import` en `vite.config.ts` antepone `import './index.css'` a `dist/index.js` para que el CSS viaje con el entry JS.

## Estructura del paquete

```
packages/component-library/
├── src/
│   ├── components/     # *.tsx
│   ├── styles/         # main.scss → bundle CSS
│   ├── lib/utils.ts
│   └── index.ts        # reexports
├── vite.config.ts      # build ES + CSS
├── tsconfig.build.json
└── package.json
```

## Tooling y versiones

Las dependencias de build y pruebas (`typescript`, `vite`, `vitest`, `@vitejs/plugin-react`, `sass`, `@types/*`) y los peers `react` / `react-dom` se declaran como **`catalog:`** en `package.json` y se resuelven desde el catálogo único del monorepo en `pnpm-workspace.yaml` (alineado con PLAN-32 / PLAN-35). No hace falta fijar versiones duplicadas en este paquete.

El build de librería usa **Vite** en modo `build.lib` (`vite.config.ts`): bundle ESM + CSS, luego **`tsc --emitDeclarationOnly`** para tipos en `dist/`. El plugin local `inject-css-import` antepone `import './index.css'` a `dist/index.js` tras el bundle.

### Bundlers alternativos (referencia)

**Vite** se mantiene como bundler: encaja con el pipeline actual (Sass, plugin React, hook post-build). **tsup** u otros bundlers mínimos serían candidatos si en el futuro se prioriza una config más corta o empaquetado distinto; cualquier cambio debe conservar los `exports` de `package.json` y el comportamiento del CSS descrito arriba. Ver decisión documentada en `docs/plans/[completed] PLAN-35-component-library-tooling-alignment.md`.

## Scripts

| Comando | Descripción |
|---------|-------------|
| `pnpm build` | Vite (`dist/index.js` + CSS) + `tsc` solo declaraciones (`.d.ts`) |
| `pnpm dev` | Vite build en modo watch |
| `pnpm test` | Vitest |
| `prepublishOnly` | Ejecuta `build` antes de publicar |

**Peer:** `react` y `react-dom` alineados con el catálogo del monorepo (p. ej. 19.2.x en lockfile).
