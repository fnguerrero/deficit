/* ============================================================
   personaje.js — el personaje, dibujado.

   Es un SVG paramétrico, no ocho dibujos: un puñado de números entra y sale la
   figura. Eso es lo que permite que el cuerpo sea CONTINUO —que un kilo se note
   un poquito— en vez de tener cuatro muñecos y saltar entre ellos.

   Tres ejes, y son independientes a propósito:

     · el CUERPO sale de cuerpo.js: tu IMC medido y tus entrenamientos;
     · la CARA sale de mascota.js: cómo viene el día de hoy;
     · la POSTURA acompaña a la cara, no al cuerpo.

   Por qué importa la separación: si comer de más engordara al muñeco, la app
   sería un reproche diario disfrazado de personaje. Comer de más pone cara de
   culpa. El cuerpo lo mueve la balanza.
   ============================================================ */

const PALETA = {
  piel: '#e3ac7d',
  pielSombra: '#c88e5f',
  pelo: '#3b2b22',
  peloBrillo: '#54402f',
  /* El verde de siempre: es lo que mantiene al personaje reconocible aunque
     haya cambiado de especie y se haya quedado sin nombre. */
  remera: '#5fbf6a',
  remeraOsc: '#49a355',
  short: '#3f4a5c',
  shortOsc: '#333c4b',
  zapa: '#2f3a4a',
  zapaOsc: '#e9edf2',
  ojo: '#ffffff',
  pupila: '#2b2620',
  boca: '#a8524a',
  bocaOsc: '#8c3f38',
  ceja: '#33251d',
  mejilla: '#e08a86'
};

/* El lienzo.
   Crece hacia arriba y a los costados: el pelo de las fases sube bastante más
   que la cabeza y la postura de poder abre los brazos fuera del ancho del
   cuerpo. Con el lienzo justo, las puntas quedaban cortadas al ras y volvían a
   leerse como una corona. El origen negativo mantiene intactas todas las
   coordenadas del cuerpo. */
const VB = { x: -8, y: -46, w: 136, h: 222 };

/* Alturas de referencia del cuerpo, sobre el lienzo de arriba.

   Las proporciones son deliberadamente infantiles —la cabeza se lleva casi un
   tercio de la figura—, y no por estética: en la pantalla Hoy el personaje mide
   74 px de alto. Con proporciones realistas la cara quedaba en 12 px y no se
   distinguía un bostezo de una sonrisa, que es justamente lo único que hay que
   poder leer de un vistazo. */
const Y = { hombro: 70, pecho: 82, cintura: 98, cadera: 110, rodilla: 134, pie: 162 };

/* ---------------- las medidas ---------------- */

/**
 * De los dos ejes del cuerpo salen todos los anchos.
 *
 * Los coeficientes están elegidos para que los extremos sean personas y no
 * caricaturas: con contextura 1 la cintura pasa a los hombros (que es lo que
 * pasa de verdad), y con musculatura 1 los hombros ganan y la cintura afina.
 */
function medidasDe(contextura, musculatura, poder = 0) {
  const c = contextura == null ? 0.42 : Math.min(1, Math.max(0, contextura));
  const m = Math.min(1, Math.max(0, musculatura || 0));
  /* `poder` es el músculo que presta la fase. Entra en TODO lo que ensancha y
     en nada de lo que afina: una racha de días perfectos puede ponerte más
     grande, nunca más flaco. Afinar la cintura por cumplir sería decirte que ya
     bajaste de peso sin que la balanza haya dicho nada. */
  const p = Math.min(1, Math.max(0, poder || 0));

  return {
    c, m, p,
    hombro: 17 + c * 4 + m * 8 + p * 8,
    pecho: 15.5 + c * 12 + m * 4 + p * 4,
    cintura: 11.5 + c * 22 - m * 2,
    cadera: 13.5 + c * 16,
    brazo: 3.6 + c * 2.6 + (m + p) * 3.6,
    pierna: 5.4 + c * 5 + (m + p) * 1.8,
    cuello: 6 + c * 3 + (m + p) * 1.6,
    caraRx: 18.5 + c * 6.5,
    caraRy: 23
  };
}

