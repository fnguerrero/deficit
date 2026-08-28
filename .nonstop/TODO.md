# TODO — ciclo 9: diez mejoras

Estados: `[ ]` pendiente · `[~]` en curso · `[x]` hecho y verificado · `[!]` bloqueado

Salen de las 31 que quedaron del ciclo 7 (`.nonstop/ciclo-7/TODO.md`) y de lo que dejó
abierto el personaje híbrido. Prioridad: corrección real y plata ahorrada antes que
cosmética.

- [x] 1. Dos comidas con el mismo id se duplican al fusionar (ciclo 7 #9) · verif: test de fusión con ids repetidos
- [x] 2. La foto se comprime ANTES de mandarla, no después (ciclo 7 #52) · verif: medir los bytes que salen
- [x] 3. Aviso claro cuando la foto pesa demasiado, con el número (ciclo 7 #53) · verif: test del tope
- [x] 4. Reintentar un análisis fallido sin volver a sacar la foto (ciclo 7 #51) · verif: por DOM
- [x] 5. Al guardar, el momento del día sale de la hora (ciclo 7 #56) · verif: test de las cuatro franjas
- [x] 6. Las frecuentes se ordenan por uso reciente y no solo por cantidad (ciclo 7 #57) · verif: test
- [x] 7. Los logros ganados dicen cuándo se ganaron (ciclo 7 #84) · verif: test
- [x] 8. El cache de imágenes en base64 infla el localStorage (ciclo 7 #28) · verif: medir el tamaño guardado
- [x] 9. core.js (NO tests.js: ver bitácora) se pasa de largo: partirlo (ciclo 7 #94) · verif: tamanos.py en verde
- [x] 10. Sacar del shell el personaje SVG que la app ya no usa · verif: guardas.py, tests en verde y la app dibuja igual

## Reemplazos

Los ítems 2 y 5 resultaron ya resueltos en ciclos anteriores, así que no cuentan como
mejora. Van dos más en su lugar para que sean diez de verdad.

- [x] 11. Cuánto falta para la próxima comida esperada (ciclo 7 #49) · verif: test de las franjas + por DOM
      (el #44 del ciclo 7 se descartó: los macros ya se ven al lado del anillo, tocarlo no agregaría nada)
- [x] 12. El gráfico de peso marca los días sin pesar en vez de unirlos con una recta (ciclo 7 #67) · verif: test de la serie con huecos
