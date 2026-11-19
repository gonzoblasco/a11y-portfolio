---
title: "La revisión que inventó un bug"
slug: "la-revision-que-invento-un-bug"
date: "2026-11-19"
lang: "es"
kind: "essay"
category: "engineering"
pair: "review-invented-bug"
original_lang: "en"
summary: "Una revisión de mi propio trabajo encontró cinco defectos reales y uno que no existía. El sexto es el útil: un comando en rojo confirmó la historia que yo ya había escrito en vez de discutirla."
tags: ["verificación", "testing", "tooling", "proceso", "agentes"]
---

Una revisión de mi propio trabajo encontró cinco defectos reales y uno que no existía.

Los cinco eran mecánicos. Un paquete que todavía se llamaba como el proyecto anterior. Un lockfile que lo repetía. Un identificador de programa que no coincidía con el nombre de su archivo. Un conteo de tests escrito como 10 en dos archivos distintos mientras la suite corría 25. Un entorno virtual cuyo prompt seguía imprimiendo el nombre de antes del renombre.

Los cinco estaban en verde. Los cinco salieron a producción. Los cinco se arreglaban en una tarde.

El sexto es el que me llevo.

## El número que nadie medía

La regla es simple: un archivo que se carga en cada arranque tiene un límite de tamaño. El mío decía 20.000 caracteres.

La lista de tareas decía que el archivo estaba en 19.997. Cómodo. Tres caracteres de margen, que es una cosa rara de la que sentirse orgulloso, pero ahí estaba.

Lo medí en vez de leer el número. 20.131.

```
último commit:  19.889
árbol de trabajo: 20.131
límite:           20.000
```

El repositorio estaba 111 caracteres por debajo. El disco estaba 131 por encima. El cargador lee el disco.

Ese hueco es el artículo entero en miniatura. El archivo no estaba «apenas pasado de presupuesto». Estaba **truncado en silencio cada vez que se cargaba**, y el único artefacto que lo habría mostrado era un número que nadie había recalculado desde que se escribió.

Un presupuesto que se revisa una vez es un deseo. La razón por la que se había corrido es más interesante que el número.

## La auditoría detrás del número

Cuando abrí el archivo para recortarlo, el contenido se explicaba solo. Dos secciones describían un mundo que ya no existía.

Una era un procedimiento para publicar un repositorio público de skills. Ese repositorio estaba archivado desde hacía meses. El procedimiento era correcto, detallado y completamente inerte: nadie podía seguirlo, porque la cosa sobre la que operaba ya no estaba.

La otra documentaba una estructura de proyectos en tres capas con un repositorio agregador intermedio. Esa capa se había retirado en un registro de decisión. El archivo la seguía describiendo como vigente, con una lista de deuda cuyos cuatro ítems ya estaban pagos.

Así que el archivo estaba por encima del presupuesto por una razón peor que la verborragia: era exacto sobre el pasado. Cada línea había sido verdad al escribirse, y el archivo conservó su autoridad después de que la verdad venciera.

Saqué cerca de un tercio y las reglas operativas sobrevivieron intactas. Ahí está la señal. El contenido que no se puede borrar sin consecuencias sostiene algo. El contenido que se evapora en una tarde era arqueología.

## Renombrar no es `mv`

Esa misma semana renombré un proyecto. El repositorio, el directorio, los documentos. Lo di por cerrado y seguí.

Después revisé mi propio trabajo como revisaría el de un desconocido, y encontré que un renombre tiene unas siete capas:

1. el directorio
2. el remoto de git
3. el nombre de distribución en `pyproject.toml`
4. el lockfile que lo repite
5. los archivos de estado indexados por el identificador viejo
6. los artefactos de entorno creados antes del renombre
7. la prosa

Había hecho cuatro. El paquete seguía llamándose `agente-local-amigo` mientras vivía en `localdoc-agent`. El lockfile le daba la razón. El archivo del programa del planner tenía el nombre del proyecto nuevo y declaraba el identificador viejo adentro, así que la herramienta lo encontraba pero devolvía el nombre equivocado. Y el prompt del entorno virtual seguía imprimiendo el viejo, porque lo había creado tres comandos antes del renombre.

Nada de eso rompe un test. Todo eso rompe un lector.

Dos de los cinco defectos además eran copias. «10 tests» aparecía en un mapa de proyectos y en un archivo de memoria curada, y el conteo real era 25. Arreglar uno dejaba el otro mintiendo, y la próxima persona iba a encontrar primero el viejo.

## El sexto defecto

Acá es donde la revisión se equivocó.

El programa del planner se llamaba `agente-local-lucia`. Renombré el archivo a `localdoc-agent.json` y dejé el identificador de adentro sin tocar, así que el comando que busca programas por nombre falló:

```
status agente-local-lucia  ->  No existe el programa
```

Escribí eso en la revisión como prueba de una «deuda de nombres entre el repositorio y el producto». Se leía bien. Tenía una transcripción de terminal. Encajaba con el patrón de los otros cinco.

