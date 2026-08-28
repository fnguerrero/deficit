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