/** El medio ancho del torso a una altura cualquiera, interpolando. */
function anchoEn(y, med) {
  const puntos = [
    [Y.hombro, med.hombro], [Y.pecho, med.pecho],
    [Y.cintura, med.cintura], [Y.cadera, med.cadera]
  ];

  if (y <= puntos[0][0]) return puntos[0][1];
  for (let i = 1; i < puntos.length; i++) {
    const [y0, a0] = puntos[i - 1];
    const [y1, a1] = puntos[i];
    if (y <= y1) return a0 + (a1 - a0) * ((y - y0) / (y1 - y0));
  }
  return puntos[puntos.length - 1][1];
}

/**
 * La silueta del torso entre dos alturas, muestreada.
 *
 * Muestrear en vez de escribir curvas a mano es lo que deja cortar el contorno
 * a cualquier altura — que es exactamente lo que hace falta para que la remera
 * y el short sigan el cuerpo en vez de ser dos rectángulos pegados encima.
 */
function silueta(med, desdeY, hastaY, paso = 2) {
  const izq = [];
  const der = [];

  for (let y = desdeY; y <= hastaY; y += paso) {
    const a = anchoEn(y, med);
    izq.push((60 - a).toFixed(1) + ' ' + y.toFixed(1));
    der.unshift((60 + a).toFixed(1) + ' ' + y.toFixed(1));
  }

  const aFin = anchoEn(hastaY, med);
  izq.push((60 - aFin).toFixed(1) + ' ' + hastaY.toFixed(1));
  der.unshift((60 + aFin).toFixed(1) + ' ' + hastaY.toFixed(1));

  return 'M ' + izq.join(' L ') + ' L ' + der.join(' L ') + ' Z';
}

/* ---------------- las poses ---------------- */

/*
 * La postura acompaña a la cara. Un cuerpo hundido con cara feliz no se lee, y
 * al revés tampoco: es el conjunto lo que dice el estado.
 *
 * hombros: cuánto se hunde el tronco (las piernas quedan plantadas)
 * cabeza: cuánto cae la cabeza · inclina: grados de ladeo
 */
const POSES = {
  neutral: { hombros: 0, cabeza: 0, inclina: 0, brazos: 0 },
  bien: { hombros: -1, cabeza: -1, inclina: 0, brazos: -3 },
  genial: { hombros: -2, cabeza: -2, inclina: 0, brazos: -26, festeja: true },
  flojo: { hombros: 2, cabeza: 1.5, inclina: 3, brazos: 2 },
  cansado: { hombros: 4, cabeza: 4, inclina: 8, brazos: 5 },
  seco: { hombros: 2, cabeza: 2, inclina: 4, brazos: 3 },
  pesado: { hombros: 4, cabeza: 3, inclina: 5, brazos: 6 },
  triste: { hombros: 5, cabeza: 4, inclina: -4, brazos: 6 }
};

/*
 * La cara, en parámetros. Mismo criterio que en la versión anterior: las cejas
 * son donde vive casi toda la expresión, y por eso tienen tres controles
 * propios mientras que la boca tiene uno solo.
 */
const CARAS = {
  neutral: { ceja: 0, cejaY: 0, parpado: 0, boca: 'recta', mirada: [0, 0] },
  bien: { ceja: -5, cejaY: -1.5, parpado: 0, boca: 'sonrisa', mirada: [0, 0], mejillas: true },
  genial: { ceja: -9, cejaY: -2.5, parpado: 0, boca: 'risa', mirada: [0, -.5], mejillas: true, ojosFelices: true, brillos: true },
  flojo: { ceja: 8, cejaY: .5, parpado: .3, boca: 'recta', mirada: [0, .8] },
  cansado: { ceja: 12, cejaY: 1, parpado: .72, boca: 'chica', mirada: [0, 1.4], ojeras: true, zzz: true },
  seco: { ceja: 14, cejaY: 1, parpado: .15, boca: 'seca', mirada: [1, 0], gota: true },
  pesado: { ceja: 17, cejaY: 1.6, parpado: .3, boca: 'triste', mirada: [0, 1.8], ojeras: true },
  triste: { ceja: -20, cejaY: -.5, parpado: .15, boca: 'triste', mirada: [0, .5], lagrima: true },

  /* De la fase 2 para arriba la cara deja de ser una carita contenta: cejas
     hacia adentro, ojos apretados y la boca gritando. Una sonrisa tierna
     encima de un aura de fuego se contradice sola y gana la sonrisa. */
  furioso: { ceja: 24, cejaY: -1, parpado: .12, boca: 'grito', mirada: [0, -.4], intenso: true }
};

