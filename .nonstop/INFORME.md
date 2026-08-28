# Informe — ciclo 9: diez mejoras

28/08/2026 · 12 iteraciones (#28 a #39) sobre un presupuesto de 40 · ninguna bloqueada.

## Las diez

**1. Una comida corregida a otro día quedaba duplicada al sincronizar.**
Llegaba del remoto con la fecha nueva, la búsqueda solo miraba la lista de esa fecha, no
la encontraba, la agregaba — y la vieja se quedaba donde estaba. La misma comida contada
dos veces, en dos días distintos, con los dos totales mal. Ahora se saca de cualquier otro
día antes de agregarla.

**2. Tope de peso para la foto.** No por lo que cuesta mandarla —eso ya lo resuelve el
redimensionado— sino por leerla: `readAsDataURL` de veinte megas arma un string de treinta
y pico y en un celular modesto la pestaña se cae sin decir nada. Ahora rebota con el número.

**3. Reintentar un análisis fallido sin volver a sacar la foto.** Cuando se cortaba el
wifi, lo que se perdía no era el intento: era la foto, y había que sacarla de nuevo con el
plato ya a medio comer. Las imágenes procesadas quedan en memoria y el botón reejecuta.

**4. Las frecuentes dejan de congelarse.** Se ordenaban solo por cantidad de usos, así que
algo comido cuarenta veces hace un año le ganaba para siempre a lo que se come todos los
días: la lista mostraba lo que uno comía, no lo que come. Ahora el puntaje cae a la mitad
cada 45 días sin usarse.

**5. Los logros dicen cuándo se ganaron.** Un logro es algo que pasó un día concreto, y
sin la fecha la tarjeta solo repetía lo que ya decía el color.

**6. Las fotos viejas se podan.** Cada comida guardaba dos imágenes en base64: 20 kB por
comida son **21 MB al año** con tres comidas por día, contra los 5 MB que da un
localStorage. No se ponía lenta: reventaba, y se llevaba el historial. La del visor dura
21 días y el thumb 180; el dato no se toca nunca.

**7. `core.js`, partido.** Estaba a **seis líneas** de su límite. Salió `fotos.js` con la
huella, el cache de análisis y la poda.

**8. `figura.js` y `cara.js` salen del shell offline.** Desde que el cuerpo es un sprite,
la app cargaba treinta kB en cada arranque para no dibujar nada. Siguen en el taller y en
los tests.

**9. Cuánto falta para la próxima comida esperada.** No es un recordatorio: es saber si lo
que estás por cargar cuenta como merienda o como cena, que es de donde sale el reparto del
día.

**10. El gráfico de peso deja de deformar el tiempo.** Usaba el **índice** como eje X, así
que dos pesadas separadas por dos meses quedaban a la misma distancia que dos de días
seguidos y una bajada lenta parecía una caída en picada. Ahora el eje va por fecha, y con
huecos de más de diez días la línea se corta en vez de inventar la tendencia del medio.

## Verificación

| Qué | Resultado |
|---|---|
| Tests propios | **771 en verde** (6 nuevos) |
| `tools/guardas.py` | OK — 41 scripts, 555 globales, 354 ids |
| `tools/tamanos.py` | Todo dentro de límite |
| Consola | Limpia, y las cinco pestañas renderizan sin errores |
| Compresión de foto | 326 kB de original salen como 60 |
| Costo de las fotos guardadas | 20,1 kB por comida medidos → 21,5 MB al año |
| Eje del gráfico de peso | Tres pesos (dos seguidos, uno a dos meses) dan cx 22 / 26,7 / 298 |

Los cuatro criterios de aceptación pasan.

## Desvíos de la SPEC

Tres, y los tres por lo mismo: el ítem escrito no era el problema real.

- **Dos de los diez ya estaban resueltos.** «La foto se comprime antes de mandarla» estaba
  hecho desde antes (se midió para confirmarlo) y «el momento del día sale de la hora»
  también, con test propio. Se marcaron sin tocar nada y se agregaron **dos mejoras más**
  en su lugar (la 9 y la 10), para que fueran diez de verdad.
- **El ítem decía partir `tests.js`; se partió `core.js`.** `tests.js` tiene 700 líneas de
  margen y `core.js` tenía seis. Partir el que no urgía y dejar el que sí habría sido
  seguir la lista en vez de mirar el proyecto.
- **El ítem del cache de imágenes apuntaba al lugar equivocado.** El cache de análisis
  guarda resultados, no imágenes; las que inflan el localStorage son las fotos de las
  comidas. Se arregló eso.

Además se descartó un ítem: «tocar el anillo abre el detalle de macros». Los macros ya se
ven al lado del anillo, así que no agregaba nada.

## Dos veces el test tuvo razón, y una vez no

- El test de la fusión falló por **mi** error: `aplicarRemoto` devuelve `{estado, resumen}`
  y yo leía `r.dias`. Se arregló el test.
- El de los logros falló y **tenía razón**: `juegoDe()` es una lista blanca de campos y
  tiraba `fechasLogros` en cada recálculo, así que la fecha duraba hasta el siguiente
  render. Se arregló el código.

## Bloqueados

Ninguno.
