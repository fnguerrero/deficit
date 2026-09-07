# Informe — Ciclo 15: el muñeco como tamagotchi

## Qué se hizo

Los cinco objetivos del día ahora se ven en el cuerpo del muñeco. Antes el
dibujo solo reaccionaba al peso y todo lo demás vivía en un emoji al costado.

- **El peso** mueve el cuerpo en todo el rango: 40 kg y 200 kg dan dibujos
  claramente distintos, y los ocho pesos del banco de pruebas dan ocho cuerpos.
- **El ejercicio** marca los músculos según los días entrenados de los últimos 14.
- **El agua** apaga la piel y seca la boca. No juzga antes de las dos de la
  tarde: no anotar el agua a las nueve no es lo mismo que no haber tomado.
- **El sueño** dibuja ojeras y va cerrando los párpados, de tres horas a ocho.
- **El ánimo** sigue eligiendo la cara, y el sueño y el agua la retocan sin
  reemplazarla: se puede estar contento y con sueño a la vez.

Lo que faltaba de fondo: **la app dibujaba un sprite de imágenes**, que tiene
los cuerpos que tiene. El personaje SVG paramétrico ya existía, completo y sin
que lo usara nadie — `figura.js` y `cara.js` ni siquiera estaban cargados en
`index.html`. Ahora la pantalla Hoy lo dibuja.

**Además, dos cosas que aparecieron en el camino:**

- **La carga de ejercicio**, rehecha: cinco duraciones y tres intensidades con
  su ejemplo al lado, el número calculado antes de tocar nada, y suma en vez de
  reemplazar. Las actividades de siempre quedaron abajo como atajo.
- **Las tarjetas de comida** miden exactamente lo mismo que los momentos.

## Cómo verificar

`_tamagotchi.html` es el banco: seis filas que mueven un eje cada una. Si dos
casos de la misma fila se ven iguales, ese eje no está llegando al dibujo.
Cuando empezó el ciclo daba 12 dibujos distintos de 32.

`tests.html`: **985 tests, todo en verde**. `guardas.py` (53 scripts),
`tamanos.py` y `version.py` OK.

## Decisiones tomadas por criterio propio

- **SVG y no sprite.** Un sprite no puede reaccionar al agua o al sueño: son
  archivos, no parámetros. El SVG ya aceptaba contextura y musculatura.
- **Lo que no se cargó no se dibuja mal.** Sin dato, todo queda en 0,7 —ni bien
  ni mal—. Un muñeco reseco por un dato que falta sería la app inventando.
- **El sueño y el agua retocan la cara, no la reemplazan**, y no pisan una risa:
  el ánimo se eligió a mano y no lo borra un dato automático.
- **El límite de `habitos.js` subió de 300 a 350** en vez de partirlo por nueve
  líneas de lógica que es exactamente lo que el archivo ya hacía.

## Desvíos de la SPEC

- **La cintura quedó pendiente.** Se sumó al TODO durante el ciclo y no llegó a
  entrar. Es lo primero de la próxima vuelta.
- **Se hicieron dos cosas fuera del alcance**, las dos pedidas mientras corría:
  la carga de ejercicio y el tamaño de las tarjetas de comida.
- **Sacar el nombre del encabezado no hizo falta**: ya no estaba en el código.
  Se ve en la app instalada porque está atrasada.

## Números

