/* ============================================================
   sonidos.js — los sonidos, sintetizados.

   Sin un solo archivo de audio: son osciladores de WebAudio. Un paquete de
   sonidos decente pesa más que toda la app, y acá hacen falta cinco pitidos de
   medio segundo, no una banda sonora.

   Tres reglas que valen más que los sonidos en sí:

   · **Arranca apagado.** Un sonido inesperado en el colectivo se apaga para
     siempre, y con él se pierde todo lo que el sonido podría haber aportado.
   · **`prefers-reduced-motion` manda.** Quien pidió menos estímulos al sistema
     operativo ya dijo lo que quiere; no hay que volver a preguntárselo.
   · **Si el navegador lo bloquea, no pasa nada.** El audio necesita un gesto
     previo del usuario y a veces simplemente no está. Eso no puede tirar abajo
     la acción que lo disparó: primero se guarda el dato, después suena.
   ============================================================ */

/*
 * Cada sonido es una lista de notas: frecuencia, cuándo entra y cuánto dura.
 *
 * Las melodías suben cuando la noticia es buena y bajan cuando no. Es lo único
 * que hace falta para que se entienda sin haberlo escuchado nunca.
 */
const SONIDOS = {
  // un blip corto y alegre: se escucha muchas veces por día
  objetivo: { onda: 'sine', vol: 0.16, notas: [[660, 0, 0.07], [880, 0.06, 0.11]] },

  // el arpegio de subir de nivel, que pasa poco y puede darse el lujo
  nivel: { onda: 'triangle', vol: 0.2, notas: [[523, 0, 0.1], [659, 0.09, 0.1], [784, 0.18, 0.1], [1047, 0.27, 0.22]] },

  // la racha: tres golpes iguales, como contando
  racha: { onda: 'square', vol: 0.12, notas: [[880, 0, 0.06], [880, 0.1, 0.06], [1175, 0.2, 0.14]] },

  // el logro, la fanfarria más larga de todas
  logro: { onda: 'triangle', vol: 0.22, notas: [[659, 0, 0.1], [659, 0.1, 0.08], [784, 0.19, 0.1], [1047, 0.3, 0.28]] },

  // fallar suena grave y cae: es el único que baja
  fallo: { onda: 'sine', vol: 0.14, notas: [[330, 0, 0.12], [247, 0.11, 0.22]] }
};

/**
 * El reproductor.
 *
 * Todo lo de afuera entra por parámetro —el constructor de AudioContext, si
 * está activado, si el sistema pidió menos estímulos— para que se pueda probar
 * sin hacer ruido y sin un navegador de verdad.
 */
function crearSonidos({ Ctx = null, activo = () => false, reducido = () => false } = {}) {
  const Constructor = Ctx || (typeof globalThis !== 'undefined'
    ? (globalThis.AudioContext || globalThis.webkitAudioContext)
    : null);

  let ctx = null;
  let roto = false;

  function contexto() {
    if (roto) return null;
    if (ctx) return ctx;
    try {
      if (!Constructor) { roto = true; return null; }
      ctx = new Constructor();
      return ctx;
    } catch (e) {
      /* Pasa de verdad: navegadores que exigen un gesto previo, contextos
         agotados, un iframe sin permiso. No es un error de la app. */
      roto = true;
      return null;
    }
  }

  function sonar(id) {
    const receta = SONIDOS[id];
    if (!receta) return false;
    if (!activo() || reducido()) return false;

    const c = contexto();
    if (!c) return false;

    try {
      if (c.state === 'suspended' && c.resume) c.resume();
      const ahora = c.currentTime;

      for (const [hz, desde, dura] of receta.notas) {
        const osc = c.createOscillator();
        const gan = c.createGain();

        osc.type = receta.onda;
        osc.frequency.value = hz;

        /* La envolvente no es cosmética: un oscilador que arranca y corta de
           golpe hace un "click" audible en los graves. */
        gan.gain.setValueAtTime(0, ahora + desde);
        gan.gain.linearRampToValueAtTime(receta.vol, ahora + desde + 0.012);
        gan.gain.exponentialRampToValueAtTime(0.0001, ahora + desde + dura);

        osc.connect(gan);
        gan.connect(c.destination);
        osc.start(ahora + desde);
        osc.stop(ahora + desde + dura + 0.02);
      }
      return true;
    } catch (e) {
      roto = true;
      return false;
    }
  }

  return {
    sonar,
    get disponible() { return !roto && !!Constructor; },
    /* Para el interruptor: deja escuchar cómo suena antes de decidir. */
    probar: () => sonar('objetivo')
  };
}

/** Si el sistema pidió menos movimiento y menos estímulo. */
function prefiereQuieto() {
  try {
    return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch (e) {
    return false;
  }
}
