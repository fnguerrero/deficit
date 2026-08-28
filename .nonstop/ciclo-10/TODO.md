# TODO — ciclo 10: que la app se sienta viva

Estados: `[ ]` pendiente · `[~]` en curso · `[x]` hecho y verificado · `[!]` bloqueado

Animaciones al estilo Duolingo, con CSS y SVG: **cero dependencias**, como todo lo demás.
La regla: la animación tiene que **decir algo** —qué cambió, cuánto, que valió la pena—.
Una que solo decora es peso muerto que encima marea.

- [x] 1. Taller `_animaciones.html` que dispare cada una a demanda, para poder verlas sin cargar comida de verdad · verif: la página abre y cada botón dispara
- [x] 2. Los números cuentan en vez de aparecer: el anillo y la XP · verif: por DOM, el texto pasa por valores intermedios
- [x] 3. El anillo se llena con transición y late al llegar al objetivo · verif: por DOM
- [x] 4. Las barras de macros crecen desde donde estaban, no desde cero · verif: por DOM
- [x] 5. Un objetivo completado hace pop y suelta partículas · verif: por DOM, las partículas se crean y se limpian solas
- [x] 6. El personaje reacciona: salto al subir de fase, tironcito al cargar comida · verif: por DOM
- [x] 7. La racha se prende fuego al sumar un día · verif: por DOM
- [x] 8. El toast entra y sale con rebote en vez de aparecer · verif: por DOM
- [x] 9. Los botones y casilleros se hunden al tocarlos · verif: CSS presente
- [x] 10. Transición al cambiar de pestaña · verif: por DOM
- [x] 11. TODO respeta `prefers-reduced-motion`: con eso puesto no se mueve nada · verif: contar animaciones activas con el media query emulado
- [x] 12. Nada de esto rompe lo que ya andaba · verif: tests, guardas, tamaños y consola

## Apareció en el camino

- [x] 13. `ui/objetivos.js` se pasó del límite al sumarle las animaciones · verif: tamanos.py en verde
