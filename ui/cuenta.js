/* ============================================================
   ui/cuenta.js — entrar, registrarse y salir.

   La app sigue andando sin cuenta: todo se guarda local igual. La cuenta es
   para que los datos sean tuyos y no de un dispositivo, y para verlos en el
   celular y en la compu sin copiar una llave a mano.
   ============================================================ */

let clienteAuth = null;

/** Se arma una sola vez, con las credenciales que ya resuelve la sincronización. */
function auth() {
  if (clienteAuth) return clienteAuth;

  const cfg = configSync();
  if (!cfg.url || !cfg.anonKey) return null;

  clienteAuth = crearAuth({ url: cfg.url, anonKey: cfg.anonKey, fetchFn: (...a) => fetch(...a) });
  return clienteAuth;
}

function sesionActual() {
  const a = auth();
  return a ? a.sesion() : null;
}

/* ---------------- pantalla ---------------- */

function renderCuenta() {
  const cont = $('estadoCuenta');
  if (!cont) return;

  const s = sesionActual();

  $('formCuenta').hidden = !!s;
  $('cuentaAdentro').hidden = !s;

  if (s) {
    $('cuentaEmail').textContent = s.usuario.email || 'tu cuenta';
    cont.textContent = 'Tus datos están asociados a esta cuenta. Entrá con el mismo mail en cualquier dispositivo y vas a ver lo mismo.';
  } else {
    cont.textContent = auth()
      ? 'Sin cuenta la app funciona igual, pero los datos se quedan en este dispositivo.'
      : 'Falta configurar Supabase para poder usar cuentas.';
  }

  $('cuentaError').textContent = '';
  $('cuentaOk').textContent = '';
}

function mostrarErrorCuenta(msg) {
  $('cuentaError').textContent = msg;
  $('cuentaOk').textContent = '';
}

function ocupado(si) {
  for (const id of ['btnEntrar', 'btnRegistrar', 'btnOlvide']) {
    const b = $(id);
    if (b) b.disabled = si;
  }
}

/**
 * Después de entrar: adoptar lo que se había cargado sin cuenta y bajar todo.
 *
 * Es el momento delicado de la migración. Si esto no corriera, las comidas
 * viejas quedarían huérfanas en el servidor y la persona vería su historial
 * vacío justo después de crearse la cuenta, que es la peor primera impresión
 * posible.
 */
async function despuesDeEntrar() {
  /*
   * Lo primero, antes de tocar nada: el estado de acá queda guardado aparte.
   *
   * Lo que viene es el único paso de la app que no se puede deshacer —el
   * servidor adopta las filas sueltas y todo lo de allá se fusiona con lo de
   * acá— y es justo el momento en que el historial entero está en juego de una
   * sola vez. Si el respaldo no entra, se sigue igual: no vale bloquear el
   * login por falta de espacio.
   */
  guardarRespaldoDeHito('entrar con tu cuenta');

  const cfg = configSync();
  const llave = llaveDeEsteDispositivo();
  const s = sesionActual();
  const token = await auth().token();

  try {
    const cli = clienteSupabase({
      url: cfg.url, anonKey: cfg.anonKey, token,
      fetchFn: (...a) => fetch(...a)
    });

    const r = await cli.reclamarLlave(llave);
    if (r.comidas || r.dias) {
      toast(`Recuperé ${r.comidas} ${r.comidas === 1 ? 'comida' : 'comidas'} que ya tenías`);
    }
  } catch (e) {
    // que falle el reclamo no puede impedir entrar: se anota y se sigue
    anotarError('Reclamo de llave: ' + e.message, 'auth', 0);
  }

  // desde cero: lo que hay en el servidor es de esta cuenta, no de esta llave
  state.cfg.sync = { ...configSyncLocal(), ultimoSync: 0, ultimoError: '' };
  save();

  await correrSync({ silencioso: false });
  renderCuenta();
  renderAll();
}

/* ---------------- acciones ---------------- */

$('btnEntrar').onclick = async () => {
  const a = auth();
  if (!a) return mostrarErrorCuenta('Falta configurar Supabase.');

  const email = $('cuentaEmail_in').value.trim();
  const pass = $('cuentaPass').value;

  if (!emailValido(email)) return mostrarErrorCuenta('Ese mail no parece válido.');
  if (!pass) return mostrarErrorCuenta('Falta la contraseña.');

  ocupado(true);
  try {
    await a.entrar(email, pass);
    $('cuentaPass').value = '';
    await despuesDeEntrar();
  } catch (e) {
    mostrarErrorCuenta(e.message);
  } finally {
    ocupado(false);
  }
};

