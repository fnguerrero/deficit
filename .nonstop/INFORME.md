# Informe — ciclo 10: que la app se sienta viva

28/08/2026 · 5 iteraciones (#43 a #47) sobre un presupuesto de 40 · ninguna bloqueada.

## Qué se construyó

Animaciones al estilo Duolingo, en CSS y SVG, **cero dependencias**. Sale `animar.js` con
las siete piezas y `_animaciones.html` para dispararlas de a una sin tener que cargar una
comida de verdad.

La regla que decidió qué entraba: **una animación tiene que decir algo** — qué cambió,
cuánto, o que lo que hiciste valió la pena. Las que solo decoran quedaron afuera.

- **Los números cuentan.** 1.200 que salta a 1.450 es un dato que cambió; 1.200 subiendo
  hasta 1.450 es algo que pasó, y encima se ve *cuánto* subió sin acordarse del anterior.
  Va en el anillo y en las calorías restantes.
- **El anillo y las barras se mueven** hasta su valor nuevo, y crecen **desde donde
  estaban**: animar siempre desde cero es mentir sobre lo que cambió.
- **El objetivo que se completa hace pop y suelta partículas** — solo el que se acaba de
  completar, no todos los cumplidos.
- **El personaje salta** cuando subís de fase.
- **La racha se prende fuego** al sumar un día. Es la única que festeja algo que no se ve
  en la pantalla: pasar de 6 a 7 días solo cambia un dígito, y sin embargo es exactamente
  lo que la racha existe para sostener.
- **El toast entra con rebote**, las **pestañas** entran con un movimiento corto, y
  **todo lo tocable se hunde** al tocarlo: el acuse de recibo más barato que hay, y sin él
  en un celular lento uno no sabe si el toque entró y toca de nuevo.

## Lo que apareció haciéndolo, y era un bug

**`requestAnimationFrame` no corre con la pestaña oculta.** Y esta app termina análisis
mientras la persona está mirando otra cosa. Sin red, al volver se encontraba **el número
viejo congelado** —no el nuevo sin animar: el viejo— y con eso la sensación de que la
comida no se guardó. `contarHasta()` ahora lleva un timeout de respaldo que pone el valor
final pase lo que pase.

Se descubrió porque la verificación en headless daba cero pasos de conteo, y en vez de
dar el método por malo valía preguntarse por qué.

## Verificación

| Qué | Resultado |
|---|---|
| Tests propios | **775 en verde** (1 nuevo: la curva del contador) |
| `guardas.py` | OK — 43 scripts, 569 globales, 355 ids |
| `tamanos.py` | Todo dentro de límite |
| App real | Las cinco pestañas renderizan sin errores, consola limpia |
| Festejo | Se completa el agua y festeja **solo** ese casillero; 12 partículas que se limpian solas (0 después) |
| `prefers-reduced-motion` | **Con** el ajuste: 0 animaciones corriendo, 0 partículas, valores finales correctos. **Sin** él: 15 animaciones, 12 partículas |

Los cinco criterios de aceptación pasan.

## Decisiones tomadas por criterio propio

- **La curva del contador se probó aparte** (`valorEnT`). La animación no se puede
  verificar sin ojos, pero la curva sí: que llegue exacto a los extremos, que a mitad de
  tiempo ya esté pasada la mitad del camino, que nunca retroceda y que un `t` fuera de
  rango no la haga pasarse.
- **El festejo compara contra los cumplidos del render anterior.** Sin esa comparación, la
  única opción sería festejar todos los cumplidos en cada render, y la pantalla explotaría
  de confeti cada vez que tocás un vaso.
- **Quedan dos páginas de taller en el repo**: `_animaciones.html` para verlas y
  `_quieto.html` para verificar el apagado con `--force-prefers-reduced-motion`.

## Desvíos de la SPEC

- **Apareció un ítem que no estaba**: `ui/objetivos.js` se pasó de su límite al sumarle
  las animaciones y hubo que partirlo. Salió `ui/tarjeta.js` con la mascota, la voz, las
  fases, los festejos y las rachas; en `ui/objetivos.js` quedaron los casilleros del día y
  sus modales.
- Nada más se desvió: las doce animaciones planeadas entraron como estaban escritas.

## Bloqueados

Ninguno.