/* Un color mezclado con otro. Se usa para apagar la remera cuando el día viene
   mal: la piel no puede cambiar de color, pero la ropa sí. */
function mezclar(hexA, hexB, t) {
  const a = parseInt(hexA.slice(1), 16);
  const b = parseInt(hexB.slice(1), 16);
  const mix = (d) => {
    const va = (a >> d) & 255;
    const vb = (b >> d) & 255;
    return Math.round(va + (vb - va) * t).toString(16).padStart(2, '0');
  };
  return '#' + mix(16) + mix(8) + mix(0);
}

const APAGADOS = { flojo: .2, cansado: .42, seco: .3, pesado: .38, triste: .45 };

/* ---------------- las partes ---------------- */

function piernas(med, col, pose) {
  const sep = med.cadera * 0.5 + 1 + (pose?.piernas || 0) * 10;
  const g = med.pierna;
  const iz = 60 - sep;
  const de = 60 + sep;

  return `
    <g stroke="${col.piel}" fill="none" stroke-linecap="round">
      <path d="M${iz} ${Y.cadera - 4} L${iz - 1} ${Y.rodilla}" stroke-width="${(g * 2).toFixed(1)}"/>
      <path d="M${de} ${Y.cadera - 4} L${de + 1} ${Y.rodilla}" stroke-width="${(g * 2).toFixed(1)}"/>
      <path d="M${iz - 1} ${Y.rodilla} L${iz - 1.5} ${Y.pie - 4}" stroke-width="${(g * 1.55).toFixed(1)}"/>
      <path d="M${de + 1} ${Y.rodilla} L${de + 1.5} ${Y.pie - 4}" stroke-width="${(g * 1.55).toFixed(1)}"/>
    </g>
    <g fill="${PALETA.zapa}">
      <path d="M${iz - 7.5} ${Y.pie - 2} h13.5 a3.2 3.2 0 0 0 0 -6.5 h-9.5 a4.2 4.2 0 0 0 -4 3.2z"/>
      <path d="M${de + 7.5} ${Y.pie - 2} h-13.5 a3.2 3.2 0 0 1 0 -6.5 h9.5 a4.2 4.2 0 0 1 4 3.2z"/>
    </g>
    <g fill="${PALETA.zapaOsc}">
      <path d="M${iz - 8} ${Y.pie - 2} h14.5 v2.6 h-14.5z"/>
      <path d="M${de + 8} ${Y.pie - 2} h-14.5 v2.6 h14.5z"/>
    </g>`;
}

