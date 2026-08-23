# Informe — ciclo 4: que la app se sienta terminada

## Qué se construyó

Los ciclos anteriores agregaron funciones. Este cerró la distancia entre "todas las piezas
funcionan" y "esto se siente una app". El disparador fueron tres cosas que pasaron de
verdad mientras Nico la usaba, no una lista de deseos.

### 1. Lo que quedó mintiendo al mover la clave al proxy

- El **onboarding seguía pidiendo la API key** que ya no hace falta. Ahora ese paso explica
  cómo se usa la app; sin proxy configurado vuelve a pedirla, porque ahí sí es necesaria.
- Los mensajes que mandan a cargar la clave se unificaron en una sola constante.

### 2. Que la app se actualice sin pelear

Nico no pudo actualizar la app en el celular, y era el diseño: la versión nueva esperaba a
que alguien tocara un banner.

- **Se actualiza sola cuando no hay nada en juego.** El banner queda solo si hay un modal
  abierto, un análisis corriendo o algo tipeándose, que ahí sí recargar sería sacarle el
  trabajo de las manos a la persona.
- **Busca versión nueva al volver a la app**, no solo al cargarla: quien la deja abierta
  días en el celular no dispara nunca el `load`.
- **Diagnóstico muestra la versión que sirve el worker activo**, preguntándosela por
  `MessageChannel`. Antes leía el cache más alto, que con una versión esperando decía que
  estabas actualizado cuando corrías la vieja.

### 3. Sincronización que no hay que acordarse de tocar

- Corre **al arrancar** (con piso de 2 minutos) y **4 segundos después de cualquier cambio**.
- El enganche está en `save()`, el único punto por donde pasa todo. Engancharlo en los seis
  lugares que agregan comidas habría dejado agujeros.
- **Nunca dos en paralelo**, y el **estado "sincronizando" ahora se ve**: con sincronización
  automática, la app hace pedidos que nadie pidió y no se veían por ningún lado.
- El cliente de Supabase **reintenta 429 y 5xx con backoff**; 401 y 404 no, porque no van a
  cambiar por insistir.

### 4. Robustez y accesibilidad

- **Offline verificado de verdad**: apagué el servidor y recargué. Carga el shell entero,
  navega las cuatro pantallas y pinta el anillo.
- Con el **almacenamiento lleno** avisa y sigue andando, sin lanzar.
- **Trampa de foco en los modales**: con uno abierto, el Tab ya no se escapa a la página de
  atrás, y al cerrar el foco vuelve de donde vino.

## Los tres bugs que aparecieron verificando

Ninguno estaba en el plan, y son lo más valioso del ciclo:

1. **`hidden` no ocultaba nada** en 6 elementos. Es solo `display:none` del navegador, así
   que cualquier clase propia con `display` se lo comía. El peor caso era `listaNutrientes`:
   la fila de fibra, azúcar y sodio que se suponía que aparecía *solo con datos* se veía
   siempre. Una regla `[hidden] { display: none !important }` lo cerró de raíz.
2. **El handler de sincronizar copiaba las credenciales globales al estado local**, el mismo
   bug que ya había evitado en los otros lugares del archivo.
3. **Dos bugs que había introducido yo mismo horas antes** con el menú de origen de foto: no
   respondía a Escape y no contaba como modal abierto, así que la app se podía
   auto-actualizar con el menú en pantalla.

## Verificación

| Criterio | Resultado |
|---|---|
| 1. Suite entera en verde | **463 tests, 0 fallos** (eran 448) |
| 2. Sin errores de consola, escritorio y móvil | 19 recursos, ninguno ≥ 400 |
| 3. Onboarding con proxy no pide clave | no la pide; título "Ya está todo listo" |
| 4. Sin proxy vuelve a pedirla | la pide; título "Para leer las fotos" |
| 5. Auto-actualiza ociosa, no con modal | ociosa manda `actualizar` sin banner; con modal, banner y nada más |
| 6. Sincroniza sola al arrancar y tras guardar | 1 ronda por cambio; 5 `save()` seguidos colapsan en una |
| 7. Un fallo de red deja el estado intacto | estado serializado idéntico antes y después |
| 8. Arranca sin conexión | servidor apagado: 28 recursos del cache, 4 pantallas navegables |
| 9. Errores del diagnóstico se limpian | 3 → "3 errores" → limpiar → "todo en orden" |
| 10. Teclado y nombres accesibles | 0 sin nombre y 0 inalcanzables en las 4 pantallas y los 2 modales |

## Decisiones tomadas por criterio propio

1. **La auto-actualización no pregunta.** Nadie quiere decidir sobre service workers. El
   banner se reserva para cuando hay algo que se perdería.
2. **El enganche de sincronización va en `save()`**, no en cada pantalla. Un solo punto no
   deja agujeros y cubre también editar, borrar y anotar el peso.
3. **Dos criterios distintos para sincronizar sola**: al arrancar con piso de tiempo, tras
   un cambio sin piso pero con espera corta. Son situaciones distintas: en una puede no
   haber nada nuevo, en la otra seguro que sí.
4. **La sincronización automática es muda.** Si falla, se anota y ya está: no vale
   interrumpir a alguien que está cargando el almuerzo con un error que no pidió.

## Desvíos de la SPEC

Uno solo, y a favor: apareció el ítem **1b**, el bug de `hidden`, que no estaba planeado y
resultó el hallazgo más importante del ciclo. Salió de verificar el ítem 1 en serio en vez
de confiar en que la lógica alcanzaba.

Los ítems 14 (limpiar errores) y 16 (accesibilidad) **ya estaban cumplidos** antes de
empezar: se verificaron y se cerraron sin tocar código. Quedan anotados como verificación,
no como trabajo.

## Lo que sigue pendiente, y es de Nico

- **Correr la calibración.** Sigue siendo lo único que no puede hacer nadie más que él:
  necesita fotos de sus comidas con calorías conocidas. Lo que sí quedó medido es que
  **leer una etiqueta funciona perfecto** (8 de 8 valores), pero eso es transcribir;
  estimar un plato servido es adivinar porciones y no está medido.
- **Emparejar los dos dispositivos** con la llave de sincronización.
- **Probar la sincronización contra el Supabase real.** Toda la verificación se hizo contra
  un servidor simulado, porque escribir en su base necesita su OK.

## Números

- **17 ítems** completados, 0 bloqueados, sobre un presupuesto de 40 iteraciones.
- **463 tests**, 0 fallos.
- **3 bugs** encontrados verificando, ninguno previsto.
