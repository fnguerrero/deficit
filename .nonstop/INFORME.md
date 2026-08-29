# Informe — ciclo 12: que no se pierdan datos

29/08/2026 · 8 iteraciones (#56 a #63) sobre un presupuesto de 40 · ninguna bloqueada.

## De dónde salieron las mejoras

No de una lista de funciones que faltan. De seguir el camino de un dato desde que se
carga hasta que llega al otro dispositivo, y marcar dónde se pierde. Aparecieron cuatro
puntos, y los cuatro perdían **en silencio**: sin error, sin aviso, sin nada raro en
pantalla. Es la única categoría que una app de registro diario no puede permitirse —un
número mal estimado se corrige; una comida que desapareció no vuelve, y nadie se entera
de que faltaba.

El ciclo 11 protegió los datos contra el afuera. Este los protege contra la app misma.

## Los cuatro agujeros

**1. El sync automático se comía lo que se cargaba mientras corría.** `sincronizar` clona
el estado al fusionar lo remoto y después se queda subiendo. Todo lo cargado durante esa
subida quedaba afuera del clon, y `correrSync` asignaba ese clon al estado global. El sync
automático corre **cuatro segundos después de cada cambio**, que es exactamente cuando se
está cargando la comida siguiente. Ahora `fusionarAlFinal()` re-aplica lo remoto sobre el
estado vivo; es idempotente, y sin nada que bajar ni siquiera clona.

**2. Quedarse sin señal deslogueaba.** El `catch` del refresco era uno solo, así que un
fetch que ni sale —un subte, un ascensor— se trataba igual que un "ese refresco no sirve"
del servidor: borraba la sesión. A partir de ahí la app guardaba todo local sin subir
nada. Ahora `pedir()` marca los fallos de red y `token()` los relanza conservando la
sesión: **no poder preguntar no es lo mismo que recibir un no.**

**3. Con la sesión rechazada, el sync seguía como anónimo.** El cliente caía en la anon
key, y con RLS eso es un 401 seguro. El mensaje que salía era *"Supabase rechazó la clave.
Revisá la anon key y las políticas"*: mandaba a revisar una configuración perfecta cuando
lo único que pasaba era que había que volver a entrar. Y de paso habría subido filas sin
`user_id`, huérfanas. Ahora `decisionDeSync()` junta las cuatro razones en un lugar puro.

**4. El día se resolvía entero por `act`.** Ganaba el más nuevo y el otro se tiraba
completo. Con celular y compu el mismo día eso perdía datos siempre: cuatro vasos de agua
en la compu a las 10 y una caminata en el celu a las 18 —cuyo agua es 0 porque ahí nunca
se tocó— y al sincronizar desaparecían los cuatro vasos. `fusionarDia()` ahora decide por
campo según **qué es cada uno**: agua y ejercicio son acumuladores (máximo), el peso lo
pone una balanza (vale el que lo tiene), y una nota vacía nunca pisa una escrita.

## Y dos redes que no existían

**Un respaldo antes del único paso irreversible.** `deficit.backup` se pisa en cada
`save()`, así que a los pocos segundos ya no sirve para volver de nada: lo que tiene es el
estado de hace un vaso de agua. Entrar con la cuenta por primera vez —el servidor adopta
las filas sueltas y todo lo de allá se fusiona con lo de acá— es el único momento en que
el historial entero está en juego de una sola vez. Ahora queda una copia aparte, sin las
fotos (95 % del peso), que se queda hasta que se la descarte a mano.

**El sync que falla en silencio ahora se ve.** El caso peor no era no tener cuenta: era
tenerla y **creer** que estaba todo a salvo mientras el sync venía fallando hace una
semana. Falla en silencio a propósito, y el aviso vivía en Ajustes, una pantalla donde
nadie entra si no tiene un problema; o sea que el problema se conocía recién cuando ya
había pasado. La barra al pie cubre ahora los cuatro casos, y con cuenta el botón dice
**Sincronizar** y lo hace ahí mismo.

## Verificación

| Qué | Resultado |
|---|---|
| Tests propios | **814 en verde** (31 nuevos) |
| `guardas.py` | OK — 46 scripts, 610 globales, 375 ids |
| `tamanos.py` | Todo dentro de límite |
| Consola | Limpia: 0 errores en los diez render y las cinco pestañas |
| Sesión vencida, en la app real | Con 401 no toca `/rest/` y avisa bien; sin red la sesión sobrevive |
| Respaldo | Se guardó, se destruyó el día, se volvió: el peso y la comida estaban |
| Barra al pie | Los cuatro casos, la ✕ y el botón que sincroniza |
| **Primer login completo** | Contra un servidor falso: auth → reclamar llave → bajar → subir, **con el peso local sobreviviendo a un día remoto más nuevo** |

Los siete criterios de aceptación pasan.

## El andamiaje que hacía falta

Cada pieza del sync se probaba sola: `aplicarRemoto` con filas a mano, `cambiosLocales`
con un estado a mano. Lo que nunca se probaba era la **coreografía** —bajar, fusionar,
decidir qué subir, subirlo—, y ahí es donde estaban los cuatro bugs, porque ninguno vive
dentro de una función: viven entre dos. El doble del servidor tiene la forma de
`clienteSupabase` y no la de `fetch`: probar otra vez el REST no aportaba nada, poder
mirar **qué** se subió y en qué orden sí.

## Desvíos de la SPEC

- **Salió un archivo que no estaba planeado.** `sync.js` llegó a 589 de 600 y se partió
  antes de reventar: `estado-sync.js` se lleva las tres preguntas que se leen en pantalla
  (si conviene sincronizar, si se puede, si está a salvo lo que hay). Son la parte que
  cambia cuando cambia el producto, no cuando cambia el servidor.
- Nada más se desvió.

## Casi lo duplico, otra vez

Antes de escribir el aviso de "hace días que no sincronizás" busqué el concepto, y
`estadoRespaldo()` y `diasSinRespaldo()` ya existían. `estadoRespaldo()` **no** era lo
mismo —responde hace cuánto que no se exporta un archivo, que es otra red— pero
`diasSinRespaldo()` se reusó tal cual. Buscar el nombre del concepto antes de escribir
sigue siendo lo único que frena esto.

## Un susto que valió la pena

La suite pasó de 808 a 591 de golpe. No era un test roto: era `tests2.js` **entero** que
dejaba de cargar por un `const DIA_MS` que ya vivía en `tests.js`. Que el total baje en
bloque es la señal de un archivo que no parsea, no de una regresión.

## Bloqueados

Ninguno.