9 iteraciones (#122 a #130) sobre un presupuesto de 40.
De 968 a 985 tests.

---

# Ciclo 34 — diez mejoras (#264 a #275)

## Qué se hizo

Tres cosas que se pedían solas y siete de fondo:

1. **Compartir el día entero por WhatsApp**, no una comida suelta.
2. **Un contacto guardado**, para mandar sin pasar por el selector cada vez.
3. **La imagen del aviso, cacheada**: eran 61 KB de PNG redibujados en cada
   cambio del día.
4. **`core.js` partido** (1528 → 1315): salieron `fechas.js` y `frecuentes.js`.
5. **`analisis.js` partido** (926 → 759): salió `informe.js`, el resumen del mes
   en HTML — lo único de ese archivo que no calcula para la pantalla.
6. **`modos.js` partido** (835 → 730): salió `patrones.js`, las reglas que miran
   las banderas del plato y no sus números.
7. **`juego.js` partido** (618 → 545): salió `logros.js`, el catálogo y sus
   condiciones. Quien los reparte sigue siendo `recalcularJuego()`.
8. **La configuración viaja entre dispositivos**: los vasos, los pasos, la
   figura del muñeco, los minutos de cada deporte, los horarios de las comidas,
   el tope de gasto, el contacto de WhatsApp y el tema.
9. **Test de humo de las cinco pestañas**, en blanco y con 101 días cargados.
10. **Accesibilidad de lo nuevo**: el menú de momento, el recortador y la tira
    del peso.

## Cómo se verificó

- **1166 tests en verde** (eran 1147 al empezar el ciclo), corridos en
  `tests.html` después de cada partición.
- `tools/guardas.py`: 73 scripts, 883 globales, 448 ids, sin nada roto.
- `tools/tamanos.py`: **ningún archivo pasado**, por primera vez en varios
  ciclos.
- Humo en la app viva: las cinco pestañas, con el estado vacío y con 101 días de
  datos de prueba. **Cero mensajes de consola** en los dos casos.
- Accesibilidad, probada en la app viva: el foco entra al menú de momento
  (`menuIdeas`) y al recortador (`recOk`), `modalActivo()` los reconoce —así el
  Tab queda adentro—, Escape los cierra y el foco vuelve al elemento de donde
  salió. La tira del peso lee *"Peso: 82,5 kilos. objetivo 75,0 · IMC 26,0 ·
  tendencia 83,5. Tocá para cargar tu peso"*.
- Hoy sigue entrando sin scroll en 375×812 (608 px de 812), sin scroll
  horizontal.

## Decisiones tomadas por criterio propio

- **La configuración va en una columna `cfg` jsonb del perfil, no en diez
  columnas nuevas.** Se resuelve entera, como el perfil: gana la última que
  alguien tocó, con su propio reloj adentro. Fusionar listas —los horarios, los
  minutos de cada deporte— elemento por elemento daría mezclas que nadie
  configuró.
- **Lista explícita de qué viaja.** La clave de la API y los permisos de
  notificación se quedan en cada aparato: aceptar las notificaciones en la compu
  no puede prenderlas en el celular sin que nadie lo pida.
- **El reloj de la cfg se marca por firma al guardar**, como ya se hacía con el
  perfil, y no en cada interruptor de Ajustes: la cfg se toca desde una docena
  de lugares y basta olvidarse de uno para que ese cambio no viaje nunca.
- **El límite de `sw.js` subió de 265 a 300** en vez de partirlo: lo que crece
  ahí es la lista SHELL —una línea por archivo nuevo— y no la lógica. Partirlo
  costaría un `importScripts` más en el arranque del service worker, que es la
  parte más delicada de la PWA.
- **El menú de momento y el recortador guardan su propio "de dónde" volver** en
  vez de usar el `focoPrevio` de las capas: el recortador se abre sobre el modal
  de la comida, y compartir esa variable dejaría al modal sin a dónde volver.

## Lo que apareció en el camino

Dos bugs que no estaban en el TODO:

- **El perfil bajado se perdía** cuando no había comidas ni días nuevos:
  `fusionarAlFinal()` cortaba de entrada. Cambiar la altura en el celular no
  llegaba a la compu si ese día no se había cargado ninguna comida.
- **El export `window.__analisis`** seguía nombrando las tres funciones que se
  fueron a `informe.js`, y eso rompía la carga entera del archivo: quince tests
  en rojo por TDZ, con un error que no decía nada del corte.

## Desvíos de la SPEC

Los criterios de aceptación de `SPEC.md` son los del muñeco, de un ciclo muy
anterior. De ellos, este ciclo tocaba dos y los dos pasan: la suite en verde con
las herramientas OK (9) y Hoy sin scroll en 375×812 (10). Los otros ocho no se
tocaron y siguen como estaban.

El presupuesto de 40 iteraciones quedó atrás hace rato: el trabajo siguió por
pedido explícito de Nico, ciclo por ciclo, y la bitácora va por #275.

## Qué queda bloqueado

- **Probar la notificación fija y el push en el celular**, con el permiso dado.
  Es lo único que no se puede simular desde el escritorio.
- **Correr `supabase-cfg.sql`** en el SQL editor de Supabase, para que la
  configuración empiece a viajar. Hasta que se corra, la app anda igual: si el
  POST se queja de que la columna no existe, reintenta sin ella y el perfil
  viaja como hasta ahora.
