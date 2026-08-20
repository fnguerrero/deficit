# Bitácora — 33 mejoras a Déficit

Formato: `#N — qué se hizo — cómo se verificó`

#0 — Bootstrap: SPEC con 7 criterios de aceptación, TODO con 34 ítems (33 mejoras + andamiaje de tests), presupuesto 45 iteraciones — verificado: los 3 archivos de .nonstop escritos y el proyecto ya andaba en http://localhost:5599 sin errores de consola

#1 — Andamiaje: core.js con la logica pura (migrar/calcularPlan/sumarComidas/fechas), app.js refactorizado para usarlo, tests.html+tests.js con runner propio. Ademas el SW paso a network-first porque servia app.js viejo cacheado — verificado: 30 tests en verde y tab nuevo de la app sin errores de consola

#2 — Migracion versionada (ESQUEMA=2) con defaults y saneado de comidas corruptas — verificado: 6 tests de migracion en verde, incluyendo idempotencia y state viejo real

#3 — Alimentos frecuentes: registrarFrecuentes/buscarFrecuentes en core.js, conectados al guardado de comidas, con ranking por uso y desempate por reciente — verificado: 12 tests nuevos (42 en total) en verde, incluyendo no-mutacion y tope de 200

#4 — Momentos del dia: MOMENTOS/momentoPorHora/agruparPorMomento en core, comidas agrupadas con subtotal en Hoy y selector en el modal — verificado: 9 tests nuevos (51 total) y en la app real desayuno 420 / almuerzo 790 con total 1210

#5 — Agua del dia: objetivoAgua (35 ml/kg, piso 6 vasos), tarjeta con vasos clicables y litros — verificado: 3 clics + / 1 clic - deja 2 vasos, persistido en localStorage, 13 vasos de objetivo para 92 kg

#6 — Ejercicio del dia: objetivoEfectivo suma lo quemado al objetivo, con input propio — verificado: cargar 400 kcal movio el objetivo mostrado de 1991 a 2391

#7 — Editar comida guardada: tocar la fila abre el modal en modo edicion (o con un item unico si es vieja sin desglose) y guarda sobre la misma comida — verificado: editar de 610 a 900 kcal dejo el dia en 1500, con 3 comidas (no duplico) y persistido en localStorage

#8 — Deshacer borrado: el toast acepta accion y borrarComida guarda la comida y su posicion — verificado: borre la del medio (1500 -> 600 kcal) y al deshacer volvio identica y en el mismo lugar (comparacion JSON exacta)

#9 — Repetir comida: panel nuevo en el modal con las comidas de los ultimos 14 dias sin duplicados, precarga en el editor como comida nueva del momento actual — verificado: repeti una pizza de ayer, hoy paso de 1500 a 2350 kcal y el dia de ayer quedo intacto

#10 — Multiplicador de porcion x0,5/x1/x1,5/x2 por alimento, escalando siempre desde el valor base y reescribiendo el texto de la porcion — verificado: 10 tests nuevos (68 total) y en la app x2 dio 700 kcal/200 g, x0,5 dio 175/50 g (no acumulativo) y lo guardado salio sin los campos internos

#11 — Autocompletado desde los frecuentes en el editor de alimentos (desde 2 letras, top 5, completa los 6 campos) — verificado: con 'f' no sugiere, con 'fid' sugiere Fideos 700 kcal y al elegirlo completo porcion y los 4 macros

#12 — Capa de API extraida a claude.js (fetch inyectable) con reintentos y backoff exponencial ante 429/5xx/red, respetando retry-after y sin reintentar 401/400 — verificado: 6 tests con fetch mockeado (99 en total), incluyendo esperas [800, 5000] con retry-after de 5s

#13 — Contexto del usuario en el prompt (momento, objetivo, consumido y 15 alimentos frecuentes) con recaudo explicito de no sesgar las calorias — verificado: 2 tests del prompt armado y app.js mandando contextoDelUsuario()

#14 — Cancelar analisis en curso con AbortController (boton en el modal y al cerrarlo) — verificado: con un fetch que nunca resuelve, cancelar cerro el modal sin pantalla de error y sin contar la llamada en el uso

#15 — Corregir la estimacion por texto y rehacerla sin sacar otra foto, reenviando la estimacion previa como turno assistant — verificado: 'la porcion era el doble' llevo el total de 650 a 1300 kcal, con la correccion en el prompt y 3 mensajes en el body

#16 — Modo etiqueta: prompt propio para leer la tabla nutricional de un envase, con boton aparte — verificado: el body salio con el prompt de etiqueta y devolvio la barrita con la nota de porciones por envase

#17 — Tokens y costo por analisis (precio por modelo) mostrados en el resultado y acumulados en Ajustes — verificado: 1800+260 tokens en Opus 5 dio US$ 0,0155 exacto y el acumulado sumo las 4 llamadas

