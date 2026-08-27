/* ============================================================
   calibracion.js — la calibración de la estimación y el registro de errores.

   Salió de core.js, que se pasó de tamaño. El corte tiene sentido propio: acá
   está todo lo que la app aprende de sus propias equivocaciones —las
   correcciones que hace Nico sobre lo que estimó el modelo— y nada del estado
   del día a día.
   ============================================================ */

/* ---------------- calibración de la estimación ---------------- */

/**
 * Una referencia es una foto de la que SÍ se conocen las calorías reales
 * (una etiqueta, algo pesado en balanza, una receta calculada). Sin eso no
 * hay forma de saber si el modelo estima bien o inventa.
 */
function agregarReferencia(referencias, entrada, ts = Date.now()) {
  const nombre = String(entrada.nombre || '').trim();
  const kcalReal = Number(entrada.kcalReal) || 0;

  if (!nombre) throw new Error('La referencia necesita un nombre.');
  if (kcalReal <= 0) throw new Error('Poné las calorías reales, que son con las que se compara.');
  if (!entrada.foto) throw new Error('Falta la foto.');

  const ref = {
    id: 'ref' + ts.toString(36) + Math.random().toString(36).slice(2, 6),
    nombre,
    kcalReal: Math.round(kcalReal),
    protReal: Number(entrada.protReal) || null,
    foto: entrada.foto,
    fotoGrande: entrada.fotoGrande || null,
    creada: ts,
    ultima: null
  };

  return [ref, ...(referencias || [])].slice(0, MAX_REFERENCIAS);
}

function borrarReferencia(referencias, id) {
  return (referencias || []).filter(r => r.id !== id);
}

/** Guarda lo que estimó el modelo para una referencia. */
function anotarEstimacion(referencias, id, { kcal, prot = null, modelo = '', precision = '', costo = 0 }, ts = Date.now()) {
  return (referencias || []).map(r => r.id !== id ? r : {
    ...r,
    ultima: {
      ts,
      kcal: Math.round(Number(kcal) || 0),
      prot: prot == null ? null : Math.round(Number(prot)),
      modelo, precision,
      costo: Number(costo) || 0
    }
  });
}

/**
 * Compara lo estimado contra lo real.
 * - error: cuánto se equivoca en promedio, sin importar para qué lado
 * - sesgo: para qué lado se equivoca (negativo = subestima)
 * Los dos importan: un modelo que se pasa 20% en una y se queda 20% en otra
 * tiene sesgo 0 pero es igual de inútil.
 */
function medirCalibracion(referencias) {
  const conDatos = (referencias || []).filter(r => r.ultima && r.ultima.kcal > 0 && r.kcalReal > 0);
  if (!conDatos.length) return null;

  const filas = conDatos.map(r => {
    const diferencia = r.ultima.kcal - r.kcalReal;
    return {
      id: r.id,
      nombre: r.nombre,
      real: r.kcalReal,
      estimado: r.ultima.kcal,
      diferencia,
      pct: +((diferencia / r.kcalReal) * 100).toFixed(1)
    };
  });

  const errorPromedio = +(filas.reduce((a, f) => a + Math.abs(f.pct), 0) / filas.length).toFixed(1);
  const sesgo = +(filas.reduce((a, f) => a + f.pct, 0) / filas.length).toFixed(1);

  const ordenadas = [...filas].sort((a, b) => Math.abs(b.pct) - Math.abs(a.pct));

  return {
    n: filas.length,
    filas,
    errorPromedio,
    sesgo,
    peor: ordenadas[0],
    mejor: ordenadas.at(-1),
    veredicto: veredictoCalibracion(errorPromedio)
  };
}

/**
 * Qué tan confiable es el número que muestra la app.
 * Los umbrales salen de para qué se usa: con 500 kcal de objetivo de déficit,
 * un error del 20% sobre 2.000 kcal se come el déficit entero.
 */
function veredictoCalibracion(errorPromedio) {
  if (errorPromedio <= 10) return { nivel: 'bueno', texto: 'La estimación es confiable para seguir un déficit.' };
  if (errorPromedio <= 20) return { nivel: 'aceptable', texto: 'Sirve como referencia, pero conviene corregir a mano las comidas importantes.' };
  return { nivel: 'flojo', texto: 'El error es demasiado grande para confiar en el número: probá el modo Preciso o cargá a mano lo que más comés.' };
}

/** Texto del sesgo, que es lo accionable: si siempre se queda corto, se sabe. */
function textoSesgo(sesgo) {
  if (Math.abs(sesgo) < 5) return 'No se inclina para ningún lado.';
  const lado = sesgo < 0 ? 'por debajo' : 'por encima';
  return `Estima ${Math.abs(sesgo)}% ${lado} de lo real, de forma pareja.`;
}

/* ---------------- errores ---------------- */

/**
 * Guarda los últimos errores para poder mirarlos después.
 * Sin esto, un error en el celular no deja rastro y no hay forma de saber qué pasó.
 */
function registrarError(errores, entrada, max = MAX_ERRORES) {
  const fila = {
    ts: Number(entrada.ts) || Date.now(),
    mensaje: String(entrada.mensaje || 'Error sin mensaje').slice(0, 300),
    origen: String(entrada.origen || '').slice(0, 120),
    linea: Number(entrada.linea) || 0
  };

  const lista = errores || [];

  // el mismo error repitiéndose no tiene que tapar a los demás
  const ultimo = lista[0];
  if (ultimo && ultimo.mensaje === fila.mensaje && fila.ts - ultimo.ts < 5000) return lista;

  return [fila, ...lista].slice(0, max);
}

/** Resumen del estado de la app, para mirar o para copiar y pegar. */
