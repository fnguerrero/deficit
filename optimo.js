/* ============================================================
   optimo.js — el techo de cada objetivo, que es otra pregunta que el nivel.

   Salio de chequeos.js, que se estaba pasando de largo. `nivel` pinta el color
   y es indulgente a proposito; esto es lo contrario, y por eso puede ser
   exigente sin que la app se ponga a retar: no llegar no pinta nada, solo no
   da la estrella.
   ============================================================ */

/* ---------------- el optimo ---------------- */

/*
 * El optimo es otra pregunta, y por eso no sale del nivel.
 *
 * `nivel` pinta el color y es indulgente a proposito: los pasos y el ejercicio
 * nunca van en rojo porque un dia flojo no es una falla. `optimo` es lo
 * contrario —el techo, no el piso— y por eso puede ser exigente sin que la app
 * se ponga a retar: no cumplirlo no pinta nada, solo no da la estrella.
 *
 * Mezclarlos habria roto una de las dos: o el ejercicio empezaba a verse mal
 * los dias de media hora, o la estrella se ganaba con cinco minutos.
 */
const OPTIMO_PASOS = 6000;
const OPTIMO_EJERCICIO_MINUTOS = 30;
const OPTIMO_EJERCICIO_KCAL = 300;
const OPTIMO_SUENO_MIN = 7;
const OPTIMO_SUENO_MAX = 9;
const OPTIMO_COMIDAS = 4;

/*
 * Dormir bien no son solo las horas.
 *
 * Ocho horas dando vueltas en la cama no son un sueno optimo, y el unico que
 * sabe eso es el que se levanto: por eso el animo entra en la cuenta. De
 * `normal` para arriba, que es "no me levante mal"; sin el animo cargado no se
 * puede saber, y la estrella no se da por las dudas.
 */
const ANIMOS_OPTIMOS = ['normal', 'bien', 'genial'];

/** Los minutos anotados de un dia. Un total puesto a mano no tiene. */
function minutosDeMovimientos(d) {
  const movs = typeof movimientosDe === 'function' ? movimientosDe(d) : [];
  return movs.reduce((a, m) => a + (Number(m.minutos) || 0), 0);
}

/** Cuantas kcal se pueden comer hoy, ya contando lo que se quemo entrenando. */
function topeDelDia(d) {
  if (typeof calcular !== 'function') return 0;
  const calc = calcular();
  if (!calc?.objetivo) return 0;
  return typeof objetivoEfectivo === 'function'
    ? objetivoEfectivo(calc.objetivo, d?.ejercicio)
    : calc.objetivo;
}

/**
 * Si un objetivo llego a su optimo.
 *
 * Devuelve false, y no null, cuando no se puede saber: el ejercicio cargado
 * como total a mano no dice cuanto duro, y una estrella no se da por las dudas.
 */
function esOptimo(id, d, { modo = null } = {}) {
  if (!d) return false;

  if (id === 'sueno') {
    const h = Number(d.sueno?.horas) || 0;
    return h >= OPTIMO_SUENO_MIN && h <= OPTIMO_SUENO_MAX
      && ANIMOS_OPTIMOS.includes(d.animo);
  }

  if (id === 'agua') {
    const meta = typeof metaVasos === 'function' ? metaVasos() : 0;
    return !!meta && (Number(d.agua) || 0) >= meta;
  }

  if (id === 'pasos') return (Number(d.pasos) || 0) >= OPTIMO_PASOS;

  /* Las dos juntas: cada una sola se cumple sin entrenar. Una caminata larga
     junta el tiempo y un rato corto muy intenso junta las calorias. */
  if (id === 'ejercicio') {
    return minutosDeMovimientos(d) >= OPTIMO_EJERCICIO_MINUTOS
      && (Number(d.ejercicio) || 0) >= OPTIMO_EJERCICIO_KCAL;
  }

  /* Comer bien no es comer poco: cuatro comidas Y dentro del tope. Solo el
     numero premiaria picotear, y solo las calorias premiaria saltearse el
     almuerzo para llegar holgado a la noche. */
  if (id === 'comidas' || id === 'registro') {
    if ((d.comidas || []).length < OPTIMO_COMIDAS) return false;
    const tope = topeDelDia(d);
    if (!tope) return false;

    /*
     * Y ninguna comida afuera del modo.
     *
     * Cuatro comidas dentro del tope de calorias con un snack que rompe la
     * cetosis no son un dia optimo: la app lo estaba marcando en rojo en la
     * pantalla y dandole la estrella en la notificacion, al mismo tiempo. El
     * numero y las calorias no alcanzan cuando se eligio un modo que juzga QUE
     * se come, no cuanto.
     */
    const idModo = modo
      || (typeof state !== 'undefined' ? state?.perfil?.modo : null)
      || (typeof MODO_DEFECTO !== 'undefined' ? MODO_DEFECTO : null);
    if (idModo && typeof comidasQueEntran === 'function'
      && comidasQueEntran(d.comidas, idModo, tope) !== d.comidas.length) {
      return false;
    }
    /* Las kcal salen del dia que llega, NO de totalesDia(), que devuelve las del
       dia que la pantalla esta mostrando. El aviso pregunta siempre por hoy
       mientras la app puede estar abierta en el martes pasado, y ahi la estrella
       se ganaba o se perdia con las comidas de otro dia. */
    const t = typeof sumarComidas === 'function' ? sumarComidas(d.comidas) : null;
    return !!t && (Number(t.kcal) || 0) <= tope;
  }

  return false;
}

/**
 * Que hay que hacer para ganarse la estrella, dicho en la app.
 *
 * La meta del agua entra por parametro y solo se busca cuando se la necesita:
 * es lo unico de aca que depende del perfil, y hacerla salir del estado global
 * para todos los casos ataba el texto del sueno a que hubiera un estado
 * cargado.
 */
function textoOptimo(id, metaAgua = null) {
  if (id === 'agua') {
    const meta = metaAgua ?? (typeof metaVasos === 'function' ? metaVasos() : 0);
    return meta ? `Óptimo: llegar a los ${meta} vasos del día.` : 'Óptimo: llegar a la meta del día.';
  }
  return {
    sueno: `Óptimo: entre ${OPTIMO_SUENO_MIN} y ${OPTIMO_SUENO_MAX} horas, y haberte levantado de normal para arriba.`,
    pasos: `Óptimo: ${OPTIMO_PASOS.toLocaleString('es-AR')} pasos o más.`,
    ejercicio: `Óptimo: ${OPTIMO_EJERCICIO_MINUTOS} minutos o más y ${OPTIMO_EJERCICIO_KCAL} kcal o más, sumando todo lo del día.`,
    comidas: `Óptimo: ${OPTIMO_COMIDAS} comidas cargadas, sin pasarte de las calorías del día y ninguna fuera del modo.`
  }[id] || '';
}