$('btnRegistrar').onclick = async () => {
  const a = auth();
  if (!a) return mostrarErrorCuenta('Falta configurar Supabase.');

  const email = $('cuentaEmail_in').value.trim();
  const pass = $('cuentaPass').value;

  if (!emailValido(email)) return mostrarErrorCuenta('Ese mail no parece válido.');
  if (pass.length < 6) return mostrarErrorCuenta('La contraseña necesita al menos 6 caracteres.');

  ocupado(true);
  try {
    const r = await a.registrar(email, pass);
    $('cuentaPass').value = '';

    if (r.confirmar) {
      $('cuentaOk').textContent = 'Te mandamos un mail para confirmar. Después entrá con esos datos.';
      $('cuentaError').textContent = '';
    } else {
      await despuesDeEntrar();
    }
  } catch (e) {
    mostrarErrorCuenta(e.message);
  } finally {
    ocupado(false);
  }
};

/*
 * Entrar con Google.
 *
 * Se va de la app y se vuelve: no hay ventana emergente ni nada que esperar.
 * Antes de irse queda anotado que se está en el medio de un login, porque al
 * volver la app arranca de cero y no tiene otra forma de saberlo.
 */
$('btnGoogle').onclick = () => {
  const a = auth();
  if (!a) return mostrarErrorCuenta('Falta configurar Supabase.');

  if (location.protocol === 'file:') {
    return mostrarErrorCuenta('Google necesita que la app esté servida por http o https. ' +
      'Abrila desde su dirección web, no desde el archivo.');
  }

  /* Se vuelve a la misma página, sin la query: si quedara el `?accion=foto` del
     acceso directo, al volver se abriría la cámara sola. */
  const volverA = location.origin + location.pathname;
  try { sessionStorage.setItem('deficit.volviendo-de-google', '1'); } catch { /* da igual */ }
  location.href = a.urlDeGoogle(volverA);
};

/**
 * Al arrancar: si volvimos de Google, la sesión viene en el fragmento de la URL.
 *
 * Lo primero que se hace con ese fragmento es borrarlo de la barra de
 * direcciones. Un token en la URL se copia, se comparte y queda en el
 * historial sin que nadie lo note.
 */
async function volverDeGoogle() {
  const hash = location.hash || '';
  let esperado = false;
  try { esperado = sessionStorage.getItem('deficit.volviendo-de-google') === '1'; } catch { /* da igual */ }
  try { sessionStorage.removeItem('deficit.volviendo-de-google'); } catch { /* da igual */ }

  if (!/access_token=|error/.test(hash)) return;

  history.replaceState(null, '', location.pathname + location.search);

  const a = auth();
  if (!a) return;

  try {
    const s = await a.entrarConHash(hash);
    if (!s) return;
    toast(`Entraste como ${s.usuario.email || 'tu cuenta de Google'}`);
    await despuesDeEntrar();
  } catch (e) {
    irTab('ajustes');
    mostrarErrorCuenta(e.message);
    if (!esperado) anotarError('Google: ' + e.message, 'auth', 0);
  }
}

$('btnOlvide').onclick = async () => {
  const a = auth();
  const email = $('cuentaEmail_in').value.trim();

  if (!a) return mostrarErrorCuenta('Falta configurar Supabase.');
  if (!emailValido(email)) return mostrarErrorCuenta('Escribí tu mail y volvé a tocar.');

  ocupado(true);
  try {
    await a.recuperar(email);
    $('cuentaOk').textContent = 'Si ese mail tiene cuenta, te va a llegar un link para cambiar la contraseña.';
    $('cuentaError').textContent = '';
  } catch (e) {
    mostrarErrorCuenta(e.message);
  } finally {
    ocupado(false);
  }
};

$('btnSalir').onclick = async () => {
  const a = auth();
  if (!a) return;

  // Los datos locales se quedan: salir no es borrar. Volver a entrar los
  // vuelve a unir con la cuenta.
  await a.salir();
  renderCuenta();
  toast('Cerraste sesión. Tus datos siguen en este dispositivo.');
};


