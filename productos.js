/* ============================================================
   productos.js — código de barras contra Open Food Facts.

   Es una base abierta y gratuita: no hace falta API key ni pagar
   nada. Para todo lo envasado esto reemplaza la foto y sale gratis.

   El fetch se inyecta, así los tests corren sin tocar la red.
   ============================================================ */

const OFF_URL = 'https://world.openfoodfacts.org/api/v2/product/';

/* Solo se piden los campos que se usan: la respuesta completa son cientos de KB. */
const OFF_CAMPOS = [
  'code', 'product_name', 'product_name_es', 'brands', 'quantity',
  'serving_size', 'serving_quantity', 'nutriments', 'image_front_small_url'
].join(',');

const MAX_PRODUCTOS = 300;

/** Un código de barras válido: 8, 12, 13 o 14 dígitos. */
function codigoValido(codigo) {
  return /^\d{8}$|^\d{12,14}$/.test(String(codigo || '').trim());
}

function limpiarCodigo(codigo) {
  return String(codigo || '').replace(/\D/g, '');
}

/* ---------------- normalización ---------------- */

/** Un número que puede venir como texto, como null o directamente no venir. */
function numeroOFF(valor) {
  const n = Number(valor);
  return isFinite(n) && n >= 0 ? n : 0;
}

/**
 * Pasa la respuesta de Open Food Facts a algo con la forma que usa la app.
 * Los valores de OFF son por 100 g; la porción se calcula después.
 */
function normalizarProducto(datos) {
  const p = datos?.product;
  if (!p) return null;

  const n = p.nutriments || {};
  const nombre = String(p.product_name_es || p.product_name || '').trim();
  if (!nombre) return null;

  // el sodio viene en gramos; en la etiqueta se lee en miligramos
  const sodioG = numeroOFF(n.sodium_100g || (numeroOFF(n.salt_100g) * 0.4));

  return {
    codigo: String(p.code || ''),
    nombre,
    marca: String(p.brands || '').split(',')[0].trim(),
    envase: String(p.quantity || '').trim(),
    porcion: String(p.serving_size || '').trim(),
    gramosPorcion: numeroOFF(p.serving_quantity) || null,
    imagen: p.image_front_small_url || null,
    por100: {
      calorias: Math.round(numeroOFF(n['energy-kcal_100g']) || numeroOFF(n.energy_100g) / 4.184),
      proteinas: Math.round(numeroOFF(n.proteins_100g) * 10) / 10,
      carbohidratos: Math.round(numeroOFF(n.carbohydrates_100g) * 10) / 10,
      grasas: Math.round(numeroOFF(n.fat_100g) * 10) / 10,
      fibra: Math.round(numeroOFF(n.fiber_100g) * 10) / 10,
      azucar: Math.round(numeroOFF(n.sugars_100g) * 10) / 10,
      sodio: Math.round(sodioG * 1000)
    },
    traido: Date.now()
  };
}

/** Un producto sin calorías no sirve para nada acá. */
function productoUtil(producto) {
  return !!producto && producto.por100.calorias > 0;
}

/* ---------------- cache local ---------------- */

function guardarProducto(cache, producto) {
  if (!producto || !producto.codigo) return cache || {};

  const nuevo = { ...(cache || {}), [producto.codigo]: producto };
  const claves = Object.keys(nuevo).sort((a, b) => (nuevo[b].traido || 0) - (nuevo[a].traido || 0));

  const recortado = {};
  for (const k of claves.slice(0, MAX_PRODUCTOS)) recortado[k] = nuevo[k];
  return recortado;
}

function leerProducto(cache, codigo, ahora = Date.now(), diasValidez = 90) {
  const p = (cache || {})[codigo];
  if (!p) return null;
  // las etiquetas cambian, pero no todos los meses
  if (ahora - (p.traido || 0) > diasValidez * 86400000) return null;
  return p;
}

/* ---------------- búsqueda ---------------- */

/**
 * Busca un producto por su código. Si está en el cache no toca la red:
 * el mismo yogur escaneado veinte veces se pide una sola.
 */
async function buscarProducto(codigo, { fetchFn, cache = null, señal = null } = {}) {
  const limpio = limpiarCodigo(codigo);
  if (!codigoValido(limpio)) throw new Error('Ese código de barras no parece válido.');

  if (cache) {
    const guardado = cache.leer(limpio);
    if (guardado) return { ...guardado, deCache: true };
  }

  let res;
  try {
    res = await fetchFn(`${OFF_URL}${limpio}.json?fields=${OFF_CAMPOS}`, { signal: señal });
  } catch (e) {
    if (e && e.name === 'AbortError') throw e;
    throw new Error('No se pudo consultar la base de productos. Revisá la conexión.');
  }

  if (res.status === 404) throw new Error('Ese producto no está en Open Food Facts todavía.');
  if (!res.ok) throw new Error(`La base de productos respondió ${res.status}.`);

  let datos;
  try { datos = await res.json(); } catch { throw new Error('La base de productos devolvió algo raro.'); }

  if (datos?.status === 0) throw new Error('Ese producto no está en Open Food Facts todavía.');

  const producto = normalizarProducto(datos);
  if (!producto) throw new Error('El producto está en la base pero sin nombre.');
  if (!productoUtil(producto)) throw new Error(`"${producto.nombre}" está en la base pero sin datos nutricionales.`);

  if (cache) cache.guardar(producto);
  return { ...producto, deCache: false };
}

/* ---------------- del producto a la comida ---------------- */

/** Las porciones que se ofrecen: la del envase, 100 g y el envase entero. */
function porcionesDe(producto) {
  const opciones = [];

  if (producto.gramosPorcion) {
    opciones.push({
      etiqueta: producto.porcion || `1 porción (${producto.gramosPorcion} g)`,
      gramos: producto.gramosPorcion
    });
  }

  opciones.push({ etiqueta: '100 g', gramos: 100 });

  const envase = Number(String(producto.envase).replace(',', '.').match(/[\d.]+/)?.[0]);
  const unidad = /ml|l\b/i.test(producto.envase || '') ? 'ml' : 'g';
  if (envase && envase !== producto.gramosPorcion && envase <= 5000) {
    opciones.push({ etiqueta: `Envase entero (${envase} ${unidad})`, gramos: envase });
  }

  return opciones;
}

/** El alimento listo para cargar, con los valores escalados a esos gramos. */
function productoAItem(producto, gramos) {
  const g = Number(gramos) || 100;
  const factor = g / 100;
  const escalar = (v) => Math.round((Number(v) || 0) * factor);

  const nombre = producto.marca && !producto.nombre.toLowerCase().includes(producto.marca.toLowerCase())
    ? `${producto.nombre} (${producto.marca})`
    : producto.nombre;

  return {
    nombre,
    porcion: `${+g.toFixed(1)} g`,
    calorias: escalar(producto.por100.calorias),
    proteinas: escalar(producto.por100.proteinas),
    carbohidratos: escalar(producto.por100.carbohidratos),
    grasas: escalar(producto.por100.grasas),
    fibra: escalar(producto.por100.fibra),
    azucar: escalar(producto.por100.azucar),
    sodio: escalar(producto.por100.sodio)
  };
}

if (typeof window !== 'undefined') {
  window.__productos = {
    OFF_URL, MAX_PRODUCTOS,
    codigoValido, limpiarCodigo, normalizarProducto, productoUtil,
    guardarProducto, leerProducto, buscarProducto, porcionesDe, productoAItem
  };
}
