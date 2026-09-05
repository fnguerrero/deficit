# Informe — cierre de los ciclos 17, 18 y 19

Fecha: 05/09/2026. Iteraciones acumuladas: #161 (presupuesto original 40 por
ciclo; estos tres ciclos consumieron de #155 a #161).

## Que se construyo

**Ciclo 17 — los pasos y el aviso fijo.** Sexto casillero y septima regla: los
pasos, con meta configurable y 10.000 por defecto, cargados a mano porque una
PWA no llega al podometro. La grilla de Hoy y las rachas del dia perfecto, que
eran dos listas distintas, pasaron a ser UNA de siete: todo lo que se ve cuenta
y todo lo que cuenta se ve. Fecha de corte 2026-09-02 para no reescribir el
pasado. Notificacion fija con el estado del dia por el service worker, con tag
fijo y silenciosa.

**Ciclo 18 — simplificar.** Cada pantalla muestra lo que se esta usando y el
resto queda a un toque. Perfil, Ajustes, Historial y Progreso plegados y sin
repetidos. Historial de 4,3 pantallas de scroll a 1,7; Progreso de 4,1 a 1,9;
Ajustes de 4,2 a 1,2. Ninguna funcion se perdio.

**Ciclo 19 — que el verde signifique algo.** El casillero Comidas ahora pide
registrar Y que al menos una comida entre en el modo. Los dos porcentajes de
adherencia unificados en una sola definicion de "dia dentro del objetivo".

## Como correrlo

```
py -3 -m http.server 8765
```

Despues `index.html` para la app y `tests.html` para la suite. Las guardas:
`py -3 tools/guardas.py`.

## Verificacion final, con numeros

- **1.063 tests en verde**, cero rojos.
- **Guardas OK**: 56 scripts (sintaxis, globales, ids, shell), 795 globales, 423 ids.
- **Hoy entra sin scroll a 375x812**: scrollHeight 812 contra clientHeight 812.
- **Consola sin errores** con la app cargada.
- **Arbol de git limpio**, ultimo commit `e7db85d`.

Los diez criterios de aceptacion de la SPEC del ciclo 15 siguen cumpliendose:
los cinco ejes del cuerpo, su independencia, el dia en blanco neutro, los tests
propios de la funcion pura, la suite entera y la pantalla sin scroll.

## Decisiones tomadas por criterio propio en este cierre

- **No se abrio un ciclo 20.** El TODO quedo agotado y no hay pedido nuevo.
  Inventar trabajo para tener algo que hacer expande el alcance sin que nadie lo
  haya pedido, y ademas ensucia un arbol que hoy esta limpio y verde.
- **El item del celular se marco bloqueado en vez de darlo por verificado.** Lo
  que se puede probar desde el escritorio ya se probo; hacerlo pasar por
  verificado seria justamente la clase de verde que este ciclo 19 vino a
  corregir.

## Desvios de la SPEC

La SPEC en disco es la del ciclo 15 y describe un objetivo ya cumplido y ya
informado en `INFORME.md`. Los ciclos 16 a 19 se agregaron al TODO sobre pedidos
posteriores de Nico sin reescribirla: ese es el desvio, y es de forma, no de
contenido. Lo que cada ciclo hizo esta en el TODO y en la bitacora, con el
detalle de por que. Dentro de los ciclos mismos no hubo desvios silenciosos.

## Bloqueado

- **Probar la notificacion fija en el celular con permiso concedido.** Necesita
  el telefono de Nico con el permiso dado: falta ver que el cartel reemplace al
  anterior en la bandeja de Android y no vibre. Un navegador de escritorio no
  reproduce esa parte.
