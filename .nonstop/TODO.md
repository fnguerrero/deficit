# TODO — Ciclo 15

- [x] Banco de pruebas `_tamagotchi.html`: grilla de estados que renderiza el muñeco sin tocar la app · verif: abrirlo y ver las variantes
- [x] `cuerpoDelDia()`: el día entero a parámetros de dibujo, función pura · verif: tests de cada eje por separado
- [x] Peso: contextura de 40 a 200 kg · verif: test de que 40, 82 y 200 dan contexturas crecientes y distintas
- [x] Ejercicio: musculatura por racha de días entrenados · verif: test de 0, 3 y 7 días
- [x] Agua: piel seca, labios partidos, gotas al cumplir · verif: DOM del SVG con y sin agua
- [x] Sueño: ojeras y párpados caídos · verif: DOM del SVG con 3 h y con 8 h
- [x] Ánimo: la cara sigue las caritas que ya elige la persona · verif: DOM con los ocho ánimos
- [ ] PENDIENTE Cintura: campo opcional al lado del peso, y que afine la silueta · verif: tests del campo y del dibujo
- [ ] PENDIENTE Cintura: campo opcional al lado del peso, y que afine la silueta - verif: tests del campo y del dibujo
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
