/* ============================================================
   core.js — lógica pura de Déficit: cálculo, fechas y estado.
   No toca el DOM. Es lo que testea tests.html.
   ============================================================ */

const ESQUEMA = 2;

/* Las constantes que usa DEFAULT_STATE tienen que estar declaradas antes que él. */
const TOPE_DEFECTO = 5;         // dólares por mes
const AVISO_GASTO = 0.8;        // a partir del 80% se avisa
const MAX_CORRECCIONES = 40;
const CORRECCION_MINIMA = 5;    // menos que esto es redondeo, no corrección
const MAX_REFERENCIAS = 8;
const MAX_ERRORES = 10;
const DEFAULT_STATE = {
  esquema: ESQUEMA,
  perfil: {
    sexo: 'm', edad: null, altura: null, peso: null, pesoObj: null,
    actividad: 1.55, ritmo: 0.5, manual: null,
    /* El modo decide el objetivo del dia y que comida entra. Ver modos.js. */
    modo: 'moderado'
  },
  dias: {},
  /* Rachas, XP y logros. Ver juego.js. */
  juego: { xp: 0, logros: [], anunciados: [], fechasLogros: {}, escudosGastados: 0, escudosUsados: {} },
  frecuentes: [],
  recetas: [],
  cacheAnalisis: {},
  /* Fotos sacadas sin señal, esperando red. Ver fotos.js. */
  colaAnalisis: [],
  historialAnalisis: [],
  errores: [],
  referencias: [],
  correcciones: [],
  borradas: [],
  productos: {},
  uso: { llamadas: 0, costo: 0, tokens: 0 },
  cfg: {
    apiKey: '', modelo: 'claude-opus-5', precision: 'normal', tema: 'auto',
    recordatorios: false, horarios: null,
    /* Los sonidos arrancan PRENDIDOS: pedido explícito de Nico, que quiere que
       la app haga ruido al cumplir. Se apagan de un toque en Ajustes, y
       `prefers-reduced-motion` los silencia igual sin preguntar.
       `sonidoElegido` marca que el interruptor se tocó a mano: sin eso, cambiar
       el valor por defecto no llegaría nunca a quien ya tiene estado guardado,
       y con eso puesto un cambio futuro tampoco pisa una decisión tomada. */
    sonido: true, sonidoElegido: false,
    /* Vasos de agua por día. Empieza bajo a propósito: ver vasosObjetivo(). */
    vasosMeta: null,
    topeGasto: TOPE_DEFECTO,
    avisoKeyOculto: false, onboardingHecho: false
  }
};

/** El objetivo de vasos de hoy: el que eligió Nico, o el default bajo. */
function metaVasos() {
  return vasosObjetivo(state.perfil.peso, state.cfg.vasosMeta);
}

const MAX_FRECUENTES = 200;

/* ---------------- estado ---------------- */

/**
 * El dia mas viejo que hay registrado.
 *
 * Las rachas barrian 400 dias hacia atras SIEMPRE, cuatro veces por render y
 * otra vez por cada record: mil seiscientas vueltas para un historial de diez
 * dias. Con esto el barrido se corta donde de verdad empiezan los datos.
 */
/** Los dias que ya pasaron. Los del futuro no cuentan para nada calculado. */
function diasPasados(dias, hoy = hoyISO()) {
  const salida = {};
  for (const [f, d] of Object.entries(dias || {})) {
    if (esFechaISO(f) && f <= hoy) salida[f] = d;
  }
  return salida;
}

function primerDia(dias) {
  let min = null;
  for (const f of Object.keys(dias || {})) {
    if (!esFechaISO(f)) continue;
    /* Un dia del futuro entra cuando alguien tiene mal la fecha del telefono o
       cuando sincroniza desde otro huso. Se guarda igual —el dato es del
       usuario— pero no puede contar como registrado ni cortar una racha. */
    if (min === null || f < min) min = f;
  }
  return min;
}

/** Cuantos dias hay que mirar hacia atras desde `hoy` para cubrir el historial. */
function ventanaHistorial(dias, hoy = hoyISO(), tope = 400) {
  const primero = primerDia(dias);
  if (!primero) return 1;
  const n = diasEntre(primero, hoy) + 1;
  return Math.max(1, Math.min(tope, n));
}

function clonar(o) {
  return JSON.parse(JSON.stringify(o));
}

/** Lleva cualquier state guardado al esquema actual sin perder datos. */
/*
 * Las fotos viejas se van, y esto no es opcional.
 *
 * Cada comida guarda dos imagenes en base64: la de 384 px del visor (unos 16 kB)
 * y el thumb de 128 (unos 4). Son 20 kB por comida, o sea 21 MB al año con tres
 * comidas por dia, contra los 5 MB que da un localStorage. La app no se pone
 * lenta: revienta, y con ella todo el historial.
 *
 * Asi que la del visor dura tres semanas y el thumb medio año. Lo que se pierde
 * es poder mirar la foto de un guiso de hace ocho meses; lo que se salva es el
 * dato, que es lo unico que despues alimenta un grafico.
 */

