# Implementation notes — a11y-portfolio

Fecha: 2026-11-18. Dirección aprobada: A (Revista técnica).

## Arquitectura

- `content/writing/*.md` es la fuente de verdad. `scripts/build.ts` genera las páginas.
- Sin dependencias npm. Bun 1.4.2 (`Bun.markdown.html`) hace la conversión.
- Las fuentes se sirven desde `assets/fonts/` (subsets latin, WOFF2). Sin Google Fonts en runtime.
- Todas las URLs internas son relativas: el sitio vive en un project page, no en la raíz del dominio.

## Contraste (WCAG 2.1)

Pares de tokens, calculados con la fórmula de luminancia relativa:

| Par | Ratio | Uso | Veredicto |
|---|---|---|---|
| `#17140f` sobre `#f4efe6` | 16.04:1 | texto principal | AAA |
| `#5d564b` sobre `#f4efe6` | 6.33:1 | texto secundario | AA/AAA |
| `#8a2f12` sobre `#f4efe6` | 7.35:1 | links y acentos | AAA |
| `#17140f` sobre `#ebe4d7` | 14.53:1 | texto en bloques de código | AAA |
| `#8a2f12` sobre `#ebe4d7` | 6.66:1 | links en bloques de código | AA/AAA |

`#cfc7b8` sobre `#f4efe6` es 1.47:1: se usa solo como borde decorativo y separador, nunca como
texto. Los bordes no están sujetos al mínimo de contraste de texto (WCAG 1.4.11 aplica a
componentes e información, no a reglas puramente decorativas).

## Decisiones

- **H1 de la home:** la tesis, no el nombre. El nombre va en el wordmark del header.
- **El ensayo es la pieza ancla.** Las notas cortas enlazan al sitio; el sitio es la copia canónica.
- **Nota en español:** `<article lang="es">` y badge visible `En español`. El chrome de la página
  sigue en inglés.
- **Sin JavaScript.** La navegación y el índice funcionan sin JS.
- **`pre` con `tabindex="0"`:** necesario para que el bloque sea scrolleable por teclado
  (WCAG 2.1.1). `role="region"` + `aria-label` le dan un nombre accesible.
- **Fechas:** `<time datetime>`; se usa la fecha de publicación registrada en cada pieza. Cuando
  la fuente no registra publicación y solo tiene la del merge, se usa esa y se documenta acá. No se
  presenta una fecha de merge como si fuera de publicación.

## Verificación ejecutada

- `bun scripts/build.ts` → exit 0, 11 artículos.
- Rutas 200: home, writing, 11 artículos, about, preflight, 404, feed, sitemap, robots, CSS y fuentes.
- Links internos: 0 rotos; 0 `href="#"`.
- Estructura: 1 `h1` por página, sin IDs duplicados, landmarks completos, skip link.
- Foco: el primer Tab lleva al skip link; outline de 2px óxido visible.
- Overflow: 0 a 390, 768 y 1280 en las 6 rutas principales.
- Contraste: ratios de la tabla, medidos con `contrast.py`.
- axe-core (WCAG 2.1/2.2 A+AA+best-practice): 0 violaciones en las 7 rutas.

## Revisión independiente (rol B) y correcciones

La revisión independiente encontró 1 P1 y varios P2. Todos los accionables quedaron corregidos:

| Hallazgo | Estado |
|---|---|
| 404 con rutas relativas se rompía en un 404 anidado | corregido: `root` absoluto `/a11y-portfolio/` solo en 404 |
| IDs de heading podían colisionar | corregido: set global + `while` |
| Fecha calendárica inválida pasaba el build | corregido: round-trip `toISOString` |
| Slugs duplicados se sobrescribían | corregido: el build falla |
| Dos regiones con el mismo nombre accesible | corregido: `Code sample`, `Code sample 2` |
| `lang` del documento en la nota ES | corregido: `<html lang="es">`, chrome con `lang="en"` |
| "All notes" dentro del `h2` | corregido: movido a `.section-head` |
| Nombre accesible del link incluía todo el excerpt | corregido: `aria-labelledby` al título |
| Screenshots de 390 desactualizados | corregidos: 390×2248 y 390×2556 reales |
| `lastmod` de páginas estáticas engañoso | corregido: solo los artículos tienen `lastmod` |

Quedan como decisiones conscientes: `pre[tabindex="0"]` en bloques que a 1280 no scrollean (es la
práctica estándar para WCAG 2.1.1) y el peso de las fuentes (~300 KB en home). El conteo de 259
tests del ensayo no se pudo verificar contra el PR; es una afirmación de la pieza original y queda
pendiente de confirmación de Gonzo.

## Pendientes conocidos

- El `Status:` del longform en `docs/linkedin/` sigue diciendo BORRADOR; el artículo está publicado.
- dev.to queda como sindicación con `canonical_url` al sitio, bloqueado hasta tener API key.
- El post en español de shadcn no tiene versión en inglés.
