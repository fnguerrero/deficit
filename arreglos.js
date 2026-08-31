/* ============================================================
   arreglos.js — qué sacar para que una comida entre en el modo.

   Salió de modos.js, que llegó a su límite. La división quedó natural:
   `modos.js` sabe qué pide cada dieta y si una comida entra; acá está la
   pregunta siguiente, que es la única que se hace alguien a quien le dijeron
   que no —**y entonces qué hago**.

   Decir "no entra" y callarse es la mitad del trabajo.
   ============================================================ */

/*
 * Decir "no entra" y callarse es la mitad del trabajo.
 *
 * Cuando una comida se pasa por una cantidad —carbohidratos en keto, tamaño en
 * el resto— casi siempre alcanza con sacar algo, y lo que hace falta es saber
 * QUÉ y CUÁNTO. Eso se puede calcular: hay un exceso medido y una lista de
 * alimentos con lo que aporta cada uno.
 *
 * Cuando el problema es un ingrediente —gluten, carne, azúcar agregada— no hay
 * cuenta que valga: sacando eso deja de ser el plato. Ahí se dice que no y
 * listo, que es más honesto que inventar un reemplazo.
 */

/** "3 empanadas" son 3; "150 g" no son unidades y devuelve 0. */
function unidadesDe(porcion) {
  const t = String(porcion || '').trim();
  if (/\d\s*(g|gr|gramos?|ml|cc|kg|l|litros?)\b/i.test(t)) return 0;
  const m = t.match(/^(\d+)\b/);
  const n = m ? Number(m[1]) : 0;
  return n > 1 ? n : 0;
}

/*
 * Fracciones que una persona puede ejecutar. "Dejá el 37 %" no lo hace nadie.
 *
 * Y se corta en la mitad a propósito: "dejá tres cuartos sin comer" no es un
 * consejo, es no comer con más palabras. Si hace falta más que eso, la
 * respuesta honesta es que el plato no entra.
 */
const FRACCIONES = [
  { f: 0.25, txt: 'un cuarto' },
  { f: 1 / 3, txt: 'un tercio' },
  { f: 0.5, txt: 'la mitad' }
];

/** La fracción ejecutable más chica que alcance para sacar `parte` de `total`. */
function fraccionQueAlcanza(parte, total) {
  if (!(total > 0)) return null;
  const necesaria = parte / total;
  if (necesaria > 0.5) return null;
  return FRACCIONES.find(x => x.f >= necesaria) || null;
}

/**
 * Qué sacar para que la comida entre en el modo.
 *
 * `campo` es lo que hay que bajar ('carb' o 'calorias') y `exceso` cuánto.
 * Devuelve el texto del consejo, o null si no hay forma.
 */
function queSacar(items, campo, exceso) {
  const lista = (items || [])
    .map(i => ({ nombre: i.nombre || 'eso', porcion: i.porcion, cuanto: Number(i[campo]) || 0 }))
    .filter(i => i.cuanto > 0)
    .sort((a, b) => b.cuanto - a.cuanto);

  if (!lista.length || exceso <= 0) return null;

  /* Primero se intenta con UNO solo, y con la parte más chica que alcance:
     sacar una empanada de tres es una corrección que se hace; sacar todo el
     plato no es una corrección, es no comer. */
  for (const it of lista) {
    if (it.cuanto < exceso) continue;

    const nombre = it.nombre.toLowerCase();
    const n = unidadesDe(it.porcion);

    if (n) {
      // en unidades se dice en unidades: "sacá 1 de las 3 empanadas"
      const sacar = Math.ceil((exceso / it.cuanto) * n);
      if (sacar < n) return `Sacá ${sacar} de las ${n} ${nombre} y entra.`;
      // si hay que sacarlas todas, sigue de largo al caso de abajo
    } else {
      const fr = fraccionQueAlcanza(exceso, it.cuanto);
      if (fr) return `Dejá ${fr.txt} de ${nombre} sin comer y entra.`;
    }

    /* Sacarlo entero es un consejo solo si queda algo de comer. Con un plato de
       un solo alimento, "sacá los fideos" es "no cenes". */
    if (lista.length > 1) return `Sacá ${nombre} y entra.`;
    return null;
  }

  /* Con uno no alcanzó: se van sumando de mayor a menor. Si hay que sacar
     todo, no es un consejo. */
  const fuera = [];
  let junta = 0;
  for (const it of lista) {
    fuera.push(it.nombre.toLowerCase());
    junta += it.cuanto;
    if (junta >= exceso) break;
  }

  if (junta < exceso || fuera.length >= lista.length) return null;

  const cuales = fuera.length === 1
    ? fuera[0]
    : `${fuera.slice(0, -1).join(', ')} y ${fuera.at(-1)}`;
  return `Sacá ${cuales} y entra.`;
}

/**
 * El consejo para una comida que no entra en el modo.
 *
 * Devuelve `{ posible, texto }`. Con `posible: false` el texto explica por qué
 * no hay arreglo, que es lo que la persona necesita saber para no quedarse
 * buscándole la vuelta a un plato que no la tiene.
 */
function comoHacerlaApta(comida, idModo = MODO_DEFECTO, objetivo = null, consumidoHoy = null) {
  const modo = modoDe(idModo);
  const items = comida?.items || [];

  // el problema es un ingrediente: no hay cuenta que lo arregle
  const p = comida?.perfil || null;
  if (p && modo.regla) {
    const v = porPatron(modo.regla, p, {
      kcal: Number(comida?.kcal) || 0,
      prot: Number(comida?.prot) || 0,
      sodio: Number(comida?.sodio) || 0
    });
    if (v && !v.apta) {
      return { posible: false, texto: 'No hay forma de acomodarla: el problema es de qué está hecha.' };
    }
  }

  // keto: sobran gramos de carbohidrato neto
  if (modo.carbosMaxDia) {
    const exceso = (carbosNetos(consumidoHoy) + carbosNetos(comida)) - modo.carbosMaxDia;
    if (exceso <= 0) return { posible: true, texto: '' };

    /* Se saca por netos, igual que se cuenta: sacar la ensalada para bajar
       carbohidratos sería el consejo exactamente al revés. */
    const porNetos = items.map(i => ({
      ...i,
      netos: Math.max(0, (Number(i.carbohidratos) || 0) - (Number(i.fibra) || 0))
    }));

    const texto = queSacar(porNetos, 'netos', exceso);
    return texto
      ? { posible: true, texto }
      : { posible: false, texto: `Se pasa por ${Math.round(exceso)} g netos y no hay de dónde sacarlos: es no apta.` };
  }

  // el resto: la comida se lleva demasiado del día
  if (objetivo?.kcal) {
    const kcal = Number(comida?.kcal) || 0;
    const tope = objetivo.kcal * 0.6;
    const exceso = kcal - tope;
    if (exceso <= 0) return { posible: true, texto: '' };

    const texto = queSacar(items, 'calorias', exceso);
    return texto
      ? { posible: true, texto }
      : { posible: false, texto: `Se pasa por ${Math.round(exceso)} kcal y no hay de dónde sacarlas: es no apta.` };
  }

  return { posible: true, texto: '' };
}
