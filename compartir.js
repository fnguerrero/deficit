/* ============================================================
   Mandarle la comida a quien cocina.

   Una sugerencia sirve de poco si el que la lee no es el que la va a hacer.
   Acá se arma el texto que se manda por WhatsApp: qué es, qué lleva y cuánto
   de cada cosa. Sin calorías ni macros, que no le dicen nada a quien cocina.
   ============================================================ */

/**
 * La sugerencia como mensaje.
 *
 * Sin guiones de lista ni signos de apertura: es un mensaje de WhatsApp, no un
 * documento. Cada ingrediente en su renglón con la cantidad al lado, que es lo
 * único que hace falta para ir a la cocina.
 */
function textoDeSugerencia(opcion, { conNota = false } = {}) {
  if (!opcion || !opcion.titulo) return '';

  const lineas = [opcion.titulo];
  const items = (opcion.items || []).filter(i => i && i.nombre);

  if (items.length) {
    lineas.push('');
    for (const i of items) {
      lineas.push(i.porcion ? `${i.nombre} (${i.porcion})` : i.nombre);
    }
  }

  /* El "por qué" es para quien come, no para quien cocina: va solo si se pide. */
  if (conNota && opcion.porque) lineas.push('', opcion.porque);

  return lineas.join('\n');
}

/**
 * Compartir, con la vía que haya.
 *
 * En el celular `navigator.share` abre el selector del sistema y WhatsApp está
 * ahí; en escritorio no existe y lo que queda es el portapapeles. Devuelve
 * cómo salió para poder avisarlo, y nunca lanza: cancelar el diálogo de
 * compartir es una decisión, no un error.
 */
async function compartirTexto(texto, { navegador = typeof navigator !== 'undefined' ? navigator : null, titulo = '' } = {}) {
  if (!texto) return 'vacio';

  if (navegador?.share) {
    try {
      await navegador.share({ title: titulo || undefined, text: texto });
      return 'compartido';
    } catch (e) {
      /* AbortError es que la persona cerró el selector: no hay nada que avisar
         y menos que caer al portapapeles, que sería hacer algo que no pidió. */
      if (e && e.name === 'AbortError') return 'cancelado';
    }
  }

  try {
    await navegador?.clipboard?.writeText(texto);
    return 'copiado';
  } catch {
    return 'sin-via';
  }
}