Estaba mal. Lucía es una persona del enunciado del ejercicio, no una clienta, y ese identificador nunca nombró al producto. El comando falló por una razón perfectamente ordinaria —el archivo se había renombrado y la clave no— y yo le colgué una historia que la evidencia no sostenía.

La falla era real. El diagnóstico era inventado.

Ese es el modo de falla sobre el que venía escribiendo desde hacía semanas sin darme cuenta de que estaba adentro. Una salida en rojo confirma que algo está roto. No confirma tu explicación de qué. La transcripción se sentía como prueba porque era concreta, y concreto no es lo mismo que correcto.

## El test que se colgó

La tarea siguiente era convertir una promesa de privacidad en algo que pueda fallar. Los dos proyectos afirman que nada sale de la máquina. La evidencia anterior era `lsof` muestreado nueve veces en una laptop, en un momento.

Así que escribí un probe: correr los caminos reales en un subproceso bajo el audit hook de Python, registrar cada `socket.connect`, `socket.getaddrinfo` y `socket.gethostbyname`, y fallar ante cualquier destino que no sea loopback. DNS cuenta. Resolver un nombre ya es tráfico.

Después agregué la pieza que lo convierte en test y no en calcomanía: un control positivo. Un workload se conecta a `example.com` a propósito, y la suite falla si el hook **no** lo atrapa.

```
{"violations": [{"event": "socket.getaddrinfo", "target": "'example.com'"},
                {"event": "socket.connect", "target": "('2606:4700:10::6814:179a', 80, 0, 0)"}],
 "clean": false}
```

Una dirección IPv6 real de Cloudflare, atrapada por nombre y por destino.

Después la suite se colgó.

El workload de Ollama llamaba a `chat` con un modelo que no estaba descargado. El cliente de Python se quedó en loopback, como estaba diseñado, pero el demonio de Ollama, del otro lado de esa conexión loopback, fue al registry a buscar el modelo. Ese tráfico es real, salió de la máquina, y el hook no lo podía ver, porque pasó en otro proceso.

El instrumento que había construido para probar que nada sale de la máquina no podía ver la única cosa que salía.

Saqué la llamada al modelo del probe y escribí la limitación en los dos READMEs: el hook audita sockets de Python, los subprocesos quedan afuera, y un modelo faltante hace que el demonio vaya a buscar. La afirmación honesta es más angosta que la que yo quería. También es la única que sobrevive a que la revisen.

La misma tarea encontró un defecto peor que el que yo había previsto. Esperaba que el endpoint de borrado dejara atrás los archivos `-wal` y `-shm` de SQLite. Los dejaba. También dejaba `data/private/`, el directorio donde se copia cada original subido antes de parsearlo. Un botón que decía «Delete everything» borraba el índice y conservaba los contratos.

## Qué significa el verde

El trabajo bilingüe tuvo la misma forma. Tres ensayos necesitaban versión en español, y el generador ya soportaba pares: una clave compartida, alternates `hreflang`, `x-default` apuntando al original.

El build pasó. Después:

- el feed emitía una entrada por página, así que cada traducción aparecía dos veces;
- el índice mostraba la etiqueta «En español» en las traducciones, así que un lector en inglés nunca se enteraba de que existía una versión en español;
- y una clave de par que no coincidía con nada fallaba en silencio, borrando el `hreflang` y el switch visible mientras el build seguía verde.

Ese último es el mismo bug que el diagnóstico inventado, con otra ropa. Yo había escrito en mi propio plan que los pares rotos ya rompían el build. Lo rompían: dos artículos en el mismo idioma, o tres en un par. Uno no. Un par con una sola mitad era invisible, y el plan decía que estaba cubierto, así que nadie miró.

Ahora el build falla con el identificador y el slug:

```
build: pair "bogus-test" has only one article; "un-anuncio-mas-silencioso" points at nothing
```

Lo probé rompiendo un par a propósito y restaurándolo. El chequeo que importa es el que viste fallar.

## La regla

Dos reglas, y son la misma regla.

**Medí al dueño, no a la copia.** El tamaño commiteado, no el recordado. El elemento que carga el rol, no el objeto de props que lo produjo. El identificador que la herramienta lee de verdad, no el nombre de archivo que parece correcto. Cada uno de los cinco defectos mecánicos era una copia que se había separado de su dueño.

**La evidencia confirma el síntoma, no la explicación.** Un comando que falla prueba que algo está mal. No prueba que sepas qué. El defecto inventado sobrevivió porque tenía una transcripción, y una transcripción no es un diagnóstico.

Los dos defectos que más costaron esta semana no estaban en mi lista de riesgos. Uno era un botón de borrado que conservaba los originales. El otro era un test que no podía ver el proceso que estaba probando. Los dos aparecieron corriendo la cosa y leyendo la salida, no prediciendo qué podía salir mal.

La lista de riesgos conocidos de un plan es una lista de conjeturas bien formateadas. Se siente como preparación porque es específica. La especificidad es el problema: te dice dónde mirar, y el defecto suele estar en otro lado.

Preguntá qué hace el artefacto. No qué dice el documento que hace.
