# Informe — ciclo 7: cien mejoras

## 69 de 100. Frenado por presupuesto, no por bloqueo.

Ninguna quedó `[!]` bloqueada: las 31 que faltan simplemente no se alcanzaron.
Están todas escritas en `TODO.md` con su forma de verificación, así que el ciclo
que venga arranca sin volver a pensarlas.

Aviso que ya di al empezar: cien mejoras sobre 18.500 líneas es mucho más de lo
que entra cómodo en un turno.

## Lo que se hizo

### Corrección (9 de 10)

- **`sumarDias` devolvía `"NaN-aN-aN"`** sobre una fecha inválida, y eso después
  se usaba como clave de `state.dias`: el estado se ensuciaba en silencio y ese
  día fantasma contaba en las rachas y en los logros. Ahora hay `esFechaISO()`,
  devuelve `null`, y `migrar()` descarta las claves que no son fechas.
- **Los totales del día estaban escritos cuatro veces**, y en dos de ellas sin
  el `|| 0`: una comida con `kcal` en `null` —pasa al editar a mano o al venir
  de una versión vieja— convertía el total del día en `NaN`, y de ahí en más
  todo lo que dependiera del día mostraba `NaN`. Salió a `totalesDe()`.
- **El IMC dividía por cero** con la altura en 0, y aceptaba pesos negativos que
  clampeaban a 0 y dibujaban un cuerpo flaco.
- El agua dibujaba un vaso por cada vaso tomado: con el objetivo en 4 y doce
  tomados salían doce y la fila se comía el modal.
- `nivelDe(Infinity)` dejaba la barra de progreso con un ancho de `NaN%`.

### Accesibilidad (10 de 10)

- **`--dim` no llegaba a 4,5:1 en cinco de los ocho temas** (vino 3,99; papel
  3,63). Corregidos los cinco: el peor ahora está en 5,57.
- **Los modales se podían abrir dos veces.** El segundo `tomarFoco` pisaba
  `focoPrevio` con un elemento del propio modal, y al cerrar el foco quedaba en
  la nada. Ahora todos pasan por `abrirCapa()`.
- **Cambiar de pestaña o abrir un modal era silencio total** para un lector de
  pantalla. Se sumó una región de anuncios.
- Los vasos decían "4 vasos" y nada más; ahora dicen si están llenos y cuál es
  el objetivo. Los objetivos del día pasaron a ser `switch` con `aria-checked`.
  El personaje se describe entero: ánimo, fase e IMC.
- **Había seis bloques de `prefers-reduced-motion` desperdigados** y cada
  animación nueva nacía sin apagar. Ahora hay una regla global.

Tres —la trampa de foco, el Escape y el `role=status` del toast— **ya estaban
bien** desde el ciclo 4. Se verificaron y se marcaron sin tocar nada.

### Rendimiento (6 de 8)

- **`renderAll` armaba las cuatro pantallas** aunque tres estuvieran ocultas:
  cada toque de un vaso reconstruía el historial y el perfil enteros. Ahora
  dibuja la visible y marca las otras como vencidas.
- **`save()` serializaba el estado entero** —cientos de kB con meses cargados—
  una vez por toque. Se agrupa a 250 ms, con escritura inmediata al ocultar la
  pestaña.
- **Las rachas barrían 400 días hacia atrás siempre**, cuatro veces por render y
  otra por cada récord: mil seiscientas vueltas para un historial de diez días.
- `recalcularJuego` y el SVG del personaje ahora se saltean si su firma no
  cambió. Verificado: **0 recálculos** con tres renders seguidos sin cambios.

### Robustez (7 de 7)

Estado corrupto, `localStorage` lleno, fechas del futuro, perfil sin altura,
calorías absurdas, dos pestañas abiertas y —la más peligrosa— **importar un
archivo cualquiera**: `migrar()` acepta cualquier cosa y devuelve un estado
válido, así que un archivo equivocado reemplazaba meses de historial sin
chistar. Ahora se valida antes y se confirma con números.

