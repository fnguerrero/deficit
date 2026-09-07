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

/* ---------------- el aviso fijo de objetivos ---------------- */

/*
 * Una sola notificacion, siempre la misma, con el estado del dia.
 *
 * Va por el service worker y no por `new Notification()`: una notificacion
 * creada por la pagina se cierra cuando se cierra la pestaña, que es
 * exactamente lo contrario de lo que se pide acá. Por el worker queda en el
 * centro de notificaciones hasta que alguien la descarta.
 *
 * Lo que NO hace, y conviene tenerlo escrito: no se actualiza sola. Sin push
 * server no hay forma de que el telefono la refresque con la app cerrada, asi
 * que muestra el estado de la ultima vez que la app corrio. Por eso dice la
 * hora: un cartel viejo que se hace pasar por actual es peor que no tenerlo.
 */
const TAG_OBJETIVOS = 'deficit-objetivos';

/*
 * Los casilleros del dia con su estado, para escribirlos en el aviso.
 *
 * Las rachas saben si estan cumplidas y los objetivos saben con que numero: la
 * racha de agua dice "no" y el objetivo dice "0/4", y en la barra de
 * notificaciones lo que sirve es el numero. El id de la racha del ejercicio es
 * `entrenamiento` y el del casillero `ejercicio`: son la misma cosa con dos
 * nombres, de cuando eran dos listas distintas.
 */
function rachasDelDia() {
  const valores = {};
  const niveles = {};
  /* Y en el MISMO orden que la grilla de la app.

     Las rachas vienen en el orden de RACHAS —comidas, agua, ejercicio, sueño,
     pasos— y los casilleros de la app estan en otro: pasos, ejercicio, agua,
     sueño, con las comidas abajo y aparte. Ver la misma fila en dos ordenes
     obliga a leerla de nuevo cada vez en vez de reconocerla de un vistazo.

     El orden se toma de objetivosDelDia() y no se copia a mano: si mañana
     cambia la grilla, el aviso la sigue solo. Lo que la grilla no tiene —las
     comidas, que en la app van abajo— queda al final, que es donde estan. */
  const orden = [];
  if (typeof objetivosDelDia === 'function') {
    for (const o of objetivosDelDia()) {
      const id = o.id === 'ejercicio' ? 'entrenamiento' : o.id;
      valores[id] = o.valor;
      niveles[id] = o.nivel;
      orden.push(id);
    }
  }
  const puesto = (id) => {
    const i = orden.indexOf(id);
    return i === -1 ? orden.length : i;
  };

  /* Las comidas ya no tienen casillero en la grilla —se ven abajo, en la fila de
     momentos— asi que su numero no sale de ahi: se cuenta aca. */
  const hoy = dia(hoyISO());
  const comidas = (hoy.comidas || []).length;

  /* Las rachas usan sus propios nombres —`registro` por las comidas,
     `entrenamiento` por el ejercicio— y el optimo se pregunta con los de la
     grilla. La traduccion vive aca y no en esOptimo(): el que tiene dos juegos
     de nombres es el aviso, no la regla. */
  const idDeObjetivo = { registro: 'comidas', entrenamiento: 'ejercicio' };

  return todasLasRachas(state.dias, { ...metasDelJuego(), juego: state.juego })
    .map(r => ({
      ...r,
      /* `listo` es como lo llaman los casilleros y `hoyCumplido` como lo llaman
         las rachas: se deja el de los casilleros porque es el que usa el dibujo. */
      listo: r.hoyCumplido,
      /* Y el nivel, que es lo que decide el color: dos vasos de cuatro no estan
         cumplidos, pero tampoco son lo mismo que cero. En la app eso se ve en
         ambar y en el dibujo salia gris. */
      nivel: niveles[r.id === 'entrenamiento' ? 'entrenamiento' : r.id] || '',
      valor: r.id === 'registro' ? (comidas ? String(comidas) : '') : (valores[r.id] || ''),
      /* La estrella del aviso. Las comidas tambien la tienen aunque no esten en
         la grilla: en la barra de notificaciones si son un casillero mas. */
      optimo: typeof esOptimo === 'function' && esOptimo(idDeObjetivo[r.id] || r.id, hoy),
      /* Pero no cuentan para el dorado del dia: la app lo decide con los cuatro
         casilleros que se ven en la grilla, y las comidas no estan ahi. */
      opcional: r.id === 'registro'
    }))
    .sort((a, b) => puesto(a.id) - puesto(b.id));
}

