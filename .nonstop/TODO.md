# TODO — Ciclo 15

- [x] Banco de pruebas `_tamagotchi.html`: grilla de estados que renderiza el muñeco sin tocar la app · verif: abrirlo y ver las variantes
- [x] `cuerpoDelDia()`: el día entero a parámetros de dibujo, función pura · verif: tests de cada eje por separado
- [x] Peso: contextura de 40 a 200 kg · verif: test de que 40, 82 y 200 dan contexturas crecientes y distintas
- [x] Ejercicio: musculatura por racha de días entrenados · verif: test de 0, 3 y 7 días
- [x] Agua: piel seca, labios partidos, gotas al cumplir · verif: DOM del SVG con y sin agua
- [x] Sueño: ojeras y párpados caídos · verif: DOM del SVG con 3 h y con 8 h
- [x] Ánimo: la cara sigue las caritas que ya elige la persona · verif: DOM con los ocho ánimos
- [x] Cintura: entró en el ciclo 16 · ver la línea del ciclo 16
- [x] Los cinco juntos sin pisarse · verif: test de independencia por eje
- [x] Cambiar la tarjeta de Hoy al personaje SVG · verif: render en vivo a 375 px, sin errores de consola
- [x] Sacar el nombre del encabezado — ya no estaba: el header solo tiene el modo y el punto de la cuenta · verif: búsqueda en el DOM, cero coincidencias
- [x] Verificación final contra los criterios de la SPEC


## Nuevo en el camino

- [x] Carga de ejercicio por minutos e intensidad · verif: 30 min moderado = 248 kcal, 60 fuerte = 743, y suma en vez de reemplazar
- [x] Tarjetas de comida al tamaño de los momentos · verif: 61x61 las dos

## Ciclo 16 — el tamagotchi en serio

- [x] Eje demacrado bajo IMC 17: costillas, clavículas, mejillas hundidas · verif: tests + banco 10/10
- [x] Extremo gordo cuadrático: 200 kg se ve de 200 · verif: banco 100/130/160/200 en grande
- [x] Músculo dibujado (pecho + abs) solo sin panza · verif: 3 tests
- [x] Pose del día: sed y cansancio encorvan · verif: test de poseDelDia
- [x] Alias mal/normal para las caritas · verif: banco ánimo 5/5
- [x] Movimiento: respiración con ritmo del día, parpadeo, cabeceo, zzz · verif: getComputedStyle en la app
- [x] Revisión adversarial del ciclo 16 (05/09/2026) · verif: 1.624 combinaciones sin un NaN, invariantes cumplidos, cero bugs confirmados. Lo que parecia bug era deliberado: el agua no se reprocha antes de las 14 y dormir 0 h se lee como "no lo cargue" (la UI solo ofrece de 4 a 10 h). Quedaron 3 tests fijando la fragilidad de poseDelDia y el barrido de cuerpos extremos
- [x] Cintura: campo opcional al lado del peso y silueta · verif: 1005 tests en verde, banco 5/5, app en vivo a 375 px

## Ciclo 17 — los pasos y el aviso fijo

