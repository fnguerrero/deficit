/* ============================================================
   push.js — el que golpea cuando toca.

   Corre por cron cada quince minutos: lee las suscripciones de Supabase, mira
   cuales tienen un horario que cae en esta ventana segun SU huso, y le manda a
   cada una un aviso vacio. El texto lo arma el telefono en el service worker.

   Vacio a proposito: un push con contenido hay que encriptarlo con la clave del
   dispositivo (RFC 8291, aes128gcm), y para decir "cargaste el almuerzo?" no
   vale la pena ni el codigo ni tener datos de comidas pasando por aca.

   Lo unico que si hace falta firmar es el VAPID: un JWT ES256 que le prueba al
   servicio de push del fabricante que el que golpea es el dueño de la clave
   publica con la que el navegador se suscribio.
   ============================================================ */

const VENTANA_MIN = 15;

/** base64url sin relleno, que es lo que piden JWT y VAPID. */
function b64url(bytes) {
  let bin = '';
  const arr = new Uint8Array(bytes);
  for (let i = 0; i < arr.length; i++) bin += String.fromCharCode(arr[i]);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function deB64url(txt) {
  const relleno = '='.repeat((4 - (txt.length % 4)) % 4);
  const bin = atob((txt + relleno).replace(/-/g, '+').replace(/_/g, '/'));
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

/**
 * El JWT que firma cada envio.
 *
 * `aud` es el ORIGEN del endpoint y no el endpoint entero: firmado con la URL
 * completa, el servicio de push lo rechaza con un 401 que no explica nada.
 */
async function tokenVapid(endpoint, privadaB64, publicaB64) {
  const aud = new URL(endpoint).origin;
  const cabecera = b64url(new TextEncoder().encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const cuerpo = b64url(new TextEncoder().encode(JSON.stringify({
    aud,
    // doce horas: el maximo que aceptan los servicios es 24
    exp: Math.floor(Date.now() / 1000) + 12 * 3600,
    sub: 'mailto:deficit@example.com'
  })));

  const clave = await crypto.subtle.importKey(
    'jwk',
    {
      kty: 'EC',
      crv: 'P-256',
      d: privadaB64,
      x: b64url(deB64url(publicaB64).slice(1, 33)),
      y: b64url(deB64url(publicaB64).slice(33, 65)),
      ext: true
    },
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  );

  const firma = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    clave,
    new TextEncoder().encode(`${cabecera}.${cuerpo}`)
  );

  return `${cabecera}.${cuerpo}.${b64url(firma)}`;
}

/** Si a esa hora local le toca. Misma cuenta que push.js del lado app. */
function tocaAvisar(horaTexto, minutosLocales, ventana = VENTANA_MIN) {
  const m = /^(\d{2}):(\d{2})$/.exec(String(horaTexto || ''));
  if (!m) return false;
  const objetivo = Number(m[1]) * 60 + Number(m[2]);
  const dif = ((minutosLocales - objetivo) % 1440 + 1440) % 1440;
  return dif < ventana;
}

/** Los minutos del dia en ese huso, ahora. */
function minutosEn(tz, ahora = new Date()) {
  try {
    const f = new Intl.DateTimeFormat('es-AR', {
      timeZone: tz || 'America/Argentina/Buenos_Aires',
      hour: '2-digit', minute: '2-digit', hour12: false
    }).format(ahora);
    const [h, m] = f.split(':').map(Number);
    return h * 60 + m;
  } catch {
    return null;
  }
}

/** A quien le toca ahora. Exportada aparte para poder probarla sin red. */
export function aQuienAvisar(filas, ahora = new Date()) {
  return (filas || []).filter(f => {
    const minutos = minutosEn(f.tz, ahora);
    if (minutos == null) return false;
    return (f.horarios || []).some(h => tocaAvisar(h?.hora, minutos));
  });
}

async function traerSuscripciones(env) {
  const url = `${env.SUPABASE_URL.replace(/\/+$/, '')}/rest/v1/push_subs?select=*`;
  const res = await fetch(url, {
    headers: { apikey: env.SUPABASE_ANON, Authorization: `Bearer ${env.SUPABASE_ANON}` }
  });
  if (!res.ok) throw new Error('Supabase respondio ' + res.status);
  return res.json();
}

/** Una suscripcion muerta se borra: el fabricante devuelve 404 o 410. */
async function borrarSuscripcion(env, endpoint) {
  const url = `${env.SUPABASE_URL.replace(/\/+$/, '')}/rest/v1/push_subs?endpoint=eq.${encodeURIComponent(endpoint)}`;
  await fetch(url, {
    method: 'DELETE',
    headers: { apikey: env.SUPABASE_ANON, Authorization: `Bearer ${env.SUPABASE_ANON}`, Prefer: 'return=minimal' }
  }).catch(() => { /* que no corte la corrida */ });
}

export async function correrAvisos(env, ahora = new Date()) {
  if (!env.VAPID_PRIVADA || !env.VAPID_PUBLICA || !env.SUPABASE_URL || !env.SUPABASE_ANON) {
    return { error: 'faltan secretos' };
  }

  const filas = await traerSuscripciones(env);
  const toca = aQuienAvisar(filas, ahora);

  let enviados = 0;
  let muertas = 0;

  for (const f of toca) {
    const jwt = await tokenVapid(f.endpoint, env.VAPID_PRIVADA, env.VAPID_PUBLICA);
    const res = await fetch(f.endpoint, {
      method: 'POST',
      headers: {
        TTL: '3600',
        Authorization: `vapid t=${jwt}, k=${env.VAPID_PUBLICA}`,
        // sin cuerpo: el texto lo arma el service worker con la hora del telefono
        'Content-Length': '0'
      }
    });

    if (res.status === 404 || res.status === 410) {
      await borrarSuscripcion(env, f.endpoint);
      muertas++;
    } else if (res.ok || res.status === 201) {
      enviados++;
    }
  }

  return { revisadas: filas.length, tocaban: toca.length, enviados, muertas };
}
