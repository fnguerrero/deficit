# Informe — ciclo 6: Fito humano y el sistema que engancha

## 30 de 30 ítems. Terminado.

14 iteraciones sobre un presupuesto de 55.

## Qué se construyó

### Fito ahora es una persona

Un SVG paramétrico con **tres ejes que se mueven por separado**, y esa separación es la
decisión central del ciclo:

| Eje | De dónde sale | Cada cuánto cambia |
|---|---|---|
| Contextura | tu IMC medido (peso de la balanza + altura) | semanas |
| Musculatura | días entrenados de los últimos 14 | días |
| Cara y postura | lo que hiciste hoy | todos los días |

**Comer de más no engorda al muñeco: le pone cara de culpa.** El cuerpo lo mueve el dato
medido, nunca la conducta del día. Sin esa separación la app sería un reproche diario
disfrazado de personaje, y hay un test que la fija: mismo peso con distinta comida tiene
que dar la silueta idéntica.

**La musculatura corrige a la contextura**, porque el IMC no distingue músculo de grasa y
acusa de sobrepeso a cualquiera que entrene en serio. Mismo IMC entrenando se ve macizo;
sin entrenar, blando. Y cuando hay rutina sostenida la app lo dice por escrito en vez de
dejar que el número solo hable.

La contextura es **continua**: el IMC clampeado a 17–35 mapeado a 0–1, así un kilo se nota
un poco en vez de no notarse nada hasta cruzar un umbral y ahí saltar de golpe.

**Las proporciones son deliberadamente infantiles** —la cabeza se lleva casi un tercio de
la figura—. No es estética: en Hoy el personaje mide 70 px, y con proporciones realistas la
cara quedaba en 12 px, donde no se distingue un bostezo de una sonrisa.

### El sistema que hace volver

**Cuatro rachas separadas** —registro, agua, entrenamiento, sueño—. Perder la del agua no
toca la del entrenamiento: una sola racha grande, cuando se rompe, se abandona; cuatro
chicas se recuperan de a una.

**Escudos que se ganan**, uno cada 7 días registrados, hasta 2. Tapan un día perdido y se
gastan solos. No se regalan ni se compran —un escudo regalado no protege nada porque no
costó nada— y no se gastan en una racha de 2, que sería tirarlos.

**XP que paga por registrar, no solo por cumplir.** Cumplir paga más, pero un día malo
anotado también suma: lo que sostiene el hábito es volver, no no fallar nunca. Con eso, 11
niveles y **16 logros**.

Todo se **recalcula contra el historial** en vez de acumularse en contadores. Es más caro y
es lo correcto: borrar una comida cargada por error no deja XP fantasma, y un logro no se
puede ganar dos veces.

### Sonidos y voz

Cinco sonidos **sintetizados con WebAudio**, sin un solo archivo. Suben cuando la noticia es
buena y bajan cuando no. Arrancan **apagados**, respetan `prefers-reduced-motion`, y si el
navegador bloquea el audio no pasa nada: primero se guarda el dato, después suena.

Y el repertorio de Fito: **más de 50 frases** repartidas en 13 situaciones, que reclama,
insiste y festeja. Antes del mediodía casi no habla —reprochar a las 9 de la mañana un día
que no empezó es volverse molesto de la manera equivocada—, después del mediodía va por lo
más fácil de resolver primero, y si algo sigue pendiente doce minutos vuelve a la carga.

Hay un test que **prohíbe explícitamente las frases que humillen por el cuerpo**. Es la
línea entre que dé gracia volver y que dé bronca abrir.

## Los bugs que aparecieron verificando

1. **La manga generaba `q--5.9`** del lado izquierdo, porque escribía el menos a mano sobre
   un valor que ya venía negativo. El navegador tira el path entero. El test de NaN no lo
   agarraba —`--5.9` no es NaN—, así que se agregó el que sí.
2. **Los brazos quedaban tapados por el torso**: se dibujaban antes. La figura parecía manca.
3. **Siete archivos nuevos entraron en `index.html` y no en el shell del service worker.**
   Eso no falla en el navegador: falla **sin internet**, semanas después, y ahí no hay cómo
   darse cuenta. Se agregó una guarda en `tools/version.py` que lo detecta, y se probó que
   la guarda dispare de verdad.
4. **La lista de comidas quedaba en 37 px** en el celular. Dos causas: los seis objetivos
   ocupaban dos filas, y sobre todo el `calc(100dvh - 216px)` —el 216 era una suma a ojo del
   header y la nav, y dejaba 120 px de pantalla vacía abajo mientras la lista se ahogaba.
   Ahora el alto lo reparte flex y la lista pasó a 88 px.
