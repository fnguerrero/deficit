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

function encolarAnalisis(cola, entrada, ts = Date.now()) {
  if (!entrada || !Array.isArray(entrada.imagenes) || !entrada.imagenes.length) return cola || [];

  const id = entrada.id || 'c' + ts.toString(36) + Math.random().toString(36).slice(2, 6);
  /* Las mas nuevas primero y con tope: sin limite, tres dias sin señal dejan el
     localStorage lleno de fotos y no entra ni el dia de hoy. */
  return [{ ...entrada, id, ts }, ...(cola || []).filter(x => x.id !== id)].slice(0, MAX_COLA);
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
