# Informe — 30 mejoras a Déficit (ciclo 2)

## Qué se construyó

El ciclo 1 dejó la app completa en registro y seguimiento. Este ciclo atacó tres cosas
que faltaban: **sacar fricción del uso diario**, **gastar menos API** y **que los datos
digan algo**, no solo que se muestren.

Salieron 31 mejoras: las 30 planeadas más una que apareció verificando.

### Cómo correrlo

```bash
"W:\Working Folder Personal\DeficitCalorico\Deficit.bat"
```

`http://localhost:5599` para la app, `/tests.html` para la suite.

## Verificación

| Criterio de aceptación | Resultado |
|---|---|
| 1. 200+ tests, 0 fallos | **319 tests, 0 fallos** |
| 2. App sin errores de consola | limpia en tab nuevo |
| 3. State del ciclo anterior migra sin pérdida | conserva perfil, días, fotos, uso y frecuentes; suma los 8 campos nuevos |
| 4. Las 30 mejoras `[x]` con verificación | 31/31 ítems, cada uno con su línea de bitácora |
| 5. Cero llamadas reales a la API | todo con `fetch` mockeado, incluido el streaming |
| 6. Exportar → borrar → importar | JSON idéntico |
| 7. Usable sin API key y sin conexión | anda sin key; el shell completo responde desde el cache |
| 8. Contraste AA en los dos temas | mínimo **4,92** en claro y **5,92** en oscuro |

Ningún ítem quedó bloqueado.

## Las 31 mejoras

**Menos fricción** — favoritos de un toque · recetas reutilizables · copiar un día entero ·
suma rápida de calorías · mover comidas de momento o de día · nota del día · buscador en el
historial · visor de la foto en grande.

**Menos API** — cache por huella de imagen (la misma foto no se paga dos veces) · streaming
con los alimentos apareciendo mientras llegan · varias fotos en un solo análisis · modos
rápido/normal/preciso · sugerencias de qué comer con lo que queda · registro de cada llamada
con su costo.

**Datos que dicen algo** — proyección de peso a 4 semanas · adherencia · reparto por momento
del día · patrón por día de la semana · comparación semana contra semana · aviso de proteína
corta · informe mensual imprimible.

**Plataforma** — tema claro · recordatorios locales · cambio de día a medianoche · atajos de
teclado · confirmación al descartar · rendimiento con años de datos.

**Robustez** — revisión de datos incoherentes · importar fusionando · pantalla de diagnóstico
· limpieza de caches viejos del service worker.

## Decisiones tomadas por criterio propio

1. **Cuáles eran las 30 mejoras.** Sin lista, prioricé lo que ahorra tiempo todos los días,
   lo que ahorra plata de API y lo que lleva a una decisión concreta.

2. **El cache de análisis no se usa en las correcciones.** Corregir es justamente pedir una
   respuesta distinta: reusar la anterior sería lo contrario de lo que pide el usuario.

3. **Los recordatorios prometen solo lo que pueden.** Sin servidor no hay push real, así que
   la UI dice "con la app abierta o recién usada" en vez de sugerir que llegan siempre.

4. **La fusión al importar completa, nunca pisa.** El peso, la nota y la configuración del
   dispositivo mandan; el backup solo llena huecos. Y el gasto de API se suma, porque es
   historia real de plata gastada.

5. **La proyección de peso usa regresión lineal sobre toda la serie.** Dos puntos sueltos en
   el peso son retención de agua, no tendencia.

6. **El TDEE adaptativo y la alerta de proteína se niegan a hablar con pocos datos.** Un
   número calculado sobre tres días flojos invita a decisiones peores que no tener número.

## Desvíos de la SPEC

Cinco, todos por cosas que aparecieron verificando:

1. **Ítem 31 agregado al TODO** (no estaba planeado): el service worker limpiaba los caches
   viejos solo al activarse, y como cada versión espera confirmación, se habían acumulado
   **34 caches**. Ahora limpia también al instalar.

2. **`tools/version.py`** (no estaba planeado): subir la versión a mano en `sw.js` + dos HTML
   era el paso que más veces se olvidaba, y olvidarlo hacía que el navegador sirviera código
   viejo y los tests fallaran por una razón falsa. Un comando lo resuelve.

3. **`proyectarPeso` se reescribió.** El primer cálculo mezclaba un punto crudo con uno
   suavizado y subestimaba la tendencia: con 1 kg en 14 días daba -0,4 en vez de -0,5. El
   test estaba bien y el código mal.

4. **`tsParaFecha` se partió en dos.** Al copiar un día a *hoy* usaba la hora actual, y un
   desayuno copiado a la noche quedaba a las 22:00 con momento "desayuno". Se separó
   `tsEnMomento`, que siempre usa la hora típica.

5. **Dos correcciones de idioma** que los tests no iban a atrapar porque eran de redacción:
   "los vierness" (los días terminados en -s no pluralizan) y "¿Cargaste el cena?" (cada
   momento ahora lleva su artículo).

## Números

- **32 iteraciones** sobre un presupuesto de 40.
- **31 ítems** completados, 0 bloqueados.
- **319 tests** (eran 148 al empezar el ciclo), 0 fallos.
- **0 llamadas reales a la API** en todo el trabajo.
- La app pasó de 4 a 5 archivos de código (`core.js`, `claude.js`, `app.js`, más
  `tools/version.py` y `tools/gen_iconos.py`).
