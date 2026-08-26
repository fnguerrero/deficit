/* ============================================================
   ui/recordatorios.js — los avisos: comidas y hora de dormir.

   Salió de ui/ajustes.js al pasarse de tamaño por segunda vez. Los avisos son
   un tema propio y bastante autocontenido, así que era el corte natural.
   ============================================================ */

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

  /* El de dormir va aparte: no depende de si cargaste una comida sino de si ya
     registraste el sueño. Se programa para su hora si todavía no pasó. */
  const horaDormir = state.cfg.horaDormir || RECORDATORIO_DORMIR.hora;
  if (state.cfg.avisarDormir) {
    const [hd, md] = horaDormir.split(':').map(Number);
    const objetivo = new Date();
    objetivo.setHours(hd, md, 0, 0);
    const faltan = objetivo - new Date();

    if (faltan > 0) {
      timersRecordatorios.push(setTimeout(() => {
        if (dia(hoyISO()).sueno?.horas) return;   // ya lo cargó: no molesta
        /* El aviso usa el mismo repertorio que la app y no un texto fijo: si
           adentro te reclama con voz propia y afuera manda un comunicado, son
           dos cosas distintas y ninguna de las dos convence. */
        new Notification('Déficit', {
          body: decir('sueno') || 'Hora de ir cerrando el día.',
          icon: 'icons/icon-192.png',
          tag: 'deficit-dormir'
        });
      }, faltan));
    }
  }

  for (const r of pendientes) {
    timersRecordatorios.push(setTimeout(() => {
      // se vuelve a mirar al disparar: para entonces quizás ya lo cargó
      const yaCargado = dia(hoyISO()).comidas.some(c => c.momento === r.momento);
      if (yaCargado) return;

      const margen = margenDelDia();
      new Notification('Déficit', {
        body: decir('comida') || textoRecordatorio(r.momento, margen ? margen.kcal : null),
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

/**
 * Explica por dónde sale el análisis. Sin esto, ver la app funcionando con el
 * campo de clave vacío parece un error, cuando en realidad es lo esperado.
 */
function renderEstadoAcceso() {
  const el = $('estadoAcceso');
  if (!el) return;

  const a = accesoApi(state.cfg);

  // Sin proxy la clave es imprescindible, así que el plegable arranca abierto.
  const det = $('avanzadoKey');
  if (det) det.open = !a.proxyUrl && !a.apiKey;

  if (a.proxyUrl) {
    el.textContent = 'Los análisis ya salen por el proxy, que tiene la clave del lado servidor. No tenés que cargar nada.';
  } else if (a.apiKey) {
    el.textContent = 'Los análisis salen con esta clave, directo desde este navegador.';
  } else {
    el.textContent = 'Sin clave no se puede analizar por foto. El registro manual y el código de barras andan igual.';
  }
}

/** Le pregunta al service worker activo qué versión está sirviendo. */
function versionDelWorker(msTope = 1500) {
  return new Promise((resolver) => {
    const activo = navigator.serviceWorker?.controller;
    if (!activo) return resolver('');

    const canal = new MessageChannel();
    const reloj = setTimeout(() => resolver(''), msTope);   // que no cuelgue el diagnóstico

    canal.port1.onmessage = (e) => { clearTimeout(reloj); resolver(String(e.data || '')); };
    try { activo.postMessage('version', [canal.port2]); } catch { clearTimeout(reloj); resolver(''); }
  });
}

/* ---------------- el aviso de dormir ---------------- */

function renderAvisoDormir() {
  const fila = $('filaDormir');
  if (!fila) return;

  // solo tiene sentido si los recordatorios están activos: sin permiso de
  // notificaciones no hay forma de avisar nada
  fila.hidden = !state.cfg.recordatorios;

  $('chkDormir').checked = !!state.cfg.avisarDormir;
  $('horaDormir').value = state.cfg.horaDormir || RECORDATORIO_DORMIR.hora;
}

$('chkDormir').onchange = (e) => {
  state.cfg.avisarDormir = e.target.checked;
  save();
  programarRecordatorios();
};

$('horaDormir').onchange = (e) => {
  state.cfg.horaDormir = e.target.value || RECORDATORIO_DORMIR.hora;
  save();
  programarRecordatorios();
};