function migrar(guardado) {
  const s = clonar(DEFAULT_STATE);
  if (!guardado || typeof guardado !== 'object') return s;

  s.perfil = { ...s.perfil, ...(guardado.perfil || {}) };
  s.cfg = { ...s.cfg, ...(guardado.cfg || {}) };

  /* Historial y Progreso tenían cada uno su selector, con opciones distintas.
     Ahora comparten `rango`; lo que había guardado se traduce en vez de
     perderse. */
  if (s.cfg.rango == null) {
    if (s.cfg.rangoHist != null) s.cfg.rango = Number(s.cfg.rangoHist);
    else if (s.cfg.periodo) s.cfg.rango = { dia: 30, semana: 90, mes: 0 }[s.cfg.periodo] ?? 30;
  }
  /* Un estado del ciclo 5 no trae `juego`: se completa con los valores vacíos y
     el primer recálculo lo llena contra el historial que ya existe. */
  s.juego = { ...s.juego, ...(guardado.juego || {}) };
  /* Los logros ganados antes de que se guardara la fecha se quedan sin fecha:
     inventarles una seria peor que no mostrarla. */
  if (!s.juego.fechasLogros || typeof s.juego.fechasLogros !== 'object') s.juego.fechasLogros = {};
  if (!s.cfg.sonidoElegido) s.cfg.sonido = DEFAULT_STATE.cfg.sonido;
  if (!Array.isArray(s.cfg.horarios) || !s.cfg.horarios.length) s.cfg.horarios = clonar(RECORDATORIOS_DEFAULT);
  s.dias = {};

  for (const [f, d] of Object.entries(guardado.dias || {})) {
    if (!d || typeof d !== 'object') continue;
    /* Una clave que no es una fecha no puede entrar: aparecia cuando `sumarDias`
       devolvia "NaN-aN-aN", y desde ahi contaba como un dia registrado en las
       rachas y en los logros sin serlo. */
    if (!esFechaISO(f)) continue;
    /* Un dia del futuro entra cuando alguien tiene mal la fecha del telefono o
       cuando sincroniza desde otro huso. Se guarda igual —el dato es del
       usuario— pero no puede contar como registrado ni cortar una racha. */
    s.dias[f] = {
      peso: typeof d.peso === 'number' ? d.peso : null,
      agua: Number(d.agua) || 0,
      ejercicio: Number(d.ejercicio) || 0,
      nota: String(d.nota || ''),
      /* Como venia el dia, en caritas. Escribir una nota es mucho pedir todos los dias. */
      animo: d.animo || null,
      /* Horas dormidas y que tal se durmio. Auto-reportado: medirlo de verdad
         necesita una app nativa o un reloj, y esto se sostiene sin comprar nada. */
      sueno: d.sueno || null,
      /* El ayuno cerrado del dia. Faltaba en esta lista, y como migrar() corre
         en CADA arranque, cortar un ayuno y volver a abrir la app lo borraba:
         la pantalla volvia a decir "arranca cuando termines de comer". */
      ayuno: d.ayuno || null,
      act: Number(d.act) || 0,
      comidas: (d.comidas || []).map(c => ({
        id: c.id || (f + '-' + Math.random().toString(36).slice(2, 8)),
        ts: c.ts || Date.parse(f) || Date.now(),
        titulo: c.titulo || 'Comida',
        items: c.items || [],
        kcal: Number(c.kcal) || 0,
        prot: Number(c.prot) || 0,
        carb: Number(c.carb) || 0,
        gras: Number(c.gras) || 0,
        // opcionales: solo los traen el código de barras y algunos análisis
        fibra: Number(c.fibra) || 0,
        azucar: Number(c.azucar) || 0,
        sodio: Number(c.sodio) || 0,
        momento: c.momento || momentoDe(c.ts || Date.now()),
        // cuándo se tocó por última vez acá: es lo que resuelve los conflictos al sincronizar
        act: Number(c.act) || Number(c.ts) || 0,
        thumb: c.thumb || null,
        foto: c.foto || null,
        notas: c.notas || '',
        /* Que fraccion de lo estimado se comio. Sin esto guardado no hay como
           volver a la porcion entera: cada toque escalaba sobre lo ya escalado
           y media porcion de media porcion daba un cuarto. */
        porcionFactor: Number(c.porcionFactor) > 0 ? Number(c.porcionFactor) : 1,
        /* De donde salio el dato. Lo trae el escaner y se perdia al arrancar. */
        codigo: c.codigo || null,
        marca: c.marca || null
      }))
    };
  }

  s.frecuentes = (guardado.frecuentes || []).filter(f => f && f.nombre).map(f => ({
    nombre: String(f.nombre),
    porcion: f.porcion || '',
    calorias: Number(f.calorias) || 0,
    proteinas: Number(f.proteinas) || 0,
    carbohidratos: Number(f.carbohidratos) || 0,
    grasas: Number(f.grasas) || 0,
    usos: Number(f.usos) || 1,
    ultimoUso: Number(f.ultimoUso) || 0,
    favorito: !!f.favorito
  }));

  s.recetas = (guardado.recetas || []).filter(r => r && r.nombre && Array.isArray(r.items)).map(r => ({
    id: r.id || ('r' + Math.random().toString(36).slice(2, 10)),
    nombre: String(r.nombre),
    items: r.items,
    kcal: Number(r.kcal) || 0,
    prot: Number(r.prot) || 0,
    carb: Number(r.carb) || 0,
    gras: Number(r.gras) || 0,
    usos: Number(r.usos) || 0,
    creada: Number(r.creada) || 0
  }));

  s.cacheAnalisis = (guardado.cacheAnalisis && typeof guardado.cacheAnalisis === 'object')
    ? guardado.cacheAnalisis : {};

  s.colaAnalisis = (Array.isArray(guardado.colaAnalisis) ? guardado.colaAnalisis : [])
    .filter(x => x && x.id && Array.isArray(x.imagenes) && x.imagenes.length)
    .slice(0, MAX_COLA);

  s.historialAnalisis = (Array.isArray(guardado.historialAnalisis) ? guardado.historialAnalisis : [])
    .filter(a => a && a.ts)
    .slice(0, MAX_HISTORIAL_ANALISIS);

  s.errores = (Array.isArray(guardado.errores) ? guardado.errores : [])
    .filter(e => e && e.ts && e.mensaje)
    .slice(0, MAX_ERRORES);

  s.referencias = (Array.isArray(guardado.referencias) ? guardado.referencias : [])
    .filter(r => r && r.id && r.nombre && r.kcalReal > 0)
    .map(r => ({ ...r, fotoGrande: r.fotoGrande || null }))
    .slice(0, MAX_REFERENCIAS);

  s.correcciones = (Array.isArray(guardado.correcciones) ? guardado.correcciones : [])
    .filter(c => c && c.ts && c.estimado > 0 && c.corregido > 0)
    .slice(0, MAX_CORRECCIONES);

  // tumbas: lo borrado acá no puede revivir cuando sincronice con otro dispositivo
  s.borradas = (Array.isArray(guardado.borradas) ? guardado.borradas : [])
    .filter(b => b && b.id && b.fecha)
    .slice(0, 500);

  s.productos = (guardado.productos && typeof guardado.productos === 'object') ? guardado.productos : {};

  s.uso = {
    llamadas: Number(guardado.uso?.llamadas) || 0,
    costo: Number(guardado.uso?.costo) || 0,
    tokens: Number(guardado.uso?.tokens) || 0
  };

  s.esquema = ESQUEMA;
  podarFotos(s.dias);

  return s;
}

/* ---------------- fusión de estados ---------------- */

/** Dos comidas son la misma aunque tengan ids distintos si coinciden en todo lo demás. */
function mismaComida(a, b) {
  return Math.abs((a.ts || 0) - (b.ts || 0)) < 60000 &&
    normalizar(a.titulo) === normalizar(b.titulo) &&
    Math.round(a.kcal || 0) === Math.round(b.kcal || 0);
}

/**
 * Junta un backup con lo que ya hay en el dispositivo.
 * Regla: lo importado completa, nunca pisa. El perfil y la configuración de
 * este dispositivo mandan, salvo que estén vacíos.
 */
