# Bitácora — 30 mejoras a Déficit (ciclo 2)

Formato: `#N — qué se hizo — cómo se verificó`

#0 — Bootstrap del ciclo 2: ciclo 1 archivado en .nonstop/ciclo-1, SPEC con 8 criterios y TODO con 30 items; el andamiaje de tests ya existe del ciclo anterior — verificado: 148 tests en verde y la app publicada andando antes de tocar nada

#1 — Favoritos: estrella por alimento en el editor y tarjeta en Hoy que carga la comida entera de un toque, con deshacer. Ademas tools/version.py para subir la version de assets en un comando — verificado: 9 tests nuevos (157 total) y en la app marcar Milanesa dejo el chip, un toque sumo 430 kcal con sus macros y deshacer lo saco

#2 — Recetas: guardar la comida del editor como plantilla con nombre (reemplaza en vez de duplicar y conserva los usos) y aplicarla desde el panel de repetir — verificado: 13 tests nuevos (170 total) y en la app guarde un desayuno de 3 alimentos, lo apliqué y sumó 425 kcal sin tocar la receta original

#3 — Copiar un dia entero desde el panel de repetir, con ids nuevos y deshacer. El test marco un error real: tsParaFecha usaba la hora actual cuando el destino era hoy, y un desayuno copiado quedaba a las 22 — se separo tsEnMomento y ahora la copia respeta la hora del momento — verificado: 8 tests nuevos (178 total) y copiar ayer dejo 900 kcal con las comidas a las 8:00 y 13:01, ayer intacto

#4 — Suma rapida: cargar kcal sueltas sin desglose desde la tarjeta del dia, con Enter y deshacer — verificado: 250 movio el anillo a 250 y limpio el input, 0 y 99999 fueron rechazados, Enter sumo 150 mas y deshacer volvio a 250

#5 — Mover una comida de momento o de dia desde el editor (selector de fecha que solo aparece al editar), con la hora acompañando al momento nuevo — verificado: pasar de almuerzo a cena la puso en el grupo Cena a las 21, y moverla a ayer dejo hoy en 0 kcal con la comida fechada correctamente en ayer

#6 — Nota del dia con guardado automatico e indicador cuando hay texto — verificado: escribir y salir del campo dejo la nota en el state y en localStorage, y cambiar de dia mostro el campo vacio sin arrastrarla

#7 — Buscador en el historial por titulo, alimento o nota del dia, con resumen de veces/dias/kcal y la lista de dias que se oculta mientras buscas — verificado: 9 tests nuevos (187 total) y buscar pizza en la app dio 2 resultados con 1.600 kcal totales y 800 de promedio

#8 — Visor de fotos: se guarda una version de 384 px ademas de la miniatura y tocar el thumb la abre en grande con titulo, kcal y notas; la purga por cuota suelta primero esas fotos — verificado: el flujo completo dejo thumb de 1 KB y foto de 3 KB, el visor abrio con la grande y sin ella cae a la miniatura avisando

#9 — Cache de analisis por huella de imagen (FNV-1a muestreado, tope 24, 30 dias, distinto por modo y sin usarlo en correcciones) guardado en el state — verificado: 11 tests nuevos (198 total) y en la app la misma foto dos veces dejo 1 sola llamada, costo sin cambios y aviso de que no gasto API

#10 — Streaming SSE con avance real: leerStream reconstruye el mensaje y alimentosParciales saca los nombres del JSON incompleto para mostrarlos mientras llegan — verificado: 9 tests nuevos (207 total, incluye evento partido entre chunks) y en la app el cartel paso de la frase generica a 'Bife de chorizo' y despues '· Ensalada mixta'

#11 — Varias fotos en un mismo analisis (hasta 4) en un unico mensaje, con el prompt aclarando que son la misma comida y sin contar dos veces; el cache distingue el set — verificado: 7 tests nuevos (214 total) y en la app 3 fotos distintas viajaron en 1 mensaje y dieron una comida de 640 kcal

#12 — Modos de precision (Rapido con Haiku sin effort / Normal medium / Preciso high) elegibles en Ajustes, con el cache separado por modo — verificado: 6 tests nuevos (220 total) confirmando modelo, effort y que rapido sale mas barato; en la app la eleccion quedo persistida

#13 — Sugerencias de que comer con lo que queda: schema propio, prompt con el margen real y prioridad a la proteina, 3 opciones tocables que precargan el editor — verificado: 8 tests nuevos (228 total) y en la app con 791 kcal de margen devolvio 2 opciones, elegir una cargo 420 kcal al dia

#14 — Registro de analisis en Ajustes: cada llamada queda anotada con tipo, modelo, tokens y costo, marcando cuales salieron del cache — verificado: 6 tests nuevos (234 total) y en la app las dos subidas de la misma foto quedaron como una pagada (US$ 0,014) y una 'del cache'

#15 — Proyeccion de peso a 4 semanas. El test detecto que el calculo original mezclaba un punto crudo con uno suavizado y subestimaba la tendencia: se reemplazo por regresion lineal sobre toda la serie — verificado: con 1 kg en 14 dias da -0,5 kg/semana exacto, y en la app muestra la fecha y el peso proyectado

