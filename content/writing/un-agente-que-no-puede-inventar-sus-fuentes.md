---
title: "Un agente que no puede inventar sus fuentes"
slug: "un-agente-que-no-puede-inventar-sus-fuentes"
date: "2026-11-18"
lang: "es"
kind: "essay"
category: "engineering"
pair: "verifiable-citations"
original_lang: "en"
summary: "Casi todos los demos de retrieval se rompen la primera vez que el modelo inventa un número de página. No lo arregla un modelo mejor: lo arregla un verificador al que el modelo no puede convencer."
tags: ["llm", "rag", "verificación", "local-first", "python"]
repo: "gonzoblasco/localdoc-agent"
---

Todo demo de recuperación de información se ve igual hasta que se equivoca.

Subís PDFs, los partís en fragmentos, los convertís en embeddings, buscás por similitud y le pasás los fragmentos al modelo. Funciona. Después el modelo escribe:

> «El contrato vence el 15 de diciembre, según la cláusula 4.2, página 3.»

La cláusula 4.2 dice otra cosa. La página 3 no existe. El modelo no mintió a propósito: rellenó un hueco con algo que sonaba probable. Y como nadie verifica, la respuesta incorrecta sale igual.

Eso no es un problema de recuperación. Es un problema de **verificación**, y no se arregla con un modelo mejor.

## El verificador tiene que ser independiente

La respuesta vuelve como datos estructurados: un identificador de fragmento y una cita textual. La aplicación no le cree al modelo. Compara la cita contra el fragmento.

```python
def verify_citations(citations, chunks_by_id):
    valid, invalid = [], []
    for cit in citations:
        chunk = chunks_by_id.get(cit["chunk_id"], "")
        if _normalize(cit["quote"]) in _normalize(chunk):
            valid.append(cit)
        else:
            invalid.append(cit)
    return valid, invalid
```

Una cita es válida solo si su texto es una subcadena del fragmento, después de normalizar los espacios. Si falla, el modelo tiene un intento más. Si vuelve a fallar, la respuesta se convierte en una negativa.

Esto no es otro modelo revisando al primero. Es contención de cadenas. Cualquiera lo reproduce abriendo la base, y eso es justamente el punto: **el verificador no puede compartir el modo de falla de lo que verifica.**

## Tres veces que casi sale mal

Esta parte suele quedar afuera.

**Los embeddings eran falsos y los tests estaban en verde.** La primera versión llamaba a `ollama embed`, un subcomando que no existe. Cada llamada fallaba y caía, en silencio, a un vector simulado de tres dimensiones. Los tests pasaban porque revisaban estructura, no valores. El arreglo no fue mejorar el simulado: fue eliminar el respaldo. Un sistema que degrada en silencio es peor que uno que se rompe fuerte.

**La búsqueda vectorial no era vectorial.** `sqlite-vec` nunca se cargaba, así que `chunks_vec` era una tabla común y la consulta de vecinos era fuerza bruta. Funcionaba con trece fragmentos y se habría caído con mil trescientos. Lo encontré leyendo `sqlite_master` en vez de confiar en el código que la creaba.

**Un delegado reportó archivos que nunca escribió.** Tres veces un subagente devolvió un resumen de entrega para un módulo que no existía en disco. La lección es de proceso, no de técnica: correr el repositorio antes de aceptar un informe. Si el archivo no está, el trabajo no está.

## El modelo no es el producto

Todos preguntan qué modelo. La respuesta honesta es que importa menos que la medición.

| Modelo | Exactitud sobre 18 preguntas | Latencia mediana |
|---|---:|---:|
| 12B local | **18/18** | 49,5 s |
| 4B local | 4/18 | 6,8 s |

El modelo chico es siete veces más rápido y cuatro veces y media menos exacto. Sirve para un demo. No sirve para un contrato.

Un resultado que nadie espera: un modelo de 9B fue **más lento** que el de 12B. Mantuvo un contexto de 262k en memoria y no terminó una sola respuesta en noventa segundos. La cantidad de parámetros no es la latencia. Se mide en tu máquina, con tu corpus y tus preguntas.

## Lo que el modelo no debería hacer

Una pregunta pedía la suma de dos totales de contrato. El 12B falló siempre: no suma. El arreglo fueron ocho líneas de código determinístico. El agente recupera y redacta; la calculadora suma.

El mismo principio, una capa más abajo: **todo lo que se puede verificar con código se verifica con código, y lo que queda en manos del modelo se declara como suposición.**

## Qué significa local-first cuando es una afirmación comprobable

Tres pruebas, no tres promesas:

1. **Cero sockets.** Durante la transcripción y la consulta, `lsof` no muestra ninguna conexión saliente.
2. **Se puede borrar.** Un botón elimina índice, embeddings y borradores, verificado en el sistema de archivos.
3. **No se alquila.** En diez años el archivo se abre sin suscripción.

Y la consecuencia que suele omitirse: si los datos no salen, tampoco entran. El modelo es local porque la privacidad es la arquitectura, no una opción.

## Lo que este proyecto no hace

- No lee PDFs escaneados. Los rechaza con un mensaje explícito.
- No es rápido. Cincuenta segundos por respuesta con un modelo de 12B.
- No escala. Una persona, una máquina, un corpus.
- No tiene un benchmark independiente. Las dieciocho preguntas las escribió la misma persona que escribió el sistema.

Decir esto no debilita el proyecto. Lo vuelve usable: quien lo lee sabe qué recibe, y quien lo revisa sabe qué falta.

El repositorio, con el registro de fallas y los datos de la evaluación, está en [localdoc-agent](https://github.com/gonzoblasco/localdoc-agent). Su hermano, sobre voces de familia en vez de contratos, es [memoria-oral](https://github.com/gonzoblasco/memoria-oral).
