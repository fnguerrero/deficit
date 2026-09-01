# Ciclo 14 — Diez bugs

## Objetivo

Encontrar diez bugs reales en Déficit y arreglarlos. Reales quiere decir que se
pueden disparar usando la app, no defectos de estilo ni deudas de diseño. Cada
uno tiene que quedar demostrado antes de tocar nada: un test que falla, un error
de consola, un valor equivocado en pantalla.

## Alcance

**Entra:** la app entera —lógica, sync, UI, fechas, números, estado— y las
herramientas de control.

**No entra:** features nuevas, rediseños, refactors que no arreglen un bug
concreto, y el backlog del ciclo 7.

## Stack y decisiones

Lo de siempre: cero dependencias, tests propios en `tests.html`, verificación
por navegador con emulación móvil. Sin librerías nuevas.

## Supuestos

- **Un bug es reproducible o no es un bug.** Si no se puede provocar, no cuenta
  para los diez; se anota como sospecha y se sigue.
- **Cada arreglo lleva un test que falla antes y pasa después.** Sin eso no hay
  forma de saber que se arregló, ni de que no vuelva.
- **Se prioriza por daño**: primero lo que pierde datos o miente sobre un
  número, después lo que rompe una pantalla, al final lo cosmético con
  consecuencia funcional.
- El conteo llega a diez y ahí para, aunque queden sospechas anotadas.

## Criterios de aceptación

1. Diez bugs distintos, cada uno con su reproducción escrita en la bitácora.
2. Los diez arreglados.
3. Un test nuevo por bug, que falla contra el código viejo.
4. La suite entera en verde al cerrar.
5. `guardas.py`, `tamanos.py` y `version.py` OK.
6. Las cinco pestañas renderizando sin errores de consola.
7. Hoy sigue entrando sin scroll en 412×915, 375×812, 375×740 y 360×640.

## Presupuesto

40 iteraciones.
