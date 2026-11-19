---
title: "Los slides ocultos no deberían tener foco"
slug: "hidden-slides-focus"
date: "2026-11-03"
lang: "es"
kind: "note"
summary: "Un PR en shadcn/ui estuvo tres meses trabado porque los tests corrían en jsdom, que no ve el scroll programático. Los tests en browser encontraron ese bug y dos más en la misma función."
tags: ["accessibility", "focus", "testing", "react", "open-source"]
repo: "shadcn-ui/ui"
pr: 11465
source: "linkedin"
---

Un PR que abrí en agosto se mergeó ayer. Tres meses. Y lo que lo destrabó no fue el código: fue un test que no podía ver el bug.

El bug: en un chat con streaming y scroll anclado, si scrolleás mientras la respuesta se va escribiendo, el espacio reservado debajo del mensaje se rompe. Con autoScroll prendido, la vista salta al fondo aunque la respuesta todavía sea chica. Con autoScroll apagado, te queda un hueco muerto abajo que nunca se resuelve.

En los dos casos, una acción completamente normal, scrollear para leer, destruye la vista.

El fix tenía dos partes: condicionar el re-armado de follow-mode a que el spacer esté en cero, y drenar ese spacer cuando se suelta el ancla, haciendo que la respuesta lo vaya llenando sin mover al lector.

Los tests pasaban. 61 tests, todo verde. Y el PR no era mergeable.

El motivo lo dijo shadcn en la review, y fue la mejor review que me hicieron este año: los tests corrían en jsdom, y jsdom no dispara eventos de scroll para scrolls programáticos. Sin eso, el test no puede ver que el drain rompía justo lo que el PR venía a arreglar. En un browser real, cada turno anclado salía disparado al fondo.

Verde en CI no significa correcto. Significa que ese entorno no vio el problema.

Agregué tests en modo browser. Y ahí salió: además de ese, había dos errores más en la misma función. Uno de ellos era la matemática del drenaje, que acumulaba error en scroll inercial. También contó daltino, que en agosto levantó el caso del stream que corta con el spacer a medio drenar.

El aprendizaje no es "testeá mejor". Es más específico: cuando el bug vive en el scroll, en la geometría o en el timing, el test tiene que correr donde el bug existe. jsdom es excelente para el DOM. Para lo que pasa mientras el navegador hace scroll, es ciego por diseño.

PR: https://github.com/shadcn-ui/ui/pull/11465
