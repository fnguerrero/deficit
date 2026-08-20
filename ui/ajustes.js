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

  let version = '—';
  try {
    // pueden quedar caches viejos: interesa el número más alto, no el primero
    const claves = (await caches.keys())
      .filter(k => /^deficit-v\d+$/.test(k))
      .sort((a, b) => Number(b.slice(9)) - Number(a.slice(9)));
    version = claves[0] || '—';
  } catch { /* sin Cache API */ }

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
  renderTope();
  renderRespaldo();
  renderSync();
  renderDiagnostico();
  renderCalibracion();
  renderRevision();
  renderAtajos();
  renderRecordatorios();
  renderTema();
  renderPrecision();
  renderHistorialAnalisis();
  $('apiKey').value = state.cfg.apiKey || '';
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
  oscuro: { nombre: 'Oscuro', detalle: 'Siempre oscuro, aunque el sistema esté en claro.' }
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

/* ---------------- recordatorios ---------------- */

let timersRecordatorios = [];

function limpiarRecordatorios() {
  timersRecordatorios.forEach(t => clearTimeout(t));
  timersRecordatorios = [];
}

/**
 * Programa los avisos que faltan hoy. Solo corren con la app abierta o en
 * segundo plano: sin servidor no hay push, y prometerlo sería mentir.
 */
function programarRecordatorios() {
  limpiarRecordatorios();

  if (!state.cfg.recordatorios) return;
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;

  const cargados = [...new Set(dia(hoyISO()).comidas.map(c => c.momento))];
  const pendientes = proximosRecordatorios(state.cfg.horarios, new Date(), cargados);

  for (const r of pendientes) {
    timersRecordatorios.push(setTimeout(() => {
      // se vuelve a mirar al disparar: para entonces quizás ya lo cargó
      const yaCargado = dia(hoyISO()).comidas.some(c => c.momento === r.momento);
      if (yaCargado) return;

      const margen = margenDelDia();
      new Notification('Déficit', {
        body: textoRecordatorio(r.momento, margen ? margen.kcal : null),
        icon: 'icons/icon-192.png',
        tag: 'deficit-' + r.momento
      });

      programarRecordatorios();   // reencola lo que siga
    }, r.enMs));
  }
}

function renderRecordatorios() {
  const activos = !!state.cfg.recordatorios;
  $('chkRecordatorios').checked = activos;
  $('horariosRecordatorios').hidden = !activos;

  const soportado = typeof Notification !== 'undefined';
  const permiso = soportado ? Notification.permission : 'no-soportado';

  $('recordatoriosPill').textContent = activos ? `${state.cfg.horarios.length} avisos` : '';

  if (!soportado) {
    $('recordatoriosInfo').textContent = 'Este navegador no permite notificaciones.';
  } else if (permiso === 'denied') {
    $('recordatoriosInfo').textContent = 'Bloqueaste las notificaciones para este sitio: habilitalas desde el candado de la barra de direcciones.';
  } else if (activos) {
    $('recordatoriosInfo').textContent = 'Los avisos llegan con la app abierta o recién usada. No se avisa de las comidas que ya cargaste.';
  } else {
    $('recordatoriosInfo').textContent = 'Te avisa a la hora de cada comida si todavía no la cargaste.';
  }

  const cont = $('horariosRecordatorios');
  cont.innerHTML = '';
  if (!activos) return;

  for (const r of state.cfg.horarios) {
    const fila = document.createElement('div');
    fila.className = 'fila';

    const nombre = document.createElement('span');
    nombre.textContent = nombreMomento(r.momento);

    const hora = document.createElement('input');
    hora.type = 'time';
    hora.value = r.hora;
    hora.setAttribute('aria-label', 'Hora del aviso de ' + nombreMomento(r.momento));
    hora.onchange = () => {
      if (!minutosDeHora(hora.value)) { hora.value = r.hora; return; }
      r.hora = hora.value;
      save(); programarRecordatorios(); renderRecordatorios();
    };

    fila.append(nombre, hora);
    cont.appendChild(fila);
  }
}