function brazos(med, pose, col) {
  const anchoSup = med.brazo * 2;
  const anchoInf = med.brazo * 1.6;

  /* El brazo nace apenas adentro del hombro y cae por FUERA del cuerpo. Con el
     codo hacia adentro quedaba escondido detras del torso y la figura parecia
     manca — que es exactamente lo que pasaba en la primera version. */
  const hx = med.hombro - med.brazo * 0.3;
  const codoY = Y.pecho + 12;
  const manoY = Y.cadera + 4;
  const codoX = Math.max(med.hombro, med.pecho) - med.brazo * 0.15;
  const manoX = Math.max(med.cintura, med.cadera) + med.brazo * 0.35;

  const uno = (s) => `
    <g transform="rotate(${(pose.brazos * s).toFixed(1)} ${60 + hx * s} ${Y.hombro + 4})">
      <path d="M${60 + hx * s} ${Y.hombro + 3} L${60 + codoX * s} ${codoY}"
        stroke="${col.piel}" stroke-width="${anchoSup.toFixed(1)}" stroke-linecap="round" fill="none"/>
      <path d="M${60 + codoX * s} ${codoY} L${60 + manoX * s} ${manoY}"
        stroke="${col.piel}" stroke-width="${anchoInf.toFixed(1)}" stroke-linecap="round" fill="none"/>
      <circle cx="${60 + manoX * s}" cy="${manoY + 2}" r="${(med.brazo * (pose.punos ? 1.25 : 0.95)).toFixed(1)}" fill="${col.piel}"/>
      ${pose.punos ? `<path d="M${(60 + manoX * s - med.brazo).toFixed(1)} ${manoY + 2} h${(med.brazo * 2).toFixed(1)}"
        stroke="${PALETA.pielSombra}" stroke-width="1.2" opacity=".6" stroke-linecap="round"/>` : ''}
      <path d="M${60 + (hx - med.brazo * 1.15) * s} ${Y.hombro - 2}
               L${60 + (hx + med.brazo * 1.15) * s} ${Y.hombro - 2}
               L${60 + (hx + med.brazo * 1.25) * s} ${Y.hombro + 11}
               q${(-med.brazo * 1.25 * s).toFixed(1)} 3 ${(-med.brazo * 2.5 * s).toFixed(1)} 0z" fill="${col.remera}"/>
      ${med.m + med.p > 0.55 ? `<path d="M${60 + (hx + 1.5) * s} ${Y.hombro + 9} q${2.5 * s} 4 ${-0.5 * s} 7"
        stroke="${PALETA.pielSombra}" stroke-width="1.1" fill="none" opacity=".5"/>` : ''}
    </g>`;

  return uno(-1) + uno(1);
}

function torso(med, col) {
  const hemRemera = Y.cadera + 3;
  const hemShort = Y.cadera + 17;

  /* La remera es la misma silueta del cuerpo cortada a la altura del ruedo: por
     eso sigue la panza en vez de quedar como un cartel colgado encima. */
  return `
    <path d="${silueta(med, Y.hombro - 4, Y.cadera + 2)}" fill="${col.piel}"/>
    <path d="${silueta(med, Y.cadera - 6, hemShort)}" fill="${col.short}"/>
    <path d="M60 ${Y.cadera + 4} v${hemShort - Y.cadera - 4}" stroke="${col.shortOsc}" stroke-width="1.4"/>
    <path d="${silueta(med, Y.hombro - 5, hemRemera)}" fill="${col.remera}"/>
    <path d="M60 ${Y.hombro - 2} q${(med.hombro * 0.6).toFixed(1)} 1 ${(med.hombro * 0.95).toFixed(1)} 4"
      stroke="${col.remeraOsc}" stroke-width="1" fill="none" opacity=".4"/>
    ${med.m + med.p > 0.5 ? `<path d="M60 ${Y.pecho - 2} v9" stroke="${col.remeraOsc}" stroke-width="1.2" opacity=".7"/>` : ''}
    <path d="M${(60 - med.cuello).toFixed(1)} ${Y.hombro - 9} h${(med.cuello * 2).toFixed(1)} v7 h-${(med.cuello * 2).toFixed(1)}z" fill="${col.piel}"/>
    <path d="M${(60 - med.cuello).toFixed(1)} ${Y.hombro - 4} q${med.cuello.toFixed(1)} 4 ${(med.cuello * 2).toFixed(1)} 0"
      stroke="${PALETA.pielSombra}" stroke-width="1.2" fill="none" opacity=".45"/>`;
}

