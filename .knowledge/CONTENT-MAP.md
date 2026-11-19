# Content map - a11y-portfolio

> Inventario del contenido que existe y decisión de qué entra al sitio.
> Fuente: `docs/linkedin/*.md` del workspace (verificado 2026-11-18) y
> `writing/the-quieter-announcement.html`.

## Qué entra

| # | Slug | Título | Fecha | Idioma | Tipo | Fuente |
|---|---|---|---|---|---|---|
| 1 | `the-quieter-announcement` | The Quieter Announcement | 2026-11-17 | en | essay | longform + HTML publicado |
| 2 | `breadcrumb-without-color` | A breadcrumb that does not rely on color | 2026-08-24 | en | note | astryx #4605 |
| 3 | `hovercard-dialog-semantics` | When a HoverCard calls itself a dialog | 2026-08-25 | en | note | astryx #5419 |
| 4 | `naming-a-tree` | Naming a tree | 2026-08-26 | en | note | astryx #5493 |
| 5 | `aria-orientation-role-owners` | aria-orientation belongs to the role owner | 2026-08-24 | en | note | base-ui #5551 |
| 6 | `dialog-description` | The dialog description that never arrived | 2026-10-22 | en | note | carbon #22887 |
| 7 | `focus-after-step-change` | Focus after the step changed | 2026-09-14 | en | note | ibm-products #9878 |
| 8 | `sortable-headers` | Sortable headers are not toggle buttons | 2026-10-07 | en | note | ibm-products #9879 |
| 9 | `the-bug-jsdom-could-not-see` | The bug jsdom could not see | 2026-11-03 | en | note | shadcn #11465 |
| 10 | `orchestrating-a-refactor` | Orchestrating a 10,000-line refactor | 2026-08-28 | en | note | Moderno AI Cleaner Pro |
| 11 | `posinset-across-sections` | Counting items across sections | 2026-09-09 | en | note | react-spectrum #10554 |
| 12 | `the-challenge-was-already-over` | The challenge was closed before we started | 2026-11-18 | en | note | field notes / dev.to audit |

## Qué NO entra (y por qué)

| Pieza | Motivo |
|---|---|
| `react-spectrum-combobox-announce.md` (#10503) | Es la versión corta del ensayo `the-quieter-announcement`. Duplicaría contenido en el mismo sitio. |
| `oss-2026-08-24.md` | Roundup de tres merges ya cubiertos por notas individuales. |
| `astryx-treelist-naming.md` | Traducción al español del mismo PR #5493 que `naming-a-tree`. Se puede publicar como versión ES más adelante. |

## Categorías

Accesibilidad es la prioridad, no el límite. El sitio tiene cuatro categorías y el build
genera una página por categoría con contenido.

| Slug | Etiqueta | Artículos |
|---|---|---|
| `accessibility` | Accessibility | 9 |
| `testing` | Testing | 1 (The bug jsdom could not see) |
| `engineering` | Engineering | 1 (Orchestrating a 10,000-line refactor) |
| `field-notes` | Field notes | 1 (The challenge was closed before we started) |

La categoría es obligatoria en el frontmatter. El build falla si falta o no es una de las
cuatro. Una pieza sobre un ejercicio de dev.to va a `field-notes`, no a `accessibility`.

## Reglas editoriales

- Un artículo por archivo en `content/writing/<slug>.md`, con frontmatter y `canonical`.
- El cuerpo conserva la primera persona y la historia técnica. Se quitan hashtags y frases
  que solo tienen sentido en LinkedIn.
- No se inventan hechos, números, PRs ni fechas: si no está en la fuente, no va.
- El ensayo es la pieza larga canónica; las notas cortas pueden enlazarlo.
- Fechas: se usa la fecha de publicación registrada en el `Status:` del archivo fuente.

## Pendientes de contenido

- [x] Traducir al inglés la nota de shadcn. El título original no describía el cuerpo: el PR es de
  scroll anclado, no de slides.
- [ ] Escribir la versión dev.to de cada pieza con `canonical_url` al sitio (bloqueado hasta tener API key).
- [ ] Corregir el `Status:` del longform en `docs/linkedin/`: dice BORRADOR y está publicado.
