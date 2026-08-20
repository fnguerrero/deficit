# SPEC — 30 mejoras a Déficit (ciclo 2)

El ciclo anterior (33 mejoras + andamiaje) está cerrado en `.nonstop/ciclo-1/`.

## Objetivo

La app ya cubre el registro y el seguimiento. Este ciclo apunta a tres cosas que hoy
no tiene: **sacar fricción del uso diario** (cargar en un toque lo que comés siempre),
**gastar menos API por el mismo resultado**, y **que los datos digan algo** — no solo
mostrar números, sino señalar dónde se te va el déficit y qué va a pasar si seguís así.

## Alcance

**Entra**
- Mejoras sobre el código existente (`core.js`, `claude.js`, `app.js`, `styles.css`, `sw.js`).
- Tests nuevos en la suite propia para todo lo que sea lógica pura o capa de API.
- Migración de datos: lo guardado hoy tiene que seguir andando sin tocar nada.

**No entra**
- Backend, cuentas, sincronización entre dispositivos.
- Frameworks, bundlers, dependencias. Sigue siendo vanilla sin build.
- APK / Capacitor: sigue siendo PWA.
- Rediseño visual: se mantiene el lenguaje actual (oscuro, tarjetas). El tema claro
  del ítem 22 es una variante de ese mismo lenguaje, no un rediseño.

## Stack y decisiones

- Lo mismo de siempre: HTML + CSS + JS vanilla, sin build.
- La lógica nueva que sea pura va a `core.js`; lo que hable con la API, a `claude.js`.
  `app.js` solo render y eventos. Es lo que permite testear sin DOM y sin gastar API.
- Tests: se extiende `tests.js` (runner propio, ya soporta async).
- Persistencia: sigue `localStorage` bajo `deficit.v1`, con `migrar()` para cada campo nuevo.

## Supuestos

Decisiones tomadas por criterio propio (esta sección crece):

1. **Las 30 mejoras las elijo yo**, igual que en el ciclo 1. Criterio: (a) toques que
   ahorran tiempo todos los días, (b) plata de API ahorrada, (c) datos que llevan a una
   decisión concreta, (d) huecos de robustez que ya se ven venir.
2. **No repetir lo del ciclo 1.** Nada de rehacer lo que ya existe: cada ítem agrega algo
   que hoy no está.
3. **Los tests existentes tienen que seguir en verde** después de cada ítem. Si un cambio
   los rompe, primero se decide si estaba mal el test o el código.
4. **Commit y push**: Nico pidió explícitamente que en sus repos de GitHub no se pregunte.
   Se commitea y pushea al cerrar, avisando después.
5. **El tema claro respeta `prefers-color-scheme`** y se puede forzar; no se inventa una
   paleta nueva, se derivan los mismos tokens.
6. **Las notificaciones locales** se piden solo cuando la persona activa el recordatorio,
   nunca al abrir la app.

## Criterios de aceptación

1. La suite pasa de 148 a **200+ tests**, con **0 fallos**.
2. La app carga en `http://localhost:5599` **sin un error de consola**.
3. Un `state` del ciclo anterior (esquema 2) se abre, migra y **no pierde ni un dato**.
4. Las 30 mejoras están `[x]` en TODO.md, cada una con su verificación en la bitácora.
5. **Cero llamadas reales a la API** durante todo el trabajo: la capa de red se prueba
   con `fetch` mockeado.
6. Exportar → borrar → importar sigue dejando el JSON idéntico.
7. La app sigue siendo usable **sin API key** y **sin conexión** (shell cacheado).
8. El tema claro y el oscuro se ven bien: ningún texto queda con contraste menor a 4.5:1.

## Presupuesto

**40 iteraciones** para 30 ítems. El margen de 10 es para imprevistos y el cierre.
Si a la iteración 30 quedan más de 5 ítems, se reporta el estado real en vez de apurar.