function fusionarEstados(actual, importado) {
  const base = migrar(actual);
  const otro = migrar(importado);
  const salida = clonar(base);

  const resumen = { diasNuevos: 0, comidasNuevas: 0, comidasRepetidas: 0, frecuentesNuevos: 0, recetasNuevas: 0 };

  // --- días ---
  for (const [f, dOtro] of Object.entries(otro.dias)) {
    const dActual = salida.dias[f];

    if (!dActual) {
      salida.dias[f] = clonar(dOtro);
      resumen.diasNuevos++;
      resumen.comidasNuevas += dOtro.comidas.length;
      continue;
    }

    for (const c of dOtro.comidas) {
      const yaEsta = dActual.comidas.some(x => x.id === c.id || mismaComida(x, c));
      if (yaEsta) { resumen.comidasRepetidas++; continue; }
      dActual.comidas.push(clonar(c));
      resumen.comidasNuevas++;
    }

    dActual.comidas.sort((a, b) => a.ts - b.ts);

    // los escalares solo se completan si acá no había nada
    if (dActual.peso == null && dOtro.peso != null) dActual.peso = dOtro.peso;
    if (!dActual.agua && dOtro.agua) dActual.agua = dOtro.agua;
    if (!dActual.ejercicio && dOtro.ejercicio) dActual.ejercicio = dOtro.ejercicio;
    if (!dActual.nota && dOtro.nota) dActual.nota = dOtro.nota;
  }

  // --- frecuentes: se suman los usos ---
  for (const f of otro.frecuentes) {
    const clave = normalizar(f.nombre);
    const ya = salida.frecuentes.find(x => normalizar(x.nombre) === clave);

    if (ya) {
      ya.usos += f.usos;
      ya.favorito = ya.favorito || f.favorito;
      if (f.ultimoUso > ya.ultimoUso) {
        ya.ultimoUso = f.ultimoUso;
        ya.calorias = f.calorias;
        ya.porcion = f.porcion || ya.porcion;
      }
    } else {
      salida.frecuentes.push(clonar(f));
      resumen.frecuentesNuevos++;
    }
  }
  salida.frecuentes.sort((a, b) => (b.usos - a.usos) || (b.ultimoUso - a.ultimoUso));
  salida.frecuentes = salida.frecuentes.slice(0, MAX_FRECUENTES);

  // --- recetas: por nombre, gana la más usada ---
  for (const r of otro.recetas) {
    const clave = normalizar(r.nombre);
    const ya = salida.recetas.find(x => normalizar(x.nombre) === clave);
    if (!ya) {
      salida.recetas.push(clonar(r));
      resumen.recetasNuevas++;
    } else if (r.usos > ya.usos) {
      ya.usos = r.usos;
      ya.items = clonar(r.items);
      ya.kcal = r.kcal; ya.prot = r.prot; ya.carb = r.carb; ya.gras = r.gras;
    }
  }
  salida.recetas = salida.recetas.slice(0, MAX_RECETAS);

  // --- perfil: lo del dispositivo manda, pero se completan los huecos ---
  for (const campo of ['edad', 'altura', 'peso', 'pesoObj']) {
    if (salida.perfil[campo] == null && otro.perfil[campo] != null) salida.perfil[campo] = otro.perfil[campo];
  }
  if (!salida.cfg.apiKey && otro.cfg.apiKey) salida.cfg.apiKey = otro.cfg.apiKey;

  // --- uso acumulado: se suma, es historia de gasto real ---
  salida.uso = {
    llamadas: base.uso.llamadas + otro.uso.llamadas,
    costo: +(base.uso.costo + otro.uso.costo).toFixed(6),
    tokens: base.uso.tokens + otro.uso.tokens
  };

  return { estado: salida, resumen };
}

/* ---------------- actualización de la app ---------------- */

/**
 * Si conviene tomar la versión nueva sin preguntar.
 *
 * Nadie quiere decidir sobre service workers: con la app ociosa, actualizar sola
 * es lo correcto. El banner queda para cuando hay algo que se perdería —un
 * análisis corriendo, un modal con datos a medio cargar—, que ahí sí recargar
 * de golpe sería sacarle el trabajo de las manos a la persona.
 */
function sePuedeActualizarSolo({ modalAbierto = false, analizando = false, editando = false } = {}) {
  return !modalAbierto && !analizando && !editando;
}

function armarDiagnostico({ version, sw, cuota, state: st, online, pantalla, agente }) {
  return {
    version: version || '—',
    serviceWorker: sw || 'sin datos',
    conexion: online ? 'con conexión' : 'sin conexión',
    almacenamiento: cuota ? `${cuota.kb} KB (${cuota.pct}%)` : '—',
    dias: Object.keys(st.dias || {}).length,
    comidas: Object.values(st.dias || {}).reduce((a, d) => a + (d.comidas || []).length, 0),
    frecuentes: (st.frecuentes || []).length,
    recetas: (st.recetas || []).length,
    analisis: (st.uso || {}).llamadas || 0,
    gasto: `US$ ${((st.uso || {}).costo || 0).toFixed(4)}`,
    tema: (st.cfg || {}).tema || 'auto',
    precision: (st.cfg || {}).precision || 'normal',
    apiKey: (st.cfg || {}).apiKey ? 'cargada' : 'sin cargar',
    acceso: (st.cfg || {}).apiKey ? 'clave propia'
      : ((typeof CONFIG_APP !== 'undefined' && CONFIG_APP.proxyUrl) ? 'proxy' : 'sin acceso'),
    errores: (st.errores || []).length,
    pantalla: pantalla || '—',
    agente: (agente || '').slice(0, 120)
  };
}

/** El diagnóstico en texto plano, listo para pegar en un mensaje. */
function diagnosticoATexto(diag, errores = []) {
  const lineas = ['Déficit — diagnóstico'];
  for (const [k, v] of Object.entries(diag)) lineas.push(`${k}: ${v}`);

  if (errores.length) {
    lineas.push('', 'Últimos errores:');
    for (const e of errores) {
      const cuando = new Date(e.ts).toLocaleString('es-AR');
      lineas.push(`- ${cuando} · ${e.mensaje}${e.origen ? ` (${e.origen}:${e.linea})` : ''}`);
    }
  }

  return lineas.join(String.fromCharCode(10));
}

/* ---------------- nutrientes opcionales ---------------- */

/**
 * Solo se muestran si hay datos: llenar la pantalla de ceros porque el
 * análisis por foto no los devuelve sería peor que no mostrarlos.
 */
const NUTRIENTES = [
  { id: 'fibra', nombre: 'Fibra', unidad: 'g', objetivo: (kcal) => Math.round(kcal / 1000 * 14), mas: true },
  { id: 'azucar', nombre: 'Azúcar', unidad: 'g', objetivo: (kcal) => Math.round(kcal * 0.10 / 4), mas: false },
  { id: 'sodio', nombre: 'Sodio', unidad: 'mg', objetivo: () => 2000, mas: false }
];

/** Qué nutrientes tienen datos cargados en ese día. */
function nutrientesConDatos(totales) {
  return NUTRIENTES.filter(n => (totales[n.id] || 0) > 0);
}

/**
 * Objetivo de cada uno según las calorías del día.
 * Fibra: 14 g cada 1.000 kcal. Azúcar: hasta el 10% de las calorías.
 * Sodio: 2.000 mg, que es lo que recomienda la OMS.
 */
function objetivosNutrientes(kcalObjetivo) {
  const salida = {};
  for (const n of NUTRIENTES) salida[n.id] = n.objetivo(kcalObjetivo || 2000);
  return salida;
}

/* ---------------- validación ---------------- */

const LIMITES = {
  edad: { min: 10, max: 100, unidad: 'años' },
  altura: { min: 100, max: 250, unidad: 'cm' },
  peso: { min: 30, max: 400, unidad: 'kg' },
  pesoObj: { min: 30, max: 400, unidad: 'kg' },
  /* Opcional y sin fecha: no es un dato del día. Ver cinturaDe() en cuerpo.js. */
  cintura: { min: 40, max: 200, unidad: 'cm' },
  manual: { min: 800, max: 6000, unidad: 'kcal' }
};

/**
 * Revisa el perfil y devuelve un mensaje por campo con problemas.
 * Los campos vacíos no son error salvo los tres que hacen falta para calcular.
 */
