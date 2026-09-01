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

/* ---------------- cuando el modo no cuadra hace días ---------------- */

/*
 * Si casi nada entra en el modo, varios días seguidos.
 *
 * El aviso por comida hace su trabajo: te dice que ese plato te saca de
 * cetosis. Pero repetido cinco días es un cartel siempre encendido, y un
 * cartel siempre encendido deja de leerse.
 *
 * Lo que la app puede notar y no decía: que el patrón no es un desliz sino
 * otra cosa. O el modo no es el que querés, o hace falta un plan distinto para
 * llegar a él. Cualquiera de las dos es una conversación que conviene tener
 * una vez, no en cada foto.
 *
 * No juzga si está bien o mal: solo dice lo que pasó y deja la decisión.
 */
/** "pan, fideos y alfajor": una coma entre todos menos el último. */
function listaEnTexto(items) {
  const l = (items || []).filter(Boolean);
  if (l.length <= 1) return l[0] || '';
  return l.slice(0, -1).join(', ') + ' y ' + l[l.length - 1];
}

const DIAS_PARA_DUDAR = 4;
const PISO_ADHERENCIA = 0.34;   // menos de un tercio de las comidas entrando

function modoQueNoCuadra(dias, idModo, objetivo, { hasta = hoyISO(), largo = 7 } = {}) {
  const modo = modoDe(idModo);
  if (!modo) return null;

  let diasFuera = 0;
  let diasConDatos = 0;

  for (let i = 0; i < largo; i++) {
    const f = sumarDias(hasta, -i);
    const comidas = (dias?.[f]?.comidas) || [];
    if (!comidas.length) continue;

    diasConDatos++;

    /* Cada comida contra lo que ya se había comido ese día, igual que en la
       pantalla: contra el total del día no entraría nunca ninguna. */
    const acumulado = { carb: 0, fibra: 0 };
    let entran = 0;

    for (const c of [...comidas].sort((a, b) => a.ts - b.ts)) {
      if (comidaApta(c, idModo, objetivo, { ...acumulado }).nivel !== 'no') entran++;
      acumulado.carb += Number(c.carb) || 0;
      acumulado.fibra += Number(c.fibra) || 0;
    }

    if (entran / comidas.length < PISO_ADHERENCIA) diasFuera++;
  }

  /* Con pocos días registrados no hay patrón, hay poca información. */
  if (diasConDatos < DIAS_PARA_DUDAR || diasFuera < DIAS_PARA_DUDAR) return null;

  /*
   * El aviso empuja hacia el modo, no hacia afuera.
   *
   * Antes decía "puede ser que te sirva otro modo", y eso es ofrecer bajar la
   * vara justo cuando cuesta: si elegiste keto, lo que hace falta saber es por
   * cuánto te estás pasando y qué lo trae, que es sobre lo que se puede hacer
   * algo mañana. Cambiar de modo sigue estando, pero como la segunda opción.
   */
  const fuente = loQueTeSaca(dias, modo.carbosMaxDia, { hasta, largo });
  const detalle = fuente && fuente.porDia > fuente.techo
    ? ` Venís en ${fmtNum(fuente.porDia)} g de carbos por día y el techo son ${fmtNum(fuente.techo)}.` +
      (fuente.culpables.length ? ` Lo que más te saca: ${listaEnTexto(fuente.culpables)}.` : '')
    : '';

  return {
    dias: diasFuera,
    modo: modo.nombre,
    fuente,
    texto: `Hace ${diasFuera} días que casi nada entra en ${modo.nombre}.${detalle}`
  };
}
