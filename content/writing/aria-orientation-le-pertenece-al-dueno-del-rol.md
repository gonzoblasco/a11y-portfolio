---
title: "aria-orientation le pertenece al dueño del rol"
slug: "aria-orientation-le-pertenece-al-dueno-del-rol"
date: "2026-08-24"
lang: "es"
kind: "note"
category: "accessibility"
pair: "aria-orientation-role-owners"
original_lang: "en"
summary: "Un Combobox con grid renderizaba aria-orientation sobre role=grid, que no lo admite. El atributo se mudó a los componentes que asignan el rol; el hook de teclado se quedó solo con el comportamiento."
tags: ["accesibilidad", "aria", "aria-orientation", "combobox", "open-source"]
repo: "mui/base-ui"
pr: 5551
---

Un atributo que falta se detecta fácil. No renderiza nada, un test falla, alguien tapa el hueco. El bug caro es el atributo que renderiza en el lugar equivocado: ahí es HTML válido, TypeScript válido, y aun así una contradicción.

En agosto mergeé mui/base-ui #5551 por uno de esos. Un Combobox con `grid` activado renderizaba esto:

```html
<div role="grid" aria-orientation="horizontal">
```

Cada mitad es legal por su cuenta. Juntas describen dos widgets distintos.

La reproducción era el selector de emojis oficial del ejemplo de Autocomplete con grid: abrís la lista, inspeccionás el elemento, encontrás `role="grid"` y `aria-orientation="horizontal"` en el mismo nodo, corrés axe. Nada parecía roto. El selector abría, las flechas movían, el emoji se insertaba.

## Dos instrucciones a la vez

`role="grid"` es una estructura de dos dimensiones. Tiene filas y columnas, y las flechas recorren los dos ejes. `aria-orientation="horizontal"` dice que el widget corre sobre una sola línea. Una persona que navega con lector de pantalla escucha la posición por fila y columna, y enseguida recibe un atributo que afirma que la cosa es una tira.

Ahí está la diferencia entre un bug que quita información y uno que agrega ruido. Una etiqueta faltante deja un silencio que se nota. Una contradicción deja una frase que suena completa y está mal, y la persona del otro lado no tiene cómo saber a cuál de las dos mitades creerle.

La especificación resuelve el conflicto descartando el atributo. WAI-ARIA 1.2 obliga a los agentes de usuario a ignorar propiedades no globales en roles que no las admiten, así que `grid` nunca recibe `aria-orientation`. Eso no es un arreglo. El componente publicó una intención que no podía expresar, la intención desapareció en el árbol de accesibilidad, y el teclado siguió funcionando porque la lógica del teclado nunca leyó ese atributo.

Axe lo encontró como violación `aria-allowed-attr`, reportada sobre el ejemplo oficial de Autocomplete con grid en la v1.7.0, con axe-core 4.10.2. Una herramienta lo vio. La suite del componente no, porque ningún test preguntaba qué elemento cargaba el rol.

## Por qué el tipo decía que sí

`aria-orientation` es una prop válida en cualquier elemento React. TypeScript revisa el nombre y el valor, `"horizontal" | "vertical" | undefined`. No puede revisar el rol del nodo al que llega la prop, porque en el momento del chequeo no hay nodo.

El atributo se armaba dentro de `useListNavigation`, volvía en un objeto de props y se esparcía después sobre el elemento que terminara con el rol. En el código fuente, el atributo y el rol nunca se cruzan. Se cruzan en el DOM, y solo una herramienta que inspecciona el árbol renderizado los ve juntos.

El tipo estaba haciendo su trabajo. Estaba revisando el contrato equivocado.

## Una variable, dos trabajos

La causa raíz era un acoplamiento. `AriaCombobox` pasaba `orientation: grid ? 'horizontal' : undefined` a `useListNavigation`, y el hook exponía cualquier orientación distinta de `'both'` como `aria-orientation`. El hook necesitaba `horizontal` de verdad: maneja ArrowLeft y ArrowRight dentro de un grid. Y después tomó esa necesidad de teclado como motivo para publicar ARIA.

Ahí está el dueño equivocado. Un hook de navegación sabe cómo tienen que moverse las teclas. No sabe qué rol va a renderizar quien lo consume, y no debería adivinarlo.

Tres componentes públicos se apoyan en ese hook. El Combobox, el Menu y el Select pasan una orientación cada uno y renderizan un rol distinto cada uno. Una emisión, tres roles, y solo uno rechaza el atributo de plano. Los otros dos lo aceptan y no lo necesitan.

Así que el arreglo sacó la emisión del hook, dos líneas borradas, y mudó el atributo a los componentes que asignan el rol final. `MenuRoot` renderiza `aria-orientation="horizontal"` solo cuando el menú es horizontal, porque `menu` es implícitamente vertical. `SelectPopup` perdió un `'aria-orientation': undefined` muerto en su rama de presentación. Grid y listbox no reciben nada: un grid es bidimensional, un listbox es implícitamente vertical, y decir cualquiera de las dos cosas en voz alta no agrega nada.

Siete archivos, 69 líneas agregadas, 4 borradas. Tres de esas adiciones son código de producción. Las otras 66 son tests: el Combobox con grid y con listbox, el hook genérico, un menú horizontal, uno vertical, un select listbox.

La proporción es la honesta. El cambio es chico y la prueba no.

Los tests buscan por rol, `getByRole('grid')` y `getByRole('listbox')`, y después afirman que el atributo está ausente. No por contenedor, no por test id. Ese es el chequeo que faltaba: una afirmación sobre el nodo que el lector de pantalla va a leer de verdad, en lugar de una afirmación sobre el nodo al que llegaron las props.

## La tercera vez

El issue apuntaba a dos arreglos anteriores de la misma forma: #4355 para Navigation Menu, #4628 para Toggle Group. El mismo atributo inválido, otro componente, el mismo hook abajo.

Ahí está la parte a la que volví varias veces. Cada arreglo era correcto donde caía, y el generador seguía. Mientras el hook compartido emitiera el atributo, cada consumidor nuevo heredaba el bug, y cada revisor tenía que notarlo otra vez en otro componente. Un parche por componente es un impuesto que se paga para siempre.

Lo que habría evitado el tercero es una convención, no un arreglo: el ARIA que depende de un rol le pertenece al componente que asigna el rol. Los hooks devuelven comportamiento. Los componentes publican semántica. Con esa línea trazada, la pregunta «este rol admite este atributo» tiene un lugar obvio donde responderse.

## La regla

Un atributo no es válido en abstracto. Es válido para un rol, sobre un elemento. Cuando lo que decide el rol no es lo que decide el atributo, el contrato no tiene dueño, y ningún tipo te lo va a decir.

Leé el atributo desde el elemento que carga el rol, no desde el objeto de props que lo produjo.
