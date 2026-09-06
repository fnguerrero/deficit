/* ============================================================
   Fusionar UN dia: el de aca contra el que bajo del servidor.

   Salio de sync.js cuando el arreglo de los contadores lo paso de su limite, y
   el corte cayo donde ya estaba la costura: sync.js habla con el servidor y
   este archivo decide, campo por campo, cual de las dos versiones queda.
   ============================================================ */

/*
 * Los contadores del dia: agua, ejercicio y pasos.
 *
 * Ganaba el mas alto, y con eso no habia forma de corregir hacia abajo. El caso
 * que lo mostro: sacar un vaso de agua, y al rato el vaso volvia solo —con
 * festejo incluido, porque el casillero pasaba otra vez de incompleto a
 * cumplido—. Lo mismo con un ejercicio cargado de mas o unos pasos mal
 * tipeados: quedaban clavados para siempre.
 *
 * Ahora gana el mas nuevo, como el peso y la nota. Pero un cero no pisa: `act`
 * es del dia entero, asi que el dispositivo donde solo cargaste una comida
 * tiene act nuevo y el agua en cero, y sin esta salvedad esa comida te borraria
 * los vasos del otro. Lo que no viaja, entonces, es bajar a cero —y es el
 * unico caso que queda sin resolver, a cambio de no perder nada.
 */
function fusionarContador(local, remoto, ganaR) {
  const l = Number(local) || 0;
  const r = Number(remoto) || 0;
  if (!l) return r;
  if (!r) return l;
  return ganaR ? r : l;
}

function fusionarDia(local, remoto) {
  const actL = Number(local?.act) || 0;
  const actR = Number(remoto?.act) || 0;
  const ganaR = actR > actL;

  const agua = fusionarContador(local?.agua, remoto?.agua, ganaR);
  const ejercicio = fusionarContador(local?.ejercicio, remoto?.ejercicio, ganaR);
  /* El desglose viaja con el total: los renglones del lado cuyo numero quedo,
     para que el ticket y la suma digan lo mismo. */
  const movL = Array.isArray(local?.movimientos) ? local.movimientos : [];
  const movR = Array.isArray(remoto?.movimientos) ? remoto.movimientos : [];
  const movimientos = ejercicio === (Number(remoto?.ejercicio) || 0) && ejercicio !== (Number(local?.ejercicio) || 0)
    ? movR : movL;
  const pasos = fusionarContador(local?.pasos, remoto?.pasos, ganaR);

  const pesoL = local?.peso == null || local.peso === '' ? null : Number(local.peso);
  const pesoR = remoto?.peso == null || remoto.peso === '' ? null : Number(remoto.peso);
  const peso = pesoL == null ? pesoR : (pesoR == null ? pesoL : (ganaR ? pesoR : pesoL));

  const notaL = String(local?.nota || '');
  const notaR = String(remoto?.nota || '');
  const nota = !notaR ? notaL : (!notaL ? notaR : (ganaR ? notaR : notaL));

  /* El sueño y el ánimo son "lo tiene el que lo tiene": ninguno de los dos se
     acumula como el agua ni se puede promediar, así que si de un lado hay dato
     y del otro no, gana el que hay, y si hay de los dos gana el más nuevo. */
  /* La cintura es como el peso: un número medido que no se acumula. Si de un
     lado hay y del otro no, gana el que hay. */
  const cintL = local?.cintura == null || local.cintura === '' ? null : Number(local.cintura);
  const cintR = remoto?.cintura == null || remoto.cintura === '' ? null : Number(remoto.cintura);
  const cintura = cintL == null ? cintR : (cintR == null ? cintL : (ganaR ? cintR : cintL));

  const suenoR = remotoSueno(remoto);
  const suenoL = local?.sueno || null;
  const sueno = !suenoR ? suenoL : (!suenoL ? suenoR : (ganaR ? suenoR : suenoL));

  const animoL = local?.animo || null;
  const animoR = remoto?.animo || null;
  const animo = !animoR ? animoL : (!animoL ? animoR : (ganaR ? animoR : animoL));

  const cambio = peso !== (pesoL == null ? null : pesoL) ||
    cintura !== cintL ||
    agua !== (Number(local?.agua) || 0) ||
    ejercicio !== (Number(local?.ejercicio) || 0) ||
    pasos !== (Number(local?.pasos) || 0) ||
    nota !== notaL ||
    JSON.stringify(sueno) !== JSON.stringify(suenoL) ||
    animo !== animoL;

  return { peso, cintura, agua, pasos, ejercicio, movimientos, nota, sueno, animo, act: Math.max(actL, actR), cambio };
}

/** El sueño que viene del servidor, que llega en dos columnas planas. */
function remotoSueno(remoto) {
  if (!remoto) return null;
  /* Puede venir ya armado (de otro cliente en memoria) o en columnas. */
  if (remoto.sueno) return remoto.sueno;
  const horas = remoto.sueno_horas;
  const calidad = remoto.sueno_calidad;
  if (horas == null && !calidad) return null;
  return { ...(horas == null ? {} : { horas: Number(horas) }), ...(calidad ? { calidad } : {}) };
}