function ojo(cx, cy, cara, r = 5.2) {
  const [mx, my] = cara.mirada;

  if (cara.ojosFelices) {
    return `<path d="M${cx - r} ${cy + 1} q${r} -${r * 1.4} ${r * 2} 0"
      stroke="${PALETA.pupila}" stroke-width="1.9" fill="none" stroke-linecap="round"/>`;
  }

  /* Ojo apretado: media elipse en vez del ojo redondo. Un ojo grande y redondo
     se lee tierno siempre, por más ceja enojada que tenga arriba. */
  if (cara.intenso) {
    return `<path d="M${(cx - r).toFixed(1)} ${(cy - 1).toFixed(1)} a${r} ${(r * 0.75).toFixed(1)} 0 0 1 ${(r * 2).toFixed(1)} 0
        a${r} ${(r * 0.35).toFixed(1)} 0 0 1 ${(r * -2).toFixed(1)} 0z" fill="${PALETA.ojo}"/>
      <circle cx="${cx}" cy="${(cy - 1.4).toFixed(1)}" r="${(r * 0.45).toFixed(1)}" fill="${PALETA.pupila}"/>`;
  }

  const px = cx + mx * 1.2;
  const py = cy + my * 1.1;
  const parpado = cara.parpado > 0
    ? `<path d="M${cx - r} ${cy} a${r} ${r} 0 0 1 ${r * 2} 0 z" fill="${PALETA.piel}"
         transform="translate(0 ${(-r * 2 + cara.parpado * r * 4).toFixed(1)})"/>`
    : '';

  return `
    <ellipse cx="${cx}" cy="${cy}" rx="${r}" ry="${(r * 1.05).toFixed(2)}" fill="${PALETA.ojo}"/>
    <circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="${(r * 0.5).toFixed(2)}" fill="${PALETA.pupila}"/>
    <circle cx="${(px - r * 0.18).toFixed(1)}" cy="${(py - r * 0.22).toFixed(1)}" r="${(r * 0.17).toFixed(2)}" fill="#fff" opacity=".9"/>
    ${cara.ojeras ? `<path d="M${(cx - r * 0.9).toFixed(1)} ${(cy + r * 1.5).toFixed(1)} q${(r * 0.9).toFixed(1)} ${(r * 0.5).toFixed(1)} ${(r * 1.8).toFixed(1)} 0"
      stroke="${PALETA.pielSombra}" stroke-width="1.1" fill="none" opacity=".7"/>` : ''}
    ${parpado}`;
}

function boca(tipo, cy) {
  if (tipo === 'risa') {
    return `<path d="M51 ${cy - 2} q9 12 18 0 q-9 4 -18 0z" fill="${PALETA.bocaOsc}"/>
            <path d="M54 ${cy + 3} q6 4 12 0" fill="${PALETA.boca}"/>`;
  }
  if (tipo === 'sonrisa') {
    return `<path d="M52.5 ${cy} q7.5 7.5 15 0" stroke="${PALETA.bocaOsc}" stroke-width="2.4" fill="none" stroke-linecap="round"/>`;
  }
  if (tipo === 'triste') {
    return `<path d="M53 ${cy + 4} q7 -7 14 0" stroke="${PALETA.bocaOsc}" stroke-width="2.4" fill="none" stroke-linecap="round"/>`;
  }
  if (tipo === 'seca') {
    return `<path d="M53 ${cy + 1} q7 3.5 14 0" stroke="${PALETA.bocaOsc}" stroke-width="2.4" fill="none" stroke-linecap="round"/>
            <path d="M56 ${cy + 5} h8" stroke="${PALETA.bocaOsc}" stroke-width="1.5" opacity=".6" stroke-linecap="round"/>`;
  }
  if (tipo === 'chica') {
    return `<ellipse cx="60" cy="${cy + 2}" rx="3.4" ry="2.8" fill="${PALETA.bocaOsc}"/>`;
  }
  if (tipo === 'grito') {
    return `<path d="M53 ${cy - 2} q7 -3 14 0 q-1 12 -7 12 q-6 0 -7 -12z" fill="${PALETA.bocaOsc}"/>
            <path d="M54.5 ${cy - 1} q5.5 -2 11 0 l-1 2.6 q-4.5 -1.6 -9 0z" fill="#ffffff"/>`;
  }
  return `<path d="M53.5 ${cy + 1} h13" stroke="${PALETA.bocaOsc}" stroke-width="2.4" stroke-linecap="round"/>`;
}

