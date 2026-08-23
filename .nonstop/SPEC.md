# SPEC — ciclo 4: que la app se sienta terminada

## Objetivo

Los ciclos anteriores construyeron funciones. Este cierra la distancia entre "todas las
piezas funcionan" y "esto se siente una app". El disparador son tres cosas que pasaron de
verdad hoy: el onboarding sigue pidiendo una clave que ya no hace falta, Nico no pudo
actualizar la app en su celular, y la sincronización es un botón que hay que acordarse de
tocar. Nada de eso es una función faltante: es la app comportándose como un prototipo.

## Alcance

**Entra:**
- Lo que quedó desactualizado al mover la clave al proxy y conectar Supabase.
- Que la actualización de la app sea confiable, que fue un problema real.
- Sincronización automática, que es lo que uno espera de algo "sincronizado".
- Robustez: qué pasa cuando falla la red, cuando se corta a la mitad, cuando no hay datos.
- Accesibilidad y offline, verificables por DOM sin intervención de Nico.

**No entra:**
- Sincronizar las fotos (necesita Supabase Storage; es un ciclo aparte).
- Medir la estimación de platos servidos: necesita fotos reales de comidas de Nico con
  calorías conocidas. Es su pendiente y ninguna cantidad de trabajo mío lo reemplaza.
- Rediseño visual. La app se ve bien; el problema es de comportamiento.

## Stack y decisiones

Sin cambios: HTML/CSS/JS vanilla, sin build ni dependencias, un archivo por pantalla en
`ui/`. Tests propios en `tests.js`, que corren en el navegador sin tocar ninguna red.

## Supuestos

1. **La sincronización automática no reemplaza al botón manual.** Se agrega, no se
   sustituye: el botón sigue siendo la forma de forzarla y de ver qué pasó.
2. **Auto-sincronizar es seguro sin preguntar** porque la fusión ya resuelve conflictos
   por comida y las tumbas evitan que lo borrado reviva. Ambas cosas están testeadas.
3. **La app se actualiza sola cuando no hay nada en juego.** Si no hay un análisis en
   curso ni un modal abierto, tomar la versión nueva sin preguntar es lo correcto: nadie
   quiere decidir sobre service workers. El banner queda para cuando sí hay algo abierto.
4. **Escribir en el Supabase real requiere el OK de Nico** (regla de bases de datos). La
   sincronización se verifica contra un servidor simulado, que es como se probó siempre;
   la prueba contra el proyecto real queda pedida explícitamente al cierre.
5. **El onboarding no debe mencionar la API key** mientras el proxy esté configurado. Con
   proxy, ese paso pasa a explicar qué hace la app; sin proxy, sigue pidiendo la clave.

## Criterios de aceptación

1. La suite pasa entera, sin fallos, y suma tests por cada ítem nuevo.
2. Sin errores en la consola al arrancar, ni en escritorio ni en viewport móvil.
3. El onboarding con proxy configurado no pide ninguna clave y se completa en 3 pasos.
4. Con el proxy vacío, el onboarding vuelve a pedir la clave: no se rompió ese camino.
5. Una versión nueva del service worker se activa sola con la app ociosa, y NO se activa
   sola con un modal abierto.
6. La sincronización corre sola al arrancar y después de guardar una comida, sin bloquear
   la interfaz, y no corre dos veces en paralelo.
7. Un fallo de red durante la sincronización deja el estado local intacto y el error
   visible, no un estado a medias.
8. La app arranca y navega sin conexión, con los datos que ya tenía.
9. Los errores del diagnóstico se pueden limpiar, y el contador refleja lo que hay.
10. Todo control interactivo alcanzable por teclado y con nombre accesible.

## Presupuesto

40 iteraciones.