#16 — Adherencia: porcentaje de dias dentro del objetivo, contando aparte los excedidos y los de comer muy por debajo, y sumando el ejercicio al objetivo del dia — verificado: 4 tests (7 de 10 dentro = 70%) y en la app 28 dias dieron 86% con 24 dentro y 4 por encima

#17 — Reparto de calorias por momento del dia con barras — verificado: 3 tests (cena 60% con 1200 de 2000) y en la app desayuno 20% / almuerzo 35% / cena 45%

#18 — Patron por dia de la semana, con el dia mas alto y el mas bajo; se corrigio el plural de los dias terminados en s ('los vierness') — verificado: 3 tests y en la app detecto que los sabados son 2.900 kcal contra 1.900 del resto

#19 — Comparacion de esta semana contra la anterior en promedio, dias cargados y peso — verificado: 4 tests (1800 vs 2200 = -400) y en la app mostro las 3 filas con sus deltas

#20 — Aviso de proteina corta en la pantalla Hoy (3 dias seguidos por debajo del 80% del objetivo) — verificado: 4 tests y en la app con 55 g de 148 g aviso cuanto sumar por dia

#21 — Informe del mes imprimible en una pagina (tarjetas, reparto y tabla dia por dia con notas), con escapado de HTML y descarga si el navegador bloquea la ventana — verificado: 9 tests nuevos (265 total, incluye intento de script en una nota) y en la app genero 8 KB con las 5 secciones y 20 filas

#22 — Tema claro completo (auto por prefers-color-scheme, o forzado desde Ajustes) con tokens propios y theme-color acompañando; se oscurecio el verde porque el blanco encima daba 3,3 — verificado: contraste medido en los 7 pares principales, minimo 4,92 en claro y 5,92 en oscuro, ambos cumplen AA

#23 — Recordatorios locales con horarios editables por comida, permiso pedido solo al activarlos y sin avisar de lo ya cargado; se agrego el articulo por momento porque decia 'el cena' — verificado: 11 tests nuevos (276 total), 0 permisos pedidos al abrir y 1 al activar, y el navegador con notificaciones bloqueadas muestra el aviso correcto

#24 — Cambio de dia a medianoche con la app abierta, mas revision al volver de una pestaña dormida; si estabas mirando un dia viejo a proposito no te lo mueve — verificado: 4 tests de msHastaMedianoche (incluye fin de mes) y simular el cruce paso la vista de Ayer a Hoy con el anillo en 0

#25 — Atajos de teclado (F/M/E/R/Q, 1-4, flechas, / y Escape) que no se disparan mientras escribis ni con un modal abierto, con la ayuda listada en Ajustes solo en pantallas con teclado — verificado: 13 comprobaciones por DOM, todas correctas, incluyendo que Escape cierra el modal y saca el foco del campo

#26 — Confirmacion al descartar un analisis con datos cargados, con forzado en los cierres que vienen despues de guardar — verificado: el modal vacio y el panel de repetir cierran sin preguntar, con datos pregunta y cancelar lo deja abierto, y guardar no pregunta

#27 — Rendimiento con años de datos: medido con 400 dias y 1.600 comidas, el Historial rinde 16,3 ms (criterio: menos de 150). Ademas la curva de peso pasa a 120 puntos submuestreados en vez de 400, que en 320 px eran una mancha — verificado: 3 tests de recortarSerie y la medicion real con la leyenda avisando los 400 registros

#28 — Revision de datos: detecta kcal que no cierran con los macros, comidas sin kcal, negativos, exagerados y fechas futuras, con recalculo automatico de lo deducible — verificado: 11 tests nuevos (294 total) y en la app encontro los 2 casos sembrados, los recalculo a 625 y 290 y dejo la revision limpia

#29 — Importar fusionando: junta el backup con lo que ya hay sin duplicar (por id o por hora+titulo+kcal), completa huecos sin pisar, suma usos de frecuentes y gasto de API, y deja la opcion de reemplazar — verificado: 14 tests nuevos (308 total) y en la app la fusion sumo 2 comidas y detecto 1 repetida, la segunda importacion no cambio nada

#30 — Pantalla de diagnostico: version, service worker, cuota, contadores y ultimos errores (de JS y de promesas) capturados y persistidos, con copiar al portapapeles y limpiar — verificado: 11 tests nuevos (319 total) y en la app un error provocado quedo anotado, persistido y copiado en el texto

#31 — Item nuevo (31): el service worker limpia los caches viejos al instalar y no solo al activar, porque cada version que espera confirmacion dejaba su cache dando vueltas (se habian juntado 34) — verificado: con deficit-v10/v20/v30 sembrados mas uno de otra app, instalar dejo solo deficit-v50 y respeto el ajeno

#32 — 3/4 del presupuesto: 31 items hechos en 31 iteraciones de 40, sin bloqueados. Queda solo el cierre: verificacion final contra los 8 criterios, informe y commit