/* El permiso se pide acá y en ningún otro lado: recién cuando lo activa. */
$('chkRecordatorios').onchange = async () => {
  const quiere = $('chkRecordatorios').checked;

  if (!quiere) {
    state.cfg.recordatorios = false;
    save(); limpiarRecordatorios(); renderRecordatorios();
    return;
  }

  if (typeof Notification === 'undefined') {
    $('chkRecordatorios').checked = false;
    toast('Este navegador no permite notificaciones');
    return;
  }

  let permiso = Notification.permission;
  if (permiso === 'default') permiso = await Notification.requestPermission();

  if (permiso !== 'granted') {
    $('chkRecordatorios').checked = false;
    renderRecordatorios();
    toast('Sin permiso no puedo avisarte');
    return;
  }

  state.cfg.recordatorios = true;
  save(); programarRecordatorios(); renderRecordatorios();
  toast('Listo, te voy a avisar');
};

/* ---------------- ajustes ---------------- */

$('btnGuardarKey').onclick = () => {
  state.cfg.apiKey = $('apiKey').value.trim();
  state.cfg.modelo = $('modelo').value;
  save();
  renderSinKey();
  toast('Guardado');
};

$('btnExport').onclick = () => {
  descargar(`deficit-${hoyISO()}.json`, JSON.stringify(state, null, 2), 'application/json');
  state.cfg.ultimoRespaldo = Date.now();
  save(); renderRespaldo();
  toast('Copia descargada');
};

/** Descarga un texto como archivo. */
function descargar(nombre, texto, tipo) {
  const blob = new Blob([texto], { type: tipo });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = nombre;
  a.click();
  URL.revokeObjectURL(a.href);
}

$('btnExportCsv').onclick = () => {
  const csv = armarCSV(state.dias);
  const filas = csv.split('\r\n').length - 1;
  if (!filas) { toast('No hay comidas para exportar'); return; }
  // BOM para que Excel reconozca los acentos
  descargar(`deficit-${hoyISO()}.csv`, '\ufeff' + csv, 'text/csv;charset=utf-8');
  toast(`${fmtNum(filas)} filas exportadas`);
};

$('btnInforme').onclick = () => {
  const mes = fecha.slice(0, 7);
  const html = armarInforme(state, mes);

  if (!html) { toast('No hay comidas cargadas en ese mes'); return; }

  // se abre en otra pestaña para imprimir o guardar como PDF
  const ventana = window.open('', '_blank');
  if (!ventana) {
    // si el navegador bloquea la ventana, se descarga el archivo
    descargar(`deficit-${mes}.html`, html, 'text/html;charset=utf-8');
    toast('Informe descargado');
    return;
  }

  ventana.document.write(html);
  ventana.document.close();
  toast('Informe listo para imprimir');
};

$('btnLiberar').onclick = () => {
  const antes = pesoDeThumbs(state.dias);
  if (!antes.cantidad) return;
  for (const d of Object.values(state.dias)) {
    for (const c of d.comidas || []) delete c.thumb;
  }
  save(); renderAjustes();
  toast(`Liberé ${fmtNum(antes.kb)} KB`);
};

$('btnRestaurar').onclick = restaurarBackup;

$('btnImport').onclick = () => $('importInput').click();
$('importInput').onchange = async (e) => {
  const f = e.target.files?.[0];
  if (!f) return;

  try {
    const s = JSON.parse(await f.text());
    if (!s.dias) throw new Error('sin días');

    const tieneDatos = Object.keys(state.dias).length > 0;

    // con datos propios, reemplazar sin avisar sería borrar el historial
    if (tieneDatos) {
      const fusionar = confirm(
        [
          'Ya tenés datos cargados.',
          '',
          'Aceptar: junta el archivo con lo que ya tenés, sin duplicar.',
          'Cancelar: reemplaza todo por el archivo.'
        ].join(String.fromCharCode(10))
      );

      if (fusionar) {
        const { estado, resumen } = fusionarEstados(state, s);
        state = estado;
        save(); renderAll();
        toast(`${fmtNum(resumen.comidasNuevas)} comidas nuevas, ${fmtNum(resumen.comidasRepetidas)} ya estaban`);
        e.target.value = '';
        return;
      }
    }

    state = migrar(s);
    save(); renderAll();
    toast('Datos importados');
  } catch {
    toast('Archivo inválido');
  }
  e.target.value = '';
};

$('btnReset').onclick = () => {
  if (!confirm('¿Borrar todos los datos? Esto no se puede deshacer.')) return;
  const cfg = state.cfg;
  state = migrar(null);
  state.cfg = cfg;
  save(); renderAll();
  toast('Datos borrados');
};
