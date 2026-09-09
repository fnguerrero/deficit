/* ============================================================
   macros.js — leer un macro, no solo mostrarlo.

   Salio de chequeos.js, que estaba clavado en su limite. Es lo unico de ese
   archivo que traduce un numero a una frase sobre las proteinas, los carbos y
   las grasas: el resto son colores y avisos del dia.
   ============================================================ */

/* ---------------- leer un macro, no solo mostrarlo ---------------- */

/*
 * Qué decir de un macro además del número.
 *
 * "64 / 180 g" obliga a hacer la resta y a acordarse de si en ese macro conviene
 * llegar o no pasarse. La app tiene las dos cosas y puede decirlas: cuánto falta
 * o cuánto sobra, y si eso está bien o mal.
 *
 * `mas` distingue los dos tipos de objetivo que hay: en proteína y fibra la meta
 * es llegar, y quedarse corto es el problema; en carbohidratos bajo keto o en
 * sodio la meta es un techo, y pasarse es el problema. El mismo número dice
 * cosas opuestas según cuál sea.
 */
function leerMacro(valor, meta, { mas = true, unidad = 'g', cerca = 0.9 } = {}) {
  const v = Number(valor) || 0;
  const m = Number(meta) || 0;
  if (!m) return { nivel: '', texto: '' };

  const falta = m - v;

  if (mas) {
    if (v >= m) return { nivel: 'bien', texto: 'Objetivo cumplido' };
    if (v >= m * cerca) return { nivel: 'cerca', texto: `Te faltan ${fmtNum(Math.round(falta))} ${unidad}` };
    return { nivel: 'falta', texto: `Te faltan ${fmtNum(Math.round(falta))} ${unidad}` };
  }

  /* Techo: pasarse es lo que importa, y por cuánto. Un 5 % de más no es lo
     mismo que el séptuple, y decir "te pasaste" en los dos casos iguala cosas
     que no son iguales. */
  if (v <= m) return { nivel: 'bien', texto: 'Dentro del objetivo' };
  return {
    nivel: v > m * 1.5 ? 'mal' : 'cerca',
    texto: `+${fmtNum(Math.round(v - m))} ${unidad} sobre el objetivo`
  };
}
