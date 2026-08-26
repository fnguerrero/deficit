# TODO — ciclo 6: Fito humano y el sistema que engancha

Estados: `[ ]` pendiente · `[~]` en curso · `[x]` hecho y verificado · `[!]` bloqueado

## Deuda que bloquea

- [x] 0. `ui/comidas.js` está 18 líneas pasado del límite: partirlo antes de agregar nada
      · verif: `tools/tamanos.py` sin "SE PASO" y la suite en verde

## El cuerpo: los datos antes del dibujo

- [x] 1. IMC desde peso registrado y altura del perfil, con banda y el caso sin peso
      · verif: tests de las cuatro bandas y del caso sin dato
- [x] 2. Contextura continua: IMC clampeado a 17–35 mapeado a 0–1, sin saltos por umbral
      · verif: test de que un kilo mueve el valor y de que los extremos clampean
- [x] 3. Musculatura desde los días entrenados en los últimos 14
      · verif: test con 0, 4 y 12 días de entrenamiento
- [x] 4. IMC ajustado: cuando hay entrenamiento sostenido, decir por texto que el número
      subestima · verif: test de que el aviso aparece entrenando y no aparece sin entrenar

## El personaje humano

- [x] 5. `personaje.js`: esqueleto paramétrico del cuerpo (hombros, cintura, cadera,
      brazos, piernas) que sale de contextura y musculatura
      · verif: test de que dos contexturas distintas dan cinturas distintas
- [x] 6. La cara: ojos, cejas y boca con los ocho ánimos del ciclo 5
      · verif: test de que los ocho generan SVG distinto entre sí
- [x] 7. Postura por ánimo: hombros caídos, pecho arriba, cabeza colgando
      · verif: test de que la postura cambia con el ánimo y no con el cuerpo
- [x] 8. Pelo, ropa y detalles para que se lea como persona y no como maniquí
      · verif: rasterizar a PNG y mirarlo
- [x] 9. Los tres ejes juntos, y el cuerpo NO reacciona a la comida del día
      · verif: test de que mismo peso con distinta comida da el mismo cuerpo
- [x] 10. Reemplazar la lechuza en Hoy y actualizar los tests que la daban por hecha
      · verif: la suite en verde y el personaje en pantalla
- [x] 11. Sin peso cargado: cuerpo medio y pedido de peso, sin inventar contextura
      · verif: por DOM con perfil sin peso

## Rachas por actividad

- [x] 12. Modelo `state.juego` con migración desde un estado del ciclo 5
      · verif: test de migración desde un state viejo
- [x] 13. Las cuatro rachas —agua, entrenamiento, registro y sueño— cada una con su regla
      · verif: tests de que suben, se cortan y son independientes entre sí
- [x] 14. Protección de racha: una cada 7 días registrados, hasta 2, se gasta sola
      · verif: tests de ganarla, gastarla y del tope
- [x] 15. Las rachas en Hoy, chiquitas y legibles
      · verif: por DOM, las cuatro con su número

## XP, niveles y logros

- [x] 16. XP por objetivo cumplido y por registrar, con el nivel calculado desde el XP
      · verif: tests de la tabla de niveles y de que registrar suma aunque el día sea malo
- [x] 17. Catálogo de logros con sus condiciones
      · verif: tests de desbloqueo de cada familia de logro
- [x] 18. Detectar y anunciar el logro nuevo en el momento
      · verif: por DOM, completar la condición muestra el cartel
- [x] 19. Pantalla de rachas, nivel y logros
      · verif: por DOM, se ven los cuatro fuegos, el nivel y los logros ganados y pendientes

## Sonidos

- [x] 20. `sonidos.js` con WebAudio: completar, subir de nivel, racha y fallar
      · verif: test con AudioContext simulado de que cada sonido programa lo suyo
- [x] 21. Interruptor en Ajustes, apagado por defecto, y que no explote si el navegador
      bloquea el audio · verif: test de que apagado no programa nada y de que el error se traga
- [x] 22. Respetar `prefers-reduced-motion` como señal de no molestar
      · verif: test con la media query simulada

## La voz de Fito

- [x] 23. `voz.js`: repertorio de mensajes por situación, con personalidad
      · verif: test de que hay varios por situación y de que no repite el anterior
- [x] 24. Reclamo al abrir la app según lo que falta del día
      · verif: por DOM, con el día vacío reclama y con el día completo festeja
- [x] 25. Insistencia adentro: si algo queda pendiente hace rato, vuelve a la carga
      · verif: por DOM con el reloj simulado
- [x] 26. Los recordatorios hablan con su voz en vez del texto genérico
      · verif: por DOM, el texto del aviso sale del repertorio

## Cierre

- [x] 27. El juego se reconstruye en otro dispositivo desde los días que ya se
      sincronizan, sin tabla nueva (ver Supuestos)
      · verif: test de que los mismos días dan el mismo XP, nivel y logros
- [x] 28. Hoy sigue entrando sin scroll en 375×812 con rachas y personaje
      · verif: `scrollHeight <= clientHeight` en viewport móvil
- [x] 29. Verificación visual: rasterizar el personaje en varias combinaciones y mirarlo
      · verif: PNG de la grilla de contexturas por ánimos
- [x] 30. Tamaños, versión y suite completa
      · verif: `tamanos.py` limpio, `version.py` corrido y la suite entera en verde
