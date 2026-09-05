/* ============================================================
   consecuencias.js — qué SIGNIFICA que una comida no entre.

   Salió de arreglos.js al pasar su límite, y el corte cayó donde estaba la
   costura: `arreglos.js` responde "y entonces qué hago con este plato";
   acá está la otra mitad, la que la app no contestaba —"y esto qué me
   cambia"—, en sus tres escalas: la comida que todavía puede salvarse con la
   pregunta abierta, el día, y varios días seguidos.

   Un veredicto sin su consecuencia se lee siempre peor de lo que es.
   ============================================================ */

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

/* ---------------- la duda que todavia puede salvarla ---------------- */

/**
 * La opcion de la pregunta abierta que haria entrar a la comida en el modo.
 *
 * El cartel decia "no hay forma de acomodarla" mientras, tres centimetros mas
 * abajo, la app preguntaba "el licuado de yogur, lleva azucar agregada?" y
 * ofrecia "yogur natural sin azucar" —que es justo lo que sacaba el motivo del
 * rechazo—. Dos afirmaciones opuestas en la misma pantalla, y la que estaba
 * mal era la del cartel: el veredicto se calculaba con la duda todavia abierta,
 * o sea sobre una comida que la app misma no sabe cual es.
 *
 * No alcanza con detectar que hay una pregunta: hay que PROBAR sus opciones. Si
 * ninguna la salva, "no hay forma" es verdad y hay que decirlo igual; mandar a
 * la persona a tocar botones que no cambian nada seria la otra forma de
 * mentirle.
 *
 * Una duda ya resuelta no cuenta: ahi el veredicto es sobre lo que eligio.
 */
function opcionQueLaSalva(comida, idModo = MODO_DEFECTO, objetivo = null, previo = null) {
  const amb = comida?.ambiguedad;
  if (!hayQuePreguntar(amb) || amb.elegida != null) return null;

  for (let i = 0; i < amb.opciones.length; i++) {
    const v = comidaApta(aplicarOpcion(comida, i), idModo, objetivo, previo);
    if (v && v.nivel !== 'no') {
      return { indice: i, etiqueta: String(amb.opciones[i].etiqueta || '').trim(), item: amb.item || '' };
    }
  }
  return null;
}

/* ---------------- y que consecuencia tiene ---------------- */

/**
 * Que significa para el dia que esta comida no entre.
 *
 * Es la pregunta que el cartel no contestaba: la persona ve rojo, "no apto" y
 * "no hay forma", y no tiene con que medir si eso le rompio el dia. Casi nunca
 * se lo rompe — el casillero de Comidas pide UNA comida que entre, no todas—,
 * y ese dato cambia por completo como se lee el aviso.
 *
 * Se cuenta sobre el dia entero, con esta comida adentro: si ya hay otra que
 * entra, el casillero ya esta verde y no hay nada que hacer.
 */
function consecuenciaNoApta(dia, idModo = MODO_DEFECTO, objetivo = null) {
  const comidas = dia?.comidas || [];
  if (!comidas.length) return '';

  const entran = comidasQueEntran(comidas, idModo, objetivo);
  return entran > 0
    ? 'El día ya tiene otra comida que entra en el modo, así que el casillero de Comidas sigue cumplido.'
    : 'Todavía ninguna comida del día entró en el modo. Con que entre una, el casillero queda cumplido.';
}
