/* ============================================================
   cargar.js — la app adentro de Node, sin navegador.

   Los scripts de la app son globales y se cargan en orden desde el HTML, sin
   modulos. Aca se corren igual: en un mismo contexto de `vm`, en el orden de
   tests.html, que es justamente el de la logica pura (sin las pantallas de
   ui/ ni arranque.js, que necesitan un DOM).

   La zona horaria se fija en Argentina ANTES de crear cualquier fecha: el
   cambio de dia y los redondeos de hora se tienen que probar donde la app se
   usa, no en el UTC de la maquina que corre los tests.
   ============================================================ */

process.env.TZ = 'America/Argentina/Buenos_Aires';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const RAIZ = path.join(__dirname, '..');

function scriptsDeLogica() {
  const html = fs.readFileSync(path.join(RAIZ, 'tests.html'), 'utf8');
  return [...html.matchAll(/src="([^"?]+\.js)/g)]
    .map(m => m[1])
    .filter(f => !/^tests\d*\.js$/.test(f));
}

/** Un contexto nuevo con toda la logica cargada. `app.f()` llama a la global `f`. */
function cargarApp() {
  const ctx = vm.createContext({
    console, setTimeout, clearTimeout, setInterval, clearInterval,
    URL, URLSearchParams, TextEncoder, TextDecoder, structuredClone
  });
  ctx.globalThis = ctx;
  for (const f of scriptsDeLogica()) {
    vm.runInContext(fs.readFileSync(path.join(RAIZ, f), 'utf8'), ctx, { filename: f });
  }
  /* Las `const` de primer nivel no quedan como propiedad del contexto: se leen
     evaluando el nombre. Las funciones si quedan, pero asi se piden igual. */
  return new Proxy({}, { get: (_, nombre) => vm.runInContext(String(nombre), ctx) });
}

module.exports = { cargarApp };