- [x] Los pasos, sexto casillero y quinta regla: meta configurable, 10.000 por defecto, cargados a mano · verif: 1030 tests en verde y el editor en la app viva
- [x] La grilla y las rachas pasan a ser UNA lista de siete · verif: RACHAS.length 7, los siete chips en pantalla, la voz reclamando peso y ánimo
- [x] Fecha de corte para no reescribir el pasado: antes del 2026-09-02 un día perfecto son las cuatro de siempre · verif: 4 tests de rachasDe/diaPerfecto y del XP viejo
- [x] Los pasos viajan: columna nueva en `dias` y fusión por el más alto · verif: test de fusionarDia y de aplicarRemoto
- [x] La cintura bajada llegaba hasta aplicarRemoto y se perdía en la última línea · verif: test nuevo
- [x] Notificación fija con el estado del día: una sola, por el service worker, con tag fijo y silenciosa · verif: los tres textos (0 de 7, 5 de 7, completo) en la app viva
- [x] Correr `supabase-pasos.sql` en Supabase · verif: la columna `pasos` figura en information_schema (02/09/2026)
- [x] `deficit-prueba.json` con pasos · verif: 121 dias con pasos y promedio 8.888 (cargado por consola, no por la bandeja de importacion)
- [!] Probar la notificación fija en el celular con permiso concedido · verif: un solo cartel que se reemplaza, sin vibrar — BLOQUEADO: necesita el celular de Nico con el permiso dado. Lo verificable desde acá ya se hizo (los tres textos en la app viva, #158); lo que falta es exactamente lo que no se puede simular en el escritorio

## Ciclo 18 — Simplificar (pedido de Nico, 02/09/2026)

Criterio: que cada pantalla muestre lo que estas USANDO y el resto quede a un
toque. Solo informacion que sirva de verdad. El ejemplo que lo define: los 12
modos en Perfil ocupan la pantalla entera para elegir uno — tiene que verse el
elegido y los demas en una lista desplegable.

- [x] Perfil: el modo elegido visible, los otros quince a un toque · verif: 1030 tests en verde, cabecera de 56 px, cero repetidos, abrir/elegir/cerrar en la app viva a 375 y 320 px
- [x] Perfil: sacado lo repetido (objetivo, macros y fecha de llegada estaban dos veces), plegados sexo/edad/altura, el objetivo manual y el detalle del calculo · verif: 1030 tests en verde, guardar sigue guardando lo plegado, el error abre el plegable y el foco cae en el campo
- [x] Ajustes: las trece tarjetas se pliegan, con titulo y estado a la vista · verif: de 4,2 pantallas de scroll a 1,2; abren y cierran, el switch de adentro sigue andando, 1030 tests en verde
- [x] Historial: se queda con los dias (buscar y la lista); las curvas y el resumen del mes se fueron a Progreso · verif: de 4,3 pantallas a 1,7, 1030 tests en verde, cero errores de consola
- [x] Progreso: las once tarjetas plegadas, abiertas el veredicto, el peso y las calorias por dia · verif: de 4,1 pantallas a 1,9 con los 153 dias de prueba cargados, graficos dibujando, 1030 tests en verde
- [x] El porque del borde rojo de un momento, en pantalla: el motivo existia pero solo en un tooltip · verif: "Desayuno no entra en el modo: 68% de tu objetivo del dia en una sola comida" en la app viva a 375 px

- Resuelto caso por caso: se SACO lo repetido (el objetivo y los macros en
  Perfil, el resumen del mes y los graficos de peso y calorias que estaban en
  Historial y en Progreso a la vez) y se PLEGO lo que hace falta pero no todos
  los dias. Ninguna funcion se perdio.

## Ciclo 19 — que el verde signifique algo (pedido de Nico, 04/09/2026)

- [x] El casillero Comidas pide registrar Y que al menos una comida entre en el
  modo; ambar cuando cargaste pero no entro nada · verif: 1055 tests en verde,
  la grilla y la racha dando lo mismo en la app viva con keto
- Fecha de corte 2026-09-05 (`DESDE_APTAS`): antes de esa fecha registrar sigue
  alcanzando, como se hizo con las siete rachas en el ciclo 17
- [x] Los dos porcentajes de adherencia unificados: una sola definicion de "dia
  dentro del objetivo" · verif: con los 153 dias de prueba las dos tarjetas dan
  50 % (antes 41 % y 60 %), 1060 tests en verde

## Ciclo 20 — la foto desde el editor (pedido de Nico, 05/09/2026)

El editor de comida guarda `foto` y `thumb` en el pendiente pero no los dibuja:
para ver la foto de la comida que estas editando hay que cerrar el editor,
encontrar la tarjeta y tocar la lupa.

- [x] Miniatura de la foto en el editor, que abre el visor grande · verif: tests de que la cabecera aparece solo con foto y que el visor recibe la imagen grande; app viva a 375 px con el visor sobre el modal y el modal sin cerrarse al salir · archivos: index.html, ui/edicion.js, ui/hoy.js, styles.css, tests2.js
- [x] El visor no anclaba el boton atras al abrirse desde la lista de Hoy · verif: test de que abrirVisor deja el ancla puesta
- [x] Tocar un vaso de agua cierra su ventana, como ya hace el peso al guardarse (pedido de Nico, 05/09/2026) · verif: en la app viva, tocar un vaso deja la ventana cerrada y el casillero actualizado · archivos: ui/hoy.js
- [x] Ejercicio: el tiempo arriba y TODAS las actividades abajo; tocar una carga el valor, sin boton Sumar (pedido de Nico, 05/09/2026) · verif: tests del catalogo ordenado y de las kcal por minutos elegidos; app viva a 375 px cargando funcional y caminata · archivos: index.html, ui/actividades.js, ui/objetivos.js, styles.css, tests2.js
- [x] Sacar lo que queda muerto al irse la intensidad · verif: guardas OK y suite en verde sin los tests de lo borrado
- [x] El informe del mes usaba el objetivo despejado del ritmo y no el del modo · verif: test nuevo y 1069 en verde
- [x] Aviso de doble conteo: actividad Alta/Muy alta y ademas ejercicios cargados (pedido de Nico, 05/09/2026) · verif: tests de la funcion pura en sus cuatro casos y el aviso en la app viva · archivos: chequeos.js, ui/perfil.js, index.html, styles.css, tests2.js

## Ciclo 21 — el arranque desde el celular (pedido de Nico, 05/09/2026)

- [x] Icono neutro y splash que no choque con ningun tema · verif: alpha en las esquinas del icono any, maskable opaco con su zona segura, manifest valido y la app viva sin errores · archivos: tools/gen_iconos.py, icons/*, manifest.json
- [x] "No hay forma de acomodarla" contradecia la pregunta de abajo, y no decia que consecuencia tiene (pedido de Nico, 05/09/2026) · verif: tests de opcionQueLaSalva y consecuenciaNoApta, y el caso del screenshot en la app viva · archivos: arreglos.js, ui/edicion.js, index.html, styles.css, tests2.js
- [x] Que el perfil y la duda de cada comida VIAJEN entre dispositivos · Nico corrio `supabase-perfil-comida.sql` el 05/09/2026 y recien ahi se toco sync.js · verif: 3 tests de round-trip y de que una fila vieja no borra el perfil local; los dos campos entran en CAMPOS_NUEVOS_COMIDA, asi que una base sin migrar reintenta sin ellos en vez de fallar el insert entero · archivos: sync.js, tests2.js

## Ciclo 22 — una sola barra arriba (pedido de Nico, 05/09/2026)

- [x] Fuera el punto de la cuenta y el ayuno sube a la barra del titulo · verif: una sola fila a 375 y a 320 px sin corte ni scroll horizontal, el ayuno sigue abriendo su editor, y Hoy entra sin scroll · archivos: index.html, ui/cuenta.js, ui/ajustes.js, styles.css
- [x] Los motivos de "no entra en el modo": un solo renglon, el resto al tocarlos, y el texto resumido para que entre (pedido de Nico, 05/09/2026) · verif: una linea a 375 y 320 px, expandir y plegar en la app viva

## Ciclo 23 — seis pedidos de Nico (06/09/2026)

- [x] Diagnóstico: fuera el "Ver el estado de la app", que era un segundo plegable adentro del primero · verif: un solo toque abre los datos, en la app viva · archivos: index.html
- [x] Historial: fuera la tarjeta Buscar de la pantalla; la búsqueda queda a un toque en "Últimos días" · verif: la pantalla sin la tarjeta, el buscador abriendo y filtrando igual · archivos: index.html, ui/historial.js, styles.css
- [x] Historial con gráficos: el peso, la cintura y las calorías por día se MUDAN de Progreso (no se copian: en el ciclo 18 se sacaron de acá justo por estar en las dos) · verif: los tres dibujando en Historial y ninguno repetido en Progreso · archivos: index.html, ui/historial.js, ui/progreso.js
- [x] Progreso compacto: las dos tarjetas que se llaman casi igual —"¿Cómo venís?" y "Cómo venís"— y Nivel + Logros · verif: menos tarjetas y ninguna función perdida, medido en pantallas de scroll · archivos: index.html, ui/progreso.js
- [x] La barra: tocar el modo despliega los dieciséis ahí mismo en vez de mandar a Perfil · verif: elegir desde Hoy cambia el objetivo y los veredictos sin cambiar de pantalla · archivos: index.html, ui/objetivos.js, ui/perfil.js, styles.css
- [x] La barra: un ícono al lado del modo que abre los datos personales · verif: entra en la fila a 375 y 320 px y lleva a la ficha · archivos: index.html, ui/objetivos.js, styles.css
- [x] La barra no daba para las cuatro cosas con el icono nuevo: el modo se escribe corto ("Moderado", no "Déficit moderado") y a 320 px la palabra "Ayuno" cede · verif: nombre entero a 375 y a 320, una fila de 56 px, sin scroll horizontal · archivos: ui/barra.js, styles.css
- [x] ui/objetivos.js se paso de su limite con el desplegable: salio ui/barra.js con la barra de arriba entera · verif: 664 y 109 lineas, guardas OK con 59 scripts

## Ciclo 24 — recortar la foto (pedido de Nico, 06/09/2026)

- [x] Marco de recorte antes de analizar: aritmetica pura en recorte.js y el dedo en ui/recorte.js · verif: 8 tests de limites + recorte real de una imagen 1200x800 que devolvio 555x800 del lado correcto · archivos: recorte.js, ui/recorte.js, ui/comidas.js, index.html, styles.css, sw.js, tests2.js, tests.html
- [x] Cancelar tira la foto antes de gastar el analisis, y limpia el input para poder reelegir la misma · verif: change real del input, cancelar, y el input vacio
- [x] El atras de Android cierra el recortador · verif: history.back() con el recortador abierto

## Ciclo 25 — los pasos y el sueño se anotan y listo (pedido de Nico, 06/09/2026)

- [x] Pasos sin objetivo del dia: se carga la cantidad, se autoguarda y el casillero queda en check · verif: seis chips y ningun "Objetivo del dia" en la app viva, tocar 8.000 cierra la ventana y deja "✓ Pasos 8.000" · archivos: index.html, ui/objetivos.js, ui/hoy.js, juego.js, chequeos.js, tests2.js
- [x] La regla vieja sigue rigiendo el pasado (DESDE_PASOS_LIBRES = 2026-09-06) · verif: 2 tests, uno de cada lado del corte
- [x] Sueño: la ventana se cierra sola cuando ya estan las horas Y la calidad · verif: tocar horas la deja abierta, tocar la carita la cierra

## Ciclo 26 — que el casillero de Comidas diga la verdad (06/09/2026)

- [x] El casillero de Comidas se pone rojo si te pasaste del objetivo o si no entro ninguna comida en el modo · verif: 6 tests de nivelComidas y el caso de Nico reproducido en la app viva (7.219 de 1.939, casillero nivel-mal) · archivos: chequeos.js, ui/objetivos.js, tests2.js
- [x] El perfil del plato sale de los alimentos que QUEDARON, no de la foto · verif: 4 tests de perfilDeItems con la mesa criolla del caso · archivos: platos.js, claude.js, ui/edicion.js, tests2.js
- [x] "Ultraprocesado" en el schema: producto industrial, no comida casera con un ingrediente procesado · verif: descripcion nueva en el schema del analisis

## Ciclo 27 — cuatro casilleros (propuesta de Nico, 06/09/2026)

- [x] El peso sale de la grilla y queda arriba, en la tira que ya tenia; la tira ahora se ve siempre y abre el editor · verif: sin peso cargado la tira invita a pesarse, con peso muestra la tendencia, y tocarla abre "Peso de hoy" · archivos: ui/objetivos.js, ui/hoy.js
- [x] El animo se mete adentro del sueño: un solo casillero y una sola hoja con las horas, como dormiste y como estas · verif: la hoja "Sueño y ánimo" con 7 chips, 5 caritas de calidad, 5 de animo y la nota; el casillero muestra "7 h 😄" · archivos: index.html, ui/objetivos.js, ui/tarjeta.js
- [x] El casillero de Comidas se va: abajo estan la barra de momentos, el color por momento y el anillo · verif: la grilla con cuatro, y las comidas siguen contando para el dia perfecto
- [x] Las rachas pasan a cinco, con corte (DESDE_CINCO = 2026-09-06) · verif: 2 tests del corte, rachasDe da 5 hoy y 7 antes de ayer, y el XP de un dia viejo no se movio

## Ciclo 28 — el vaso que volvia (reportado por Nico, 06/09/2026)

- [x] Los contadores del dia (agua, ejercicio, pasos) se fusionaban por el mas alto y no habia forma de corregir hacia abajo · verif: 2 tests nuevos con el caso exacto y el del cero que no pisa · archivos: sync.js, fusion-dia.js (nuevo), tests2.js
- [x] sync.js se paso de su limite con el arreglo: salio fusion-dia.js · verif: 576 lineas, guardas OK con 62 scripts

## Ciclo 29 — el ejercicio, mas simple (pedido de Nico, 06/09/2026)

- [x] Ocho deportes —funcional, futbol, boxeo, natacion, padel, yoga, pilates, running— y una hora cada uno salvo running · verif: los ocho chips con su tiempo en la app viva y 3 tests del catalogo · archivos: deportes.js (nuevo), habitos.js, tests.js
- [x] Fuera la fila de minutos de arriba: tocar el deporte lo carga con su tiempo · verif: tocar Running carga 404 kcal de 30' y cierra
- [x] Mantener apretado abre el tiempo de ESE deporte, y el elegido queda guardado · verif: long press en Futbol abre "¿cuanto te dura?", elegir 90 carga 866 kcal y el chip queda en 90' · archivos: ui/objetivos.js, ui/actividades.js, index.html, styles.css
- [x] habitos.js y ui/hoy.js pasados de limite: salio deportes.js · verif: 297 y 700 lineas, guardas OK con 63 scripts

## Ciclo 30 — tres pedidos sueltos (06/09/2026)

- [x] El muñeco puede ser masculino o femenino · verif: 4 tests de figuraDe y de las proporciones, y los dos dibujos comparados a 180 px · archivos: cuerpo.js, figura.js, personaje.js, transformacion.js, cara.js, sprite.js, ui/ajustes.js, ui/tarjeta.js, core.js, index.html, tests2.js
- [x] Sueño y ánimo: la hoja se cierra con las TRES cosas cargadas · verif: horas y calidad la dejan abierta, la carita la cierra · archivos: ui/objetivos.js
- [x] El agua ya no ofrece "Deshacer": se corrige tocando el vaso · archivos: ui/hoy.js

## Ciclo 32 — avisos con la app cerrada (elegido por Nico, 07/09/2026)

- [x] Web Push de punta a punta: claves, suscripcion, service worker, tabla y el reloj del servidor · verif: 6 tests de la parte pura + 3 del reloj del Worker en Node, y el interruptor apareciendo solo con la clave puesta · archivos: push.js, ui/push.js, sw.js, config.js, sync.js, proxy/push.js, proxy/worker.js, proxy/wrangler.toml, proxy/test.mjs, supabase-push.sql, tools/vapid.py, index.html, tests2.js
- [x] Los tres pasos que se podian hacer desde aca, hechos (07/09/2026): par VAPID generado sin que la privada saliera a pantalla —script con --secreto-a, pipe a wrangler y borrado—, los cuatro secretos cargados en el Worker, la publica en config.js y `wrangler deploy` con el cron cada 15 minutos andando
- [x] La tabla push_subs, creada por Nico el 07/09/2026 · verif: guardar una suscripcion de prueba devuelve ok, la fila queda con su llave, huso y horarios, y borrarla devuelve 204. El push esta completo de punta a punta · lo que sigue es probarlo en el celular. (Era: correr `supabase-push.sql` en el editor de Supabase.) Es lo unico que no se puede hacer sin la credencial de administrador —la anon key no crea tablas y no hay token de la CLI en el equipo. Mientras tanto la app lo dice con todas las letras: "Falta crear la tabla push_subs en Supabase (supabase-push.sql)"
- [!] Probar la notificacion fija en el celular con permiso concedido — sigue bloqueado, pero con el push andando deja de importar tanto: el aviso fijo era el parche a que no hubiera servidor

