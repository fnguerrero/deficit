/* ============================================================
   Pantalla Ajustes: API, tema, recordatorios, diagnóstico,
   revisión de datos, exportación y respaldo.
   ============================================================ */

/* ---------------- render: AJUSTES ---------------- */

function renderHistorialAnalisis() {
  const lista = state.historialAnalisis || [];
  const ul = $('listaAnalisis');
  ul.innerHTML = '';
  $('analisisVacio').hidden = lista.length > 0;

  const NOMBRES = { foto: '📷', etiqueta: '🏷️', correccion: '✎', sugerencia: '💡' };

  for (const a of lista) {
    const li = document.createElement('li');

    const info = document.createElement('div');
    info.className = 'info';
    const b = document.createElement('b');
    b.textContent = `${NOMBRES[a.tipo] || '•'} ${a.titulo || a.tipo}`;
    const sm = document.createElement('small');
    const cuando = new Date(a.ts).toLocaleString('es-AR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
    sm.textContent = `${cuando} · ${a.modelo || '—'} · ${fmtNum(a.tokens)} tokens`;
    info.append(b, sm);

    const costo = document.createElement('span');
    if (a.deCache) {
      costo.className = 'cache';
      costo.textContent = 'del cache';
    } else {
      costo.textContent = formatearCosto(a.costo) || '—';
    }

    li.append(info, costo);
    ul.appendChild(li);
  }
}

function renderPrecision() {
  const actual = state.cfg.precision || 'normal';
  const cont = $('selPrecision');
  cont.innerHTML = '';

  for (const [id, p] of Object.entries(PRECISIONES)) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = p.nombre;
    b.className = actual === id ? 'sel' : '';
    b.setAttribute('aria-pressed', String(actual === id));
    b.onclick = () => {
      state.cfg.precision = id;
      save(); renderPrecision();
    };
    cont.appendChild(b);
  }

  $('precisionDetalle').textContent = (PRECISIONES[actual] || PRECISIONES.normal).detalle;
}

async function renderDiagnostico() {
  let sw = 'no soportado';
  if ('serviceWorker' in navigator) {
    const reg = await navigator.serviceWorker.getRegistration();
    if (!reg) sw = 'sin registrar';
    else if (reg.waiting) sw = 'hay una versión nueva esperando';
    else if (reg.active) sw = 'activo (' + reg.active.state + ')';
  }

  // Se la preguntamos al worker que está sirviendo, no a los caches: si hay una
  // versión esperando, su cache ya existe y mentiría diciendo que ya actualizaste.
  let version = await versionDelWorker();
  if (!version) {
    try {
      const claves = (await caches.keys())
        .filter(k => /^deficit-v\d+$/.test(k))
        .sort((a, b) => Number(b.slice(9)) - Number(a.slice(9)));
      version = claves[0] || '—';
    } catch { version = '—'; }
  }

  const diag = armarDiagnostico({
    version,
    sw,
    cuota: usoAlmacenamiento(localStorage.getItem(KEY) || ''),
    state,
    online: navigator.onLine,
    pantalla: `${window.innerWidth}×${window.innerHeight}`,
    agente: navigator.userAgent
  });

  const ul = $('listaDiagnostico');
  ul.innerHTML = '';
  for (const [k, v] of Object.entries(diag)) {
    const li = document.createElement('li');
    const s = document.createElement('span'); s.textContent = k;
    const b = document.createElement('b'); b.textContent = String(v);
    li.append(s, b);
    ul.appendChild(li);
  }

  const errores = state.errores || [];
  $('diagPill').textContent = errores.length
    ? `${fmtNum(errores.length)} ${errores.length === 1 ? 'error' : 'errores'}`
    : 'todo en orden';
  $('bloqueErrores').hidden = !errores.length;
  $('btnLimpiarErrores').hidden = !errores.length;

  const ulErr = $('listaErrores');
  ulErr.innerHTML = '';
  for (const e of errores) {
    const li = document.createElement('li');
    const info = document.createElement('div');
    info.className = 'info';
    const b = document.createElement('b'); b.textContent = e.mensaje;
    const sm = document.createElement('small');
    sm.textContent = new Date(e.ts).toLocaleString('es-AR') + (e.origen ? ` · ${e.origen}:${e.linea}` : '');
    info.append(b, sm);
    li.append(info);
    ulErr.appendChild(li);
  }

  ultimoDiagnostico = diag;
}

