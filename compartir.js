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
async function compartirTexto(texto, { navegador = typeof navigator !== 'undefined' ? navigator : null, titulo = '', numero = '' } = {}) {
  if (!texto) return 'vacio';

  /*
   * Con un numero guardado se va derecho a ese chat: es un toque contra tres
   * —abrir el selector, elegir WhatsApp, buscar el contacto— y en el uso real
   * la comida se le manda siempre a la misma persona.
   */
  const link = linkWhatsApp(numero, texto);
  if (link && typeof window !== 'undefined') {
    window.open(link, '_blank', 'noopener');
    return 'whatsapp';
  }

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

/**
 * Un momento del dia como mensaje: que comiste (o vas a comer) en esa comida.
 *
 * Mismo criterio que la sugerencia: los alimentos con su cantidad y nada de
 * calorias ni macros. Quien lo recibe casi siempre es quien cocina, y "410
 * kcal, 18 g de proteina" no le dice que poner en la olla.
 */
function textoDeMomento(grupo, { fecha = '' } = {}) {
  const comidas = (grupo?.comidas || []).filter(Boolean);
  if (!comidas.length) return '';

  const lineas = [fecha ? `${grupo.nombre} del ${fecha}` : grupo.nombre, ''];

  for (const c of comidas) {
    lineas.push(c.titulo || 'Comida');

    /* Los alimentos van indentados debajo de su plato, y solo si son mas de
       uno: con un solo item que se llama igual que el plato, repetirlo es
       escribir dos veces lo mismo. */
    const items = (c.items || []).filter(i => i && i.nombre);
    if (items.length > 1) {
      for (const i of items) {
        lineas.push(i.porcion ? `  ${i.nombre} (${i.porcion})` : `  ${i.nombre}`);
      }
    }
  }

  return lineas.join('\n');
}

/**
 * El dia entero como mensaje: las comidas en orden, con sus alimentos.
 *
 * Es lo que se manda cuando alguien pregunta "que comiste hoy" o cuando se le
 * pasa el dia a quien cocina. Los momentos vacios no se nombran: una lista con
 * "Merienda: nada" ocupa lugar para decir que no hay nada que decir.
 */
function textoDelDia(grupos, { fecha = '', kcal = 0, completo = false } = {}) {
  const conComida = (grupos || []).filter(g => (g?.comidas || []).length);
  if (!conComida.length) return '';

  const partes = [fecha ? `Lo que comi el ${fecha}` : 'Lo que comi hoy'];

  for (const g of conComida) {
    partes.push('');
    partes.push(textoDeMomento(g));
  }

  /* El total va al final y es lo unico numerico que se manda: sirve para quien
     lleva la cuenta, y al final no le estorba a quien solo quiere la lista. */
  if (kcal > 0) partes.push('', `Total del dia: ${Math.round(kcal)} kcal`);

  /* Y el dia completo, que es lo unico del mensaje que no habla de comida: si
     estuvo, se dice, porque es la parte que uno quiere contar. */
  if (completo) partes.push('Dia completo: pasos, ejercicio, agua y sueno, todo en su optimo.');

  return partes.join('\n');
}

/* ---------------- mandar directo a un contacto ---------------- */

/**
 * El numero, limpio y en formato internacional.
 *
 * `wa.me` no acepta espacios, guiones, parentesis ni el "+": quiere solo
 * digitos con el pais adelante. Y en Argentina hay una trampa conocida: los
 * celulares se escriben con un 15 que NO va en el numero internacional
 * \u201411 15 2345-6789 es +54 9 11 2345-6789\u2014, asi que ese 15 se saca y se agrega
 * el 9 que WhatsApp pide para moviles argentinos.
 */
function numeroWhatsApp(texto, { pais = '54' } = {}) {
  let n = String(texto || '').replace(/[^\d+]/g, '');
  if (!n) return '';

  n = n.replace(/^\+/, '');
  if (n.startsWith('00')) n = n.slice(2);

  /* Ya viene con pais: se respeta tal cual, que puede ser de cualquier lado. */
  if (n.startsWith(pais) && n.length > 10) return n;

  // 0 inicial de larga distancia nacional: no va nunca
  n = n.replace(/^0+/, '');

  /* El 15 va DESPUES del codigo de area, no al principio: 11 15 2345 6789. Se
     saca solo si lo que queda sigue teniendo largo de telefono. */
  const sin15 = n.replace(/^(\d{2,4})15(\d{6,8})$/, '$1$2');

  return pais === '54' ? `${pais}9${sin15}` : `${pais}${sin15}`;
}

/** El link de WhatsApp para ese numero y ese texto. Vacio si no hay numero. */
function linkWhatsApp(numero, texto) {
  const n = numeroWhatsApp(numero);
  if (!n) return '';
  return `https://wa.me/${n}?text=${encodeURIComponent(texto || '')}`;
}