/** Que falta hoy, en el orden de la grilla. */
function faltanteDelDia() {
  const rachas = todasLasRachas(state.dias, {
    ...metasDelJuego(), juego: state.juego
  });
  return {
    total: rachas.length,
    hechas: rachas.filter(r => r.hoyCumplido),
    faltan: rachas.filter(r => !r.hoyCumplido)
  };
}

function textoObjetivos() {
  const { faltan } = faltanteDelDia();
  const hora = new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false });

  /*
   * Todo en el titulo y el cuerpo VACIO: abajo va la fila dibujada, que dice
   * lo mismo mejor.
   *
   * En el titulo va lo que QUEDA y no el progreso del tablero.
   *
   * Decia "3 de 5", que es exactamente lo que la grilla de abajo ya dibuja —y
   * mejor, porque ahi ademas se ve cual falta. Sin desplegar, en cambio, la
   * imagen no se ve: esa linea es todo lo que hay, y gastarla en repetir el
   * dibujo la desperdicia. Las calorias que quedan son el unico numero con el
   * que se decide que comer, y no estan en ningun otro lado del aviso.
   *
   * La hora se queda porque es lo unico que la imagen no puede decir y hace
   * falta: este aviso lo escribe la app cuando se la abre, asi que muestra el
   * estado de la ultima vez que corrio, y un cartel viejo que se hace pasar
   * por actual es peor que no tenerlo.
   */
  const calc = typeof calcular === 'function' ? calcular() : null;
  const t = typeof totalesDia === 'function' ? totalesDia() : null;
  const d = typeof dia === 'function' ? dia() : null;
  const objetivo = (calc && typeof objetivoEfectivo === 'function')
    ? objetivoEfectivo(calc.objetivo, d?.ejercicio) : 0;

  /* Pasarse tambien se dice, y por cuanto: con el objetivo cumplido "quedan 0"
     y "te pasaste por 600" son la misma linea, y son cosas distintas. */
  const sobra = objetivo ? Math.round(objetivo - (t?.kcal || 0)) : 0;
  const margen = !objetivo ? 'Déficit'
    : (sobra >= 0 ? `Quedan ${fmtNum(sobra)} kcal` : `${fmtNum(-sobra)} kcal de más`);

  return { titulo: `${margen} · ${hora}`, cuerpo: '', faltan: faltan.length };
}

/* Lo ultimo que se mostro, para no repintar el mismo cartel en cada render.
   Sin esto la notificacion se reescribe decenas de veces por minuto. */
let ultimoAvisoObjetivos = '';

/**
 * Repinta el aviso fijo y el numerito del icono.
 *
 * Se llama desde renderObjetivos(), o sea al abrir la app y cada vez que se
 * toca un objetivo, que es lo mas cerca de "siempre actualizada" que se puede
 * estar sin servidor.
 */
async function actualizarObjetivosFijos() {
  const { faltan } = textoObjetivos();

  /* El numerito del icono va aparte del aviso: no necesita permiso de
     notificaciones y en el escritorio instalado es lo que mas se mira. */
  if (navigator.setAppBadge) {
    try {
      if (faltan) await navigator.setAppBadge(faltan);
      else await navigator.clearAppBadge();
    } catch { /* algunos navegadores lo declaran y lo rechazan */ }
  }

  if (!state.cfg.avisoObjetivos) return;
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;

  const reg = await navigator.serviceWorker?.getRegistration();
  if (!reg?.showNotification) return;

  /* Y el aviso vuelve a ser irrompible: el service worker pudo reiniciarse —o
     quedar apagado de la ultima vez que se saco a mano— y esta es la unica
     señal de que el interruptor esta prendido otra vez. */
  (reg.active || navigator.serviceWorker?.controller)?.postMessage('prender-aviso-fijo');

  const { titulo, cuerpo } = textoObjetivos();

  /*
   * La firma incluye la FILA, no solo el texto.
   *
   * El titulo dice las calorias que quedan y el cuerpo esta vacio: tomar un
   * vaso de agua no mueve ninguno de los dos, asi que la firma daba igual y el
   * aviso no se repintaba. El agua llegaba a su meta en la app y la
   * notificacion seguia mostrando el dibujo viejo, sin la estrella. Lo mismo
   * con los pasos, el sueño y cualquier casillero que no sean calorias.
   */
  const fila = rachasDelDia();
  const firma = titulo + '|' + cuerpo + '|' +
    (typeof firmaDeTira === 'function' ? firmaDeTira(fila, TIRA_ANCHO, TIRA_ALTO) : '');
  if (firma === ultimoAvisoObjetivos) return;
  ultimoAvisoObjetivos = firma;

  /* La fila dibujada, que es lo unico "propio" que se puede meter en una
     notificacion: Android la muestra al desplegarla. Si el navegador no la
     acepta, el aviso sigue igual con su texto. */
  const tira = typeof tiraDelDiaPNG === 'function' ? tiraDelDiaPNG(fila) : null;

  try {
    await reg.showNotification(titulo, {
      body: cuerpo,
      icon: 'icons/icon-192.png',
      /* El badge es la silueta de la barra de estado: Android le tira el color
         y deja la forma, asi que tiene que ser blanco sobre transparente. Con
         el icono a color quedaba una mancha gris donde no se distinguia nada;
         este es la flecha sola, que a 24 px se lee. */
      badge: 'icons/badge-96.png',
      ...(tira ? { image: tira } : {}),
      /* El tag es lo que la hace UNA: cada aviso nuevo reemplaza al anterior en
         vez de apilar veinte carteles iguales a lo largo del dia. */
      tag: TAG_OBJETIVOS,
      /*
       * Sin botones: es un tablero, no un panel de control.
       *
       * Estuvieron los dos —"+1 vaso" y "Cargar comida"— y los dos terminaban
       * abriendo la app, porque el estado vive en localStorage y el service
       * worker no lo ve. Un boton que promete una interaccion que no es tal
       * vale menos que el lugar que ocupa, y ocupaban bastante: sin ellos, la
       * fila dibujada respira.
       */
      /* Y renotify apagado es lo que la hace soportable: reemplaza en silencio,
         sin vibrar ni sonar cada vez que se toca un vaso de agua. */
      renotify: false,
      silent: true,
      /* Que no se vaya sola a los pocos segundos. Android lo ignora, y no hay
         nada que hacer al respecto: "ongoing" es de las apps nativas. */
      requireInteraction: true
    });
  } catch { /* si el navegador la rechaza, no pasa nada mas */ }
}