5. **Al mover el alto a flex, las otras cuatro pestañas quedaron sin scroll**, porque el
   `overflow: hidden` quedó en el body. El scroll se mudó a `main`.

## Un test en rojo que estaba mal él, no el código

"Con el día en blanco no opina" venía fallando del ciclo 5: `estadoMascota` leía el reloj
adentro, y a las 18 hs un día vacío **sí** es un problema. El código estaba bien; lo que
estaba mal era que la hora no se pudiera fijar. Ahora entra por parámetro.

## Verificación final

| Criterio | Resultado |
|---|---|
| 1. Suite en verde | **682 tests, 0 fallos** (eran 587 al empezar) |
| 2. Sin errores de consola | 0, en escritorio y en móvil |
| 3. Migra un estado del ciclo 5 | por test, incluso con basura en `juego` |
| 4. Se lee como humano a 96 px | verificado rasterizando |
| 5. Dos pesos, dos cuerpos | 13 px de diferencia de cintura sobre 120 de lienzo |
| 6. Entrenar se nota | +7 px de hombro con el mismo IMC, y el aviso por texto |
| 7. Comer de más no engorda al muñeco | silueta idéntica, cara distinta |
| 8. Ocho ánimos distinguibles | 8 dibujos distintos, verificado a ojo |
| 9. Cuatro rachas independientes | por test y por DOM |
| 10. Escudos | ganar, gastar, tope y no gastar en racha corta |
| 11. XP, niveles y logros | 16 logros en pantalla, nivel desde el XP |
| 12. Sonidos | suenan prendidos, mudos apagados, y el error se traga |
| 13. La voz no repite | 30 tiradas seguidas sin repetir la anterior |
| 14. Hoy sin scroll en 375×812 | entra justo, y con más aire que antes |
| 15. Límites de líneas | todos dentro |

## Desvíos de la SPEC

1. **El juego no se sincroniza como tabla propia**, que era lo que decía el ítem 27. XP,
   nivel, rachas y logros se **derivan** de los días, que ya se sincronizan: otro
   dispositivo los reconstruye solo. Lo único que queda por dispositivo son los escudos
   gastados y qué logros ya se festejaron. Una tabla nueva para dos campos, con un SQL que
   Nico tendría que correr a mano, no lo vale. Está anotado en Supuestos.
2. **`tests.js` se partió**: salió `tests2.js`. Se pasó de las 6.000 líneas.
3. **`ui/comidas.js` se partió** antes de empezar: salió `ui/edicion.js`. Estaba 18 líneas
   pasado del límite y bloqueaba el control de tamaños.
4. **El layout móvil se rehízo**, que no estaba planeado. El ítem 28 pedía que Hoy siguiera
   entrando; para que entrara con las rachas hubo que reemplazar el alto fijo por flex.
5. **`_personaje.html`** es nuevo y no estaba previsto: una página de taller que dibuja a
   Fito en todas sus combinaciones. Es lo que permitió verificar el dibujo mirándolo, con
   Edge headless sacando el PNG a disco.

## Cómo correrlo

```bash
py -3 -m http.server 5599
```

- La app: `http://localhost:5599/index.html`
- Los tests: `http://localhost:5599/tests.html` — el resumen se pinta dos veces porque hay
  tests async; lo confiable es esperar a `window.__listo`.
- El taller del personaje: `http://localhost:5599/_personaje.html?modo=cuerpo` y `?modo=animo`

## Números

- **30 ítems** completados, 0 bloqueados.
- **682 tests**, 0 fallos. Se sumaron 95 en el ciclo.
- **14 iteraciones** sobre un presupuesto de 55.
- 7 archivos nuevos: `cuerpo.js`, `personaje.js`, `juego.js`, `sonidos.js`, `voz.js`,
  `ui/logros.js`, `ui/edicion.js`.

## Lo que sigue pendiente, y es de Nico

- **Crear la cuenta** en Ajustes → Tu cuenta. Sigue pendiente del ciclo anterior.
- **Prender los sonidos** si los quiere: arrancan apagados a propósito.
- **Cargar el peso**, o Fito dibuja un cuerpo medio que no es el suyo.
- **Usar la app.** Las rachas, el nivel y los logros no tienen nada que medir hasta que
  haya días adentro, y la estimación de un plato servido sigue sin probarse contra la
  realidad ni una sola vez.
