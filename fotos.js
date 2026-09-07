/*
 * fotos.js — las imagenes: la huella para el cache, el cache de analisis y la
 * poda de las fotos viejas.
 *
 * Salio de core.js, que quedo a seis lineas de su limite. Es un tema propio y
 * bastante autocontenido: todo lo que tiene que ver con que una foto no se
 * analice ni se guarde dos veces.
 */

const DIAS_FOTO = 21;
const DIAS_THUMB = 180;

function podarFotos(dias, hoy = hoyISO()) {
  let sacadas = 0;

  for (const [fecha, dia] of Object.entries(dias || {})) {
    const edad = diasEntre(fecha, hoy);
    if (edad <= DIAS_FOTO) continue;

    for (const c of (dia.comidas || [])) {
      if (c.foto) { delete c.foto; sacadas++; }
      if (edad > DIAS_THUMB && c.thumb) { delete c.thumb; sacadas++; }
    }
  }

  return sacadas;
}

/**
 * Huella de una imagen para reconocerla sin guardarla entera.
 * FNV-1a sobre una muestra: recorrer 1 MB de base64 en cada foto sería tirar
 * tiempo, y con 4.000 caracteres repartidos ya no hay colisiones en la práctica.
 */
function huellaImagen(b64) {
  const txt = String(b64 || '');
  if (!txt) return '';

  let h = 0x811c9dc5;
  const paso = Math.max(1, Math.floor(txt.length / 4000));

  for (let i = 0; i < txt.length; i += paso) {
    h ^= txt.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }

  // el largo entra en la huella: dos fotos distintas rara vez pesan igual
  return (h >>> 0).toString(36) + '-' + txt.length.toString(36);
}

/** Guarda un resultado en el cache, tirando lo más viejo si se pasa del tope. */
/* Cuantos analisis se guardan. Mas alla de esto, se tira el mas viejo. */
const MAX_CACHE = 60;

function guardarEnCache(cache, huella, valor, ts = Date.now()) {
  if (!huella) return cache || {};
  const nuevo = { ...(cache || {}) };
  nuevo[huella] = { valor: clonar(valor), ts };

  const claves = Object.keys(nuevo).sort((a, b) => nuevo[b].ts - nuevo[a].ts);
  const recortado = {};
  for (const k of claves.slice(0, MAX_CACHE)) recortado[k] = nuevo[k];
  return recortado;
}

/** Busca en el cache. Las entradas viejas se ignoran. */
function leerDeCache(cache, huella, ts = Date.now(), diasValidez = 90) {
  const entrada = (cache || {})[huella];
  if (!entrada) return null;
  if (ts - entrada.ts > diasValidez * 86400000) return null;
  return clonar(entrada.valor);
}


/*
 * La cola de fotos sacadas sin señal.
 *
 * Es la unica de las mejoras que evita perder algo que no se puede recuperar.
 * Una foto de un plato tiene una ventana de treinta segundos: despues el plato
 * esta a medio comer, o vacio, o ya te levantaste de la mesa. Que la app conteste
 * "no hay conexión" en un subte, un ascensor o un restaurante con wifi malo
 * significa que ese almuerzo no se registra nunca.
 *
 * Asi que la foto se guarda con todo lo que hace falta para analizarla despues,
 * y cuando vuelve la red se procesa sola. La cola vive en el estado: tiene que
 * sobrevivir a cerrar la app, que es exactamente lo que uno hace cuando algo no
 * anda.
 */
const MAX_COLA = 4;

/*
 * Cuantas veces se reintenta una foto antes de soltarla.
 *
 * Sin tope, una foto que falla siempre —una imagen que el proxy rechaza, un
 * error que se ve como de red pero no lo es— vuelve a la cola en cada intento y
 * se reintenta cada vez que la conexion aparece, para siempre. Tres veces
 * alcanza para cubrir la mala señal, que es el caso real, y corta el bucle.
 */
const MAX_INTENTOS = 3;

/** Si ya se probo bastante. Al llegar aca la foto se suelta, y se dice. */
function reintentosAgotados(entrada) {
  return (Number(entrada?.intentos) || 0) >= MAX_INTENTOS;
}

/** La misma entrada, con un intento mas encima. */
function conUnIntentoMas(entrada) {
  return { ...entrada, intentos: (Number(entrada?.intentos) || 0) + 1 };
}

function encolarAnalisis(cola, entrada, ts = Date.now()) {
  if (!entrada || !Array.isArray(entrada.imagenes) || !entrada.imagenes.length) return cola || [];

  const id = entrada.id || 'c' + ts.toString(36) + Math.random().toString(36).slice(2, 6);
  /* Las mas nuevas primero y con tope: sin limite, tres dias sin señal dejan el
     localStorage lleno de fotos y no entra ni el dia de hoy. */
  /* Los intentos viajan con la entrada: al reencolar despues de un fallo se
     conserva el id, asi que el contador se acumula en vez de arrancar de cero
     en cada vuelta. */
  return [{ intentos: 0, ...entrada, id, ts }, ...(cola || []).filter(x => x.id !== id)].slice(0, MAX_COLA);
}

function sacarDeCola(cola, id) {
  return (cola || []).filter(x => x.id !== id);
}

/** Lo que se dice de una cola con cosas adentro. Vacía no dice nada. */
function textoCola(cola) {
  const n = (cola || []).length;
  if (!n) return '';
  return n === 1
    ? 'Hay 1 foto esperando señal. Se analiza sola cuando vuelva.'
    : `Hay ${n} fotos esperando señal. Se analizan solas cuando vuelva.`;
}

/* ---------------- el visor ---------------- */

/**
 * La imagen que le toca al visor: la grande si sobrevivió, y si no la miniatura.
 *
 * Se separan porque duran distinto —la foto 21 días y el thumb 180—, así que
 * una comida de hace dos meses tiene qué mostrar aunque ya no tenga la original.
 */
function imagenDelVisor(c) {
  return (c && (c.foto || c.thumb)) || null;
}

/**
 * El pie del visor.
 *
 * Las calorías salen de `kcal` o, si no está, de sumar los alimentos: el mismo
 * visor se abre desde una comida guardada —que tiene el total ya calculado— y
 * desde el editor, donde el total todavía se está armando y solo hay items. Sin
 * esto, abrirlo desde el editor mostraba "0 kcal" al lado de la foto.
 */
function pieDelVisor(c) {
  if (!c) return '';
  const kcal = (c.kcal === undefined || c.kcal === null)
    ? (c.items ? sumarItems(c.items).calorias : null)
    : c.kcal;

  const partes = [c.titulo, kcal === null ? '' : fmtKcal(kcal)];
  // Decirlo importa: la foto se ve borrosa y el motivo no es el celular.
  if (!c.foto && c.thumb) partes.push('solo queda la miniatura de esta comida');
  if (c.notas) partes.push(c.notas);
  return partes.filter(Boolean).join(' · ');
}