/*
 * Volver a pintarlo aunque diga lo mismo.
 *
 * Al tocar un boton del aviso, Android lo cierra por su cuenta: si ademas lo
 * que se hizo no cambia el texto —abrir la camara, por ejemplo— el guard de
 * `ultimoAvisoObjetivos` impedia repintarlo y el aviso fijo desaparecia hasta
 * el proximo cambio del dia.
 */
async function refrescarAvisoFijo() {
  ultimoAvisoObjetivos = '';
  await actualizarObjetivosFijos();
}

/** Saca el aviso y el numerito, al apagar el interruptor. */
async function borrarObjetivosFijos() {
  ultimoAvisoObjetivos = '';
  try { await navigator.clearAppBadge?.(); } catch { /* ver arriba */ }

  const reg = await navigator.serviceWorker?.getRegistration();
  /* Primero se le avisa al service worker que este cierre es a proposito: sin
     esto lo lee como un descarte y repone el aviso justo cuando se pidio no
     verlo mas. */
  (reg?.active || navigator.serviceWorker?.controller)?.postMessage('apagar-aviso-fijo');
  const abiertas = await reg?.getNotifications?.({ tag: TAG_OBJETIVOS });
  (abiertas || []).forEach(n => n.close());
}

function renderAvisoObjetivos() {
  const fila = $('filaObjetivosFijos');
  if (!fila) return;

  fila.hidden = !state.cfg.recordatorios;
  $('chkObjetivosFijos').checked = !!state.cfg.avisoObjetivos;
}

if ($('chkObjetivosFijos')) {
  $('chkObjetivosFijos').onchange = async (e) => {
    state.cfg.avisoObjetivos = e.target.checked;
    save();
    if (state.cfg.avisoObjetivos) { await actualizarObjetivosFijos(); toast('Queda fijo el estado del día'); }
    else await borrarObjetivosFijos();
  };
}