function validarPerfil(p) {
  const errores = {};
  const num = (v) => (v === null || v === undefined || v === '' ? null : Number(v));

  for (const campo of ['edad', 'altura', 'peso']) {
    if (num(p[campo]) == null) errores[campo] = 'Falta este dato para poder calcular tu objetivo.';
  }

  for (const [campo, lim] of Object.entries(LIMITES)) {
    const v = num(p[campo]);
    if (v == null) continue;
    if (isNaN(v)) errores[campo] = 'Tiene que ser un número.';
    else if (v < lim.min || v > lim.max) {
      errores[campo] = `Tiene que estar entre ${lim.min} y ${lim.max} ${lim.unidad}.`;
    }
  }

  const peso = num(p.peso), obj = num(p.pesoObj);
  if (!errores.pesoObj && peso != null && obj != null) {
    if (obj > peso) errores.pesoObj = 'Tu meta está por encima de tu peso actual: esta app calcula déficit, no aumento.';
    /* Una baja grande NO es un error y no bloquea nada. Alguien de 140 kg que
       pone 80 no se esta equivocando: esta poniendo su meta. Retarlo y no
       dejarlo guardar es la app diciendole que su objetivo esta mal. Lo que
       hace falta ahi es un plan por etapas, y eso lo arma planPorEtapas(). */
  }

  return { ok: Object.keys(errores).length === 0, errores };
}

/* ---------------- almacenamiento ---------------- */

/* localStorage suele rondar los 5 MB por origen. */
const CUOTA_BYTES = 5 * 1024 * 1024;

/**
 * Uso del almacenamiento a partir del tamaño del state serializado.
 * Sirve para avisar antes de que falle un guardado, no después.
 */
function usoAlmacenamiento(textoState, cuota = CUOTA_BYTES) {
  const bytes = new Blob([textoState || '']).size;
  const pct = Math.round((bytes / cuota) * 100);
  return {
    bytes,
    kb: Math.round(bytes / 1024),
    pct,
    // dos umbrales: uno para avisar, otro para empezar a soltar miniaturas
    alerta: pct >= 75,
    critico: pct >= 90
  };
}

/** Cuántas miniaturas hay guardadas y cuánto pesan (son el 90% del volumen). */
function pesoDeThumbs(dias) {
  let cantidad = 0, bytes = 0;
  for (const d of Object.values(dias || {})) {
    for (const c of d.comidas || []) {
      if (c.thumb) { cantidad++; bytes += c.thumb.length; }
    }
  }
  return { cantidad, kb: Math.round(bytes / 1024) };
}

/* ---------------- tope de gasto ---------------- */

/** Lo gastado en la API dentro de un mes (formato aaaa-mm). */
function gastoDelMes(historial, mes) {
  return +(historial || [])
    .filter(a => !a.deCache && hoyISO(new Date(a.ts)).startsWith(mes))
    .reduce((a, x) => a + (Number(x.costo) || 0), 0)
    .toFixed(5);
}

/**
 * Estado del gasto contra el tope.
 * Con `bloqueado` en true no se analiza más: un aviso que no frena nada
 * no evita la sorpresa a fin de mes.
 */
function estadoGasto(historial, { tope = TOPE_DEFECTO, mes = hoyISO().slice(0, 7) } = {}) {
  const gastado = gastoDelMes(historial, mes);

  // tope en cero = sin límite, para el que prefiera no tener freno
  if (!tope || tope <= 0) {
    return { gastado, tope: 0, pct: 0, avisar: false, bloqueado: false, restante: Infinity, mes };
  }

  const pct = Math.round((gastado / tope) * 100);

  return {
    gastado,
    tope,
    pct,
    restante: +(tope - gastado).toFixed(5),
    avisar: pct >= AVISO_GASTO * 100 && pct < 100,
    bloqueado: gastado >= tope,
    mes
  };
}

/** Qué decirle a quien llegó al tope. */
function textoTope(estado) {
  if (estado.bloqueado) {
    return `Llegaste al tope de US$ ${estado.tope} de este mes. ` +
      'Podés subirlo en Ajustes o esperar al mes que viene; el registro manual y el código de barras siguen funcionando.';
  }
  if (estado.avisar) {
    return `Vas por el ${estado.pct}% del tope del mes ` +
      `(US$ ${estado.gastado.toFixed(2).replace('.', ',')} de ${String(estado.tope).replace('.', ',')}).`;
  }
  return '';
}

/* ---------------- respaldo ---------------- */

const DIAS_SIN_RESPALDO_AVISO = 14;

/** Cuántos días pasaron desde el último respaldo a archivo. */
function diasSinRespaldo(ultimoRespaldo, ahora = Date.now()) {
  if (!ultimoRespaldo) return null;
  return Math.floor((ahora - ultimoRespaldo) / 86400000);
}

/**
 * Si conviene avisar que respalde.
 * El localStorage lo puede vaciar el navegador solo: sin un archivo afuera,
 * ese día se pierde todo. Con sincronización activa el riesgo es menor,
 * pero no cero (la llave también se puede perder).
 */
function estadoRespaldo({ ultimoRespaldo, dias, ahora = Date.now(), persistente = false }) {
  const cantidadDias = Object.keys(dias || {}).length;
  const sinDatos = cantidadDias === 0;

  if (sinDatos) return { avisar: false, dias: null, texto: '' };

  const pasados = diasSinRespaldo(ultimoRespaldo, ahora);

  if (pasados == null) {
    return {
      avisar: cantidadDias >= 3,
      dias: null,
      texto: `Tenés ${plural(cantidadDias, 'día')} cargados y todavía no exportaste nunca. ` +
        (persistente
          ? 'El navegador se comprometió a no borrarlos, pero un archivo aparte no está de más.'
          : 'Si el navegador limpia el sitio, se pierden.')
    };
  }

  return {
    avisar: pasados >= DIAS_SIN_RESPALDO_AVISO,
    dias: pasados,
    texto: pasados >= DIAS_SIN_RESPALDO_AVISO
      ? `Hace ${plural(pasados, 'día')} que no exportás. Bajá una copia por las dudas.`
      : `Último respaldo hace ${pasados} ${pasados === 1 ? 'día' : 'días'}.`
  };
}

/* ---------------- exportación ---------------- */