/* ---------------- quién está entrado ---------------- */

/*
 * El nombre en el encabezado.
 *
 * Sin esto, la única forma de saber con qué cuenta estás entrado era ir a
 * Ajustes y bajar hasta la tarjeta de la cuenta. Con dos cuentas —la del mail
 * y la de Google, que pueden no ser el mismo mail— eso importa: si entraste
 * con la que no es, todo lo que cargues va a parar a otro historial y no hay
 * nada en pantalla que lo delate.
 */
function renderQuienSoy() {
  const el = $('quienSoy');
  if (!el) return;

  const s = sesionActual();
  el.hidden = !s;
  if (!s) return;

  /* `nombre` no existe en las sesiones que se guardaron antes de que se
     empezara a pedir: para esas se deriva del mail, así no hace falta volver a
     entrar para que el encabezado deje de mostrar la dirección entera. */
  /* Solo el nombre de pila: el apellido no distingue nada —hay una sola
     persona usando esto— y en un renglón de 11 px ocupa el doble de lugar. El
     nombre completo y el mail quedan en el título, al alcance del dedo. */
  const u = s.usuario || {};
  const completo = u.nombre || nombreDeUsuario({ email: u.email }) || 'tu cuenta';
  el.textContent = completo.split(/\s+/)[0];
  el.title = u.email ? `${completo} · ${u.email}` : 'Tocá para ver tu cuenta';
}

$('quienSoy').onclick = () => {
  irTab('ajustes');
  $('cardCuenta')?.scrollIntoView({ block: 'center', behavior: quieto() ? 'auto' : 'smooth' });
};

/* ---------------- el aviso de "estás sin cuenta" ---------------- */

/*
 * La barra al pie cuando no hay sesión.
 *
 * Sin cuenta, todo vive en el localStorage de UN navegador: alcanza con limpiar
 * datos del sitio, cambiar de teléfono o que el sistema decida liberar espacio
 * para que se pierdan meses. El login existía desde hace rato pero estaba en
 * Ajustes y nada llevaba ahí, así que en la práctica no existía.
 *
 * Vuelve en cada arranque a propósito. Cerrarla la esconde por esta vez y no
 * para siempre, porque el riesgo tampoco se va: mientras no haya cuenta, sigue
 * siendo cierto todos los días. Y no bloquea nada —se puede usar la app entera
 * sin cuenta, offline incluido—, que es lo que un login obligatorio rompería.
 */
let avisoCuentaCerrado = false;

/* Qué hace el botón según por qué salió la barra: entrar, o sincronizar ya. */
let accionDelAviso = 'entrar';

function renderAvisoCuenta() {
  const barra = $('barraCuenta');
  if (!barra) return;

  const cfg = configSync();
  const e = estadoDeLaCuenta({
    haySesion: !!sesionActual(),
    ultimoSync: cfg.ultimoSync || 0,
    ultimoError: cfg.ultimoError || '',
    dias: Object.keys(state.dias || {}).filter(f => (state.dias[f].comidas || []).length).length,
    comidas: Object.values(state.dias || {}).reduce((a, d) => a + (d.comidas || []).length, 0)
  });

  barra.hidden = !e.avisar || avisoCuentaCerrado;
  if (barra.hidden) return;

  accionDelAviso = e.accion;
  $('barraCuentaTxt').textContent = e.texto;
  $('barraCuentaEntrar').textContent = e.accion === 'sincronizar' ? 'Sincronizar' : 'Entrar';
}

$('barraCuentaCerrar').onclick = () => {
  avisoCuentaCerrado = true;
  renderAvisoCuenta();
};

$('barraCuentaEntrar').onclick = () => {
  /* Con cuenta, el botón hace la única cosa que hace falta acá y ahora. Mandar
     a Ajustes a buscar el botón de sincronizar sería mandar a otra pantalla
     por algo que se resuelve en un toque. */
  if (accionDelAviso === 'sincronizar') {
    avisoCuentaCerrado = true;
    renderAvisoCuenta();
    correrSync({ silencioso: false });
    return;
  }

  irTab('ajustes');
  $('cuentaEmail_in')?.focus();
  $('cardCuenta')?.scrollIntoView({ block: 'center', behavior: quieto() ? 'auto' : 'smooth' });
};