function cabeza(med, cara, col, fase) {
  const cy = 40;
  const rx = med.caraRx;
  const ry = med.caraRy;
  const ojoY = cy + 2;
  const sep = rx * 0.40;

  /* Con contextura alta la cara se redondea y aparece una sombra suave bajo la
     mandíbula. Es un trazo, no una deformación: la idea es que se reconozca el
     cuerpo, no que dé lástima. */
  const papada = med.c > 0.68
    ? `<path d="M${(60 - rx * 0.5).toFixed(1)} ${(cy + ry * 0.78).toFixed(1)} q${(rx * 0.5).toFixed(1)} ${((med.c - 0.5) * 8).toFixed(1)} ${rx.toFixed(1)} 0"
        stroke="${PALETA.pielSombra}" stroke-width="1.3" fill="none" opacity=".55"/>`
    : '';

  return `
    <path d="M${(60 - rx * 0.94).toFixed(1)} ${cy - 1} a4.4 4.4 0 0 0 0 9z" fill="${col.piel}"/>
    <path d="M${(60 + rx * 0.94).toFixed(1)} ${cy - 1} a4.4 4.4 0 0 1 0 9z" fill="${col.piel}"/>
    <ellipse cx="60" cy="${cy}" rx="${rx.toFixed(1)}" ry="${ry}" fill="${col.piel}"/>
    ${papada}
    ${pelo(cy, rx, ry, fase)}
    ${ojo(60 - sep, ojoY, cara)}
    ${ojo(60 + sep, ojoY, cara)}
    <g stroke="${PALETA.ceja}" stroke-width="2.6" stroke-linecap="round" fill="none">
      <path d="M${(60 - sep - 6).toFixed(1)} ${cy - 8} q6 -2.6 11.5 -1"
        transform="rotate(${cara.ceja} ${(60 - sep).toFixed(1)} ${cy - 8}) translate(0 ${(cara.cejaY * 1.4).toFixed(1)})"/>
      <path d="M${(60 + sep + 6).toFixed(1)} ${cy - 8} q-6 -2.6 -11.5 -1"
        transform="rotate(${-cara.ceja} ${(60 + sep).toFixed(1)} ${cy - 8}) translate(0 ${(cara.cejaY * 1.4).toFixed(1)})"/>
    </g>
    <path d="M60 ${cy + 7} q2.2 3.2 -.8 4" stroke="${PALETA.pielSombra}" stroke-width="1.6"
      fill="none" stroke-linecap="round" opacity=".8"/>
    ${cara.mejillas ? `<ellipse cx="${(60 - rx * 0.72).toFixed(1)}" cy="${cy + 10}" rx="4.4" ry="3" fill="${PALETA.mejilla}" opacity=".45"/>
       <ellipse cx="${(60 + rx * 0.72).toFixed(1)}" cy="${cy + 10}" rx="4.4" ry="3" fill="${PALETA.mejilla}" opacity=".45"/>` : ''}
    ${boca(cara.boca, cy + 14)}
    ${cara.lagrima ? `<path d="M${(60 - sep + 4).toFixed(1)} ${ojoY + 7} q2 5 0 7 q-2 -2 0 -7" fill="#7ec8f0" opacity=".85"/>` : ''}`;
}

function adornos(cara) {
  let out = '';
  if (cara.zzz) {
    out += `<g fill="${PALETA.pupila}" opacity=".45" font-family="system-ui" font-weight="700">
      <text x="90" y="30" font-size="13">z</text><text x="101" y="18" font-size="9">z</text></g>`;
  }
  if (cara.gota) out += `<path d="M88 30 q4.5 8 0 11.5 q-4.5 -3.5 0 -11.5" fill="#7ec8f0" opacity=".85"/>`;
  if (cara.brillos) {
    out += `<g fill="#ffd84d">
      <path d="M17 30 l2.6 6 6 2.6 -6 2.6 -2.6 6 -2.6 -6 -6 -2.6 6 -2.6z"/>
      <path d="M102 54 l1.9 4.4 4.4 1.9 -4.4 1.9 -1.9 4.4 -1.9 -4.4 -4.4 -1.9 4.4 -1.9z"/></g>`;
  }
  return out;
}

