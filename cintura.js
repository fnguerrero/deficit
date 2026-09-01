/* ============================================================
   cintura.js — el dato que el IMC no puede saber.

   Salió de cuerpo.js por tamaño, y la separación resultó ser la correcta: todo
   lo de cuerpo.js se recalcula solo —el peso de la balanza, los entrenamientos
   de la semana—, y esto es lo único que hay que ir a medir a mano.
   ============================================================ */

/* ============================================================
   La cintura.

   El IMC no sabe dónde tenés el peso. Dos personas de 82 kg y 1,78 m dan
   exactamente el mismo muñeco, y una puede tener panza y la otra piernas.
   La cintura es el único dato barato que distingue esos dos cuerpos.

   NO es un dato del día y la app no lo pide todos los días: un centímetro de
   cintura son semanas, y medirla bien tiene fricción —encontrar el ombligo, no
   contraer, no apretar la cinta—. Se carga cuando uno quiere y el último valor
   queda vigente, igual que la altura. Sin fecha, sin racha y sin reproche.
   ============================================================ */

const CINTURA_MIN = 40;
const CINTURA_MAX = 200;

/**
 * El índice cintura-altura, que es la forma seria de leer este número.
 *
 * Predice riesgo metabólico mejor que el IMC porque mira dónde está la grasa y
 * no cuánto pesás: el umbral es 0,5 —la cintura, menos de la mitad de tu
 * altura— y vale igual para cualquier contextura.
 */
function icaDe(cinturaCm, alturaCm) {
  const cm = Number(cinturaCm);
  const a = Number(alturaCm);
  if (!isFinite(cm) || !isFinite(a)) return null;
  if (cm < CINTURA_MIN || cm > CINTURA_MAX) return null;
  if (a < ALTURA_MIN || a > ALTURA_MAX) return null;
  return +(cm / a).toFixed(3);
}

const ICA_UMBRAL = 0.5;

function bandaICA(ica) {
  if (ica == null) return null;
  if (ica < 0.4) return { id: 'bajo', nombre: 'Por debajo de lo habitual' };
  if (ica < ICA_UMBRAL) return { id: 'sano', nombre: 'Dentro de lo saludable' };
  if (ica < 0.6) return { id: 'riesgo', nombre: 'Riesgo aumentado' };
  return { id: 'alto', nombre: 'Riesgo alto' };
}

/*
 * La cintura que le corresponde a ese IMC.
 *
 * Sale de que el ICA sube junto con el IMC: cerca de 0,45 en IMC 22, de 0,55 en
 * IMC 30 y de 0,66 en IMC 40. La recta que pasa por esos tres puntos alcanza,
 * porque lo que se dibuja no es este número sino cuánto te APARTÁS de él.
 */
function icaEsperado(imc) {
  return 0.20 + Math.min(imc ?? 0, IMC_MAX) * 0.0115;
}

/* Cuánto apartarse satura el eje: 0,08 de ICA son unos 14 cm en 1,78 m, que es
   la diferencia entre una panza y no tenerla. */
const FORMA_RANGO = 0.08;

/**
 * Dónde tenés el peso, de -1 (afinado, el peso está en otro lado) a +1 (panza).
 *
 * Sin cintura cargada devuelve 0 y el dibujo queda exactamente como antes: el
 * eje es aditivo a propósito, así nadie ve cambiar su muñeco por una función
 * nueva que todavía no alimentó con nada.
 */
function formaDe(cinturaCm, alturaCm, imc) {
  const ica = icaDe(cinturaCm, alturaCm);
  if (ica == null || imc == null) return 0;
  const t = (ica - icaEsperado(imc)) / FORMA_RANGO;
  return +Math.min(1, Math.max(-1, t)).toFixed(3);
}

/* De qué ICA a qué ICA se recorre el eje de la grasa. 0,40 es una cintura
   marcada y 0,70 es una panza grande; fuera de esos dos números el dibujo ya
   no tiene a dónde ir. */
const ICA_FINO = 0.40;
const ICA_ANCHO = 0.70;

/**
 * Cuánta panza hay, de 0 a 1, o null si no se midió.
 *
 * Devuelve lo mismo que la contextura del IMC pero sacado de la cinta métrica,
 * y por eso REEMPLAZA a esa contextura en vez de corregirla: entre una medida
 * y una estimación gana la medida. El IMC es un sustituto que se usa mientras
 * no haya cintura, no un dato mejor.
 *
 * Es también lo que arregla el caso que el IMC no puede: quien entrena mucho
 * recibe un descuento por músculo, y con ese descuento una panza de 110 cm
 * quedaba dibujada como un abdomen marcado.
 */
function grasaDe(ica) {
  if (ica == null) return null;
  const t = (ica - ICA_FINO) / (ICA_ANCHO - ICA_FINO);
  return +Math.min(1, Math.max(0, t)).toFixed(3);
}

/**
 * La última cintura conocida.
 *
 * Al revés que el peso, acá manda el perfil: no se guarda por día porque no es
 * un dato del día. Igual se miran los días por si alguna vez se anotó ahí.
 */
function ultimaCinturaConocida(perfil, dias, hasta = hoyISO()) {
  const pc = Number(perfil?.cintura);
  if (pc >= CINTURA_MIN && pc <= CINTURA_MAX) return pc;

  for (let i = 0; i < 365; i++) {
    const f = sumarDias(hasta, -i);
    if (!f) break;
    const c = Number(dias?.[f]?.cintura);
    if (c >= CINTURA_MIN && c <= CINTURA_MAX) return c;
  }
  return null;
}
