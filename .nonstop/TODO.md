# TODO — ciclo 7: cien mejoras

Estados: `[ ]` pendiente · `[~]` en curso · `[x]` hecho y verificado · `[!]` bloqueado

## A. Corrección (lo que está mal hoy)

- [x] 1. `renderAgua` dibuja `max(meta, vasos)` vasos: con la meta en 4 y 12 tomados salen 12 · verif: test del tope
- [x] 2. Un peso de 0 o negativo cargado a mano no puede dar IMC · verif: test con 0, -5 y texto
- [x] 3. `sumarDias` sobre una fecha inválida devuelve "NaN-aN-aN" en vez de fallar claro · verif: test
- [x] 4. Una comida sin `kcal` numérico rompe el total del día · verif: test con kcal null/undefined/texto
- [x] 5. `diasEntrenados` cuenta un ejercicio de 0 kcal como entrenamiento si el campo existe · verif: test
- [x] 6. Un `state.dias` con una fecha basura como clave rompe los gráficos · verif: test
- [x] 7. `nivelDe` con XP infinito o NaN · verif: test
- [x] 8. La racha cuenta 400 días hacia atrás en cada render, cuatro veces · verif: medir llamadas
- [ ] 9. Dos comidas con el mismo id se duplican al fusionar · verif: test de fusión
- [x] 10. El modal se puede abrir dos veces y apila capas · verif: por DOM

## B. Accesibilidad

- [x] 11. El foco vuelve al botón que abrió el modal al cerrarlo · verif: por DOM
- [x] 12. El modal atrapa el foco mientras está abierto · verif: por DOM con Tab simulado
- [x] 13. Los cambios de pestaña se anuncian a un lector de pantalla · verif: aria-live presente
- [x] 14. El toast se anuncia (role=status) · verif: por DOM
- [x] 15. Los vasos de agua dicen su estado, no solo su número · verif: aria-label completo
- [x] 16. La grilla de objetivos usa role y estado correctos · verif: por DOM
- [x] 17. Contraste mínimo 4.5 en los textos secundarios de los 9 temas · verif: cálculo de contraste
- [x] 18. El personaje tiene descripción textual del estado, no solo del ánimo · verif: aria-label
- [x] 19. Foco visible en todos los controles (outline propio) · verif: por DOM
- [x] 20. `prefers-reduced-motion` apaga TODAS las animaciones, no solo las del personaje · verif: repasar el CSS

## C. Rendimiento

- [x] 21. `renderAll` re-renderiza las cinco pestañas aunque solo una esté visible · verif: contar renders
- [ ] 22. `recalcularJuego` recorre el historial entero en cada render de Hoy · verif: cachear por firma
- [x] 23. `mejorRacha` recorre 400 días por cada una de las 4 rachas · verif: medir
- [ ] 24. El SVG del personaje se re-genera aunque no haya cambiado nada · verif: cachear por firma
- [x] 25. `save()` serializa el estado entero en cada toque de un vaso · verif: agrupar escrituras
- [ ] 26. Los gráficos recalculan las series al cambiar de pestaña sin datos nuevos · verif: medir
- [ ] 27. El historial arma el DOM de todos los días de una · verif: limitar y paginar
- [ ] 28. Las imágenes en base64 del cache inflan el localStorage · verif: medir el tamaño guardado

## D. Datos raros y robustez

- [ ] 29. Un estado guardado corrupto no puede dejar la app en blanco · verif: test con JSON roto
- [ ] 30. Un `localStorage` lleno tiene que avisar, no fallar en silencio · verif: test con quota simulada
- [ ] 31. Una fecha del futuro en `dias` no rompe las rachas · verif: test
- [x] 32. Un perfil sin altura no puede dividir por cero · verif: test
- [ ] 33. Comidas con kcal absurdas (>20.000) se marcan como sospechosas · verif: test
- [ ] 34. El estado importado de un respaldo se valida antes de pisar el actual · verif: test
- [ ] 35. Dos pestañas abiertas no se pisan el estado · verif: escuchar `storage`

## E. Textos

- [ ] 36. Los mensajes de error de red dicen qué hacer, no solo qué falló · verif: repasar los textos
- [ ] 37. Los estados vacíos dicen el siguiente paso concreto · verif: repasar cada pantalla vacía
- [ ] 38. Las unidades son consistentes (kcal, g, L, kg) en toda la app · verif: grep
- [ ] 39. Los números grandes usan separador de miles en todos lados · verif: grep de fmtNum
- [ ] 40. Ningún texto trata al usuario de "usuario" · verif: grep
- [ ] 41. Los plurales de 1 están bien en todos los contadores · verif: test de las funciones de texto
- [ ] 42. El texto del veredicto no promete lo que no puede saber · verif: repasar

## F. Pantalla Hoy

