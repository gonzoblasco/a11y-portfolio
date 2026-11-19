---
title: "El bug que jsdom no podía ver"
slug: "el-bug-que-jsdom-no-podia-ver"
date: "2026-11-03"
lang: "es"
kind: "note"
category: "testing"
pair: "bug-jsdom-could-not-see"
original_lang: "en"
summary: "Un PR a shadcn/ui estuvo tres meses quieto mientras 61 tests de jsdom pasaban. jsdom no dispara eventos de scroll en scrolls programáticos, así que no podía ver el colapso del spacer que introducía el arreglo. Los tests de navegador encontraron ese y otros dos bugs."
tags: ["accesibilidad", "foco", "testing", "react", "open-source"]
repo: "shadcn-ui/ui"
pr: 11465
---

Un PR que abrí en agosto se mergeó el 2 de noviembre. Casi todo ese tiempo pasaron 61 tests en verde y el código estaba mal.

No en un rincón que nadie visita. `MessageScroller` es la primitiva detrás del ejemplo de chat en streaming, ese donde la respuesta se escribe sola en la página mientras mirás. El bug vivía en el segundo posterior a que scrolleás.

## Un scroll durante la respuesta

Cuando un mensaje del usuario queda anclado cerca del borde superior, el componente reserva espacio debajo: un spacer de cola, dimensionado para que la respuesta tenga dónde crecer sin empujar la página. A medida que llegan los chunks, el spacer se consume y la persona se queda donde está. Ese es el diseño entero.

Después la persona scrollea. Para arriba, casi siempre, a releer la pregunta. El scroll manual suelta el ancla, y desde ese momento el spacer no tiene dueño.

Con `autoScroll` prendido, el modo seguir se rearma en el commit siguiente y `scrollToEnd` lleva el spacer a cero en un solo frame. El espacio reservado colapsa y la vista salta al borde vivo mientras la respuesta mide tres líneas. Con `autoScroll` apagado no se rearma nada, el spacer se congela en su altura actual y queda un hueco muerto abajo de la respuesta. La respuesta puede crecer hasta llenar la pantalla y el hueco no se mueve.

El mismo gesto, dos fallas, una causa: scrollear para leer mientras llega una respuesta destruye el espacio reservado para la respuesta.

## El test que no podía fallar

`reconcileFollowMode` tenía una rama que rearmaba `following-bottom` siempre que `autoScroll` estuviera prendido y el scroll no estuviera al final. Excluía dos modos, `settling-jump` y `anchored-to-message`. No excluía `free-scrolling`, el modo en el que queda un turno después de que la persona agarra el scroll.

La otra mitad es geometría. `scrollable.end` se mide contra `contentBottom`, y `contentBottom` no incluye el spacer de cola. Alguien parado dentro del spacer se lee como si estuviera al final, entonces su propio gesto lo devolvía a modo seguir. El chunk siguiente llamaba a `scrollToEnd` y un frame después el espacio ya no estaba.

El otro hueco era más simple: un spacer liberado nunca se drenaba. `scrollToEnd` lo consumía en el camino de seguir, y nada más lo tocaba.

Escribí el arreglo y un test de regresión. La suite llegó a 61 en verde, typecheck limpio, y abrí el PR.

## La primera revisión

daltino leyó la lógica de drenaje al día siguiente e hizo una sola pregunta: qué pasa si el stream se corta antes de que el spacer llegue a cero. La guarda que había puesto, `spacerHeight === 0`, iba a bloquear para siempre la reactivación del modo seguir. El test solo ejercitaba el camino feliz, donde el stream dura lo suficiente para drenar el espacio.

Esa lectura era correcta, y el caso borde era el interesante. Un stream no es una promesa: puede terminar a mitad de oración, a mitad del drenaje, con unos píxeles de espacio reservado y ningún resize posterior que los consuma.

Moví el drenaje a `drainReleasedSpacer` y lo llamé desde dos lugares: `handleResize`, cuando la respuesta crece hacia el espacio, y `syncAfterScroll`, cuando la persona se mueve. Un scroll hasta el fondo real termina el trabajo, porque el fondo incluye el spacer. Agregué el test que corta el stream.

En ese punto el código hacía lo que yo creía que tenía que hacer. Seguía sin ser mergeable.

## Lo que jsdom no puede ver

shadcn revisó el 2 de septiembre y nombró la cosa que ningún test de mi suite podía nombrar: `syncAfterScroll` corre en cada evento de scroll, incluido el programático que ubica un turno anclado. En un navegador real con `autoScroll` prendido, cada turno anclado salía disparado al fondo. Exactamente el bug que el PR existía para arreglar, reintroducido por su propio arreglo.

Los 61 tests pasaban porque jsdom no dispara eventos de scroll para scrolls programáticos. El handler nunca corría. El test no era débil ni estaba mal escrito: medía una página donde el evento no ocurre.

Dos problemas más chicos vivían en la misma función. En el resize, alguien que había scrolleado por encima de la zona del spacer producía `consumed` igual a cero, así que el spacer colapsaba y `scrollToEnd` lo sacaba de la transcripción que estaba leyendo. En el scroll, el drenaje restaba un solapamiento absoluto en cada evento en vez de un delta, así que el scroll inercial drenaba de más y encadenaba un salto.

La revisión salteaba `anchored-to-message`, `settling-jump` y la bandera de scroll programático. Recalculaba el espacio desde geometría absoluta en cada evento, `max(0, contentBottom + spacerHeight - (scrollTop + clientHeight))`, así eventos repetidos convergen en vez de acumularse. Retornaba temprano cuando la persona estaba por encima de la zona del spacer, y le pasaba el control a `scrollToEnd` solo en el fondo real, donde el spacer vale cero por construcción. Después, dos tests de navegador con `autoScroll` prendido: uno afirma que ubicar un turno anclado no dispara al fondo, el otro que un scroll manual drena el spacer sin mover a la persona y que scrollear al fondo reactiva el modo seguir.

jsdom pasó 51 de 51. El modo navegador pasó 48 de 48.

## Qué significa el verde

Yo también había diagnosticado mal, antes de todo esto. El 3 de agosto, sandengocka describió los dos cambios en el hilo del issue con el razonamiento completo. Contesté que `main` ya lo cubría en el #11106. No lo cubría.

Ese arreglo corría mientras el turno seguía en `anchored-to-message`; este bug vive en lo que pasa después de que un scroll manual lo saca de ese modo. Volví al código, confirmé su lectura y escribí el PR encima.

Una suite en verde es una afirmación sobre un entorno, no sobre el producto. jsdom es honesto con el DOM y mudo sobre lo que hace un navegador mientras scrollea, y el hueco entre esas dos cosas es exactamente donde un spacer, un evento de scroll y un solo frame arruinan una experiencia de lectura.

Probá donde vive el bug. Tres meses, cuatro archivos, 346 líneas agregadas por una borrada, y lo que lo destrabó fue un test que otro runtime podía correr de verdad.
