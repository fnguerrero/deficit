/* ============================================================
   patrones.js — juzga el plato por lo que TIENE, no por sus numeros.

   Salio de modos.js, que se estaba pasando de largo. Es la parte que mira las
   banderas del plato (tiene gluten, es frito, hay pescado) y no las calorias:
   una comida puede estar perfecta para el patron y ser igual demasiado grande,
   y de eso se ocupa modos.js.
   ============================================================ */

/* ---------------- reglas de cada patron alimentario ---------------- */

/**
 * Juzga el plato por lo que TIENE, no por sus numeros.
 *
 * Devuelve null cuando la regla no tiene nada que decir, y ahi sigue la logica
 * general de calorias. Es a proposito: una comida puede estar bien para el
 * patron y ser igual demasiado grande.
 */
function porPatron(regla, p, { kcal = 0, prot = 0, sodio = 0 } = {}) {
  if (regla === 'vegetariana') {
    if (p.vegetariano === false) {
      return { apta: false, nivel: 'no', motivo: 'Tiene carne, ave o pescado.' };
    }
    return null;
  }

  if (regla === 'singluten') {
    if (p.gluten) {
      return { apta: false, nivel: 'no', motivo: 'Tiene gluten: trigo, avena, cebada o centeno.' };
    }
    return null;
  }

  if (regla === 'mediterranea') {
    // lo que la saca de una: procesados y azucar agregada
    if (p.ultraprocesado) {
      return { apta: false, nivel: 'no', motivo: 'Es ultraprocesado, que es lo que esta dieta evita.' };
    }
    if (p.azucarAgregada) {
      return { apta: false, nivel: 'no', motivo: 'Tiene azúcar agregada.' };
    }
    if (p.frito) {
      return { apta: true, nivel: 'justo', motivo: 'Frito: entra, pero no es lo habitual en esta dieta.' };
    }
    if (p.carneRoja) {
      return { apta: true, nivel: 'justo', motivo: 'Carne roja: acá va poco y de vez en cuando.' };
    }
    // lo que la define
    if (p.pescado || p.legumbres || (p.vegetales && p.aceiteOliva)) {
      return { apta: true, nivel: 'si', motivo: 'Justo lo que busca esta dieta.' };
    }
    if (!p.vegetales) {
      return { apta: true, nivel: 'justo', motivo: 'Sin verduras a la vista.' };
    }
    return null;
  }

  if (regla === 'paleo') {
    if (p.cereales) return { apta: false, nivel: 'no', motivo: 'Tiene cereales, que acá no van.' };
    if (p.lacteos) return { apta: false, nivel: 'no', motivo: 'Tiene lácteos.' };
    if (p.ultraprocesado) return { apta: false, nivel: 'no', motivo: 'Es ultraprocesado.' };
    if (p.azucarAgregada) return { apta: false, nivel: 'no', motivo: 'Tiene azúcar agregada.' };
    if (p.legumbres) return { apta: true, nivel: 'justo', motivo: 'Las legumbres son discutidas en paleo.' };
    return null;
  }

  if (regla === 'dash') {
    // acá el enemigo es la sal, y eso se mide con el sodio del análisis
    if (sodio > 800) return { apta: false, nivel: 'no', motivo: `${Math.round(sodio)} mg de sodio en una comida es mucho para esta dieta.` };
    if (p.ultraprocesado) return { apta: false, nivel: 'no', motivo: 'Los ultraprocesados son la principal fuente de sal escondida.' };
    if (sodio > 500) return { apta: true, nivel: 'justo', motivo: `${Math.round(sodio)} mg de sodio: mirá el resto del día.` };
    if (p.vegetales || p.frutas) return { apta: true, nivel: 'si', motivo: 'Con verduras o fruta, como corresponde.' };
    return null;
  }

  if (regla === 'flexi') {
    // no prohíbe la carne: solo avisa, que es lo que la hace sostenible
    if (p.carneRoja) return { apta: true, nivel: 'justo', motivo: 'Carne roja: acá va de vez en cuando, no todos los días.' };
    if (p.vegetariano || p.legumbres) return { apta: true, nivel: 'si', motivo: 'Base vegetal, que es de lo que se trata.' };
    return null;
  }

  if (regla === 'sinlactosa') {
    if (p.lacteos) return { apta: false, nivel: 'no', motivo: 'Tiene lácteos.' };
    return null;
  }

  if (regla === 'antiinflamatoria') {
    if (p.azucarAgregada) return { apta: false, nivel: 'no', motivo: 'El azúcar agregada es justo lo que esta dieta saca.' };
    if (p.ultraprocesado) return { apta: false, nivel: 'no', motivo: 'Es ultraprocesado.' };
    if (p.frito) return { apta: false, nivel: 'no', motivo: 'Frito: las grasas oxidadas van en contra.' };
    if (p.pescado || p.frutosSecos || p.aceiteOliva) return { apta: true, nivel: 'si', motivo: 'Grasas buenas: justo lo que busca.' };
    if (p.vegetales) return { apta: true, nivel: 'si', motivo: 'Con verduras.' };
    return null;
  }

  if (regla === 'proteina') {
    // una comida de tamaño real tiene que aportar proteina
    if (kcal > 250) {
      const pctProt = (prot * 4) / kcal;
      if (pctProt < 0.15) {
        return { apta: false, nivel: 'no', motivo: `Solo ${Math.round(prot)} g de proteína para ${Math.round(kcal)} kcal.` };
      }
      if (pctProt < 0.25) {
        return { apta: true, nivel: 'justo', motivo: `${Math.round(prot)} g de proteína: podría tener más.` };
      }
      return { apta: true, nivel: 'si', motivo: `${Math.round(prot)} g de proteína.` };
    }
    return null;
  }

  return null;
}
