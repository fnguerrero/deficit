# Informe — ciclo 11: diez mejoras potentes

28/08/2026 · 7 iteraciones (#48 a #54) sobre un presupuesto de 40 · ninguna bloqueada.

## El análisis que las eligió

La app está terminada como software y sin estrenar como herramienta: 783 tests y cero días
de uso. Así que "potente" acá no era agregar funciones sino sacar lo que la haría
abandonar en la primera semana. Se buscaron los tres modos de perderla:

**Pierde datos.** La foto sacada sin señal se evaporaba. La comida cargada dos veces
ensuciaba el día sin que nadie se enterara. El peso mal tipeado no tenía vuelta atrás.

**Pierde tiempo.** Corregir una porción obligaba a editar seis números a mano, cuando
"comí la mitad" es la corrección más frecuente que existe. Cargar el café de todas las
mañanas costaba lo mismo que cargar algo nuevo: foto, espera y pago del análisis.

**Pierde credibilidad.** Un plato de 12.000 kcal entraba en silencio. Y si lo registrado
no cuadraba con la balanza, la app se callaba: seguía mostrando un déficit que no estaba
pasando.

## Las diez

1. **Cola offline.** La foto sacada sin señal se guarda en el estado y se analiza sola al
   volver la red. Una foto de un plato tiene una ventana de treinta segundos: después está
   a medio comer o ya te levantaste. Se saca de la cola *antes* de analizar, para que una
   foto que siempre falla no trabe el resto.
2. **"Comí la mitad" en un toque.** ¼ ½ ¾ 1 1½ 2 sobre la comida ya guardada, reescalando
   items y macros. Siempre sobre lo estimado original: tocar ½ y después ¾ da tres cuartos
   de la estimación, no tres cuartos de la mitad.
3. **La app avisa cuando sus números no cuadran con la balanza.** Compara su gasto estimado
   contra el que se deduce del peso real y lo dice, aunque lo que diga sea que sus propios
   números vienen mal.
4. **Lo que solés comer a esta hora, a un toque.** Sin gastar API. Solo de la misma franja:
   lo que comés a las 8 no dice nada sobre las 21.
5. **Deshacer global.** Ctrl+Z y un botón. Guarda el día entero y no la operación: funciona
   igual para cualquier cambio sin escribir un inverso por cada uno.
6. **El sesgo aprendido sale a Progreso.** Vivía en una pantalla que hay que ir a buscar,
   cuando es la misma pregunta que la brecha con la balanza.
7. **Aviso de comida cargada dos veces.** Con el deshacer al lado.
8. **Un análisis imposible no entra en silencio.** Topes de plato y de alimento, y el
   chequeo de que los macros den las calorías (4, 4 y 9 por gramo).
9. **La semana de un vistazo.** Cuatro números grandes: un gráfico hay que leerlo.
10. **Si se pasó la hora de la que siempre cargás, la app lo nota.** No por horario fijo,
    sino por lo que la persona hace: 18 de los últimos 20 días, y hoy no.

## Verificación

| Qué | Resultado |
|---|---|
| Tests propios | **783 en verde** (9 nuevos) |
| `guardas.py` | OK — 45 scripts, 598 globales, 367 ids |
| `tamanos.py` | Todo dentro de límite |
| Consola | Limpia; las cinco pestañas y los ocho render sin errores |
| Cola offline | Se cortó la red, se encoló, sobrevivió en `deficit.v1` y al volver se analizó sola |
| Porciones | 900 → ½ → 450 → ¾ → 675, y el título queda "¾ Milanesa" |
| Deshacer | Peso y agua deshechos en orden inverso; el botón se oculta al vaciarse |
| Sesgo en Progreso | Seis correcciones del 25% y la tarjeta lo dice |
| `prefers-reduced-motion` | Sigue apagando todo: 0 animaciones, 0 partículas |

Los cinco criterios de aceptación pasan.

## Casi duplico código, por tercera vez

El ítem 6 original —"el código de barras calibra solo"— estaba mal pensado, y al ir a
escribirlo empecé una `sesgoDeCorrecciones()` que **ya existía**: `registrarCorreccion()` y
`sesgoAprendido()` están en `core.js` desde hace ciclos y la app ya aprende sola de cada
corrección. Lo borré antes de que entrara.

Es la tercera vez en este proyecto. Lo que lo frenó esta vez fue buscar el nombre del
concepto —"correcciones"— antes de escribir, y no después. La guarda de duplicados no lo
habría agarrado: los nombres eran distintos.

Lo que sí faltaba de verdad era que ese sesgo **se viera**, y eso es lo que se hizo.

## Desvíos de la SPEC

- **El ítem 6 se reemplazó** por lo de arriba: el original habría duplicado código.
- **Aparecieron dos archivos nuevos que no estaban planeados**: `core.js` y `analisis.js`
  se pasaron del límite y salieron `platos.js` (los momentos del día y el reescalado de
  porciones) y `chequeos.js` (las cuatro preguntas incómodas: si un análisis tiene sentido,
  si algo ya se cargó, si los números cuadran con la balanza, si una meta entra en una sola
  cuesta).
- Nada más se desvió.

## Un test tuvo razón

El de `faltaLaDeSiempre` falló con `d.getTime is not a function`. Era mío: `hoyISO()`
espera un `Date` y le estaba pasando un timestamp. Habría reventado en la primera llamada
real, con la app abierta.

## Bloqueados

Ninguno.
