# TODO — ciclo 11: diez mejoras potentes

Estados: `[ ]` pendiente · `[~]` en curso · `[x]` hecho y verificado · `[!]` bloqueado

**El análisis que las eligió.** La app está terminada como software y sin estrenar como
herramienta: 775 tests y cero días de uso. Así que "potente" acá no es agregar funciones,
es sacar lo que va a hacer que se abandone en la primera semana. Se buscaron los momentos
donde la app pierde datos, pierde tiempo o pierde credibilidad.

- [x] 1. Cola offline: la foto sacada sin red se guarda y se analiza sola al volver · verif: test de la cola + por DOM cortando la red
- [x] 2. Ajuste de porción en un toque: ¼ ½ ¾ 1 1½ 2 sobre lo ya analizado · verif: test del reescalado + por DOM
- [x] 3. La app avisa cuando lo registrado no cuadra con la balanza · verif: test con datos que no cierran
- [x] 4. Lo que solés comer a esta hora, a un toque, en Hoy · verif: test del ranking por franja + por DOM
- [x] 5. Deshacer global con pila, no solo al borrar una comida · verif: por DOM, deshacer un peso y una comida
- [x] 6. El sesgo aprendido sale a Progreso (el ítem original se descartó: ver bitácora) · verif: por DOM
- [x] 7. Aviso de comida cargada dos veces por error · verif: test del detector
- [x] 8. Un análisis absurdo (10.000 kcal en un plato) no entra sin avisar · verif: test de los topes
- [x] 9. Resumen de la semana de un vistazo · verif: test de los números + por DOM
- [x] 10. Si a la hora de siempre no cargaste, la app lo nota · verif: test con patrón de comidas
- [x] 11. Nada de esto rompe lo que ya andaba · verif: tests, guardas, tamaños y consola

## Apareció en el camino

- [x] 12. core.js y analisis.js se pasaron del límite: salen platos.js y chequeos.js · verif: tamanos.py