/** Escapa un valor para CSV: comillas dobles y separadores. */
function celdaCSV(valor) {
  const txt = String(valor == null ? '' : valor);
  return /[";\n]/.test(txt) ? '"' + txt.replace(/"/g, '""') + '"' : txt;
}

/**
 * CSV de todas las comidas, una fila por alimento.
 * Separador `;` y coma decimal: es lo que abre bien Excel en español.
 */
function armarCSV(dias) {
  const cabecera = ['fecha', 'hora', 'momento', 'comida', 'alimento', 'porcion', 'kcal', 'proteinas', 'carbohidratos', 'grasas', 'peso_del_dia', 'agua_vasos', 'ejercicio_kcal'];
  const filas = [cabecera.join(';')];

  for (const f of Object.keys(dias || {}).sort()) {
    const d = dias[f];
    for (const c of d.comidas || []) {
      const hora = new Date(c.ts).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
      const items = (c.items && c.items.length) ? c.items : [{
        nombre: c.titulo, porcion: '', calorias: c.kcal,
        proteinas: c.prot, carbohidratos: c.carb, grasas: c.gras
      }];

      for (const it of items) {
        filas.push([
          f, hora, nombreMomento(c.momento), c.titulo, it.nombre, it.porcion,
          String(Math.round(it.calorias || 0)),
          String(Math.round(it.proteinas || 0)),
          String(Math.round(it.carbohidratos || 0)),
          String(Math.round(it.grasas || 0)),
          d.peso != null ? String(d.peso).replace('.', ',') : '',
          String(d.agua || 0),
          String(d.ejercicio || 0)
        ].map(celdaCSV).join(';'));
      }
    }
  }

  return filas.join('\r\n');
}

/* ---------------- formato ---------------- */

/** Números con separador de miles y coma decimal, como se escriben en Argentina. */
function fmtNum(valor, decimales = 0) {
  const n = Number(valor);
  if (!isFinite(n)) return '—';
  return n.toLocaleString('es-AR', { minimumFractionDigits: decimales, maximumFractionDigits: decimales });
}

function fmtKcal(valor) {
  return `${fmtNum(Math.round(Number(valor) || 0))} kcal`;
}

/** Con signo adelante: sirve para balances y diferencias contra el objetivo. */
function fmtDelta(valor, decimales = 0, unidad = '') {
  const n = Number(valor) || 0;
  const signo = n > 0 ? '+' : '';
  return `${signo}${fmtNum(n, decimales)}${unidad ? ' ' + unidad : ''}`;
}

function fmtPeso(kg) {
  return `${fmtNum(kg, 1)} kg`;
}

/* ---------------- porciones ---------------- */

const FACTORES = [0.5, 1, 1.5, 2];

/**
 * Reescala un alimento por un factor de porción.
 * Siempre se aplica sobre el item base, así ×2 dos veces no termina en ×4.
 */
function escalarItem(base, factor) {
  const f = Number(factor) || 1;
  const n = (v) => Math.round((Number(v) || 0) * f);
  return {
    ...base,
    porcion: escalarPorcion(base.porcion, f),
    calorias: n(base.calorias),
    proteinas: n(base.proteinas),
    carbohidratos: n(base.carbohidratos),
    grasas: n(base.grasas)
  };
}

/** "150 g" ×2 -> "300 g". Si no hay número reconocible, se anota el factor. */
function escalarPorcion(porcion, factor) {
  const txt = String(porcion || '').trim();
  if (!txt) return factor === 1 ? '' : `×${factor}`.replace('.', ',');
  if (factor === 1) return txt;

  const m = txt.match(/^(\d+(?:[.,]\d+)?)\s*(.*)$/);
  if (!m) return `${txt} (×${String(factor).replace('.', ',')})`;

  const valor = parseFloat(m[1].replace(',', '.')) * factor;
  const redondeado = Math.round(valor * 100) / 100;
  return `${String(redondeado).replace('.', ',')}${m[2] ? ' ' + m[2] : ''}`;
}

/* ---------------- agua y ejercicio ---------------- */

const ML_POR_VASO = 250;

/** Vasos de 250 ml recomendados: ~35 ml por kg de peso. */
function objetivoAgua(pesoKg) {
  if (!pesoKg) return 8;
  return Math.max(6, Math.round((pesoKg * 35) / ML_POR_VASO));
}

/** Las calorías quemadas por ejercicio se suman al objetivo del día. */
function objetivoEfectivo(objetivo, ejercicio) {
  return Math.round((Number(objetivo) || 0) + (Number(ejercicio) || 0));
}

/* ---------------- cache de análisis ---------------- */

/* Cada entrada es un analisis ya pagado: guardar mas es plata que no se
   vuelve a gastar. 60 entradas siguen siendo pocos KB. */

/* ---------------- registro de análisis ---------------- */

const MAX_HISTORIAL_ANALISIS = 50;

/**
 * Anota qué se le pidió a la API y qué costó. Sirve para entender la factura
 * y para ver si conviene bajar la precisión.
 */
function registrarAnalisis(historial, entrada, max = MAX_HISTORIAL_ANALISIS) {
  const fila = {
    ts: Number(entrada.ts) || Date.now(),
    tipo: String(entrada.tipo || 'foto'),
    titulo: String(entrada.titulo || ''),
    modelo: String(entrada.modelo || ''),
    precision: String(entrada.precision || 'normal'),
    costo: Number(entrada.costo) || 0,
    tokens: Number(entrada.tokens) || 0,
    deCache: !!entrada.deCache
  };
  return [fila, ...(historial || [])].slice(0, max);
}

/** Totales del registro, para mostrarlos arriba de la lista. */
function resumenAnalisis(historial) {
  const lista = historial || [];
  const pagados = lista.filter(a => !a.deCache);
  return {
    total: lista.length,
    pagados: pagados.length,
    ahorrados: lista.length - pagados.length,
    costo: +pagados.reduce((a, x) => a + x.costo, 0).toFixed(5),
    tokens: pagados.reduce((a, x) => a + x.tokens, 0)
  };
}

/* ---------------- copiar días ---------------- */

/**
 * Copia las comidas de un día a otro. Devuelve las comidas nuevas, con ids
 * propios y la hora corrida al día destino: la del origen no se toca.
 */
function comidasCopiadas(comidas, fechaDestino, ts = Date.now()) {
  return (comidas || []).map((c, i) => {
    const momento = c.momento || momentoDe(c.ts);
    return {
      ...clonar(c),
      id: 'c' + ts.toString(36) + i.toString(36) + Math.random().toString(36).slice(2, 5),
      // siempre la hora típica del momento, aunque el destino sea hoy: copiar un
      // desayuno a las 22 lo dejaría con la hora al revés que su propio momento.
      // El minuto por índice mantiene el orden entre comidas del mismo momento.
      ts: tsEnMomento(fechaDestino, momento, i)
    };
  });
}

/** Días con comidas cargadas, del más reciente al más viejo, con su total. */
function diasConComidas(dias, excluir = null, limite = 30) {
  return Object.keys(dias || {})
    .filter(f => f !== excluir && (dias[f].comidas || []).length)
    .sort().reverse()
    .slice(0, limite)
    .map(f => ({
      fecha: f,
      comidas: dias[f].comidas.length,
      kcal: sumarComidas(dias[f].comidas).kcal
    }));
}

/* ---------------- recetas ---------------- */

const MAX_RECETAS = 60;

/**
 * Guarda un conjunto de alimentos como plantilla reutilizable.
 * Si ya existe una con el mismo nombre, la reemplaza en vez de duplicar.
 */
function guardarReceta(recetas, nombre, items, ts = Date.now()) {
  const limpio = String(nombre || '').trim();
  if (!limpio) throw new Error('La receta necesita un nombre.');

  const utiles = (items || []).filter(i => i && String(i.nombre || '').trim());
  if (!utiles.length) throw new Error('La receta necesita al menos un alimento.');

  const total = sumarComidas([{
    kcal: utiles.reduce((a, i) => a + (Number(i.calorias) || 0), 0),
    prot: utiles.reduce((a, i) => a + (Number(i.proteinas) || 0), 0),
    carb: utiles.reduce((a, i) => a + (Number(i.carbohidratos) || 0), 0),
    gras: utiles.reduce((a, i) => a + (Number(i.grasas) || 0), 0)
  }]);

  const receta = {
    id: 'r' + ts.toString(36) + Math.random().toString(36).slice(2, 6),
    nombre: limpio,
    items: clonar(utiles.map(({ factor, base, ...i }) => i)),
    kcal: total.kcal, prot: total.prot, carb: total.carb, gras: total.gras,
    usos: 0,
    creada: ts
  };

  const clave = normalizar(limpio);
  const resto = (recetas || []).filter(r => normalizar(r.nombre) !== clave);
  const anterior = (recetas || []).find(r => normalizar(r.nombre) === clave);
  if (anterior) {
    receta.usos = anterior.usos;
    receta.creada = anterior.creada;
  }

  return [receta, ...resto].slice(0, MAX_RECETAS);
}

function borrarReceta(recetas, id) {
  return (recetas || []).filter(r => r.id !== id);
}

/** Devuelve los items de la receta listos para editar, y suma un uso. */
function aplicarReceta(recetas, id) {
  const receta = (recetas || []).find(r => r.id === id);
  if (!receta) return null;

  return {
    items: clonar(receta.items),
    titulo: receta.nombre,
    recetas: (recetas || []).map(r => (r.id === id ? { ...r, usos: r.usos + 1 } : r))
  };
}

/** Las recetas ordenadas por uso, y a igual uso las más nuevas. */
function recetasOrdenadas(recetas) {
  return [...(recetas || [])].sort((a, b) => (b.usos - a.usos) || (b.creada - a.creada));
}

/* ---------------- cambio de día ---------------- */

/** Cuánto falta para las 00:00 del día siguiente, más un margen chico. */
function msHastaMedianoche(ahora = new Date(), margenMs = 2000) {
  const manana = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate() + 1, 0, 0, 0, 0);
  return (manana - ahora) + margenMs;
}

