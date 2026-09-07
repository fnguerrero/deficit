/* Tests del Worker. Corren en Node, sin Cloudflare y sin tocar la API:
   node proxy/test.mjs

   Lo que se prueba acá es lo único que maneja la clave, así que vale
   la pena aunque sean cien líneas. */

import worker from './worker.js';
import { aQuienAvisar } from './push.js';

let fallos = 0;
const PENDIENTES = [];

/* Se encolan y corren de a uno: todos comparten el fetch global, así que
   en paralelo se pisan entre ellos. */
function test(nombre, fn) {
  PENDIENTES.push({ nombre, fn });
}

async function correr() {
  for (const { nombre, fn } of PENDIENTES) {
    try {
      await fn();
      console.log('  ok  ' + nombre);
    } catch (e) {
      fallos++;
      console.log('  MAL ' + nombre + ' → ' + e.message);
    }
  }
  const n = PENDIENTES.length;
  console.log(`\n${n} tests, ${fallos ? fallos + ' fallando' : 'todo en verde'}\n`);
  if (fallos) process.exitCode = 1;
}

function esperar(real, esperado, msg) {
  if (real !== esperado) throw new Error(`${msg || ''} esperaba ${JSON.stringify(esperado)}, dio ${JSON.stringify(real)}`);
}

const ENV = { ANTHROPIC_API_KEY: 'sk-ant-secreta' };
const ORIGEN = 'https://fnguerrero.github.io';

const CUERPO = { model: 'claude-opus-5', max_tokens: 1000, messages: [] };

function pedido(cuerpo = CUERPO, { origen = ORIGEN, metodo = 'POST' } = {}) {
  return new Request('https://proxy.dev/', {
    method: metodo,
    headers: origen ? { Origin: origen, 'content-type': 'application/json' } : {},
    body: metodo === 'POST' ? JSON.stringify(cuerpo) : undefined
  });
}

/** Reemplaza el fetch global y devuelve lo que el Worker mandó a la API. */
function espiarFetch(respuesta = new Response('{"ok":true}', { status: 200 })) {
  const visto = {};
  globalThis.fetch = async (url, opts) => {
    visto.url = url;
    visto.headers = opts.headers;
    visto.body = JSON.parse(opts.body);
    return respuesta;
  };
  return visto;
}

console.log('\nProxy — Worker\n');

test('rechaza un origen que no está en la lista', async () => {
  const res = await worker.fetch(pedido(CUERPO, { origen: 'https://sitio-ajeno.com' }), ENV);
  esperar(res.status, 403);
});

test('rechaza un pedido sin origen', async () => {
  const res = await worker.fetch(pedido(CUERPO, { origen: '' }), ENV);
  esperar(res.status, 403);
});

test('contesta el preflight con CORS', async () => {
  const res = await worker.fetch(pedido(CUERPO, { metodo: 'OPTIONS' }), ENV);
  esperar(res.status, 204);
  esperar(res.headers.get('Access-Control-Allow-Origin'), ORIGEN);
});

test('acepta localhost, para poder probar en la compu', async () => {
  espiarFetch();
  const res = await worker.fetch(pedido(CUERPO, { origen: 'http://localhost:5599' }), ENV);
  esperar(res.status, 200);
});

test('le agrega la clave al pedido que sale', async () => {
  const visto = espiarFetch();
  await worker.fetch(pedido(), ENV);
  esperar(visto.url, 'https://api.anthropic.com/v1/messages');
  esperar(visto.headers['x-api-key'], 'sk-ant-secreta');
});

test('la respuesta al navegador no filtra la clave', async () => {
  espiarFetch();
  const res = await worker.fetch(pedido(), ENV);
  const texto = JSON.stringify([...res.headers]) + (await res.text());
  esperar(texto.includes('sk-ant-secreta'), false, 'la clave no puede volver al cliente');
});

