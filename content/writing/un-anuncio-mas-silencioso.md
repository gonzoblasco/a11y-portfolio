---
title: "Un anuncio más silencioso"
slug: "un-anuncio-mas-silencioso"
date: "2026-11-17"
lang: "es"
kind: "essay"
category: "accessibility"
pair: "quieter-announcement"
original_lang: "en"
summary: "Arreglé un bug de lector de pantalla borrando un anuncio. La live region de React Spectrum pisaba lo que VoiceOver ya decía solo, y ningún linter podía ver esa colisión."
tags: ["accesibilidad", "lectores-de-pantalla", "voiceover", "react-spectrum", "aria"]
---

Una vez arreglé un bug de lector de pantalla borrando un anuncio.

Suena al revés, y ese es el punto. En la superficie el cambio era chico: 41 líneas agregadas, 80 borradas, un hook, dos archivos de test, mergeado en React Spectrum de Adobe en octubre. Lo que quedó a la vista es más incómodo: casi todo el trabajo de accesibilidad apunta al blanco equivocado.

## Lo que escuchaba la persona

Un ComboBox con secciones. Lo abrís y bajás con las flechas. VoiceOver, en macOS y en iOS, dice cada ítem mientras te movés: la etiqueta, el rol, la posición, si está seleccionado.

Es un anuncio completo. Y es, en el sentido más literal, un regalo: el navegador y el lector de pantalla se pusieron de acuerdo para producirlo.

React Spectrum lo pisó.

El hook `useComboBox` traía un parche, y el comentario de arriba explicaba por qué existía:

```js
// VoiceOver has issues with announcing aria-activedescendant properly on change
// (especially on iOS). We use a live region announcer to announce focus changes
// manually.
```

Un patrón `aria-activedescendant` mueve el foco dentro del árbol de accesibilidad sin mover el foco real. Varios lectores de pantalla no seguían ese movimiento con confianza, así que la librería anunciaba cada cambio a mano, con una live region, por las dudas.

El parche era correcto cuando se escribió. Dejó de serlo cuando VoiceOver empezó a anunciar el detalle de cada ítem por su cuenta. Y en el momento en que las dos cosas pasaron a la vez, no se sumaron: compitieron.

La live region disparaba en cada cambio de ítem enfocado y reemplazaba el habla nativa por una sola cadena: el nombre. En lugar de escuchar «Precios, elemento de menú, 3 de 12, seleccionado», la persona escuchaba «Precios» y seguía.

Menos información, entregada con más urgencia. Eso es la definición de una regresión que se esconde.

## Por qué nada lo detectó

Pasá esa página por axe. Todo en verde.

El combobox tiene el rol correcto. `aria-expanded` está sincronizado. `aria-controls` apunta al listbox que corresponde. Las opciones llevan `aria-selected` y `aria-posinset`, y el `aria-setsize` coincide. La live region existe, no está oculta y no está vacía. Cada atributo que un linter sabe revisar está presente o no aplica.

El bug vivía donde ningún linter mira: en la colisión entre dos cosas que, cada una por separado, estaban bien.

Ahí la accesibilidad no es una propiedad del marcado. Es una propiedad del runtime, y más precisamente de lo que una persona escucha. El marcado es la entrada. No es la cosa.

## El arreglo

El anuncio todavía hacía falta en un caso angosto: entrar a una sección nueva, donde VoiceOver se queda callado y se perderían el título de la sección y la cantidad de opciones. Así que la condición pasó a ser el cambio de sección, no el ítem.

```js
if (isGroupChange) {
  const announcement = stringFormatter.format('focusAnnouncement', {
    isGroupChange: true,
    groupTitle: sectionTitle,
    groupCount: section ? [...getChildNodes(section, state.collection)].length : 0,
    optionText: focusedItem['aria-label'] || focusedItem.textValue || '',
    isSelected
  });

  announce(announcement);
}
```

Todo lo demás se calla y deja hablar a la plataforma. Recorrer una sección: voz nativa, intacta. Llegar al ítem seleccionado: voz nativa, intacta. Entrar a una sección: un anuncio manual con el título y la cantidad, y después a un costado.

La revisión fue la parte difícil, y también la interesante. Yo había actualizado los tests del combobox para afirmar que navegar ítem por ítem ya no dispara un anuncio manual. El maintainer me frenó dos veces. La primera versión, según su lectura, era un `not.toHaveBeenCalled` disfrazado. La segunda ronda preguntó qué cubrían esos tests que no cubriera nada más. La respuesta, al final, era nada. Cuando el anuncio se mudó al cambio de sección, los tests se quedaron sin qué afirmar, y se fueron. La suite cerró con 259 tests en dos paquetes.

Entregué un diff más chico del que abrí, y el PR quedó mejor por eso. No es el instinto que tenemos la mayoría.

## El segundo error, que fue mío

Un mes antes había mergeado un PR solo de tests en el mismo repo, para fijar que `aria-posinset` sigue siendo global entre secciones de un menú. Cuatro ítems en dos secciones tienen que contar 1 a 4, igual que `aria-setsize=4`. Si una sección reinicia la cuenta, el lector anuncia «ítem 1 de 2» cuando la verdad es «ítem 1 de 4».

React Spectrum ya lo hacía bien. Nada lo garantizaba. El test estaba para que un refactor futuro no lo rompiera en silencio.

Mi primera versión de ese test no servía para nada.

El helper que usé para armar el fixture aplanaba las secciones en una lista de ítems. El DOM que el test renderizaba nunca tuvo la estructura con secciones que el test decía cubrir. Daba verde. Era decoración. Un maintainer lo vio en segundos.

La versión corregida renderiza cada sección a través del hook real, con grupos etiquetados y sus encabezados, y cubre además la sección sin encabezado, donde el nombre accesible sale de `aria-label`.

Dos PRs, dos errores distintos, la misma raíz: estaba razonando sobre el modelo que tenía en la cabeza y no sobre el artefacto que sale. En el primer caso le creí al atributo antes que al anuncio. En el segundo le creí al fixture antes que al DOM.

## La regla que me quedó

Si querés saber si un componente es accesible, no preguntes qué atributos tiene. Preguntá qué dice el lector de pantalla cuando una persona lo usa. Son dos preguntas distintas, y solo una es el producto.

Casi toda la herramienta contesta la primera, porque la primera es barata: se responde parseando HTML, y parsear escala. La segunda exige correr la cosa, en un navegador, con una tecnología asistiva enganchada, y leer la salida. No escala ni parecido. También resulta ser la única que anticipa lo que vive un usuario ciego.

Ese hueco es el que terminé rodeando con una herramienta. Preflight carga una página en un navegador, lee su salida de accesibilidad como la consume un lector de pantalla, y reporta lo que se anuncia en vez de lo que se declara.

La página de demo de su README tiene todos los atributos en su lugar, dos imágenes sin nombre y un botón sin nombre. HTML válido, lint limpio, inusable.

PRs: [adobe/react-spectrum#10503](https://github.com/adobe/react-spectrum/pull/10503) y [#10554](https://github.com/adobe/react-spectrum/pull/10554).
