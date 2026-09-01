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