let ultimoDiagnostico = null;

$('btnCopiarDiag').onclick = async () => {
  if (!ultimoDiagnostico) await renderDiagnostico();
  const texto = diagnosticoATexto(ultimoDiagnostico, state.errores || []);

  try {
    await navigator.clipboard.writeText(texto);
    toast('Copiado');
  } catch {
    // sin permiso de portapapeles, al menos que lo pueda leer y copiar a mano
    descargar('deficit-diagnostico.txt', texto, 'text/plain;charset=utf-8');
    toast('Descargado como archivo');
  }
};

$('btnLimpiarErrores').onclick = () => {
  state.errores = [];
  save(); renderDiagnostico();
  toast('Errores borrados');
};

function renderRevision() {
  const problemas = revisarDatos(state.dias);
  $('cardRevision').hidden = !problemas.length;
  if (!problemas.length) return;

  $('revisionPill').textContent = `${fmtNum(problemas.length)} ${problemas.length === 1 ? 'aviso' : 'avisos'}`;

  const arreglables = problemas.filter(p => p.arreglable);
  $('btnArreglar').hidden = !arreglables.length;
  $('btnArreglar').textContent = `Recalcular ${fmtNum(arreglables.length)} ${arreglables.length === 1 ? 'comida' : 'comidas'}`;

  const ul = $('listaProblemas');
  ul.innerHTML = '';

  for (const p of problemas.slice(0, 20)) {
    const li = document.createElement('li');
    li.className = p.id ? 'clicable' : '';

    const info = document.createElement('div');
    info.className = 'info';
    const b = document.createElement('b');
    b.textContent = `${etiquetaFecha(p.fecha)}${p.titulo ? ' · ' + p.titulo : ''}`;
    const sm = document.createElement('small');
    sm.textContent = p.detalle;
    info.append(b, sm);

    if (p.id) {
      li.tabIndex = 0;
      const abrir = () => { fecha = p.fecha; irTab('hoy'); };
      li.onclick = abrir;
      li.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); abrir(); } };
    }

    li.append(info);
    ul.appendChild(li);
  }
}

$('btnArreglar').onclick = () => {
  const problemas = revisarDatos(state.dias);
  const { dias, arreglados } = arreglarDatos(state.dias, problemas);

  if (!arreglados) { toast('No hay nada que recalcular'); return; }

  state.dias = dias;
  save(); renderAll();
  toast(`${fmtNum(arreglados)} ${arreglados === 1 ? 'comida recalculada' : 'comidas recalculadas'}`);
};

function renderAtajos() {
  // en pantallas táctiles sin teclado no aportan nada
  const conTeclado = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  $('cardAtajos').hidden = !conTeclado;
  if (!conTeclado) return;

  const NOMBRES = { ArrowLeft: '←', ArrowRight: '→' };
  const ul = $('listaAtajos');
  ul.innerHTML = '';

  for (const [tecla, a] of Object.entries(ATAJOS)) {
    const li = document.createElement('li');
    const s = document.createElement('span'); s.textContent = a.desc;
    const b = document.createElement('b'); b.className = 'tecla'; b.textContent = NOMBRES[tecla] || tecla.toUpperCase();
    li.append(s, b);
    ul.appendChild(li);
  }

  const li = document.createElement('li');
  const s = document.createElement('span'); s.textContent = 'Cerrar lo que esté abierto';
  const b = document.createElement('b'); b.className = 'tecla'; b.textContent = 'Esc';
  li.append(s, b);
  ul.appendChild(li);
}