function renderRecordatorios() {
  const activos = !!state.cfg.recordatorios;
  $('chkRecordatorios').checked = activos;
  $('horariosRecordatorios').hidden = !activos;
  renderAvisoObjetivos();

  const soportado = typeof Notification !== 'undefined';
  const permiso = soportado ? Notification.permission : 'no-soportado';

  const prendidos = state.cfg.horarios.filter(r => r.activo !== false).length;
  $('recordatoriosPill').textContent = activos ? `${prendidos} avisos` : '';

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
    const fila = document.createElement('label');
    fila.className = 'fila fila-aviso' + (r.activo === false ? ' apagada' : '');

    /* Cada aviso se prende y se apaga aparte: no todos meriendan, y quien no lo
       hace no tiene por que recibir un aviso de algo que no come. Apagado se
       deja ver —con su hora— para poder volver a prenderlo sin buscarlo. */
    const check = document.createElement('input');
    check.type = 'checkbox';
    check.checked = r.activo !== false;
    check.setAttribute('aria-label', 'Avisarme ' + conArticulo(r.momento));
    check.onchange = () => {
      r.activo = check.checked;
      save(); programarRecordatorios(); renderRecordatorios();
      if (typeof renderPush === 'function') actualizarPushSiEstaPrendido();
    };

    const nombre = document.createElement('span');
    nombre.textContent = nombreMomento(r.momento);

    const hora = document.createElement('input');
    hora.type = 'time';
    hora.value = r.hora;
    hora.disabled = r.activo === false;
    hora.setAttribute('aria-label', 'Hora del aviso de ' + nombreMomento(r.momento));
    hora.onchange = () => {
      if (!minutosDeHora(hora.value)) { hora.value = r.hora; return; }
      r.hora = hora.value;
      save(); programarRecordatorios(); renderRecordatorios();
      if (typeof renderPush === 'function') actualizarPushSiEstaPrendido();
    };

    fila.append(check, nombre, hora);
    cont.appendChild(fila);
  }
}

/* El permiso se pide acá y en ningún otro lado: recién cuando lo activa. */
$('chkRecordatorios').onchange = async () => {
  const quiere = $('chkRecordatorios').checked;

  if (!quiere) {
    state.cfg.recordatorios = false;
    /* El aviso fijo se va con ellos: dejarlo colgado en la barra despues de
       apagar los avisos seria la app desobedeciendo el unico interruptor. */
    state.cfg.avisoObjetivos = false;
    save(); limpiarRecordatorios(); borrarObjetivosFijos(); renderRecordatorios();
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

/*
 * Volver a antes de entrar con la cuenta.
 *
 * Sin diálogo de confirmación: el botón ya dice de qué fecha es la copia y
 * cuánto trae, y lo que hace es justamente deshacer. Preguntar "¿estás
 * seguro?" acá agregaría un paso a la salida de emergencia.
 */
$('btnRestaurarHito').onclick = () => {
  if (restaurarRespaldoDeHito()) renderAjustes();
};

$('btnOlvidarHito').onclick = () => {
  olvidarRespaldoDeHito();
  renderAjustes();
  toast('Listo, la borré');
};

$('btnImport').onclick = () => $('importInput').click();
$('importInput').onchange = async (e) => {
  const f = e.target.files?.[0];
  if (!f) return;

  try {
    const s = JSON.parse(await f.text());
    if (!s.dias) throw new Error('sin días');

    const tieneDatos = Object.keys(state.dias).length > 0;

    /* Antes de tocar nada: que el archivo SEA un estado de la app.
       `migrar()` acepta cualquier cosa y devuelve un estado válido, así que un
       archivo equivocado entraba sin chistar y reemplazaba meses de historial
       por un estado vacío. */
    if (!pareceEstado(s)) {
      toast('Ese archivo no es un respaldo de Déficit');
      e.target.value = '';
      return;
    }

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

    /* Reemplazar es destructivo: hay que decir exactamente qué entra y qué se
       va, con números, antes de hacerlo. */
    const entra = pesoDelEstado(s);
    const sale = pesoDelEstado(state);
    if (tieneDatos && !confirm(
      `Vas a reemplazar ${plural(sale.dias, 'día')} con ${plural(sale.comidas, 'comida')} ` +
      `por ${plural(entra.dias, 'día')} con ${plural(entra.comidas, 'comida')}.

¿Seguro?`
    )) { e.target.value = ''; return; }

    state = migrar(s);
    save(); renderAll();
    toast(`Importado: ${plural(entra.dias, 'día')}`);
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


/*
 * Vaciar el caché de análisis a mano.
 *
 * El caché guarda cada foto ya analizada para no volver a pagarla, y son la
 * parte más pesada del estado. Se limpia solo cuando el almacenamiento se
 * llena, pero hasta ahora no había forma de hacerlo a propósito — y a veces se
 * quiere, por ejemplo después de recalibrar la estimación.
 */
if ($('btnLimpiarCache')) {
  $('btnLimpiarCache').onclick = () => {
    const cuantos = Object.keys(state.cacheAnalisis || {}).length;
    if (!cuantos) { toast('El caché ya está vacío'); return; }

    if (!confirm(`Vas a borrar ${plural(cuantos, 'análisis guardado', 'análisis guardados')}.

` +
      'No perdés ninguna comida: solo se vuelve a pagar el análisis si sacás la misma foto otra vez.')) return;

    state.cacheAnalisis = {};
    guardarYa();
    renderAjustes();
    toast(`Caché vacío: ${plural(cuantos, 'análisis borrado', 'análisis borrados')}`);
  };
}