/* ---------------- recordatorios ---------------- */

const RECORDATORIOS_DEFAULT = [
  { momento: 'desayuno', hora: '09:00' },
  { momento: 'almuerzo', hora: '13:30' },
  { momento: 'cena', hora: '21:30' }
];

/* La hora de dormir no es un momento de comida, pero es el mismo mecanismo:
   un aviso a una hora fija. Va aparte porque su regla de "ya está hecho" es
   distinta: no se mira si cargaste una comida sino si ya te fuiste a dormir. */
const RECORDATORIO_DORMIR = { momento: 'dormir', hora: '23:30' };

/** Un aviso de irse a dormir tiene sentido si falta poco y todavía no cargaste el sueño. */
function tocaDormir(horaObjetivo, ahora = new Date(), suenoCargado = false) {
  if (suenoCargado) return false;

  const [h, m] = String(horaObjetivo || '23:30').split(':').map(Number);
  const objetivo = new Date(ahora);
  objetivo.setHours(h, m, 0, 0);

  const faltan = objetivo - ahora;
  // desde media hora antes y hasta dos horas después: fuera de esa franja el
  // aviso llega tarde o molesta sin sentido
  return faltan <= 30 * 60000 && faltan > -120 * 60000;
}

/** Convierte "13:30" en minutos desde medianoche. */
function minutosDeHora(hhmm) {
  const m = String(hhmm || '').match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const h = Number(m[1]), min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

/**
 * Los recordatorios que todavía faltan hoy, con cuántos ms quedan.
 * Los del momento ya cargado no se avisan: la idea es recordar, no molestar.
 */
function proximosRecordatorios(horarios, ahora = new Date(), momentosCargados = []) {
  const minutosAhora = ahora.getHours() * 60 + ahora.getMinutes();

  return (horarios || [])
    .map(r => ({ ...r, minutos: minutosDeHora(r.hora) }))
    .filter(r => r.minutos != null)
    .filter(r => r.minutos > minutosAhora)
    .filter(r => !momentosCargados.includes(r.momento))
    .sort((a, b) => a.minutos - b.minutos)
    .map(r => ({ ...r, enMs: (r.minutos - minutosAhora) * 60000 }));
}

/** Texto del recordatorio, según si ya comió algo o no. */
function textoRecordatorio(momento, restante = null) {
  const cual = conArticulo(momento);
  if (restante != null && restante > 0) {
    return `¿Cargaste ${cual}? Te quedan ${Math.round(restante)} kcal para hoy.`;
  }
  return `No te olvides de cargar ${cual}.`;
}

/* ---------------- momentos del día ---------------- */

/** "el almuerzo", "la cena": el artículo cambia según el momento. */
function conArticulo(id) {
  const m = MOMENTOS.find(x => x.id === id);
  return m ? `${m.articulo} ${m.nombre.toLowerCase()}` : 'la comida';
}

/** Hora representativa de un momento, para fechar comidas cargadas a destiempo. */
function horaDeMomento(id) {
  const horas = { desayuno: 8, almuerzo: 13, merienda: 17, cena: 21, snack: 23 };
  return horas[id] != null ? horas[id] : 12;
}

/** Timestamp del día `iso` a la hora típica de ese momento. */
function tsEnMomento(iso, momento, minutos = 0) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d, horaDeMomento(momento), minutos, 0, 0).getTime();
}

/**
 * Timestamp para una comida que se está cargando ahora en el día `iso`.
 * Si es hoy, la hora real; si es otro día, la hora típica del momento.
 */
function tsParaFecha(iso, momento, ahora = new Date()) {
  if (iso === hoyISO(ahora)) return ahora.getTime();
  return tsEnMomento(iso, momento);
}

/** Agrupa comidas por momento, en el orden natural del día. */
/**
 * Los cinco momentos del día, SIEMPRE los cinco.
 *
 * `todos: true` devuelve también los vacíos. Es lo que permite que la pantalla
 * de Hoy tenga una fila de altura fija: cinco casilleros que no se mueven de
 * lugar, cargues tres comidas o doce. Los vacíos no son un hueco, son la
 * información de qué te falta.
 */
function agruparPorMomento(comidas, { todos = false } = {}) {
  const orden = ['desayuno', 'almuerzo', 'merienda', 'cena', 'snack'];
  const grupos = [];

  for (const id of orden) {
    const delGrupo = (comidas || []).filter(c => (c.momento || momentoDe(c.ts)) === id);
    if (delGrupo.length || todos) {
      grupos.push({
        id,
        nombre: nombreMomento(id),
        icono: (MOMENTOS.find(m => m.id === id) || {}).icono || '',
        comidas: delGrupo.sort((a, b) => a.ts - b.ts),
        kcal: sumarComidas(delGrupo).kcal
      });
    }
  }
  return grupos;
}

/* ---------------- alimentos frecuentes ---------------- */

