# Informe — 33 mejoras a Déficit

## Qué se construyó

La app pasó de una primera versión funcional a algo usable todos los días. Las 33 mejoras
(más el andamiaje de tests y un ítem 34 que apareció en el camino) están todas hechas y
verificadas una por una.

El cambio estructural más grande: la lógica se separó en tres archivos.
`core.js` tiene todo lo puro (cálculo, fechas, estado, análisis de la serie, formato),
`claude.js` toda la conversación con la API con el `fetch` inyectable, y `app.js` quedó
solo con render y eventos. Eso es lo que hizo posible testear de verdad, sin manos.

### Cómo correrlo

```bash
"W:\Working Folder Personal\DeficitCalorico\Deficit.bat"
```

Abre `http://localhost:5599`. Los tests están en `http://localhost:5599/tests.html`.

## Verificación

| Criterio de aceptación | Resultado |
|---|---|
| 1. Tests en verde, 40+ assertions | **148 tests, 0 fallos** |
| 2. App sin errores de consola | limpia en tab nuevo |
| 3. State viejo se abre y queda migrado | conserva datos y suma los campos nuevos |
| 4. Las 33 mejoras marcadas y verificadas | 34/34 ítems en `[x]`, cada uno con su línea de bitácora |
| 5. Service worker registrando y cacheando | activo, `deficit-v4` |
| 6. Exportar → borrar → importar | JSON idéntico byte a byte |
| 7. App usable sin API key | anillo, historial, carga manual y agua funcionan |

Ningún ítem quedó bloqueado.

## Las 33 mejoras

**Datos y modelo** — migración versionada · alimentos frecuentes con ranking de uso ·
momentos del día autodetectados · agua según peso corporal · ejercicio que amplía el objetivo.

**Carga de comidas** — editar una comida guardada · deshacer el borrado · repetir una comida
de otro día · multiplicador de porción · autocompletado desde los frecuentes.

**Análisis con Claude** — reintentos con backoff · cancelar el análisis · contexto del usuario
en el prompt · corregir la estimación por texto · modo etiqueta de envase · costo por llamada.

**Historial** — barras de 14 días · media móvil de peso · racha · progreso hacia la meta ·
balance semanal · TDEE adaptativo · editar días pasados.

**Robustez y UX** — la app sin API key · validación del perfil · formato es-AR · onboarding ·
aviso de versión nueva · accesibilidad · cuota de almacenamiento · CSV · backup automático ·
versión del service worker.

## Decisiones tomadas por criterio propio

1. **Cuáles eran las 33 mejoras.** El pedido no traía lista. Prioricé lo que ahorra llamadas
   a la API (frecuentes, autocompletado, repetir), lo que hoy era imposible y molestaba
   (editar una comida guardada), lo que da contexto para decidir (media móvil, TDEE real) y
   robustez ante errores.

2. **Separar `core.js` y `claude.js`.** Un ítem de "tests" sobre el `app.js` monolítico habría
   sido verificación de mentira: todo tocaba el DOM. La separación es lo que permite que los
   148 tests corran de verdad, y que la capa de red se pruebe con `fetch` mockeado sin gastar
   un centavo de API.

3. **TDEE adaptativo con condiciones estrictas.** Se niega a estimar con menos de 10 días o
   menos del 60% de cobertura. Un promedio sobre datos flojos es peor que no dar el número,
   porque invita a bajar el objetivo por una medición que no significa nada.

4. **El multiplicador de porción escala siempre desde el valor base.** Es el bug clásico de
   esta función: aplicar ×2 dos veces terminando en ×4. Hay un test dedicado a eso.

5. **Umbrales de cuota en 75% y 90%.** El aviso llega antes de que un guardado falle, no
   después. Las miniaturas son el 90% del volumen, así que el botón de liberar espacio va
   directo contra ellas.

6. **CSV con `;` y coma decimal.** Es lo que abre bien Excel en español; con `,` como
   separador se rompe con los números en formato local.

## Desvíos de la SPEC

Hubo cuatro, todos por cosas que aparecieron al verificar:

1. **El service worker pasó a network-first** (no estaba planeado). Con cache-first servía
   `app.js` viejo y la app quedaba pegada en una versión anterior: se publicaba un fix y no
   lo veía nadie. Apareció en el ítem 0 y frenaba toda verificación posterior.

2. **Ítem 34 agregado al TODO: versionado de assets (`?v=N`).** Aun con network-first, el
   cache HTTP del propio navegador seguía sirviendo CSS viejo — lo descubrí cuando las reglas
   de foco no aparecían en `document.styleSheets`. Sin esto, cualquier deploy futuro llega a
   medias a los dispositivos ya instalados.

3. **El aviso de versión nueva cambió el comportamiento del SW.** Estaba planeado solo como
   banner, pero el `skipWaiting()` automático hacía que la actualización se aplicara sola.
   Se sacó: ahora la versión nueva espera y la persona decide cuándo.

4. **Ítems 1 y 13 salieron junto con otros.** La migración versionada (1) quedó resuelta
   dentro del andamiaje del ítem 0, y el contexto en el prompt (13) dentro de la extracción de
   `claude.js`. Están verificados igual, con sus tests propios; la bitácora lo dice así en vez
   de inventarles una iteración separada.

## Números

- **35 iteraciones** sobre un presupuesto de 45.
- **34 ítems** completados, 0 bloqueados.
- **148 tests**, 0 fallos.
- **4 archivos** de código donde antes había 2 (`core.js`, `claude.js`, `app.js`, `tests.js`).
