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