/**
 * Estado del respaldo y del almacenamiento.
 * Un archivo afuera es lo único que sobrevive a que el navegador limpie el sitio.
 */
async function renderRespaldo() {
  const r = estadoRespaldo({
    ultimoRespaldo: state.cfg.ultimoRespaldo,
    dias: state.dias,
    persistente: !!state.cfg.persistente
  });

  $('avisoRespaldo').hidden = !r.avisar;
  if (r.avisar) $('avisoRespaldo').textContent = r.texto;
  $('respaldoInfo').textContent = r.avisar ? '' : r.texto;

  // almacenamiento persistente: se pide una sola vez y solo si hay datos
  if (navigator.storage?.persisted) {
    const yaEs = await navigator.storage.persisted();

    if (yaEs) {
      $('persistenciaInfo').textContent = 'El navegador se comprometió a no borrar estos datos.';
      if (!state.cfg.persistente) { state.cfg.persistente = true; save(); }
    } else {
      $('persistenciaInfo').textContent = 'El navegador puede borrar estos datos si le falta espacio.';
    }
  } else {
    $('persistenciaInfo').textContent = '';
  }
}

/** Se pide recién cuando hay algo que valga la pena proteger. */
async function pedirPersistencia() {
  if (!navigator.storage?.persist) return false;
  if (await navigator.storage.persisted()) return true;
  if (Object.keys(state.dias).length < 3) return false;

  const dado = await navigator.storage.persist();
  state.cfg.persistente = dado;
  save();
  return dado;
}

function renderTope() {
  const tope = state.cfg.topeGasto;
  const e = estadoGasto(state.historialAnalisis, { tope });

  $('inputTope').value = tope || '';

  const barra = $('barraGasto');
  barra.style.width = e.tope ? Math.min(e.pct, 100) + '%' : '0%';
  barra.className = e.bloqueado ? 'bloqueado' : (e.avisar ? 'alerta' : '');

  $('gastoInfo').textContent = e.tope
    ? `Este mes: US$ ${fmtNum(e.gastado, 4)} de ${fmtNum(e.tope)} · quedan US$ ${fmtNum(Math.max(0, e.restante), 4)}`
    : `Este mes: US$ ${fmtNum(e.gastado, 4)} · sin tope`;

  const texto = textoTope(e);
  $('avisoTope').hidden = !texto;
  if (texto) $('avisoTope').textContent = texto;
}

$('btnGuardarTope').onclick = () => {
  const v = parseFloat($('inputTope').value);

  if ($('inputTope').value.trim() === '' || v === 0) {
    state.cfg.topeGasto = 0;
    save(); renderTope();
    toast('Sin tope: nada va a frenar el gasto');
    return;
  }

  if (isNaN(v) || v < 0 || v > 500) { toast('Poné un número entre 0 y 500'); return; }

  state.cfg.topeGasto = v;
  save(); renderTope();
  toast(`Tope en US$ ${fmtNum(v)} por mes`);
};