- [ ] 43. El anillo de calorías muestra el exceso, no se queda en 100% · verif: por DOM
- [ ] 44. Tocar el anillo abre el detalle de macros · verif: por DOM
- [ ] 45. La fila de acciones marca cuál es la recomendada según la hora · verif: por DOM
- [ ] 46. Las comidas del día se pueden borrar deslizando o con un menú · verif: por DOM
- [ ] 47. Deshacer el borrado de una comida · verif: por DOM
- [ ] 48. El total del día se actualiza sin re-render completo · verif: medir
- [ ] 49. Un indicador de cuánto falta para la próxima comida esperada · verif: por DOM
- [ ] 50. El chip del modo muestra el objetivo de kcal, no solo el nombre · verif: por DOM

## G. Cargar comidas

- [ ] 51. Reintentar el análisis sin volver a sacar la foto · verif: por DOM
- [ ] 52. La foto se comprime antes de mandarla, no después · verif: medir el tamaño
- [ ] 53. Aviso claro cuando la foto pesa demasiado · verif: test del tope
- [ ] 54. El análisis se puede cancelar y el estado queda limpio · verif: por DOM
- [ ] 55. Editar la cantidad de un alimento recalcula el total al instante · verif: por DOM
- [ ] 56. Sugerir el momento del día según la hora al guardar · verif: test
- [ ] 57. Las comidas frecuentes se ordenan por uso reciente y no solo por cantidad · verif: test
- [ ] 58. Buscar dentro de las frecuentes · verif: por DOM
- [ ] 59. Duplicar una comida de otro día · verif: por DOM
- [ ] 60. El código de barras no encontrado ofrece cargar a mano en el momento · verif: por DOM

## H. Historial y progreso

- [ ] 61. Filtrar el historial por rango de fechas · verif: por DOM
- [ ] 62. Buscar una comida en todo el historial · verif: test
- [ ] 63. El promedio semanal de kcal, visible · verif: test
- [ ] 64. La tendencia del peso con media móvil de 7 días · verif: test contra valores conocidos
- [ ] 65. Comparar esta semana con la anterior · verif: test
- [ ] 66. Un gráfico de la distribución de macros del período · verif: por DOM
- [ ] 67. Marcar en el gráfico de peso los días sin registrar · verif: por DOM
- [ ] 68. Exportar el historial a CSV · verif: test del formato
- [ ] 69. El día con más y con menos calorías del período · verif: test
- [ ] 70. Cuántos días se cumplió el objetivo, en porcentaje del período · verif: test

## I. Modos y nutrición

- [ ] 71. Avisar cuando el objetivo de proteína no se llega, con cuánto falta · verif: test
- [ ] 72. Estimar cuándo se llega al peso objetivo al ritmo actual · verif: test
- [ ] 73. Avisar si el déficit sostenido es peligroso · verif: test de los umbrales
- [ ] 74. La fibra, contada y con objetivo · verif: test
- [ ] 75. El agua, ajustada por el ejercicio del día · verif: test
- [ ] 76. Comparar el modo actual con otro antes de cambiarlo · verif: por DOM
- [ ] 77. Un recordatorio de que el objetivo se recalcula al cambiar el peso · verif: por DOM
- [ ] 78. El reparto de macros, visible en Perfil con el modo elegido · verif: por DOM

## J. Juego

- [ ] 79. La racha en peligro avisa antes de que termine el día · verif: test de la hora
- [ ] 80. El logro más cerca de ganarse, visible · verif: test
- [ ] 81. Cuánto XP falta para el próximo nivel, en Hoy · verif: por DOM
- [ ] 82. Un resumen semanal del juego · verif: test
- [ ] 83. El escudo se puede usar a mano, no solo automático · verif: por DOM
- [ ] 84. Los logros ya ganados muestran cuándo se ganaron · verif: test
- [ ] 85. Un récord personal por actividad, visible · verif: por DOM

## K. Ajustes y mantenimiento

- [ ] 86. Ver cuánto ocupa el estado guardado · verif: por DOM
- [ ] 87. Vaciar el cache de análisis a mano · verif: por DOM
- [ ] 88. Exportar e importar el estado completo · verif: test de ida y vuelta
- [ ] 89. Ver la versión y si hay una nueva esperando · verif: por DOM
- [ ] 90. Un modo de diagnóstico que junte todo lo que hace falta para reportar un problema · verif: por DOM
- [ ] 91. Borrar un día entero · verif: por DOM
- [ ] 92. Cambiar el tamaño del vaso, que no siempre son 250 ml · verif: test

## L. Calidad interna

- [x] 93. `core.js` está cerca del límite: partirlo por tema · verif: tamanos.py
- [ ] 94. `tests.js` está cerca del límite · verif: tamanos.py
- [ ] 95. Sacar las funciones duplicadas entre archivos · verif: grep
- [ ] 96. Un solo lugar para los formatos de número · verif: grep
- [ ] 97. Los números mágicos del CSS, a variables · verif: grep
- [ ] 98. Una guarda que avise si un `id` del HTML no existe · verif: test
- [ ] 99. Una guarda que detecte funciones globales duplicadas entre archivos · verif: correrla
- [ ] 100. Un README que explique la arquitectura para el Nico de dentro de seis meses · verif: existe y es correcto
