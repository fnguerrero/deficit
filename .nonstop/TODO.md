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
- [ ] Reimportar `deficit-prueba.json` para ver el historial con pasos · verif: 121 días con pasos, promedio 8.888
- [ ] Probar la notificación fija en el celular con permiso concedido · verif: un solo cartel que se reemplaza, sin vibrar

## Ciclo 18 — Simplificar (pedido de Nico, 02/09/2026)

Criterio: que cada pantalla muestre lo que estas USANDO y el resto quede a un
toque. Solo informacion que sirva de verdad. El ejemplo que lo define: los 12
modos en Perfil ocupan la pantalla entera para elegir uno — tiene que verse el
elegido y los demas en una lista desplegable.

- [ ] Perfil: el modo elegido visible, los otros 11 en desplegable
- [ ] Perfil: revisar que queda a la vista y que se puede plegar
- [ ] Ajustes: agrupar y plegar lo que casi nunca se toca
- [ ] Historial: quedarse con lo que se mira de verdad
- [ ] Progreso: idem
- Sin decidir: si lo que sobra se PLIEGA o se SACA. Plegar no simplifica, solo
  esconde; sacar duele pero es lo que se pidio. Preguntar caso por caso.