### Lo demás

Plurales de 1 (la app decía "1 días" en una docena de lugares), paginación del
historial, el exceso de calorías visible en vez de un 0 en "restantes", el botón
sugerido según la hora, el objetivo del modo en el chip, tamaño de vaso
configurable, vaciar el caché a mano, proyección al peso objetivo, aviso de
déficit peligroso, objetivo de fibra, agua ajustada por ejercicio, racha en
peligro, el logro más cerca y el XP que falta para el próximo nivel.

## Las dos guardas nuevas, y por qué importan

`tools/guardas.py` chequea tres cosas que el navegador solo descubre corriendo:

1. **Globales declaradas dos veces**, entre archivos y dentro del mismo archivo.
2. **`$('idQueNoExiste')`**, que revienta recién cuando alguien entra a esa
   pantalla.
3. **Scripts fuera del shell del service worker**, que no fallan en el navegador
   sino sin internet, semanas después.

Encontró tres cosas de entrada: dos referencias muertas (`notaPill`,
`ejercicioPill`) y `window.__core`, un bloque de export que **no usaba nadie** y
que además rompía al cargar porque nombraba funciones que se habían mudado.

Y se probó que dispara: renombrando un `id` a mano, falla.

## Dos veces me dupliqué a mí mismo

Vale la pena dejarlo escrito porque las dos fueron el mismo error.

1. **Escribí `historialACSV()`** cuando `armarCSV()` ya existía y era más
   completa. La borré y le escribí a la que estaba los tests que le faltaban.
2. **Escribí `compararSemanas()` y `buscarEnHistorial()`** cuando las dos ya
   existían — y las **pisé**, rompiendo nueve tests que pasaban. Los originales
   comparan también el peso y buscan en las notas ignorando acentos.

La segunda es la interesante: mi propia guarda no la agarró, porque solo miraba
duplicados **entre** archivos y estas estaban dentro del mismo. La guarda ahora
chequea las dos cosas.

## Verificación final

| Criterio | Resultado |
|---|---|
| 1. Las 100 implementadas | **69**. Ninguna bloqueada; 31 sin alcanzar |
| 2. Suite en verde | **761 tests, 0 fallos** (eran 720 al empezar) |
| 3. Sin errores de consola | 0, verificado en pestaña nueva |
| 4. Hoy sin scroll en 375×812 | entra con el día liviano (ver desvío 2) |
| 5. Límites de líneas | todos dentro |
| 6. Arranca offline | `guardas.py` OK: 38 scripts, todos en el shell |
| 7. Sin romper decisiones anteriores | ninguna rota |

## Desvíos de la SPEC

1. **No se llegó a 100.** Faltan 31, todas anotadas.
2. **"Hoy sin scroll" tiene una excepción.** Con una comida cargada entra justo;
   si además aparece la tarjeta de alerta de proteína (58 px), scrollea 66 px.
   Es un estado excepcional y scrollear para ver una alerta me parece aceptable,
   pero es un desvío del criterio como estaba escrito.
3. **Se agregaron dos archivos no previstos**: `calibracion.js` (core.js se pasó
   del límite) y `tools/guardas.py`.
4. **El README no estaba en el alcance como tal** — era el ítem 100 y quedó más
   largo de lo previsto, con la arquitectura y las decisiones que no se toman.

## Lo que queda para el ciclo 8

Los 31 pendientes, por bloque: cargar comidas (10), historial y progreso (5),
textos (4), pantalla Hoy (3), modos (3), juego (3), calidad interna (3).

Los tres que más rendirían: **reintentar el análisis sin volver a sacar la foto**
(51), **duplicar una comida de otro día** (59) y **filtrar el historial por
fechas** (61).

## Números

- **69 mejoras** verificadas, 0 bloqueadas, 31 sin alcanzar.
- **761 tests**, 0 fallos. Se sumaron 41 en el ciclo.
- **2 duplicaciones propias** detectadas y revertidas.
- **3 referencias muertas** y un bloque de export fantasma, borrados.