/* ---------------- el personaje entero ---------------- */

/*
 * La postura de poder.
 *
 * Brazos separados del cuerpo, hombros arriba y piernas abiertas. Es lo que
 * separa "un tipo parado" de "un tipo cargando energía", y no depende del
 * dibujo sino de tres números.
 */
function posturaDePoder(base, fase) {
  const t = fase.pose || 0;
  return {
    ...base,
    hombros: base.hombros - 2 * t,
    cabeza: base.cabeza - 1 * t,
    inclina: base.inclina * (1 - t * 0.7),
    /* Absoluto, no relativo al ánimo: 'genial' ya levanta los brazos 26 grados
       y sumarle la fase los terminaba de poner en cruz, que se lee como
       rendición y no como fuerza. Acá manda la fase y punto. */
    brazos: -10 - 12 * t,
    piernas: t,
    punos: t > 0.3
  };
}

/**
 * El personaje entero, listo para meter en el DOM.
 *
 * `cuerpo` es lo que devuelve `cuerpoDe()`. Si no viene —o viene sin peso—, se
 * dibuja una contextura media: mostrar un cuerpo inventado como si fuera el de
 * Nico sería peor que no mostrar ninguno.
 */
function svgPersonaje(animo = 'neutral', tam = 96, cuerpo = null, fase = null) {
  const base = POSES[animo] || POSES.neutral;
  const f = fase && fase.n ? fase : null;

  /* De la fase 2 para arriba la cara la manda la fase, no el ánimo. Es el único
     lugar donde la fase pisa al día: un día que llegó a fase 2 ya cumplió todo
     dos veces seguidas, así que el ánimo iba a ser bueno igual. */
  const cara = (f && f.n >= 2) ? CARAS.furioso : (CARAS[animo] || CARAS.neutral);

  /* La fase suma músculo y abre la postura SOLO en el dibujo. Sin esto la
     transformación era un cambio de color de pelo sobre el mismo muñeco
     parado de brazos caídos, que no transmite absolutamente nada. */
  const med = medidasDe(
    cuerpo && cuerpo.efectiva != null ? cuerpo.efectiva : null,
    cuerpo?.musculatura ?? 0,
    f ? f.musculo : 0
  );

  const pose = f ? posturaDePoder(base, f) : base;

  const apagado = APAGADOS[animo] || 0;
  const col = {
    piel: PALETA.piel,
    short: PALETA.short,
    shortOsc: PALETA.shortOsc,
    remera: mezclar(PALETA.remera, '#8f9a90', apagado),
    remeraOsc: mezclar(PALETA.remeraOsc, '#79837a', apagado)
  };

  const alto = Math.round(tam);
  const ancho = Math.round(tam * VB.w / VB.h);

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${VB.x} ${VB.y} ${VB.w} ${VB.h}" width="${ancho}" height="${alto}"
    class="mascota-svg${fase && fase.n ? ' fase-' + fase.n : ''}" role="img"
    aria-label="Cómo venís: ${animo}${fase && fase.n ? ', en fase ' + fase.n : ''}">

    ${aura(med, fase)}
    <ellipse cx="60" cy="${Y.pie + 3}" rx="${(med.cadera + 12).toFixed(1)}" ry="4" fill="${PALETA.pupila}" opacity=".13"/>
    ${suelo(med, fase)}

    ${piernas(med, col, pose)}

    <g transform="translate(0 ${pose.hombros})">
      ${torso(med, col)}
      ${brazos(med, pose, col)}
      <g transform="translate(0 ${pose.cabeza}) rotate(${pose.inclina} 60 ${Y.hombro - 4})">
        ${cabeza(med, cara, col, fase)}
      </g>
    </g>

    ${adornos(cara)}
    ${rayos(med, fase)}
  </svg>`;
}

/* El nombre viejo sigue andando: lo usan los tests del ciclo anterior, y
   romperlos por un cambio de dibujo no aporta nada. */
function svgMascota(animo = 'neutral', tam = 96, cuerpo = null, fase = null) {
  return svgPersonaje(animo, tam, cuerpo, fase);
}
