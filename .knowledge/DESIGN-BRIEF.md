# Design brief - a11y-portfolio

> Fecha: 2026-11-18. Estado: direcciones en evaluación visual (previews A/B/C).
> Método: `agents/kanam-dev/skills/design-direction/SKILL.md` y el frente `studies/design/`.

## 1. Propósito

- **Qué resuelve:** que un comprador de accesibilidad (equipo de producto, AI builder, agencia)
  entienda en menos de 60 segundos qué hace Gonzalo, vea evidencia y lea una pieza técnica.
- **Quién:** decisores técnicos y de producto, en inglés. Llegan desde GitHub, LinkedIn o dev.to.
- **Apuro:** medio. No está comprando un producto ahora: está evaluando criterio.
- **Acción primaria:** leer una nota. **Acción secundaria:** contactar / probar Preflight.

## 2. Tono

- **Pieza memorable, no herramienta funcional.** Es un portfolio: la neutralidad no es una virtud.
- Dirección base: **editorial técnica**. Autoridad tranquila, legibilidad de lectura larga, un solo
  acento. La accesibilidad se demuestra, no se declara.
- Lo que se sacrifica: densidad de dashboard, efectos, y cualquier cosa que compita con el texto.

## 3. Restricciones

- Estático, sin JS obligatorio; GitHub Pages desde `main`.
- WCAG 2.1 AA como piso, con foco visible, landmarks, skip link y teclado.
- `prefers-reduced-motion` respetado desde el diseño.
- Peso: fuentes self-hosted o stacks del sistema; sin dependencias de CDN en producción.
- El contenido vive en markdown; el HTML se genera (Bun 1.4.2, `Bun.markdown`).

## 4. Diferenciación

- **El sitio es la prueba de la tesis.** La tesis es "lo que el screen reader anuncia, no lo que el
  markup declara". El sitio debe poder auditarse con la misma vara.
- Elemento memorable candidato: la pieza de cada artículo que muestra **qué se anuncia** (una cita
  transcripta), no una captura de código.

## 5. Arquitectura de información

```
/                       Home: tesis, trabajo seleccionado, últimas notas, contacto
/writing/               Índice de notas y ensayos (por año, con tipo e idioma)
/writing/<slug>.html    Artículo
/about/                 Quién es, trayectoria corta, contacto
/preflight/             Producto: qué hace, ejemplo, CTA
/404.html
```

## 6. Candidatas de dirección (a decidir con previews)

| | Nombre | Registro | Elemento memorable | Riesgo |
|---|---|---|---|---|
| A | Revista técnica | Editorial impresa: papel cálido, serif con carácter, mono para metadata, grid asimétrico | La página se lee como un journal, no como un portfolio | Puede sentirse conservador |
| B | Transcript | Oscuro, mono dominante, riel de rol/estado + columna de lo anunciado | La home literalmente muestra "lo que se anuncia" | Gimmick; fatiga de lectura en oscuro |
| C | Señal alta | Brutalista accesible: blanco/negro, rojo señal, reglas gruesas, foco como motivo | Energía y postura política de la accesibilidad | Frialdad; puede envejecer mal |

## 7. Criterio de decisión

Se elige por reacción a los previews, no por descripción. Gates aplicados a la elegida:
grayscale, squint, alignment, spacing, contrast (peor píxel en superficies no uniformes), rank-1.
