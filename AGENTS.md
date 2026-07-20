# Agents — hubilee

## Where things live

| Qué | Dónde |
|-----|--------|
| Reglas de Cursor (carga automática) | [`.cursor/rules/*.mdc`](.cursor/rules/) — **versionado en git** (p. ej. [`frontend-design-system.mdc`](.cursor/rules/frontend-design-system.mdc) para UI/Tailwind/`@hubilee/ui`) |
| SDD (Spec-Driven Development, flujo Gentle AI) | Regla [`spec-driven-development-sdd.mdc`](.cursor/rules/spec-driven-development-sdd.mdc); artefactos en [`openspec/`](openspec/); **specs canónicas** en [`openspec/specs/`](openspec/specs/); cambios cerrados en [`openspec/changes/archive/`](openspec/changes/archive/). Configuración en [`openspec/config.yaml`](openspec/config.yaml). Skills `sdd-*` (gentleman-programming) cuando estén disponibles en el agente. |
| Skills del proyecto | [`.cursor/skills/`](.cursor/skills/) — **versionado en git** |
| Planes `PLAN-*.md` y checklists | [`docs/plans/`](docs/plans/) — fuente de verdad del contenido del plan |
| Convenciones y sync | [`docs/plans/SYNC.md`](docs/plans/SYNC.md) |

Borradores solo en `.cursor/plans/` no son canónicos; copiar a `docs/plans/` cuando el trabajo sea real.