/** Clave de comparación: sin acentos, sin mayúsculas, sin espacios de más. */
function normalizar(txt) {
  return String(txt || '')
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Suma los items de una comida al listado de frecuentes.
 * Devuelve un array nuevo — no muta el que recibe.
 */
function registrarFrecuentes(frecuentes, items, ts = Date.now()) {
  const lista = (frecuentes || []).map(f => ({ ...f }));

  for (const it of items || []) {
    const nombre = String(it.nombre || '').trim();
    if (!nombre) continue;

    const clave = normalizar(nombre);
    const ya = lista.find(f => normalizar(f.nombre) === clave);

    if (ya) {
      // los valores del último uso ganan: la estimación más reciente es la mejor
      ya.usos += 1;
      ya.ultimoUso = ts;
      ya.porcion = it.porcion || ya.porcion;
      ya.calorias = Number(it.calorias) || ya.calorias;
      ya.proteinas = Number(it.proteinas) || ya.proteinas;
      ya.carbohidratos = Number(it.carbohidratos) || ya.carbohidratos;
      ya.grasas = Number(it.grasas) || ya.grasas;
    } else {
      lista.push({
        nombre,
        favorito: false,
        porcion: it.porcion || '',
        calorias: Number(it.calorias) || 0,
        proteinas: Number(it.proteinas) || 0,
        carbohidratos: Number(it.carbohidratos) || 0,
        grasas: Number(it.grasas) || 0,
        usos: 1,
        ultimoUso: ts
      });
    }
  }

  lista.sort((a, b) => puntajeFrecuente(b, ts) - puntajeFrecuente(a, ts));
  return lista.slice(0, MAX_FRECUENTES);
}

/*
 * El ranking de frecuentes, con la recencia pesando.
 *
 * Ordenar por cantidad de usos a secas congela la lista: algo comido cuarenta
 * veces hace un año le gana para siempre a lo que se come todos los días desde
 * hace un mes, y la lista termina mostrando lo que uno comía antes en vez de lo
 * que come. Cada 45 días sin usarse, un alimento vale la mitad.
 */
const VIDA_MEDIA_FRECUENTE = 45 * 24 * 3600 * 1000;

function puntajeFrecuente(f, ahora = Date.now()) {
  const usos = Number(f?.usos) || 0;
  const ultimo = Number(f?.ultimoUso) || 0;
  if (!ultimo) return usos * 0.25;   // sin fecha no se puede saber: pesa poco, no cero

  const antiguedad = Math.max(0, ahora - ultimo);
  return usos * Math.pow(0.5, antiguedad / VIDA_MEDIA_FRECUENTE);
}

/** Marca o desmarca un alimento como favorito. Devuelve un array nuevo. */
function alternarFavorito(frecuentes, nombre) {
  const clave = normalizar(nombre);
  return (frecuentes || []).map(f =>
    normalizar(f.nombre) === clave ? { ...f, favorito: !f.favorito } : { ...f }
  );
}

function esFavorito(frecuentes, nombre) {
  const clave = normalizar(nombre);
  return !!(frecuentes || []).find(f => normalizar(f.nombre) === clave && f.favorito);
}

/** Los favoritos, primero los más usados. */
function favoritos(frecuentes, limite = 12) {
  return (frecuentes || [])
    .filter(f => f.favorito)
    .sort((a, b) => (b.usos - a.usos) || (b.ultimoUso - a.ultimoUso))
    .slice(0, limite);
}

/** Busca en los frecuentes por coincidencia parcial; sin texto devuelve el top. */
function buscarFrecuentes(frecuentes, texto, limite = 8) {
  const q = normalizar(texto);
  const lista = frecuentes || [];
  if (!q) return lista.slice(0, limite);

  return lista
    .filter(f => normalizar(f.nombre).includes(q))
    .sort((a, b) => {
      // primero los que arrancan con lo tipeado
      const ea = normalizar(a.nombre).startsWith(q) ? 0 : 1;
      const eb = normalizar(b.nombre).startsWith(q) ? 0 : 1;
      return (ea - eb) || (b.usos - a.usos);
    })
    .slice(0, limite);
}

/* ---------------- fechas ---------------- */

function hoyISO(d = new Date()) {
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

/* Un ISO valido son exactamente 10 caracteres con dos guiones. Sin este chequeo
   una fecha rota devolvia "NaN-aN-aN", que despues se usaba como clave de `dias`
   y ensuciaba el estado en silencio. */
function esFechaISO(iso) {
  if (typeof iso !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false;
  const [y, m, d] = iso.split('-').map(Number);
  if (m < 1 || m > 12 || d < 1 || d > 31) return false;
  const f = new Date(y, m - 1, d);
  return f.getFullYear() === y && f.getMonth() === m - 1 && f.getDate() === d;
}

/**
 * Los totales de una lista de comidas.
 *
 * Estaba escrito con el mismo `reduce` en cuatro archivos, y en dos de ellos sin
 * el `|| 0`: una comida con kcal en null o en texto —pasa cuando se edita a mano
 * o cuando llega de una version vieja— convertia el total del dia en NaN, y de
 * ahi en mas todo lo que dependia del dia mostraba NaN.
 */
/**
 * Plural en español, con el singular incluido.
 *
 * La app decía "1 días", "1 comidas" y "1 vasos" en una docena de lugares. Es
 * el tipo de detalle que nadie reporta como error y que hace que todo se lea
 * como generado por una máquina.
 */
/**
 * Si un objeto parece un estado de la app.
 *
 * `migrar()` acepta cualquier cosa y devuelve un estado válido, lo cual está
 * bien para arrancar pero es un desastre para importar: un archivo equivocado
 * pasaba sin chistar y reemplazaba meses de historial por un estado vacío.
 */
function pareceEstado(o) {
  if (!o || typeof o !== 'object' || Array.isArray(o)) return false;
  if (!o.dias || typeof o.dias !== 'object' || Array.isArray(o.dias)) return false;
  if (!o.perfil || typeof o.perfil !== 'object') return false;

  const fechas = Object.keys(o.dias);
  if (fechas.length && !fechas.some(esFechaISO)) return false;
  return true;
}

/** Cuántos días con comidas trae, para poder avisar qué se está por pisar. */
function pesoDelEstado(o) {
  const dias = Object.entries(o?.dias || {}).filter(([f, d]) => esFechaISO(f) && (d?.comidas || []).length);
  return {
    dias: dias.length,
    comidas: dias.reduce((a, [, d]) => a + d.comidas.length, 0)
  };
}

function plural(n, singular, plural) {
  const x = Number(n) || 0;
  return `${fmtNum(x)} ${Math.abs(x) === 1 ? singular : (plural || singular + 's')}`;
}

function totalesDe(comidas) {
  const n = (v) => { const x = Number(v); return isFinite(x) ? x : 0; };
  return (comidas || []).reduce((a, c) => ({
    kcal: a.kcal + n(c?.kcal),
    prot: a.prot + n(c?.prot),
    carb: a.carb + n(c?.carb),
    gras: a.gras + n(c?.gras),
    fibra: a.fibra + n(c?.fibra)
  }), { kcal: 0, prot: 0, carb: 0, gras: 0, fibra: 0 });
}

/* Por encima de esto no es una comida: es un error de tipeo o una estimación
   que se fue al carajo. No se bloquea —a veces un asado familiar es real— pero
   se marca, porque una comida de 40.000 kcal arruina el promedio del mes. */
const KCAL_SOSPECHOSA = 6000;

function esSospechosa(comida) {
  const k = Number(comida?.kcal);
  return isFinite(k) && k > KCAL_SOSPECHOSA;
}

function kcalDe(comidas) {
  return totalesDe(comidas).kcal;
}

function sumarDias(iso, n) {
  if (!esFechaISO(iso)) return null;
  const [y, m, d] = iso.split('-').map(Number);
  return hoyISO(new Date(y, m - 1, d + (Number(n) || 0)));
}

function diasEntre(isoA, isoB) {
  const a = new Date(isoA + 'T00:00:00'), b = new Date(isoB + 'T00:00:00');
  return Math.round((b - a) / 86400000);
}

function etiquetaFecha(iso, hoy = hoyISO()) {
  if (iso === hoy) return 'Hoy';
  if (iso === sumarDias(hoy, -1)) return 'Ayer';
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' });
}

/* ---------------- cálculo nutricional ---------------- */

/** Mifflin-St Jeor + factor de actividad + déficit, con piso de seguridad. */
function calcularPlan(p) {
  if (!p || !p.edad || !p.altura || !p.peso) return null;

  const tmb = Math.round(10 * p.peso + 6.25 * p.altura - 5 * p.edad + (p.sexo === 'm' ? 5 : -161));
  const tdee = Math.round(tmb * Number(p.actividad));

  // 1 kg de grasa ≈ 7700 kcal
  const deficitDia = Math.round((Number(p.ritmo) * 7700) / 7);
  let objetivo = tdee - deficitDia;

  const piso = Math.max(tmb, p.sexo === 'm' ? 1500 : 1200);
  const ajustado = objetivo < piso;
  if (ajustado) objetivo = piso;

  if (p.manual) objetivo = Number(p.manual);

  const deficitReal = tdee - objetivo;
  const kgSemana = +((deficitReal * 7) / 7700).toFixed(2);

  let semanas = null;
  if (p.pesoObj && p.peso > p.pesoObj && kgSemana > 0) {
    semanas = Math.ceil((p.peso - p.pesoObj) / kgSemana);
  }

  return {
    tmb, tdee, objetivo, deficitReal, kgSemana, semanas, ajustado, piso,
    macros: {
      prot: Math.round((objetivo * 0.30) / 4),
      carb: Math.round((objetivo * 0.40) / 4),
      gras: Math.round((objetivo * 0.30) / 9)
    }
  };
}

/* ---------------- deshacer ---------------- */

/*
 * La pila de deshacer.
 *
 * La app ya ofrecía "Deshacer" en algunos toasts, pero solo ahí y solo mientras
 * el toast estaba en pantalla: dos segundos. Todo lo demás —el peso mal
 * tipeado, el vaso de más, el ejercicio en el día equivocado— no tenía vuelta
 * atrás, y arreglarlo a mano significa acordarse de qué había antes.
 *
 * Se guarda el DÍA entero y no la operación: es un objeto chico, funciona igual
 * para cualquier cambio sin escribir un inverso por cada uno, y no hay forma de
 * que un deshacer quede a mitad de camino.
 */
const MAX_DESHACER = 12;

function apilarCambio(pila, fecha, dia, que, ts = Date.now()) {
  if (!fecha || !dia) return pila || [];
  return [{ fecha, dia: clonar(dia), que: String(que || 'el último cambio'), ts }, ...(pila || [])]
    .slice(0, MAX_DESHACER);
}

/** Saca el último y devuelve qué hay que restaurar. */
function desapilarCambio(pila) {
  const p = pila || [];
  if (!p.length) return { pila: p, cambio: null };
  return { pila: p.slice(1), cambio: p[0] };
}

/* ---------------- sesgo aprendido de las correcciones ---------------- */

/**
 * Cada vez que se corrige a mano lo que estimó la IA queda una medición gratis
 * de cuánto se equivoca. Es la calibración que se arma sola, sin cargar nada.
 */
function registrarCorreccion(lista, estimado, corregido, ts = Date.now()) {
  const est = Math.round(Number(estimado) || 0);
  const cor = Math.round(Number(corregido) || 0);
  if (est <= 0 || cor <= 0) return lista || [];

  const pct = +(((est - cor) / cor) * 100).toFixed(1);
  if (Math.abs(pct) < CORRECCION_MINIMA) return lista || [];

  return [{ ts, estimado: est, corregido: cor, pct }, ...(lista || [])].slice(0, MAX_CORRECCIONES);
}

/**
 * El sesgo que se desprende de las correcciones.
 * Se pide un mínimo de muestras: con dos correcciones no hay patrón, hay ruido.
 */
function sesgoAprendido(lista, minimo = 5) {
  const datos = lista || [];
  if (datos.length < minimo) return null;

  const sesgo = +(datos.reduce((a, c) => a + c.pct, 0) / datos.length).toFixed(1);
  const error = +(datos.reduce((a, c) => a + Math.abs(c.pct), 0) / datos.length).toFixed(1);

  // solo es un patrón si la mayoría se equivoca para el mismo lado
  const mismoLado = datos.filter(c => Math.sign(c.pct) === Math.sign(sesgo)).length;
  const consistente = mismoLado / datos.length >= 0.7;

  return {
    n: datos.length,
    sesgo,
    error,
    consistente,
    avisar: consistente && Math.abs(sesgo) >= 15,
    lado: sesgo > 0 ? 'de más' : 'de menos'
  };
}

/** Suma los alimentos de una comida: sirve para el total antes de guardarla. */
function sumarItems(items) {
  const t = { calorias: 0, proteinas: 0, carbohidratos: 0, grasas: 0, fibra: 0, azucar: 0, sodio: 0 };
  for (const i of items || []) {
    t.calorias += Number(i.calorias) || 0;
    t.proteinas += Number(i.proteinas) || 0;
    t.carbohidratos += Number(i.carbohidratos) || 0;
    t.grasas += Number(i.grasas) || 0;
    t.fibra += Number(i.fibra) || 0;
    t.azucar += Number(i.azucar) || 0;
    t.sodio += Number(i.sodio) || 0;
  }
  return {
    calorias: Math.round(t.calorias), proteinas: Math.round(t.proteinas),
    carbohidratos: Math.round(t.carbohidratos), grasas: Math.round(t.grasas),
    fibra: Math.round(t.fibra), azucar: Math.round(t.azucar), sodio: Math.round(t.sodio)
  };
}

/** Suma calorías y macros de una lista de comidas. */
function sumarComidas(comidas) {
  const t = { kcal: 0, prot: 0, carb: 0, gras: 0, fibra: 0, azucar: 0, sodio: 0 };
  for (const c of comidas || []) {
    t.kcal += Number(c.kcal) || 0;
    t.prot += Number(c.prot) || 0;
    t.carb += Number(c.carb) || 0;
    t.gras += Number(c.gras) || 0;
    t.fibra += Number(c.fibra) || 0;
    t.azucar += Number(c.azucar) || 0;
    t.sodio += Number(c.sodio) || 0;
  }
  return {
    kcal: Math.round(t.kcal), prot: Math.round(t.prot),
    carb: Math.round(t.carb), gras: Math.round(t.gras),
    fibra: Math.round(t.fibra), azucar: Math.round(t.azucar), sodio: Math.round(t.sodio)
  };
}

/* ---------------- borrar un día ---------------- */

/**
 * Saca un día entero del estado.
 *
 * Devuelve lo que borró para poder ofrecer deshacer: borrar un día de comidas
 * sin vuelta atrás es la clase de acción que hace desconfiar de una app.
 */
function borrarDia(estado, fecha) {
  if (!esFechaISO(fecha) || !estado?.dias?.[fecha]) return null;
  const copia = clonar(estado.dias[fecha]);
  delete estado.dias[fecha];
  return copia;
}

function restaurarDia(estado, fecha, copia) {
  if (!esFechaISO(fecha) || !copia) return false;
  estado.dias[fecha] = copia;
  return true;
}
