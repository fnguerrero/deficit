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

/**
 * Cómo se llama quien entró.
 *
 * Google manda el nombre en `user_metadata`, con tres nombres distintos según
 * cómo se haya configurado el proveedor. Con mail y contraseña no hay ninguno,
 * y ahí lo que queda es la parte de adelante del arroba: es fea pero es la
 * persona, y sirve para lo único que importa acá, que es saber con qué cuenta
 * estás entrado cuando tenés más de una.
 */
function nombreDeUsuario(u) {
  const m = (u && u.user_metadata) || {};
  const nombre = String(m.full_name || m.name || m.given_name || '').trim();
  if (nombre) return nombre;

  const email = String((u && u.email) || '').trim();
  return email ? email.split('@')[0] : '';
}

/** Lo que guardamos de la sesión. El token de refresco es lo que evita relogin. */
function sesionDesdeRespuesta(r) {
  if (!r || !r.access_token) return null;
  return {
    token: r.access_token,
    refresco: r.refresh_token || '',
    vence: Date.now() + (Number(r.expires_in) || 3600) * 1000,
    usuario: {
      id: r.user?.id || '',
      email: r.user?.email || '',
      nombre: nombreDeUsuario(r.user)
    }
  };
}

/* ---------------- entrar con Google ---------------- */

/*
 * Google va por redirección y no por fetch, y por eso no se parece a nada más
 * de este archivo.
 *
 * El flujo es: la app manda el navegador a Supabase, Supabase manda a Google,
 * Google pregunta, y de vuelta Supabase deja la sesión **en el fragmento de la
 * URL** (`#access_token=...`). El fragmento no viaja al servidor, así que el
 * token nunca sale de la máquina: por eso se usa el hash y no la query.
 *
 * Nada de esto necesita un SDK. Lo que sí necesita es que el `redirect_to` esté
 * en la lista de URLs permitidas del proyecto, o Supabase devuelve a la página
 * por defecto y la sesión se pierde en el camino.
 */
function urlDeGoogle(base, volverA) {
  const u = String(base || '').replace(/\/+$/, '');
  if (!u) return '';
  return `${u}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(volverA)}`;
}

/**
 * La sesión que viene en el fragmento de la URL, si es que viene.
 *
 * Devuelve null cuando no hay nada que leer —que es el caso normal, cada vez
 * que se abre la app— y un objeto `{ error }` cuando Google o Supabase
 * rebotaron, para poder decirlo en vez de quedarse en silencio.
 */
function sesionDesdeHash(hash) {
  const txt = String(hash || '').replace(/^#/, '');
  if (!txt) return null;

  const p = new URLSearchParams(txt);
  if (p.get('error') || p.get('error_description')) {
    return { error: p.get('error_description') || p.get('error') };
  }

  const token = p.get('access_token');
  if (!token) return null;

  return {
    token,
    refresco: p.get('refresh_token') || '',
    vence: Date.now() + (Number(p.get('expires_in')) || 3600) * 1000,
    /* Google no manda el mail acá. Se completa después con /auth/v1/user, y
       mientras tanto la sesión ya sirve: lo que hace falta es el token. */
    usuario: { id: '', email: '' }
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

  /* Un GET firmado. `pedir()` es siempre POST porque todo lo demás de auth lo
     es; /auth/v1/user es el único que no. */
  async function pedirGet(ruta, token) {
    const res = await fetchFn(base + ruta, {
      headers: { apikey: anonKey, Authorization: 'Bearer ' + token }
    });
    if (!res.ok) throw new Error('No se pudo leer el usuario.');
    return res.json();
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

    /** A dónde mandar el navegador para entrar con Google. */
    urlDeGoogle: (volverA) => urlDeGoogle(url, volverA),

    /**
     * Guarda la sesión que volvió en la URL y completa quién es.
     *
     * El mail se pide aparte porque el fragmento no lo trae, y sin mail la
     * pantalla diría "sesión iniciada como" y nada. Si esa consulta falla, la
     * sesión se guarda igual: tener el token es lo que importa.
     */
    async entrarConHash(hash) {
      const s = sesionDesdeHash(hash);
      if (!s) return null;
      if (s.error) throw new Error(mensajeDeGoogle(s.error));

      try {
        const r = await pedirGet('user', s.token);
        s.usuario = { id: r?.id || '', email: r?.email || '', nombre: nombreDeUsuario(r) };
      } catch { /* sin el mail se sigue igual */ }

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

/** Lo que puede rebotar de Google, en castellano. */
function mensajeDeGoogle(crudo) {
  const t = String(crudo || '');
  if (/access_denied|cancel/i.test(t)) return 'Cancelaste el ingreso con Google.';
  if (/provider is not enabled|not enabled/i.test(t)) return 'Google todavía no está habilitado en el proyecto de Supabase.';
  if (/redirect|not allowed/i.test(t)) return 'Esta dirección no está en la lista de URLs permitidas del proyecto.';
  return t || 'No se pudo entrar con Google.';
}

/** Un mail con forma de mail. No valida que exista, eso lo dirá el servidor. */
function emailValido(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(email || '').trim());
}