test('rechaza un modelo que no es de la app', async () => {
  const res = await worker.fetch(pedido({ ...CUERPO, model: 'modelo-carisimo' }), ENV);
  esperar(res.status, 400);
});

test('recorta max_tokens si se pasa del techo', async () => {
  const visto = espiarFetch();
  await worker.fetch(pedido({ ...CUERPO, max_tokens: 999999 }), ENV);
  esperar(visto.body.max_tokens, 4096);
});

test('rechaza un cuerpo que no es JSON', async () => {
  const req = new Request('https://proxy.dev/', {
    method: 'POST', headers: { Origin: ORIGEN }, body: 'esto no es json'
  });
  const res = await worker.fetch(req, ENV);
  esperar(res.status, 400);
});

test('avisa si le falta la clave en vez de llamar sin ella', async () => {
  const res = await worker.fetch(pedido(), {});
  esperar(res.status, 500);
});

test('respeta el freno por IP', async () => {
  const env = { ...ENV, LIMITE: { limit: async () => ({ success: false }) } };
  const res = await worker.fetch(pedido(), env);
  esperar(res.status, 429);
});

test('deja pasar el status y el retry-after de la API', async () => {
  espiarFetch(new Response('{"error":1}', { status: 429, headers: { 'retry-after': '7' } }));
  const res = await worker.fetch(pedido(), ENV);
  esperar(res.status, 429, 'el cliente reintenta según el status');
  esperar(res.headers.get('retry-after'), '7');
});

test('no rompe si la API no responde', async () => {
  globalThis.fetch = async () => { throw new Error('sin red'); };
  const res = await worker.fetch(pedido(), ENV);
  esperar(res.status, 502);
});

await correr();

/* ---------------- el reloj de los avisos ---------------- */

const SUB = (tz, horas) => ({
  endpoint: 'https://fcm.googleapis.com/' + tz,
  tz,
  horarios: horas.map(h => ({ momento: 'x', hora: h }))
});

test('avisa al que le toca en SU huso, no en el del servidor', async () => {
  /* Las 14:30 en Buenos Aires son las 17:30 UTC. El mismo instante no le toca a
     alguien en Madrid, donde son las 19:30. */
  const ahora = new Date('2026-09-07T17:30:00Z');
  const filas = [
    SUB('America/Argentina/Buenos_Aires', ['14:30']),
    SUB('Europe/Madrid', ['14:30'])
  ];
  const toca = aQuienAvisar(filas, ahora);
  esperar(toca.length, 1, 'solo uno de los dos');
  esperar(toca[0].tz, 'America/Argentina/Buenos_Aires');
});

test('el aviso cae en su ventana de quince minutos y en ninguna otra', async () => {
  const bsas = tz => new Date(tz);
  const filas = [SUB('America/Argentina/Buenos_Aires', ['14:30'])];
  esperar(aQuienAvisar(filas, bsas('2026-09-07T17:30:00Z')).length, 1, 'a las 14:30');
  esperar(aQuienAvisar(filas, bsas('2026-09-07T17:44:00Z')).length, 1, 'a las 14:44 todavia');
  esperar(aQuienAvisar(filas, bsas('2026-09-07T17:45:00Z')).length, 0, 'a las 14:45 ya no');
  esperar(aQuienAvisar(filas, bsas('2026-09-07T17:29:00Z')).length, 0, 'un minuto antes tampoco');
});

test('una suscripcion sin horarios o con huso invalido no molesta a nadie', async () => {
  const ahora = new Date('2026-09-07T17:30:00Z');
  esperar(aQuienAvisar([SUB('America/Argentina/Buenos_Aires', [])], ahora).length, 0);
  esperar(aQuienAvisar([{ endpoint: 'x', tz: 'Marte/Olympus', horarios: [{ hora: '14:30' }] }], ahora).length, 0);
  esperar(aQuienAvisar([], ahora).length, 0);
  esperar(aQuienAvisar(null, ahora).length, 0);
});