function renderAjustes() {
  renderActividadesEditar();
  renderTope();
  renderRespaldo();
  renderSync();
  renderDiagnostico();
  renderCalibracion();
  renderRevision();
  renderAtajos();
  renderRecordatorios();
  renderAvisoDormir();
  renderTema();
  renderPrecision();
  renderHistorialAnalisis();
  $('apiKey').value = state.cfg.apiKey || '';
  renderEstadoAcceso();
  $('modelo').value = state.cfg.modelo || 'claude-opus-5';
  const nDias = Object.keys(state.dias).length;
  const nCom = Object.values(state.dias).reduce((a, d) => a + (d.comidas?.length || 0), 0);
  const kb = Math.round((localStorage.getItem(KEY) || '').length / 1024);
  $('statsInfo').textContent = `${fmtNum(nDias)} días · ${fmtNum(nCom)} comidas · ${fmtNum(kb)} KB usados`;

  // aviso de cuota antes de que un guardado falle
  const uso = usoAlmacenamiento(localStorage.getItem(KEY) || '');
  const barra = $('barraCuota');
  barra.style.width = Math.min(uso.pct, 100) + '%';
  barra.className = uso.critico ? 'critico' : (uso.alerta ? 'alerta' : '');

  const thumbs = pesoDeThumbs(state.dias);
  $('avisoCuota').hidden = !uso.alerta;
  $('btnLiberar').hidden = !uso.alerta || !thumbs.cantidad;
  if (uso.alerta) {
    $('avisoCuota').textContent = uso.critico
      ? `Estás al ${uso.pct}% del espacio disponible. Liberá lugar o exportá y borrá días viejos.`
      : `Vas por el ${uso.pct}% del espacio. Las ${fmtNum(thumbs.cantidad)} fotos guardadas ocupan ${fmtNum(thumbs.kb)} KB.`;
  }

  const backup = hayBackup();
  $('btnRestaurar').hidden = !backup;
  $('backupInfo').textContent = backup
    ? `Copia de respaldo: ${fmtNum(backup.dias)} días, ${fmtNum(backup.kb)} KB.`
    : 'Todavía no hay copia de respaldo.';

  const u = state.uso;
  $('usoInfo').textContent = u.llamadas
    ? `${fmtNum(u.llamadas)} ${u.llamadas === 1 ? 'análisis' : 'análisis'} · ${fmtNum(u.tokens)} tokens · US$ ${fmtNum(u.costo, 4)} en total`
    : 'Todavía no analizaste ninguna foto.';
}

function renderAll() {
  renderHoy(); renderHistorial(); renderPerfil(); renderAjustes();
}

/* ---------------- tema ---------------- */

const TEMAS = {
  auto: { nombre: 'Automático', detalle: 'Sigue el tema de tu teléfono o de Windows.' },
  claro: { nombre: 'Claro', detalle: 'Siempre claro, aunque el sistema esté en oscuro.' },
  oscuro: { nombre: 'Oscuro', detalle: 'Siempre oscuro, aunque el sistema esté en claro.' },
  /* En pantallas OLED el negro puro no enciende el pixel: ahorra bateria de verdad. */
  oled: { nombre: 'Negro', detalle: 'Negro puro. En pantallas OLED gasta menos batería.' },
  /* Menos azul para la noche, que es cuando se carga la cena. */
  calido: { nombre: 'Cálido', detalle: 'Tonos cálidos, con menos azul. Cansa menos de noche.' },
  oceano: { nombre: 'Océano', detalle: 'Azules profundos, con acento turquesa.' },
  bosque: { nombre: 'Bosque', detalle: 'Verdes apagados, tranquilo para la vista.' },
  vino: { nombre: 'Vino', detalle: 'Oscuro con acento bordó.' },
  papel: { nombre: 'Papel', detalle: 'Claro y cálido, como una libreta.' }
};

/** En automático no se fuerza nada: manda el prefers-color-scheme del CSS. */
function aplicarTema() {
  const tema = state.cfg.tema || 'auto';
  if (tema === 'auto') document.documentElement.removeAttribute('data-tema');
  else document.documentElement.setAttribute('data-tema', tema);

  // la barra del navegador acompaña al fondo real
  const fondo = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim();
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta && fondo) meta.setAttribute('content', fondo);
}

function renderTema() {
  const actual = state.cfg.tema || 'auto';
  const cont = $('selTema');
  cont.innerHTML = '';

  for (const [id, t] of Object.entries(TEMAS)) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = t.nombre;
    b.className = actual === id ? 'sel' : '';
    b.setAttribute('aria-pressed', String(actual === id));
    b.onclick = () => {
      state.cfg.tema = id;
      save(); aplicarTema(); renderTema();
    };
    cont.appendChild(b);
  }

  $('temaDetalle').textContent = (TEMAS[actual] || TEMAS.auto).detalle;
}