#18 — Grafico de barras de los ultimos 14 dias con linea de objetivo, barras rojas cuando se pasa y marca fina en los dias sin cargar — verificado: 14 barras, 1 vacia (el hueco), 13 en rojo contra objetivo 1977 y linea de objetivo presente

#19 — Media movil de 7 dias sobre la curva de peso, con leyenda y el delta calculado sobre la tendencia y no sobre el ultimo dato suelto — verificado: 4 tests de mediaMovil (ruido de +-2 kg aplanado a 90) y las dos lineas dibujadas

#20 — Racha de dias seguidos registrados, tolerando que hoy este vacio todavia — verificado: 4 tests y en la app dio 4 dias seguidos con un hueco 4 dias atras

#21 — Progreso hacia el peso meta en porcentaje, acotado a 0-100 — verificado: bajar 1 de 10 kg dio 10% con el texto de cuanto falta

#22 — Balance semanal acumulado en kcal y kg, sumando el ejercicio al gasto e ignorando dias sin cargar — verificado: 3 tests exactos (14000 consumido vs 17500 gastado = -3500) y en la app -2562 kcal / -0,33 kg

#23 — TDEE adaptativo: gasto real estimado del consumo promedio mas el peso perdido, exigiendo 10 dias y 60% de cobertura — verificado: 5 tests (incluye negarse con datos flojos) y en la app 2553 kcal reales vs 2527 de formula

#24 — Editar dias pasados: aviso visible con boton 'volver a hoy' y comidas fechadas con la hora tipica del momento en vez de la hora actual — verificado: 4 tests nuevos (122 total) y cargar en anteayer guardo la comida a las 13 en ese dia, dejando hoy intacto

#25 — Sin API key: tarjeta discreta con 'cargar la key' o 'ahora no' (persistente) en vez de mandarte a la fuerza a Ajustes, y toast con accion al intentar una foto — verificado: en un tab limpio sin key el anillo, agua, carga manual e historial funcionan y la consola quedo sin errores

#26 — Validacion del perfil por campo con limites y mensajes concretos, marcando el input y sin guardar hasta corregir — verificado: 7 tests nuevos y en la app altura 1.78 + meta 99 kg marco los 2 campos con su mensaje, no guardo y puso el foco en el primero

#27 — Formato es-AR en toda la UI (fmtNum/fmtKcal/fmtDelta/fmtPeso, 26 puntos de render) — verificado: 7 tests de formato y un barrido del texto de las 3 pantallas sin ningun numero con punto decimal ni miles sin separador

#28 — Onboarding de 3 pasos la primera vez (bienvenida, datos con validacion, API key opcional) que ademas deja cargado el peso del dia — verificado: recorri los 3 pasos, el paso 2 freno con datos vacios, quedo objetivo 2.314 kcal y tras recargar no volvio a aparecer

#29 — Aviso de version nueva: el SW ya no saltea solo, espera la orden y la app muestra un banner con boton Actualizar — verificado: subi el SW a v3, aparecio el banner, al actualizar quedo solo el cache v3 (v2 borrado) y la pagina recargo sola

#30 — Accesibilidad: aria-label en todos los botones de icono, roles tablist/tab con aria-selected, dialog en los modales, svg con descripcion, toast aria-live, foco visible y prefers-reduced-motion, y subi el contraste del gris secundario — verificado: barrido del DOM sin botones ni inputs sin nombre accesible y las 3 reglas de focus-visible activas

#31 — Item nuevo detectado (34): versionado de assets con ?v=3 en HTML y en el shell del SW, porque el cache HTTP del navegador servia CSS viejo pese al network-first — verificado: las reglas de focus-visible y el gris nuevo recien aparecieron despues de versionar

#32 — Aviso de cuota de localStorage con barra, umbrales 75/90% y boton para soltar las fotos viejas; save() ademas purga miniaturas y sacrifica el backup antes de fallar — verificado: 5 tests y en la app con 3.906 KB de fotos marco 76% en amarillo y liberarlas volvio a 0%

#33 — Exportar CSV (separador ; coma decimal y BOM para Excel en español), una fila por alimento con peso, agua y ejercicio del dia — verificado: 7 tests (incluye escapado de ; y comillas) y la descarga real genero deficit-2026-08-20.csv con 16 filas

#34 — Backup automatico: cada save deja la version anterior como copia, con boton para restaurar y recuperacion sola si el state principal queda ilegible — verificado: borre los 15 dias y los restaure identicos, y con el JSON corrupto la app arranco de la copia avisando

#35 — Cierre: SW a v4 con el ?v=4 de los assets alineado y README reescrito con las 33 mejoras y la regla de subir la version en los dos lugares — verificado: los 7 criterios de aceptacion pasaron (148 tests, consola limpia, migracion de state viejo, export-import identico, SW activo, app usable sin API key)
