/* ============================================================
   worker.js — proxy entre la app y la API de Claude.

   Existe por una sola razón: la app es HTML servido por GitHub Pages,
   así que todo lo que esté en el repo es público y no puede guardar
   una credencial. Acá sí: la clave vive como secreto de Cloudflare,
   nunca baja al navegador y no está en ningún dispositivo.

   La app le pega a este Worker exactamente como le pegaría a la API,
   sin el header de autenticación. El Worker lo agrega y reenvía.

   Solo atiende a quien tiene sesión en Supabase: el Origin solo no
   alcanza, porque con curl se escribe a mano. La app manda su token
   en `Authorization: Bearer` y el Worker le pregunta a Supabase de
   quién es antes de gastar un centavo. Con EMAILS_PERMITIDOS cargado,
   además tiene que ser uno de esos mails: sin eso, cualquiera que se
   cree una cuenta podría usar la clave.
   ============================================================ */

const API_URL = 'https://api.anthropic.com/v1/messages';

/* Desde dónde se acepta. Cualquier otro origen se rechaza sin llamar a la API. */
const ORIGENES = [
  'https://fnguerrero.github.io',
  'http://localhost:5599',
  'http://127.0.0.1:5599'
];

/* Solo estos modelos. Sin esto, alguien podría pedir cualquier cosa a costa nuestra. */
const MODELOS = ['claude-opus-5', 'claude-sonnet-5', 'claude-haiku-4-5'];

/* Techo por pedido: el análisis de una comida no necesita más que esto. */
const MAX_TOKENS = 4096;

/* Una foto de 1024 px en base64 pesa ~1,5 MB. Con margen para varias fotos. */
const MAX_CUERPO = 12 * 1024 * 1024;

function cors(origen) {
  return {
    'Access-Control-Allow-Origin': origen,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'content-type, anthropic-version, authorization',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin'
  };
}

/** Error con la misma forma que devuelve la API, así el cliente no distingue. */
function error(mensaje, status, origen) {
  return new Response(JSON.stringify({ type: 'error', error: { type: 'proxy_error', message: mensaje } }), {
    status,
    headers: { 'content-type': 'application/json', ...cors(origen || ORIGENES[0]) }
  });
}

import { correrAvisos } from './push.js';

/* Un análisis son varios pedidos seguidos con el mismo token: preguntarle a
   Supabase en cada uno es sumar latencia sin ganar nada. Vive lo que vive la
   instancia del Worker, y un token revocado deja de servir en cinco minutos. */
const SESIONES = new Map();
const VIGENCIA_SESION = 5 * 60 * 1000;

/** El mail de quien manda el token, o null si Supabase no lo reconoce. */
async function usuarioDelToken(token, env) {
  const guardado = SESIONES.get(token);
  if (guardado && guardado.hasta > Date.now()) return guardado.email;

  let res;
  try {
    res = await fetch(`${env.SUPABASE_URL.replace(/\/+$/, '')}/auth/v1/user`, {
      headers: { apikey: env.SUPABASE_ANON, Authorization: `Bearer ${token}` }
    });
  } catch {
    return null;
  }
  if (!res.ok) return null;

  let email = '';
  try { email = String((await res.json())?.email || '').toLowerCase(); } catch { return null; }
  if (SESIONES.size > 500) SESIONES.clear();
  SESIONES.set(token, { email, hasta: Date.now() + VIGENCIA_SESION });
  return email;
}

function emailPermitido(email, env) {
  const lista = String(env.EMAILS_PERMITIDOS || '')
    .split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
  return !lista.length || lista.includes(email);
}

export default {
  /*
   * El reloj de los avisos. Cloudflare lo llama por el cron de wrangler.toml, y
   * es lo unico que puede despertar a un telefono con la app cerrada: adentro
   * del navegador no hay nada que siga corriendo.
   */
  async scheduled(evento, env, ctx) {
    /* Envuelto: el cron corre cada quince minutos para siempre, y una tabla que
       todavia no existe o un Supabase caido no puede dejar el Worker tirando
       excepciones sin fin. Se anota y la corrida siguiente vuelve a intentar. */
    ctx.waitUntil(
      correrAvisos(env, new Date(evento.scheduledTime))
        .catch(e => console.log('avisos:', e.message || e))
    );
  },

  async fetch(request, env) {
    const origen = request.headers.get('Origin') || '';
    const permitido = ORIGENES.includes(origen);

    if (request.method === 'OPTIONS') {
      // el preflight se contesta igual, pero solo con el origen que corresponde
      return new Response(null, { status: 204, headers: cors(permitido ? origen : ORIGENES[0]) });
    }

    if (!permitido) return error('Origen no permitido.', 403, null);
    if (request.method !== 'POST') return error('Solo POST.', 405, origen);
    if (!env.ANTHROPIC_API_KEY) return error('El proxy no tiene la clave configurada.', 500, origen);

    // Freno por IP. Si el binding no está declarado, el Worker sigue andando igual.
    if (env.LIMITE) {
      const ip = request.headers.get('CF-Connecting-IP') || 'sin-ip';
      const { success } = await env.LIMITE.limit({ key: ip });
      if (!success) return error('Demasiados pedidos seguidos. Esperá un minuto.', 429, origen);
    }

    if (!env.SUPABASE_URL || !env.SUPABASE_ANON) {
      return error('El proxy no tiene Supabase configurado para validar la sesión.', 500, origen);
    }

    // Recién acá, con el freno por IP ya pasado, se le pregunta a Supabase.
    const token = (request.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '').trim();
    if (!token) return error('Para analizar con la IA de la app hay que iniciar sesión (Ajustes → Cuenta).', 401, origen);
    const email = await usuarioDelToken(token, env);
    if (email === null) return error('La sesión venció o no es válida. Volvé a iniciar sesión (Ajustes → Cuenta).', 401, origen);
    if (!emailPermitido(email, env)) return error('Esta cuenta no tiene permiso para usar la IA de la app.', 403, origen);

    const crudo = await request.text();
    if (crudo.length > MAX_CUERPO) return error('El pedido es demasiado grande.', 413, origen);

    let cuerpo;
    try {
      cuerpo = JSON.parse(crudo);
    } catch {
      return error('El cuerpo no es JSON válido.', 400, origen);
    }

    if (!MODELOS.includes(cuerpo.model)) return error('Modelo no permitido.', 400, origen);
    if (Number(cuerpo.max_tokens) > MAX_TOKENS) cuerpo.max_tokens = MAX_TOKENS;

    let res;
    try {
      res = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': env.ANTHROPIC_API_KEY,
          'anthropic-version': request.headers.get('anthropic-version') || '2023-06-01'
        },
        body: JSON.stringify(cuerpo)
      });
    } catch {
      return error('El proxy no pudo contactar a la API de Claude.', 502, origen);
    }

    // El body se devuelve tal cual: si viene en streaming, sigue siendo un stream.
    const headers = new Headers(cors(origen));
    headers.set('content-type', res.headers.get('content-type') || 'application/json');
    const reintentar = res.headers.get('retry-after');
    if (reintentar) headers.set('retry-after', reintentar);

    return new Response(res.body, { status: res.status, headers });
  }
};
