# SPEC — 33 mejoras a Déficit

## Objetivo

Llevar la app Déficit (PWA de control calórico con análisis de comidas por foto) de
"primera versión funcional" a algo que se pueda usar todos los días sin fricción:
menos llamadas a la API para lo repetitivo, datos editables, más contexto en el
historial y una app que no se rompa ante errores de red ni datos raros.

33 mejoras concretas, más el andamiaje de tests que permite verificarlas sin manos.

## Alcance

**Entra**
- Mejoras sobre el código existente: `index.html`, `styles.css`, `app.js`, `sw.js`.
- Suite de tests headless propia (`tests.html` + `tests.js`), sin dependencias.
- Migración de datos: lo que ya está guardado en `localStorage` tiene que seguir andando.

**No entra**
- Backend, cuentas de usuario, sincronización entre dispositivos.
- Empaquetado como APK (Capacitor) — sigue siendo PWA.
- Frameworks, bundlers, gestores de paquetes. Cero dependencias.
- Rediseño visual completo: se mantiene el lenguaje visual actual (tema oscuro, tarjetas).

## Stack y decisiones

- HTML + CSS + JS vanilla, sin build. Es lo que ya hay y lo que hace que se publique
  en Pages con un push.
- Tests: runner propio en `tests.js` sobre funciones puras, corrido desde `tests.html`
  y verificado con `javascript_tool` contra el server local. Sin Jest ni Node.
- Persistencia: sigue `localStorage` bajo `deficit.v1`, con función de migración para
  no perder datos viejos al agregar campos nuevos.
- Todo el estado nuevo (alimentos frecuentes, agua, ejercicio) cuelga del mismo objeto
  `state`, para que exportar/importar siga siendo un solo JSON.

## Supuestos

Decisiones tomadas por criterio propio ante ambigüedad (esta sección crece):

1. **"33 mejoras" no venía con lista.** La armé yo priorizando: (a) lo que ahorra
   llamadas a la API — que es lo que cuesta plata, (b) lo que hoy es imposible y molesta
   sí o sí (no se puede editar una comida guardada), (c) lo que da contexto para decidir
   (tendencia real vs ruido diario), (d) robustez ante errores.
2. **Prioridad sobre estética.** Ante empate, gana la mejora funcional. El rediseño no
   entra.
3. **Sin romper lo que anda.** Toda mejora tiene que dejar pasando los tests previos;
   el objetivo NO es reescribir la app.
4. **Los datos existentes se respetan.** Cualquier campo nuevo entra con default y
   migración, nunca borrando lo guardado.
5. **Commit y push**: Nico pidió explícitamente (19/08/2026) que en repos personales
   propios de GitHub no se pregunte. Se commitea y pushea al terminar, avisando después.
6. **Las mejoras de "IA"** no cambian el modelo por defecto (Opus 5): apuntan a gastar
   menos llamadas, no a bajar la calidad de la estimación.

## Criterios de aceptación

1. `tests.html` corre y da **0 fallos**, con al menos 40 assertions cubriendo cálculo
   nutricional, agregados por día, migración de datos y formateo.
2. La app carga en `http://localhost:5599` **sin un solo error de consola**.
3. Un `state` guardado con el formato viejo (`deficit.v1` sin los campos nuevos) se
   abre sin romper y queda migrado.
4. Las 33 mejoras están marcadas `[x]` en TODO.md, cada una con su verificación real
   anotada en la bitácora.
5. El service worker sigue registrando y cacheando el shell, con `VERSION` subida.
6. Exportar → borrar todo → importar deja la app en el mismo estado que antes
   (verificado comparando el JSON).
7. La app sigue andando **sin API key**: todo lo que no sea análisis de foto funciona.

## Presupuesto

**45 iteraciones.** Son 34 ítems (33 mejoras + andamiaje de tests), así que el margen
es de 11 iteraciones para imprevistos y para el cierre. Si a la #34 quedan más de 5
ítems sin hacer, se reporta el estado real en vez de apurar.
