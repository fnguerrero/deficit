/* ============================================================
   frecuentes.js — los alimentos que mas comes.

   Salio de core.js con las fechas. Es una lista que se aprende sola de lo que
   se carga: sube el que se repite, envejece el que se dejo de comer, y de ahi
   salen los accesos rapidos de Hoy y las sugerencias que la app le pasa al
   modelo para que proponga cosas que esta persona come de verdad.
   ============================================================ */

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
