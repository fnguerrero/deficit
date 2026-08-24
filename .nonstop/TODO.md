# TODO — ciclo 5: modos, simplificar y que se pueda cumplir

Estados: `[ ]` pendiente · `[~]` en curso · `[x]` hecho y verificado · `[!]` bloqueado

## Modos (el corazón del ciclo, va primero porque todo lo demás depende del objetivo)

- [x] 1. Gasto basal y TDEE con Mifflin-St Jeor por altura, peso, edad, género y actividad
      · verif: tests contra valores calculados a mano para 3 perfiles distintos
- [x] 2. Catálogo de modos: mantenimiento, déficit moderado, déficit agresivo, definición,
      keto y volumen limpio, cada uno con su reparto de macros
      · verif: test de que cada modo devuelve kcal y macros coherentes entre sí
- [x] 3. Pisos de seguridad: ningún modo baja de 1.500 / 1.200 kcal, y avisa por qué
      · verif: test con un perfil chico en modo agresivo, que tiene que cortar en el piso
- [x] 4. Elegir el modo en Perfil, con lo que implica cada uno explicado en una línea
      · verif: por DOM, cambiar de modo cambia el objetivo que se ve en Hoy
- [x] 5. Migración: el estado del ciclo 4 estrena modo sin perder el objetivo que ya tenía
      · verif: test de migración desde un state viejo

## Apta o no apta

- [x] 6. Reglas por modo: qué hace que una comida entre o no (carbos en keto, proteína en
      definición, calorías sueltas) · verif: tests con comidas límite en cada modo
- [x] 7. Marca visible en la comida, con el motivo en una línea
      · verif: por DOM, una comida con 40 g de carbos en keto sale marcada y dice por qué
- [ ] 8. Aviso antes de guardar si la comida rompe el modo, sin bloquear
      · verif: por DOM, aparece el aviso y se puede guardar igual

## Pantalla Hoy como tablero

- [x] 9. Los tres botones de carga en una fila: foto, código de barras, etiqueta
      · verif: por DOM, misma fila (mismo `offsetTop`) y los tres abren lo suyo
- [x] 10. Sugerencias, repetir y carga manual pasan a un menú secundario
      · verif: por DOM no están en Hoy, y desde el menú siguen funcionando
- [x] 11. Grilla de objetivos del día: peso, agua, ejercicio y ánimo, que se marcan al
      completarse · verif: por DOM, completar cada uno lo pasa a verde
- [x] 12. Las comidas del día sin descripción; al tocarlas se abre el detalle completo
      · verif: por DOM, la fila muestra momento y kcal; el detalle muestra los alimentos
- [x] 13. Todo Hoy entra sin scroll en 375×812 con el día a medio cargar
      · verif: `scrollHeight <= clientHeight` en viewport móvil

## Menos gasto de API

- [x] 14. Sonnet por defecto en platos, Haiku en etiquetas y códigos
      · verif: test de que cada modo de análisis pide el modelo que corresponde
- [x] 15. Escalar a Opus (la decision; falta ofrecerlo en pantalla) solo si la confianza vuelve baja, ofreciéndolo, no automático
      · verif: test con respuesta de confianza baja y con confianza alta
- [ ] 16. Optimizaciones sin tocar el modelo: imagen más chica, prompt más corto, cache más
      largo · verif: medir el tamaño del request antes y después
- [ ] 17. Mostrar el ahorro real en Ajustes: gasto por análisis y del mes
      · verif: por DOM con historial simulado

## Ejercicio por actividad

- [x] 18. Tabla de actividades con METs y duración por defecto (funcional 1 h, running 30
      min, fútbol 1 h) · verif: test de kcal = MET × peso × horas contra valores conocidos
- [x] 19. Favoritas en Hoy, de un toque; el resto en un selector
      · verif: por DOM, tocar una favorita carga el ejercicio del día
- [ ] 20. Editar actividades y duraciones fuera de la pantalla principal
      · verif: por DOM en Ajustes, agregar una actividad propia y usarla

## Agua

- [x] 21. Vasos táctiles: se toca el vaso al que llegaste, sin `+` ni `−`
      · verif: por DOM, tocar el 4º vaso deja 4; tocar el 4º de nuevo baja a 3
- [x] 22. El objetivo de vasos sale del peso, y se marca al llegar
      · verif: test del cálculo y por DOM el estado completado

## Ánimo, peso y objetivos

- [x] 23. Nota del día por caritas, con opción de escribir si hace falta
      · verif: por DOM, elegir una carita guarda y marca el objetivo
- [x] 24. Peso precargado con el último valor conocido
      · verif: por DOM, abrir el campo con un peso anterior lo muestra

## Recomendaciones y veredicto

- [x] 25. Recomendaciones por modo, concretas y accionables
      · verif: por DOM, cambiar de modo cambia lo que dice
- [x] 26. Veredicto honesto: en camino, más lento, o sin déficit — y "faltan datos" cuando
      no alcanza para afirmar nada · verif: tests de los cuatro casos con series armadas
- [x] 27. El veredicto explica en qué se basa, sin adornos
      · verif: por DOM, el texto nombra el dato concreto que lo sostiene

## Gráficos

- [ ] 28. Sección propia con peso, calorías contra objetivo y adherencia
      · verif: por DOM con datos simulados, los tres gráficos dibujan
- [ ] 29. Selector de período: diario, semanal y mensual
      · verif: por DOM, cambiar el período cambia la cantidad de puntos
- [ ] 30. Gráfico propio del modo cuando aplica (carbohidratos en keto, proteína en
      definición) · verif: por DOM en keto aparece la línea de carbos

## Temas

- [x] 31. Cuatro temas: claro, oscuro, negro OLED y cálido
      · verif: por DOM, cada uno cambia el fondo y sobrevive a recargar

## Ayuno y sueño (pedido de Nico a mitad del ciclo)

- [x] 32. Ayuno intermitente: botón iniciar/cortar con cronómetro en vivo y ventanas
      típicas (16:8, 18:6, 20:4) · verif: test del cálculo de horas y por DOM el contador
- [x] 33. El ayuno como objetivo del día, con su historial · verif: por DOM, un ayuno en
      curso se ve en el tablero y al cortarlo queda registrado
- [ ] 34. Sueño auto-reportado: al abrir la app a la mañana, horas y calidad en caritas
      · verif: por DOM, cargar el sueño marca el objetivo
- [ ] 35. Recordatorio de hora de dormir, con los recordatorios que ya existen
      · verif: se programa y aparece en la lista de recordatorios
- [ ] 36. Cruzar sueño con adherencia: si dormís poco, ¿comés peor? · verif: test con
      series donde la relación existe y donde no existe, sin afirmar de más
