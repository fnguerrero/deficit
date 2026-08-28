# Déficit

App de control calórico que estima una comida a partir de una foto. HTML, CSS y
JavaScript planos: **sin build, sin dependencias, sin framework**. Se abre con
un servidor estático y listo.

Este archivo es para el Nico de dentro de seis meses, que va a volver a esto sin
acordarse de nada.

## Correrla

```bash
py -3 -m http.server 5599
```

- La app: `http://localhost:5599/index.html`
- Los tests: `http://localhost:5599/tests.html`
- El taller del personaje: `http://localhost:5599/_personaje.html?modo=cuerpo`
  (también `?modo=animo`, `?modo=fase` y `?modo=peso`)

Publicada en `https://fnguerrero.github.io/deficit/`.

## Las tres reglas que no se rompen

1. **Cero dependencias.** Todo lo que hace falta se escribe. Los gráficos son
   SVG a mano, los sonidos son osciladores de WebAudio y el personaje es un SVG
   paramétrico. Una librería de charts pesa más que toda la app.
2. **La app no miente.** Si no hay datos suficientes para afirmar algo, lo dice
   en vez de inventar una tendencia. Buena parte del código es negarse a
   responder: `veredictoProgreso`, `efectoDelSueno`, `proyeccionPeso`.
3. **El cuerpo del personaje sale de datos medidos**, nunca de la conducta del
   día. Comer de más pone cara de culpa; engorda al muñeco solo si la balanza lo
   dice.

## Cómo está armado

Los scripts se cargan en orden desde `index.html` y **todo es global**: no hay
módulos ni bundler, así que el orden importa y una función declarada dos veces
en archivos distintos hace que la última gane en silencio. Para eso está
`tools/guardas.py`.

### El estado

Uno solo, en `localStorage`, con `state.dias[fecha]` como centro de todo:

```
state = {
  perfil,          // sexo, edad, altura, peso, peso objetivo, modo
  cfg,             // tema, sonido, recordatorios, objetivo de vasos
  juego,           // XP, logros, escudos
  dias: { '2026-08-27': { comidas: [], peso, agua, ejercicio, sueno, animo } },
  frecuentes, recetas, cacheAnalisis, historialAnalisis
}
```

`migrar()` es la **única** puerta de entrada: acepta cualquier basura y devuelve
un estado válido. Si aguanta, no hay forma de que un `localStorage` roto deje la
pantalla en blanco.

### Los archivos

| Archivo | Qué hace |
|---|---|
| `core.js` | Estado, migración, fechas, formato, CSV, cache, frecuentes |
| `calibracion.js` | Lo que la app aprende de sus propias equivocaciones |
| `modos.js` | Los 16 modos: objetivo del día y si una comida entra |
| `habitos.js` | Ejercicio por MET, agua, ayuno, proyección de peso |
| `cuerpo.js` | IMC, contextura y musculatura: los números del personaje |
| `sprite.js` + `sprite-datos.js` | El personaje que ve el usuario: sprite + capas |
| `personaje.js` + `figura.js` + `cara.js` | El personaje dibujado entero, hoy solo para el taller |
| `transformacion.js` + `aura.js` | El pelo de las fases y el fuego, que SI se dibujan |
| `mascota.js` | En qué estado está el personaje hoy |
| `juego.js` | Rachas, escudos, XP, niveles, logros, fases |
| `voz.js` | Lo que dice la app, con personalidad |
| `sonidos.js` | Cinco sonidos sintetizados |
| `graficos.js` | Series y SVG de los gráficos |
| `analisis.js` | Estadística sobre el historial |
| `claude.js` | El esquema y las llamadas al modelo |
| `sync.js` + `auth.js` | Supabase por REST, sin SDK |
| `ui/*.js` | Una pantalla por archivo |

### El análisis de una foto

La clave de Anthropic **no está en la app**: vive en un Cloudflare Worker
(`proxy/worker.js`) con lista blanca de origen y de modelo. La app le pega al
proxy y el proxy pone la clave. Por eso no hay que configurar nada por
dispositivo.

Sonnet para platos, Haiku para etiquetas, y Opus solo si la confianza vuelve
baja. Cada análisis se guarda en cache por huella de imagen: la misma foto no se
paga dos veces.

## El personaje es híbrido, y eso es a propósito

El **cuerpo** son siete PNG recortados de una lámina dibujada a mano
(`tools/sprites.py` los saca de `ref/cuerpos.png`). Son exactamente las siete
contexturas que la app sabe distinguir, y se ven como Nico se las imaginó: eso no
lo alcanzó el SVG paramétrico, y perseguirlo consumió dos ciclos enteros.

Pero **solo** el cuerpo. Las fases se siguen dibujando por código y se apilan en
capas: el fuego atrás, el sprite en el medio, el pelo de color adelante tapando
al negro. Por dos razones:

- Siete auras por siete contexturas son 49 dibujos que nadie va a hacer.
- Con la lámina de fases como sprite, alguien con panza en fase 3 vería el cuerpo
  flaco del dibujo. La regla 3 dice que el cuerpo no miente sobre el cuerpo.

Lo que se perdió: los ocho ánimos en la cara, que ahora van como emoji al lado
del título. El personaje SVG completo (`personaje.js`, `figura.js`, `cara.js`)
sigue vivo para el taller y como vuelta atrás.

Si cambia la lámina, se corre `py -3 tools/sprites.py` y listo: recorta, saca el
fondo —con flood fill desde los bordes, no por color, o las zapatillas blancas
quedan huecas—, mide dónde está la mata de pelo para poder taparla, y escribe
`sprite-datos.js`.

## Antes de dar algo por terminado

```bash
py -3 tools/tamanos.py    # que ningun archivo se pase de largo
py -3 tools/guardas.py    # globales duplicadas, ids que no existen, shell offline
py -3 tools/version.py    # sube la version en sw.js y en los ?v= de los HTML
```

**`version.py` es obligatorio** después de tocar cualquier archivo del shell. Sin
eso el navegador sigue sirviendo el JS viejo de su propio cache, y se depura un
bug que ya estaba arreglado.

Los tests corren en el navegador (`tests.html`). El resumen se pinta dos veces
porque hay tests asíncronos: lo confiable es esperar a `window.__listo`.

## Lo que se decidió no hacer, y por qué

- **Push real con servidor.** Los avisos son `setTimeout` + `Notification`: solo
  suenan con la app abierta. Perseguir al usuario con el celular en el bolsillo
  necesita un push service y un backend que despierte.
- **Registro automático de sueño.** El navegador suspende todo con la pantalla
  apagada. Eso necesita app nativa o un reloj.
- **Sincronizar fotos.** Pesan y no aportan al cálculo.
- **Ligas y competencia.** Duolingo las usa porque tiene millones de usuarios;
  acá hay uno. Una liga de una persona es un espejo.
- **Vidas o corazones.** Castigar quitando acceso hace que se registre menos,
  que es lo contrario de lo que sirve.

## Los ciclos

El historial de decisiones está en `.nonstop/`: `SPEC.md` con los supuestos,
`BITACORA.md` con lo que pasó en cada iteración y `INFORME.md` con el cierre.
Si algo del código parece raro, el motivo está casi siempre ahí.
