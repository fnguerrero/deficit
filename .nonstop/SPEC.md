# SPEC — ciclo 7: cien mejoras

## Objetivo

Cien mejoras concretas y verificables sobre la app entera: corrección, accesibilidad,
rendimiento, texto, UX y calidad interna. No hay una feature grande nueva — el ciclo es
de pulido, que es justo lo que le falta a una app que creció seis ciclos seguidos
agregando cosas.

## Alcance

**Entra:** cualquier mejora acotada y verificable de la app. Bugs, accesibilidad,
rendimiento, claridad de los textos, detalles de UX, robustez ante datos raros, y
limpieza interna que no cambie el comportamiento.

**No entra:**
- Features grandes nuevas. El ciclo es de pulido.
- Rediseñar el personaje otra vez. Quedó donde quedó en el ciclo 6.
- Push real con servidor, sincronizar fotos, medir la estimación de platos: siguen fuera
  por los mismos motivos de siempre.

## Stack y decisiones

Sin cambios: HTML/CSS/JS vanilla, sin build ni dependencias.

## Supuestos

1. **"De toda índole" se reparte en doce bloques** —corrección, accesibilidad,
   rendimiento, datos raros, textos, Hoy, comidas, historial y progreso, modos, juego,
   ajustes y calidad interna— para que no sean cien variantes de lo mismo.
2. **Cada mejora entra sola.** Nada que dependa de otra de la lista: si una queda
   bloqueada, las demás siguen.
3. **Lo verificable manda.** Una mejora que no se puede probar no entra en la lista, por
   más linda que suene.
4. **Las mejoras de texto también cuentan.** Media app se usa leyendo, y un mensaje que
   no se entiende es un defecto igual que un cálculo mal hecho.
5. **Cien es mucho.** Van ordenadas por valor: si el presupuesto se corta, lo que queda
   afuera es lo de abajo.

## Criterios de aceptación

1. Las 100 mejoras están implementadas y verificadas, o las que no lo están figuran
   `[!]` con el motivo.
2. La suite entera pasa, y crece con tests por cada mejora que tenga lógica.
3. Sin errores de consola, en escritorio y en móvil.
4. Hoy sigue entrando sin scroll en 375×812 con el día liviano.
5. Ningún archivo pasa su límite de líneas.
6. La app sigue arrancando offline: todo script nuevo entra en el shell del sw.
7. Ninguna mejora rompe una decisión de diseño de los ciclos anteriores sin decirlo en
   el informe.

## Presupuesto

110 iteraciones.

---

## Ciclo 8 — el personaje contra la referencia (27/08/2026)

**Objetivo.** Que el muñeco se parezca a la referencia visual que pasó Nico: dos láminas
con las 7 fases y las 7 contexturas, estilo anime, anteojos redondos, musculosa verde,
short azul y zapatillas blancas.

**Supuestos** (decisiones tomadas solo, sin preguntar):

- Las 31 mejoras que quedaron del ciclo 7 pasan a `.nonstop/ciclo-7/TODO.md` y esperan.
  El pedido vigente es el personaje.
- Las imágenes de referencia NO se usan como assets. El personaje se dibuja por código y
  combina contextura × musculatura × ánimo × fase: son miles de combinaciones y catorce
  dibujos fijos no las cubren. Se usan como referencia de estilo.
- No se rediseña la cara de cero: los anteojos, las proporciones y la ropa alcanzan para
  el parecido, y rediseñar la cara sin una referencia de la cara sería tirar lo que ya
  está aprobado.
- La verificación es visual, rasterizando con Edge headless y mirando el PNG. El panel del
  navegador no saca screenshots en esta sesión.

**Criterios de aceptación:**

1. Los 763 tests propios en verde, `guardas.py` y `tamanos.py` OK.
2. La consola del navegador limpia con la app real cargada.
3. Con músculo se ven pectorales, abdomen y trapecios sobre la musculosa; sin músculo, no.
4. Con panza, la musculosa se abomba y el ruedo sube al frente.
5. El short llega a media pierna y tiene dobladillo.
6. Las siete fases dibujan llamas con forma de fuego, y de la 3 en adelante hay escombros.
7. El personaje entra en la tarjeta de Hoy sin desbordar.

**Presupuesto:** 40 iteraciones.

---

## Ciclo 9 — diez mejoras (28/08/2026)

**Objetivo.** Diez mejoras sueltas sobre la app ya andando, elegidas de lo que quedó
pendiente en ciclos anteriores.

**Supuestos:**

- Las diez salen de las 31 del ciclo 7 y de lo que dejó abierto el personaje híbrido, no
  de ideas nuevas: hay una lista de pendientes escrita y revisada, y estrenar ideas
  mientras esa lista existe es empezar cosas en vez de terminarlas.
- Se priorizan las que corrigen algo que hoy está mal o ahorran plata de API, antes que
  las cosméticas.
- El ciclo 8 se archiva en `.nonstop/ciclo-8/`.

**Criterios de aceptación:**

1. Los tests propios en verde, `guardas.py` y `tamanos.py` OK.
2. Consola limpia con la app real cargada.
3. Cada una de las diez verificada con el método que declara su ítem.
4. El personaje se sigue dibujando igual después de la limpieza.

**Presupuesto:** 40 iteraciones.
