/* ============================================================
   fechas.js — el calendario de la app.

   Salio de core.js, que se estaba pasando de largo. Todo lo que sabe de dias:
   la fecha de hoy en ISO, sumar y restar dias, contar entre dos, y como se
   escribe una fecha para que se lea.

   Va ANTES que core.js en el orden de carga: `migrar()` y el estado por defecto
   preguntan que dia es apenas arranca la app.
   ============================================================ */

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
