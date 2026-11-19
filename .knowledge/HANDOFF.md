# HANDOFF - a11y-portfolio

**Fecha:** 2026-11-19 12:25 GMT-3
**Proyecto:** a11y-portfolio
**Branch:** main
**Repo:** https://github.com/gonzoblasco/a11y-portfolio
**Autor:** Kanam (CORE)

> HANDOFF generado en el cierre de sesion (2026-11-19). Es el punto de entrada para continuar este proyecto. El informe detallado de la sesion vive en `memory/2026-11-19.md`.

---

## Que se hizo en esta sesion

Sesion 2026-11-19: tres ensayos reescritos al espanol (pares quieter-announcement, bug-jsdom-could-not-see, aria-orientation-role-owners) y el articulo nuevo the-review-that-invented-a-bug / la-revision-que-invento-un-bug. Feed sin duplicados. Indice con una fila por pieza y link a la otra version; contadores corregidos de 21 a 16. Build: guard de par huerfano, versionado del CSS por hash de contenido, favicon SVG para eliminar el 404. A11y: skip link mueve el foco, chip con subrayado. Lighthouse en produccion: 99/100/100/100.

## Estado actual

21 articulos (16 piezas, 5 pares bilingues), desplegado y verificado en vivo. Cerrados del HANDOFF anterior: reescritura de los 9 articulos restantes, push, Pages live, bio de GitHub. Lighthouse produccion: 99/100/100/100; el punto faltante es el max-age=600 de GitHub Pages sobre las fuentes.

## Proximos pasos

1) Aprobar la voz del piloto (sigue abierto del HANDOFF anterior). 2) Conseguir acceso a la API key de dev.to: la clave existe en el store protegido pero el proxy de egress del gateway esta deshabilitado. 3) Decidir si el articulo nuevo se recorta: 1.569 palabras contra el rango 800-1.200 de blog-publishing. 4) Verificar mobile con viewport real: Chrome headless no lo cambia.

## Decisiones y contexto que no debe perderse

- Dirección A aprobada. El sitio es la copia canónica y dev.to la sindicación. Categorías: accessibility, testing, engineering, field-notes. La nota de shadcn se tradujo al inglés y se corrigió el título porque el original hablaba de slides y el cuerpo es de scroll anclado. Nuevas: una fila por pieza (la traducción es una vista, no una pieza); versionar assets por hash de contenido; no minificar CSS ni subsetear fuentes variables porque el ahorro medido no paga el riesgo.

## Archivos tocados

```
.knowledge/HANDOFF.md
.knowledge/SESSIONS.md
.knowledge/handoff-history/2026-11-17-1944-HANDOFF.md
memory/2026-11-19.md
memory/memory.db
```

## Como continuar

1. Leer este HANDOFF (estado actual + proximos pasos).
2. Leer `memory/2026-11-19.md` para el informe completo de la sesion.
3. Verificar el estado real antes de actuar (git, tests, la DB).

---

*Generado por `scripts/session-handoff.py` (session-lifecycle). Se regenera en cada cierre de sesion.*
