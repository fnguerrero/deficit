# SPEC — ciclo 12: que no se pierdan datos

## Objetivo

Las mejoras clave de este ciclo salen de leer el camino que recorre un dato desde que
se carga hasta que llega al otro dispositivo. No son funciones nuevas: son los cuatro
lugares donde ese camino **pierde el dato en silencio**, que es la única categoría de
error que una app de registro diario no puede permitirse. Un número mal estimado se
corrige; una comida que desapareció no vuelve, y la persona ni siquiera se entera de
que faltaba.

El ciclo 11 protegió los datos contra el afuera (sin señal, análisis absurdos,
duplicados). Este los protege contra la app misma.

## Alcance

**Entra:**
- El sync automático se come lo que se cargó mientras corría.
- Quedarse sin señal desloguea la cuenta.
- Con la sesión caída, el sync sigue como anónimo y culpa a la anon key.
- Dos dispositivos el mismo día: el agua de uno borra el peso del otro.
- Un respaldo que sobrevive a la primera fusión con el servidor.
- El sync que viene fallando en silencio hace días.
- El andamiaje para probar todo eso sin red ni servidor.

**No entra:**
- Rehacer el modelo de conflictos (last-write-wins se queda: el conflicto lo genera
  una persona en dos dispositivos, no dos personas peleando).
- Sincronizar fotos. Siguen siendo locales, por peso.
- Tocar el personaje, el juego o la estética. Ese trabajo está cerrado.
- Correr nada contra el Supabase real: no hay credenciales en esta sesión y no se
  piden. Todo se prueba contra un doble del servidor.

## Stack y decisiones

Lo de siempre: HTML/CSS/JS planos, cero dependencias, tests propios en `tests.html`.
El doble del servidor es un objeto con la misma forma que `clienteSupabase`, no un
mock de `fetch`: probar el protocolo REST no es el punto, probar la coreografía sí.

## Supuestos

- **La fusión se re-aplica siempre sobre el estado vivo**, no solo cuando cambió. Es
  idempotente y sale más barato que llevar un contador de mutaciones que hay que
  acordarse de incrementar en cada lugar que escribe.
- **Agua y ejercicio se fusionan tomando el máximo.** Son acumuladores que solo suben
  durante el día. Es la heurística que menos datos pierde sin llevar un `act` por campo.
- **La sesión solo se borra si el servidor la rechaza.** Sin respuesta se conserva: no
  poder preguntar no es lo mismo que recibir un no.
- **El respaldo previo a la primera fusión vive en su propia clave** y no se pisa con
  cada `save()`, a diferencia de `deficit.v1.bak`.

## Criterios de aceptación

1. Una comida cargada mientras el sync está corriendo sigue existiendo al terminar.
2. Un refresco de token que falla por red no borra la sesión; uno que el servidor
   rechaza, sí.
3. Con sesión y sin token vivo, el sync no sube nada como anónimo y lo dice bien.
4. Peso en un dispositivo y agua en el otro, el mismo día: quedan los dos.
5. Antes de la primera fusión con el servidor queda un respaldo restaurable.
6. Tres días de sync fallado en silencio se ven en pantalla.
7. Toda la suite en verde, guardas y tamaños OK, consola limpia.

## Presupuesto

40 iteraciones. La bitácora sigue en #56.
