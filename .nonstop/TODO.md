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
- [~] Revisión adversarial (workflow wq3ox92yv) y commit · verif: hallazgos confirmados arreglados, suite en verde
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
- [ ] Probar la notificación fija en el celular con permiso concedido · verif: un solo cartel que se reemplaza, sin vibrar

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
