/* ============================================================
   auth.js — cuentas de verdad, por REST y sin SDK.

   Reemplaza a la llave de dispositivo: la comida deja de ser "de esta
   instalación" y pasa a ser tuya. Entrás en el celular o en la compu y está
   todo, sin copiar nada a mano.

   El fetch se inyecta, así los tests corren sin tocar la red.
   ============================================================ */

const CLAVE_SESION = 'deficit.sesion';

/* Se renueva antes de que venza, no cuando ya venció: si esperáramos al 401, la
   primera sincronización después de un rato fallaría siempre. */
const MARGEN_RENOVACION = 5 * 60 * 1000;

/** Lo que guardamos de la sesión. El token de refresco es lo que evita relogin. */
function sesionDesdeRespuesta(r) {
  if (!r || !r.access_token) return null;
  return {
    token: r.access_token,
    refresco: r.refresh_token || '',
    vence: Date.now() + (Number(r.expires_in) || 3600) * 1000,
    usuario: {
      id: r.user?.id || '',
      email: r.user?.email || ''
    }
  };
}

function crearAuth({ url, anonKey, fetchFn, almacen = null }) {
  if (!url || !anonKey) throw new Error('Faltan la URL y la clave de Supabase.');

  const base = String(url).replace(/\/+$/, '') + '/auth/v1/';
  const guardado = almacen || {
    leer: () => { try { return JSON.parse(localStorage.getItem(CLAVE_SESION) || 'null'); } catch { return null; } },
    escribir: (s) => { try { s ? localStorage.setItem(CLAVE_SESION, JSON.stringify(s)) : localStorage.removeItem(CLAVE_SESION); } catch { /* sin storage */ } }
  };

  async function pedir(ruta, cuerpo, extra = {}) {
    let res;
    try {
      res = await fetchFn(base + ruta, {
        method: 'POST',
        headers: { apikey: anonKey, 'Content-Type': 'application/json', ...(extra.headers || {}) },
        body: cuerpo ? JSON.stringify(cuerpo) : undefined
      });
    } catch {
      /* Marcado como fallo de RED, no de credenciales. La diferencia decide si
         una sesión se conserva o se borra: ver token(), más abajo. */
      const e = new Error('No se pudo conectar. Revisá tu conexión.');
      e.red = true;
      throw e;
    }

    let datos = null;
    try { datos = await res.json(); } catch { /* algunas respuestas vienen vacías */ }

    if (!res.ok) {
      throw new Error(mensajeDeAuth(res.status, datos));
    }
    return datos;
  }

  return {
    /** La sesión guardada, sin validar si venció. */
    sesion: () => guardado.leer(),

    async registrar(email, password) {
      const r = await pedir('signup', { email, password });

      // Con confirmación por mail activada, Supabase no devuelve token todavía.
      if (!r?.access_token) {
        return { creada: true, confirmar: true, usuario: { email } };
      }

      const s = sesionDesdeRespuesta(r);
      guardado.escribir(s);
      return { creada: true, confirmar: false, ...s };
    },

    async entrar(email, password) {
      const r = await pedir('token?grant_type=password', { email, password });
      const s = sesionDesdeRespuesta(r);
      if (!s) throw new Error('La respuesta no trajo una sesión válida.');
      guardado.escribir(s);
      return s;
    },

    async salir() {
      const s = guardado.leer();
      guardado.escribir(null);
      // el logout del servidor es cortesía: si falla, la sesión local ya se fue
      if (s?.token) {
        try { await pedir('logout', null, { headers: { Authorization: 'Bearer ' + s.token } }); } catch { /* da igual */ }
      }
    },

    /** Recupera la contraseña por mail. La app nunca ve la nueva. */
    async recuperar(email) {
      await pedir('recover', { email });
      return true;
    },

    /**
     * Un token vivo, renovándolo si está por vencer.
     *
     * Tres respuestas distintas, y la diferencia importa:
     *   · `null` — no hay sesión, o el servidor rechazó el refresco. Hay que
     *     volver a entrar, y la sesión local ya se borró.
     *   · un string — el token, listo para usar.
     *   · **lanza** con `.red = true` — no se pudo preguntar. La sesión se
     *     conserva intacta.
     *
     * Esa última rama es la que faltaba, y lo que costaba era la cuenta. El
     * catch era uno solo, así que quedarse sin señal justo cuando vencía el
     * token —un subte, un ascensor, el campo— **deslogueaba**: la app volvía a
     * decir "sin cuenta" y a partir de ahí guardaba todo local sin subir nada.
     * No poder preguntar no es lo mismo que recibir un no.
     */
    async token() {
      const s = guardado.leer();
      if (!s) return null;

      if (Date.now() < s.vence - MARGEN_RENOVACION) return s.token;
      if (!s.refresco) { guardado.escribir(null); return null; }

      let r;
      try {
        r = await pedir('token?grant_type=refresh_token', { refresh_token: s.refresco });
      } catch (e) {
        if (e && e.red) throw e;          // sin respuesta: la sesión se queda
        guardado.escribir(null);          // el servidor dijo que no: a entrar de nuevo
        return null;
      }

      const nueva = sesionDesdeRespuesta(r);
      if (!nueva) { guardado.escribir(null); return null; }

      // el usuario no siempre vuelve en el refresco: se conserva el que había
      nueva.usuario = nueva.usuario.id ? nueva.usuario : s.usuario;
      guardado.escribir(nueva);
      return nueva.token;
    }
  };
}

/** Los errores de Supabase en castellano y sin jerga. */
function mensajeDeAuth(status, datos) {
  const crudo = String(datos?.msg || datos?.error_description || datos?.message || '');

  if (/already registered|already exists/i.test(crudo)) return 'Ese mail ya tiene una cuenta. Probá entrar en vez de registrarte.';
  if (/Invalid login credentials/i.test(crudo)) return 'Mail o contraseña incorrectos.';
  if (/Email not confirmed/i.test(crudo)) return 'Falta confirmar el mail. Revisá tu casilla.';
  if (/Password should be at least/i.test(crudo)) return 'La contraseña necesita al menos 6 caracteres.';
  if (/valid email|invalid format/i.test(crudo)) return 'Ese mail no parece válido.';
  if (/rate limit|too many/i.test(crudo)) return 'Demasiados intentos seguidos. Esperá un minuto.';

  if (status === 400) return crudo || 'Los datos no son válidos.';
  if (status === 401 || status === 403) return 'No autorizado.';
  if (status >= 500) return 'Supabase está con problemas. Probá en un rato.';

  return crudo || `Error ${status}`;
}

/** Un mail con forma de mail. No valida que exista, eso lo dirá el servidor. */
function emailValido(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(email || '').trim());
}
