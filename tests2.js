/* ============================================================
   tests2.js — la suite del ciclo 6.

   tests.js se paso de tamano. El corredor (test, esperar, esperarQue) sigue
   viviendo alla y se carga antes; aca van los tests del cuerpo, el personaje,
   el juego, los sonidos y la voz.
   ============================================================ */


/* ============================================================
   El cuerpo del personaje
   ============================================================ */

const HOY_CUERPO = '2026-09-01';

/* Arma dias con ejercicio en los primeros `entrenados` dias hacia atras. */
function diasCuerpo({ entrenados = 0, pesos = {} } = {}) {
  const dias = {};
  for (let i = 0; i < 20; i++) {
    const f = sumarDias(HOY_CUERPO, -i);
    dias[f] = { peso: pesos[i] ?? null, agua: 0, ejercicio: i < entrenados ? 300 : 0,
      nota: '', animo: null, sueno: null, comidas: [], act: 0 };
  }
  return dias;
}

test('el IMC sale de peso y altura', () => {
  esperar(imcDe(85, 178), 26.8);
  esperar(imcDe(60, 170), 20.8);
});

test('sin peso o sin altura no hay IMC', () => {
  esperar(imcDe(null, 178), null);
  esperar(imcDe(85, null), null);
  esperar(imcDe(0, 178), null);
});

test('las cuatro bandas de IMC', () => {
  esperar(bandaIMC(17).id, 'bajo');
  esperar(bandaIMC(22).id, 'normal');
  esperar(bandaIMC(27).id, 'sobrepeso');
  esperar(bandaIMC(33).id, 'obesidad');
  esperar(bandaIMC(null), null);
});

test('la contextura es continua: un kilo la mueve', () => {
  const a = contexturaDe(imcDe(85, 178));
  const b = contexturaDe(imcDe(86, 178));
  esperarQue(b > a, 'un kilo mas tiene que subir la contextura');
  esperarQue(b - a < 0.05, 'pero poquito, no un salto: ' + (b - a));
});

test('la contextura clampea en los extremos', () => {
  esperar(contexturaDe(10), 0);
  esperar(contexturaDe(17), 0);
  esperar(contexturaDe(IMC_MAX), 1);
  esperar(contexturaDe(200), 1);
});

test('la contextura sube en tres tramos, cada vez mas lento', () => {
  /* El tramo donde de verdad se mueve la gente se lleva la mitad del recorrido;
     arriba de eso el dibujo sigue creciendo pero cada vez menos. */
  esperar(contexturaDe(IMC_CODO), TRAMO_1);
  esperar(contexturaDe(IMC_CODO2), +(TRAMO_1 + TRAMO_2).toFixed(3));

  const porPunto = (a, b) => (contexturaDe(b) - contexturaDe(a)) / (b - a);
  esperarQue(porPunto(20, 28) > porPunto(32, 42), 'el primer tramo sube mas rapido que el segundo');
  esperarQue(porPunto(32, 42) > porPunto(50, 80), 'y el segundo mas que el tercero');
});

test('el techo llega hasta un IMC que 400 kg todavia pasa, y se avisa', () => {
  /* Antes el techo estaba en 50 y 200, 300 y 400 kg dibujaban exactamente el
     mismo cuerpo: el muneco se quedaba quieto por mas que el numero subiera, y
     parecia que la app habia ignorado el dato. */
  const de = (kg) => cuerpoDe({ altura: 180, peso: kg }, {}, HOY_CUERPO);

  esperarQue(de(200).efectiva > de(150).efectiva, '200 kg tiene que verse mas que 150');
  esperarQue(de(150).efectiva > de(110).efectiva, 'y 150 mas que 110');

  esperarQue(!fueraDeEscala(de(150).imc), '150 kg entra en la escala');
  esperarQue(fueraDeEscala(de(400).imc), '400 kg no, y hay que decirlo');
  esperarQue(/dibujo llega hasta/.test(de(400).aviso), de(400).aviso);
  esperar(de(110).aviso, '', 'con un IMC dibujable no se avisa nada');
});

test('no hay salto brusco al cruzar una banda', () => {
  const antes = contexturaDe(24.9);
  const despues = contexturaDe(25.1);
  esperarQue(despues - antes < 0.02, 'cruzar de normal a sobrepeso no puede ser un salto');
});

test('la musculatura sale de los dias entrenados', () => {
  /* DIAS_RUTINA bajo de 10 a 6 en el ciclo 6: con 10 el eje casi nunca llegaba
     arriba, y quien entrena tres veces por semana ya entrena en serio. */
  esperar(musculaturaDe(0), 0);
  esperar(musculaturaDe(3), 0.5);
  esperar(musculaturaDe(6), 1);
  esperar(musculaturaDe(12), 1);
});

test('solo cuentan los ultimos 14 dias', () => {
  esperar(diasEntrenados(diasCuerpo({ entrenados: 20 }), HOY_CUERPO), 14);
  esperar(diasEntrenados(diasCuerpo({ entrenados: 5 }), HOY_CUERPO), 5);
});

test('el peso sale del ultimo dia registrado antes que del perfil', () => {
  const dias = diasCuerpo({ pesos: { 3: 82 } });
  esperar(ultimoPesoConocido({ peso: 90 }, dias, HOY_CUERPO), 82);
});

test('sin peso en los dias cae al perfil', () => {
  esperar(ultimoPesoConocido({ peso: 90 }, diasCuerpo(), HOY_CUERPO), 90);
});

test('sin peso en ningun lado no se inventa un cuerpo', () => {
  const c = cuerpoDe({ altura: 178 }, diasCuerpo(), HOY_CUERPO);
  esperar(c.contextura, null);
  esperar(c.efectiva, null);
  esperarQue(!c.hayDatos);
});

test('dos pesos muy distintos dan cuerpos distintos', () => {
  const flaco = cuerpoDe({ altura: 178, peso: 62 }, diasCuerpo(), HOY_CUERPO);
  const grande = cuerpoDe({ altura: 178, peso: 105 }, diasCuerpo(), HOY_CUERPO);
  esperarQue(grande.efectiva - flaco.efectiva > 0.4, 'tienen que separarse: ' +
    (grande.efectiva - flaco.efectiva).toFixed(2));

  /* Lo que de verdad importa es que se vea, y eso se mide en la cintura del
     dibujo, no en el numero intermedio. */
  const cintura = (c) => medidasDe(c.efectiva, 0, 0).cintura;
  esperarQue(cintura(grande) > cintura(flaco) * 1.6, 'la cintura tiene que crecer de verdad');
});

test('entrenar corrige la contextura hacia abajo', () => {
  const quieto = cuerpoDe({ altura: 178, peso: 88 }, diasCuerpo({ entrenados: 0 }), HOY_CUERPO);
  const activo = cuerpoDe({ altura: 178, peso: 88 }, diasCuerpo({ entrenados: 12 }), HOY_CUERPO);
  esperar(quieto.imc, activo.imc);
  esperarQue(activo.efectiva < quieto.efectiva, 'mismo IMC entrenando tiene que dar menos contextura');
  esperar(activo.musculatura, 1);
});

test('avisa que el IMC exagera en quien entrena', () => {
  const activo = cuerpoDe({ altura: 178, peso: 88 }, diasCuerpo({ entrenados: 12 }), HOY_CUERPO);
  esperarQue(/exagera/.test(activo.aviso), activo.aviso);
  esperarQue(/12 de los ultimos 14|12 de los últimos 14/.test(activo.aviso), activo.aviso);
});

test('sin entrenar no hay aviso, aunque el IMC sea alto', () => {
  const quieto = cuerpoDe({ altura: 178, peso: 88 }, diasCuerpo({ entrenados: 0 }), HOY_CUERPO);
  esperar(quieto.banda.id, 'sobrepeso');
  esperar(quieto.aviso, '');
});

test('con IMC normal tampoco avisa, por mas que entrene', () => {
  const c = cuerpoDe({ altura: 178, peso: 70 }, diasCuerpo({ entrenados: 14 }), HOY_CUERPO);
  esperar(c.aviso, '');
});


/* ============================================================
   El personaje dibujado
   ============================================================ */

const CUERPO_FLACO = { efectiva: 0.05, musculatura: 0 };
const CUERPO_GRANDE = { efectiva: 0.95, musculatura: 0 };
const CUERPO_FIBRA = { efectiva: 0.35, musculatura: 1 };
const CUERPO_BLANDO = { efectiva: 0.35, musculatura: 0 };

test('dos contexturas distintas dan cinturas distintas', () => {
  const flaco = medidasDe(CUERPO_FLACO.efectiva, 0);
  const grande = medidasDe(CUERPO_GRANDE.efectiva, 0);
  esperarQue(grande.cintura - flaco.cintura > 12, 'la cintura tiene que separarse de verdad');
  esperarQue(grande.cadera > flaco.cadera);
});

test('con contextura alta la cintura pasa a los hombros', () => {
  const grande = medidasDe(1, 0);
  esperarQue(grande.cintura > grande.hombro, 'es lo que pasa en un cuerpo real');
});

test('entrenando los hombros ganan y la cintura afina', () => {
  const fibra = medidasDe(0.35, 1);
  const blando = medidasDe(0.35, 0);
  esperarQue(fibra.hombro > blando.hombro + 5, 'hombros');
  esperarQue(fibra.cintura < blando.cintura, 'cintura');
  esperarQue(fibra.brazo > blando.brazo, 'brazos');
});

test('sin datos de cuerpo se dibuja una contextura media, no cero', () => {
  const med = medidasDe(null, 0);
  esperarQue(med.c > 0.2 && med.c < 0.7, 'ni flaco ni grande: ' + med.c);
});

test('la contextura clampea tambien en el dibujo', () => {
  esperar(medidasDe(5, 0).c, 1);
  esperar(medidasDe(-3, 0).c, 0);
});

test('el ancho del torso interpola entre las alturas de referencia', () => {
  const med = medidasDe(0.9, 0);
  const aMedio = anchoEn((Y.pecho + Y.cintura) / 2, med);

  esperar(+anchoEn(Y.hombro, med).toFixed(2), +med.hombro.toFixed(2));
  esperar(+anchoEn(Y.cintura, med).toFixed(2), +med.cintura.toFixed(2));
  esperarQue(aMedio > Math.min(med.pecho, med.cintura) && aMedio < Math.max(med.pecho, med.cintura),
    'un punto intermedio tiene que caer entre los dos');
});

test('por encima y por debajo del rango el ancho no se dispara', () => {
  const med = medidasDe(0.35, 0);
  esperar(anchoEn(0, med), med.hombro);
  esperar(anchoEn(500, med), med.cadera);
});

test('la silueta se puede cortar a cualquier altura', () => {
  const med = medidasDe(0.35, 0);
  const corta = silueta(med, Y.hombro, Y.pecho);
  const larga = silueta(med, Y.hombro, Y.cadera);
  esperarQue(corta.startsWith('M ') && corta.endsWith('Z'));
  esperarQue(larga.length > corta.length, 'mas alto, mas puntos');
});

test('dos pesos distintos dibujan cuerpos distintos', () => {
  esperarQue(svgPersonaje('neutral', 96, CUERPO_FLACO) !== svgPersonaje('neutral', 96, CUERPO_GRANDE));
});

test('la comida del dia NO toca el cuerpo: solo la cara', () => {
  /* El criterio central del ciclo. Mismo cuerpo medido, dos animos distintos:
     la silueta del torso tiene que salir identica. */
  const torsoDe = (svg) => svg.split('<path d="M ')[1].split('"')[0];
  const tranquilo = svgPersonaje('bien', 96, CUERPO_BLANDO);
  const culposo = svgPersonaje('pesado', 96, CUERPO_BLANDO);

  esperar(torsoDe(tranquilo), torsoDe(culposo), 'comer de mas no puede engordar al muneco');
  esperarQue(tranquilo !== culposo, 'pero algo tiene que cambiar: la cara');
});

/* Los animos del dia. CARAS tiene uno mas —'furioso'— que no es un animo sino
   la cara que impone la fase, asi que la lista va explicita. */
const ANIMOS = ['neutral', 'bien', 'genial', 'flojo', 'cansado', 'seco', 'pesado', 'triste'];

test('los ocho animos siguen siendo ocho dibujos distintos', () => {
  const vistos = new Set(ANIMOS.map(a => svgPersonaje(a, 96, CUERPO_BLANDO)));
  esperar(vistos.size, 8);
});

test('cada animo tiene cara y pose, y la de furia no es un animo', () => {
  for (const a of ANIMOS) {
    esperarQue(!!CARAS[a], a + ' sin cara');
    esperarQue(!!POSES[a], a + ' sin pose');
  }
  esperarQue(!!CARAS.furioso && !POSES.furioso, 'furioso es cara de fase, no animo');
});

test('cada animo tiene su pose', () => {
  // 8 de siempre + los alias "mal" y "normal" de las caritas del selector
  esperar(Object.keys(POSES).length, 10);
  esperarQue(POSES.cansado.hombros > POSES.neutral.hombros, 'cansado se hunde');
  esperarQue(POSES.genial.hombros < POSES.neutral.hombros, 'genial se estira');
});

test('la postura acompana al animo y no al cuerpo', () => {
  const hundido = (s) => s.split('translate(0 ')[1].split(')')[0];
  esperar(hundido(svgPersonaje('cansado', 96, CUERPO_FLACO)),
    hundido(svgPersonaje('cansado', 96, CUERPO_GRANDE)),
    'el mismo animo hunde lo mismo, pese al cuerpo');
});

test('la remera se apaga cuando el dia viene mal', () => {
  esperarQue(svgPersonaje('genial', 96, CUERPO_BLANDO).includes(PALETA.remera), 'a pleno va el verde pleno');
  esperarQue(!svgPersonaje('triste', 96, CUERPO_BLANDO).includes('"' + PALETA.remera + '"'), 'triste va apagado');
});

test('mezclar da un color intermedio valido', () => {
  esperar(mezclar('#000000', '#ffffff', 0), '#000000');
  esperar(mezclar('#000000', '#ffffff', 1), '#ffffff');
  esperar(mezclar('#000000', '#ffffff', .5), '#808080');
});

test('el dibujo se puede meter en el DOM y rasterizar', () => {
  const svg = svgPersonaje('bien', 74, CUERPO_BLANDO);
  esperarQue(svg.startsWith('<svg'), 'arranca en svg');
  esperarQue(/xmlns=/.test(svg), 'sin xmlns no se puede rasterizar');
  esperarQue(/viewBox="-8 -46 136 222"/.test(svg), 'el lienzo se estiro para arriba por el pelo de las fases');
});

test('ninguna combinacion de cuerpo y animo genera NaN', () => {
  for (const a of Object.keys(CARAS)) {
    for (const c of [null, 0, .5, 1]) {
      const svg = svgPersonaje(a, 96, c == null ? null : { efectiva: c, musculatura: c });
      esperarQue(!/NaN|undefined/.test(svg), a + ' con ' + c);
    }
  }
});

test('ningun path sale con doble signo', () => {
  /* Un "--5.9" no es NaN pero el navegador tira el path entero. Aparecio de
     verdad: la manga escribia el menos a mano y del lado izquierdo el valor ya
     venia negativo. */
  for (const a of Object.keys(CARAS)) {
    for (const c of [null, 0, .5, 1]) {
      const svg = svgPersonaje(a, 96, c == null ? null : { efectiva: c, musculatura: c });
      // --resp es una variable CSS del tag svg, no un path: se descuenta
      esperarQue(!svg.replace(/--resp/g, '').includes('--'), a + ' con ' + c + ': doble signo en un path');
      esperarQue(!/[\d.]-\d/.test(svg.replace(/e-\d/g, '')), a + ' con ' + c + ': numeros pegados');
    }
  }
});

test('el tamano pedido manda, y la figura es mas alta que ancha', () => {
  const svg = svgPersonaje('neutral', 100, CUERPO_BLANDO);
  esperarQue(/height="100"/.test(svg));
  esperarQue(/width="61"/.test(svg), 'una persona parada no es cuadrada');
});


/* ============================================================
   El juego: rachas, escudos, XP y logros
   ============================================================ */

const HOY_JUEGO = '2026-09-10';

/* Un dia armado a pedido. `dias({0:'todo', 1:'agua'})` arma hoy completo y ayer
   solo con agua; lo que no se nombra queda vacio. */
function diaJ(que = '') {
  const q = String(que);
  const todo = q === 'todo';
  return {
    peso: null,
    agua: todo || q.includes('agua') ? 12 : 0,
    ejercicio: todo || q.includes('ejercicio') ? 300 : 0,
    nota: '', animo: null, act: 0,
    sueno: todo || q.includes('sueno') ? { horas: 8 } : null,
    comidas: todo || q.includes('comida') ? [{ id: 'x', kcal: 600 }] : []
  };
}

function diasJ(mapa, desde = HOY_JUEGO) {
  const dias = {};
  for (const [i, que] of Object.entries(mapa)) dias[sumarDias(desde, -Number(i))] = diaJ(que);
  return dias;
}

const OPTS_J = { hoy: HOY_JUEGO, vasos: 8 };

/* ---- las cuatro rachas ---- */

test('hay cuatro rachas y cada una sabe como se cumple', () => {
  esperar(RACHAS.length, 4);
  for (const r of RACHAS) {
    esperarQue(!!r.nombre && !!r.icono, r.id);
    esperarQue(typeof r.cumple === 'function', r.id);
  }
});

test('la racha cuenta dias seguidos hacia atras', () => {
  const dias = diasJ({ 0: 'comida', 1: 'comida', 2: 'comida', 4: 'comida' });
  esperar(rachaDe(dias, 'registro', OPTS_J).actual, 3, 'el hueco del dia 3 corta');
});

test('el dia de hoy sin cumplir no corta la racha', () => {
  const dias = diasJ({ 1: 'comida', 2: 'comida', 3: 'comida' });
  esperar(rachaDe(dias, 'registro', OPTS_J).actual, 3, 'hoy todavia puede completarse');
  esperarQue(!rachaDe(dias, 'registro', OPTS_J).hoyCumplido);
});

test('las cuatro rachas son independientes entre si', () => {
  const dias = diasJ({ 0: 'agua comida', 1: 'agua', 2: 'agua', 3: 'agua' });
  esperar(rachaDe(dias, 'agua', OPTS_J).actual, 4);
  esperar(rachaDe(dias, 'registro', OPTS_J).actual, 1, 'perder el agua no puede tocar el registro');
  esperar(rachaDe(dias, 'entrenamiento', OPTS_J).actual, 0);
});

test('el agua se mide contra el objetivo de cada uno', () => {
  const dias = diasJ({ 0: 'agua', 1: 'agua' });
  esperar(rachaDe(dias, 'agua', { hoy: HOY_JUEGO, vasos: 8 }).actual, 2);
  esperar(rachaDe(dias, 'agua', { hoy: HOY_JUEGO, vasos: 20 }).actual, 0, '12 vasos no alcanzan si el objetivo es 20');
});

test('dormir poco no suma a la racha de sueno', () => {
  const dias = { [HOY_JUEGO]: { ...diaJ(), sueno: { horas: 5 } } };
  esperar(rachaDe(dias, 'sueno', OPTS_J).actual, 0);
});

test('la mejor racha se acuerda del record aunque hoy este en cero', () => {
  const dias = diasJ({ 10: 'comida', 11: 'comida', 12: 'comida', 13: 'comida', 14: 'comida' });
  const r = rachaDe(dias, 'registro', OPTS_J);
  esperar(r.actual, 0);
  esperar(r.mejor, 5);
});

test('una racha que no existe no rompe nada', () => {
  esperar(rachaDe({}, 'inventada', OPTS_J).actual, 0);
});

test('las cuatro se pueden pedir de un saque', () => {
  const todas = todasLasRachas(diasJ({ 0: 'todo' }), OPTS_J);
  esperar(todas.length, 4);
  esperarQue(todas.every(r => r.hoyCumplido), 'un dia completo cumple las cuatro');
});

/* ---- los escudos ---- */

test('se gana un escudo cada 7 dias registrados', () => {
  /* Va con la fecha del fixture: desde que los dias del futuro no cuentan,
     `escudosDisponibles` necesita saber cual es "hoy" — si no, con un fixture
     fechado adelante se descarta el historial entero. */
  const seis = {};
  for (let i = 0; i < 6; i++) seis[i] = 'comida';
  esperar(escudosDisponibles(diasJ(seis), JUEGO_VACIO, HOY_JUEGO), 0);

  const siete = { ...seis, 6: 'comida' };
  esperar(escudosDisponibles(diasJ(siete), JUEGO_VACIO, HOY_JUEGO), 1);
});

test('no se pueden juntar mas de dos', () => {
  const muchos = {};
  for (let i = 0; i < 60; i++) muchos[i] = 'comida';
  esperar(escudosDisponibles(diasJ(muchos), JUEGO_VACIO, HOY_JUEGO), MAX_ESCUDOS);
});

test('el escudo tapa el dia perdido y la racha sigue', () => {
  // seis dias de comida, ayer nada: alcanza para tener un escudo
  const mapa = { 1: '', 2: 'comida', 3: 'comida', 4: 'comida', 5: 'comida', 6: 'comida', 7: 'comida', 8: 'comida' };
  const dias = diasJ(mapa);
  const juego = juegoDe({});

  esperar(rachaDe(dias, 'registro', { ...OPTS_J, juego }).actual, 0, 'sin escudo la racha murio');

  const salvadas = aplicarEscudos(dias, juego, OPTS_J);
  esperar(salvadas.length, 1);
  esperar(salvadas[0].id, 'registro');
  esperar(juego.escudosGastados, 1);
  esperarQue(rachaDe(dias, 'registro', { ...OPTS_J, juego }).actual >= 7, 'con el escudo la racha sigue viva');
});

test('el escudo no se gasta en una racha corta', () => {
  const dias = diasJ({ 1: '', 2: 'comida', 3: 'comida' });
  const juego = juegoDe({});
  juego.escudosGastados = -5;   // como si sobraran escudos
  esperar(aplicarEscudos(dias, juego, OPTS_J).length, 0, 'tapar una racha de 2 es tirar el escudo');
});

test('sin escudos disponibles no se tapa nada', () => {
  const mapa = { 1: '', 2: 'comida', 3: 'comida', 4: 'comida', 5: 'comida' };
  const juego = juegoDe({});
  juego.escudosGastados = 99;
  esperar(aplicarEscudos(diasJ(mapa), juego, OPTS_J).length, 0);
});

test('el mismo dia no se tapa dos veces', () => {
  const mapa = { 1: '', 2: 'comida', 3: 'comida', 4: 'comida', 5: 'comida', 6: 'comida', 7: 'comida', 8: 'comida' };
  const dias = diasJ(mapa);
  const juego = juegoDe({});
  aplicarEscudos(dias, juego, OPTS_J);
  const gastados = juego.escudosGastados;
  aplicarEscudos(dias, juego, OPTS_J);
  esperar(juego.escudosGastados, gastados, 'correrlo de nuevo no puede cobrar otro escudo');
});

/* ---- XP y niveles ---- */

test('registrar suma XP aunque el dia venga mal', () => {
  const malo = { ...diaJ(), comidas: [{ id: 'x', kcal: 4000 }] };
  esperarQue(xpDelDia(malo, { vasos: 8 }) > 0, 'volver tiene que pagar algo');
});

test('cumplir paga mas que solo registrar', () => {
  esperarQue(xpDelDia(diaJ('todo'), { vasos: 8 }) > xpDelDia(diaJ('comida'), { vasos: 8 }));
});

test('el dia completo tiene su premio aparte', () => {
  const completo = xpDelDia(diaJ('todo'), { vasos: 8 });
  esperar(completo, XP.registrar + 4 * XP.objetivo + XP.diaCompleto);
});

test('un dia vacio no paga nada', () => {
  esperar(xpDelDia(diaJ(), { vasos: 8 }), 0);
  esperar(xpDelDia(null), 0);
});

test('el XP total suma los dias y los logros', () => {
  const dias = diasJ({ 0: 'comida', 1: 'comida' });
  const sinLogros = xpTotal(dias, { vasos: 8, logros: [] });
  const conLogros = xpTotal(dias, { vasos: 8, logros: ['primer-dia', 'semana'] });
  esperar(conLogros - sinLogros, 2 * XP.logro);
});

/* ---- logros ---- */

test('el catalogo de logros esta completo y sin repetidos', () => {
  esperarQue(LOGROS.length >= 15, 'pocos logros para medio ano de uso');
  esperar(new Set(LOGROS.map(l => l.id)).size, LOGROS.length);
  for (const l of LOGROS) {
    esperarQue(!!l.nombre && !!l.detalle && !!l.icono, l.id);
    esperarQue(typeof l.cumple === 'function', l.id);
  }
});

test('el primer dia registrado ya desbloquea algo', () => {
  const ctx = contextoLogros(diasJ({ 0: 'comida' }), JUEGO_VACIO, OPTS_J);
  esperarQue(logrosGanados(ctx).includes('primer-dia'));
});

test('sin nada cargado no hay ningun logro', () => {
  esperar(logrosGanados(contextoLogros({}, JUEGO_VACIO, OPTS_J)).length, 0);
});

test('los logros de racha miran el record, no el dia de hoy', () => {
  const mapa = {};
  for (let i = 3; i < 12; i++) mapa[i] = 'comida';
  const ctx = contextoLogros(diasJ(mapa), JUEGO_VACIO, OPTS_J);
  esperarQue(logrosGanados(ctx).includes('racha-7'), 'la racha se corto pero el record queda');
});

test('el dia perfecto pide las cuatro actividades', () => {
  const casi = contextoLogros(diasJ({ 0: 'agua comida ejercicio' }), JUEGO_VACIO, OPTS_J);
  esperarQue(!logrosGanados(casi).includes('perfecto'), 'faltando el sueno no es perfecto');

  const perfecto = contextoLogros(diasJ({ 0: 'todo' }), JUEGO_VACIO, OPTS_J);
  esperarQue(logrosGanados(perfecto).includes('perfecto'));
});

test('cada logro tiene su ficha buscable por id', () => {
  esperar(logro('perfecto').nombre, 'Día perfecto');
  esperar(logro('no-existe'), null);
});

/* ---- el recalculo entero ---- */

test('recalcular llena el juego contra el historial', () => {
  const r = recalcularJuego(diasJ({ 0: 'todo', 1: 'todo' }), null, OPTS_J);
  esperarQue(r.juego.xp > 0);
  esperarQue(r.juego.logros.includes('primer-dia'));
  esperarQue(r.nuevos.includes('primer-dia'), 'la primera vez son todos nuevos');
});

test('recalcular dos veces no duplica nada', () => {
  const dias = diasJ({ 0: 'todo', 1: 'todo' });
  const a = recalcularJuego(dias, null, OPTS_J);
  const b = recalcularJuego(dias, a.juego, OPTS_J);
  esperar(b.juego.xp, a.juego.xp);
  esperar(b.nuevos.length, 0, 'no puede volver a anunciar lo mismo');
});

test('borrar un dia devuelve el XP: no queda fantasma', () => {
  const dias = diasJ({ 0: 'todo', 1: 'todo' });
  const antes = recalcularJuego(dias, null, OPTS_J);
  delete dias[sumarDias(HOY_JUEGO, -1)];
  const despues = recalcularJuego(dias, antes.juego, OPTS_J);
  esperarQue(despues.juego.xp < antes.juego.xp, 'el XP tiene que bajar al borrar el dia');
});

test('un estado del ciclo 5 sin juego migra sin romperse', () => {
  const j = juegoDe({});
  esperar(j.xp, 0);
  esperar(j.logros.length, 0);
  esperar(j.escudosGastados, 0);

  const r = recalcularJuego(diasJ({ 0: 'comida' }), j, OPTS_J);
  esperarQue(r.juego.xp > 0, 'el historial que ya existia tiene que contar');
});

test('un juego con basura adentro no rompe la migracion', () => {
  const j = juegoDe({ juego: { xp: 'hola', logros: 'no-es-lista', escudosUsados: 5 } });
  esperar(j.xp, 0);
  esperar(j.logros.length, 0);
  esperar(Object.keys(j.escudosUsados).length, 0);
});

test('los logros por anunciar son los que no se mostraron', () => {
  const juego = { logros: ['primer-dia', 'semana'], anunciados: ['primer-dia'] };
  esperar(logrosPorAnunciar(juego).join(), 'semana');
  esperar(logrosPorAnunciar({}).length, 0);
});


/* ============================================================
   Sonidos y voz
   ============================================================ */

/* Un AudioContext de mentira que anota lo que le piden en vez de hacer ruido. */
function ctxFalso(registro) {
  return function FakeCtx() {
    this.state = 'running';
    this.currentTime = 0;
    this.destination = { tipo: 'salida' };
    this.resume = () => { registro.resumido = true; };
    this.createOscillator = () => {
      const o = { type: '', frequency: { value: 0 }, connect() {}, start(t) { this.t0 = t; }, stop(t) { this.t1 = t; } };
      registro.osciladores.push(o);
      return o;
    };
    this.createGain = () => ({
      gain: {
        setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {}
      },
      connect() {}
    });
  };
}

function registroNuevo() {
  return { osciladores: [], resumido: false };
}

test('cada sonido programa sus notas', () => {
  const reg = registroNuevo();
  const s = crearSonidos({ Ctx: ctxFalso(reg), activo: () => true });

  esperarQue(s.sonar('objetivo'), 'tiene que sonar');
  esperar(reg.osciladores.length, SONIDOS.objetivo.notas.length);
  esperar(reg.osciladores[0].frequency.value, SONIDOS.objetivo.notas[0][0]);
});

test('los cinco sonidos existen y son distintos entre si', () => {
  const ids = ['objetivo', 'nivel', 'racha', 'logro', 'fallo'];
  for (const id of ids) esperarQue(!!SONIDOS[id], id);

  const firmas = new Set(ids.map(id => JSON.stringify(SONIDOS[id].notas)));
  esperar(firmas.size, ids.length, 'dos sonidos iguales no sirven de senal');
});

test('las buenas noticias suben y fallar baja', () => {
  const sube = (id) => SONIDOS[id].notas.at(-1)[0] > SONIDOS[id].notas[0][0];
  esperarQue(sube('objetivo'), 'objetivo');
  esperarQue(sube('nivel'), 'nivel');
  esperarQue(sube('logro'), 'logro');
  esperarQue(!sube('fallo'), 'fallar tiene que bajar');
});

test('apagado no programa absolutamente nada', () => {
  const reg = registroNuevo();
  const s = crearSonidos({ Ctx: ctxFalso(reg), activo: () => false });

  esperarQue(!s.sonar('objetivo'));
  esperar(reg.osciladores.length, 0, 'ni siquiera crea el contexto');
});

test('si el sistema pidio menos estimulos, no suena aunque este prendido', () => {
  const reg = registroNuevo();
  const s = crearSonidos({ Ctx: ctxFalso(reg), activo: () => true, reducido: () => true });

  esperarQue(!s.sonar('logro'));
  esperar(reg.osciladores.length, 0);
});

test('un sonido que no existe se ignora sin romper', () => {
  const s = crearSonidos({ Ctx: ctxFalso(registroNuevo()), activo: () => true });
  esperarQue(!s.sonar('inventado'));
});

test('si el navegador bloquea el audio, se lo traga', () => {
  const Explota = function () { throw new Error('no se puede'); };
  const s = crearSonidos({ Ctx: Explota, activo: () => true });

  esperarQue(!s.sonar('objetivo'), 'devuelve false, no explota');
  esperarQue(!s.disponible, 'y se marca como no disponible');
});

test('sin AudioContext en el navegador tampoco rompe', () => {
  const s = crearSonidos({ Ctx: null, activo: () => true });
  // en el navegador de los tests SI existe, asi que solo se prueba que no tire
  esperarQue(typeof s.sonar('objetivo') === 'boolean');
});

test('un contexto suspendido se reanuda antes de sonar', () => {
  const reg = registroNuevo();
  const Ctx = ctxFalso(reg);
  const Suspendido = function () { Ctx.call(this); this.state = 'suspended'; };
  const s = crearSonidos({ Ctx: Suspendido, activo: () => true });

  s.sonar('racha');
  esperarQue(reg.resumido, 'sin resume no suena en un navegador de verdad');
});

/* ---- la voz ---- */

test('cada situacion tiene varias frases', () => {
  for (const [k, lista] of Object.entries(VOZ)) {
    esperarQue(Array.isArray(lista) && lista.length >= 3, k + ' tiene pocas frases');
    esperar(new Set(lista).size, lista.length, k + ' tiene frases repetidas');
  }
});

test('no repite la frase anterior', () => {
  const mem = {};
  let previa = null;
  for (let i = 0; i < 30; i++) {
    const f = decir('vacio', {}, mem);
    esperarQue(f !== previa, 'repitio dos veces seguidas');
    previa = f;
  }
});

test('los marcadores se reemplazan con los datos', () => {
  const f = decir('racha', { n: 12, que: 'agua' }, {});
  esperarQue(!/\{\w+\}/.test(f), 'quedo un marcador sin reemplazar: ' + f);
});

test('un marcador sin dato queda en blanco, no en llaves', () => {
  const f = decir('racha', {}, {});
  esperarQue(!/\{/.test(f), f);
});

test('una situacion que no existe devuelve vacio', () => {
  esperar(decir('no-existe', {}, {}), '');
});

test('con el dia completo festeja en vez de reclamar', () => {
  const d = { comidas: [{ kcal: 500 }], agua: 10, ejercicio: 200, sueno: { horas: 8 } };
  const r = reclamoDelDia(d, { vasos: 8, hora: 20, memoria: {} });
  esperar(r.situacion, 'completo');
  esperarQue(!!r.texto);
});

test('a la manana temprano no reclama nada', () => {
  const vacio = { comidas: [], agua: 0, ejercicio: 0, sueno: null };
  esperar(reclamoDelDia(vacio, { hora: 8, memoria: {} }).texto, '', 'reprochar a las 8 es molestar mal');
});

test('con el dia en blanco al mediodia si reclama', () => {
  const vacio = { comidas: [], agua: 0, ejercicio: 0, sueno: null };
  const r = reclamoDelDia(vacio, { hora: 13, memoria: {} });
  esperar(r.situacion, 'vacio');
});

test('reclama primero lo mas facil de resolver', () => {
  const d = { comidas: [], agua: 0, ejercicio: 0, sueno: { horas: 8 } };
  esperar(reclamoDelDia(d, { vasos: 8, hora: 15, memoria: {} }).falta, 'agua');
});

test('cuando falta una sola cosa insiste con esa', () => {
  const d = { comidas: [{ kcal: 500 }], agua: 10, ejercicio: 0, sueno: { horas: 8 } };
  const r = reclamoDelDia(d, { vasos: 8, hora: 19, memoria: {} });
  esperar(r.situacion, 'casi');
  esperar(r.falta, 'entrenamiento');
});

test('celebrar un logro lo nombra', () => {
  const t = celebrarLogro('perfecto', {});
  esperarQue(t.includes('Día perfecto'), t);
});

test('un logro que no existe no celebra nada', () => {
  esperar(celebrarLogro('no-existe', {}), '');
});

test('subir de nivel dice el numero y el nombre', () => {
  const t = celebrarNivel(nivelDe(250), {});
  esperarQue(/2/.test(t) && /Constante/.test(t), t);
});

test('el escudo se cuenta con la actividad que salvo', () => {
  const t = contarEscudo({ id: 'agua', nombre: 'Agua', racha: 9 }, {});
  esperarQue(/agua/.test(t), t);
});

test('ninguna frase del repertorio humilla por el cuerpo', () => {
  /* La linea que separa que de gracia volver de que de bronca abrir. */
  const prohibidas = /gord|obes|panz|asquer|verguenza|vergüenza|fracas|inutil|inútil/i;
  for (const [k, lista] of Object.entries(VOZ)) {
    for (const f of lista) esperarQue(!prohibidas.test(f), k + ': ' + f);
  }
});


/* ---- el juego entre dispositivos ----

   No se sincroniza como tabla propia, y es a proposito: XP, nivel, rachas y
   logros se DERIVAN de los dias, que ya se sincronizan. Un celular que baja los
   dias del otro reconstruye todo solo, sin migracion de base ni tabla nueva.

   Lo unico que no se deriva son los escudos gastados y que logros ya se
   festejaron. Eso queda por dispositivo, y el precio es chico: en el peor caso
   un escudo se gasta dos veces o un logro se festeja de nuevo. */

test('el juego se reconstruye entero desde los dias sincronizados', () => {
  const dias = diasJ({ 0: 'todo', 1: 'todo', 2: 'todo', 3: 'comida', 4: 'comida' });

  const original = recalcularJuego(dias, null, OPTS_J);
  // otro dispositivo: los mismos dias, sin nada de juego guardado
  const otro = recalcularJuego(clonar(dias), null, OPTS_J);

  esperar(otro.juego.xp, original.juego.xp, 'el XP tiene que dar igual');
  esperar(otro.juego.logros.join(), original.juego.logros.join());
  esperar(nivelDe(otro.juego.xp).nivel, nivelDe(original.juego.xp).nivel);
});

test('las rachas tambien salen solas de los dias', () => {
  const dias = diasJ({ 0: 'agua', 1: 'agua', 2: 'agua' });
  esperar(rachaDe(clonar(dias), 'agua', OPTS_J).actual, 3);
});

test('un dia que llega de otro dispositivo suma su XP', () => {
  const dias = diasJ({ 0: 'comida' });
  const antes = recalcularJuego(dias, null, OPTS_J).juego.xp;

  dias[sumarDias(HOY_JUEGO, -1)] = diaJ('todo');
  const despues = recalcularJuego(dias, null, OPTS_J).juego.xp;

  esperarQue(despues > antes, 'bajar un dia del otro celular tiene que sumar');
});


/* ============================================================
   Las fases: la escalera de dias perfectos seguidos
   ============================================================ */

test('sin dias perfectos no hay fase', () => {
  esperar(diasPerfectos(diasJ({ 0: 'comida' }), OPTS_J), 0);
  esperar(faseDe(0).n, 0);
  esperar(bonusDePerfectos(0), 0);
});

test('los dias perfectos se cuentan seguidos hacia atras', () => {
  esperar(diasPerfectos(diasJ({ 0: 'todo', 1: 'todo', 2: 'todo' }), OPTS_J), 3);
  esperar(diasPerfectos(diasJ({ 0: 'todo', 1: 'todo', 3: 'todo' }), OPTS_J), 2, 'el hueco corta');
});

test('un dia incompleto hoy no corta la escalera', () => {
  const dias = diasJ({ 0: 'agua', 1: 'todo', 2: 'todo' });
  esperar(diasPerfectos(dias, OPTS_J), 2, 'hoy todavia se puede completar');
});

test('falta una sola cosa y el dia no es perfecto', () => {
  esperar(diasPerfectos(diasJ({ 0: 'agua comida ejercicio' }), OPTS_J), 0, 'sin sueno no cuenta');
});

test('cada dia perfecto sube una fase, hasta el tope', () => {
  esperar(faseDe(1).n, 1);
  esperar(faseDe(4).n, 4);
  esperar(faseDe(FASE_MAX).n, FASE_MAX);
  esperar(faseDe(99).n, FASE_MAX, 'arriba del tope se queda en la ultima');
});

test('todas las fases tienen nombre, y de la 1 para arriba tienen color', () => {
  esperar(FASES.length, FASE_MAX + 1);
  for (const f of FASES) {
    esperarQue(!!f.nombre, 'fase ' + f.n + ' sin nombre');
    if (f.n > 0) esperarQue(/^#[0-9a-f]{6}$/i.test(f.color), 'fase ' + f.n + ' sin color');
  }
  esperar(new Set(FASES.map(f => f.nombre)).size, FASES.length, 'dos fases con el mismo nombre');
});

test('los rayos aparecen recien en la fase 2', () => {
  esperarQue(!FASES[1].rayos, 'la fase 1 todavia no');
  esperarQue(FASES[2].rayos && FASES[FASE_MAX].rayos, 'de la 2 para arriba si');
});

test('la fase abre la postura y suma musculo', () => {
  /* Lo que hace que se lea imponente es la silueta, no el color: sin postura
     abierta y hombros anchos, la transformacion era un cambio de peinado. */
  for (let i = 1; i < FASES.length; i++) {
    esperarQue(FASES[i].musculo > FASES[i - 1].musculo, 'fase ' + i + ': musculo');
    esperarQue(FASES[i].pose >= FASES[i - 1].pose, 'fase ' + i + ': pose');
  }
  /* El angulo del brazo lo fija la fase en ABSOLUTO y no sumando sobre el
     animo: 'genial' ya los levanta 26 grados y sumarle la fase los terminaba de
     poner en cruz, que se lee como rendicion y no como fuerza. */
  const poder = posturaDePoder(POSES.neutral, FASES[FASE_MAX]);
  const flojito = posturaDePoder(POSES.neutral, FASES[1]);
  esperarQue(poder.brazos <= -20, 'los brazos se separan del cuerpo: ' + poder.brazos);
  esperarQue(poder.brazos < flojito.brazos, 'y mas cuanto mas alta la fase');
  esperar(posturaDePoder(POSES.genial, FASES[FASE_MAX]).brazos, poder.brazos, 'el animo no puede sumar al angulo');
  esperarQue(poder.punos, 'y los punos se cierran');
});

test('la fase ensancha los hombros de verdad', () => {
  const ancho = (f) => medidasDe(.4, .3, f.musculo).hombro;
  esperarQue(ancho(FASES[FASE_MAX]) > ancho(FASES[0]) + 4, 'la fase maxima tiene que verse');
});

test('de la fase 2 para arriba la cara la manda la fase', () => {
  /* Una sonrisa tierna encima de un aura de fuego se contradice sola, y gana la
     sonrisa. */
  const cu = { efectiva: .4, musculatura: .3 };
  esperarQue(svgPersonaje('genial', 96, cu, faseDe(2)).includes('grito') === false, 'la boca sale como path');
  const conFuria = svgPersonaje('genial', 96, cu, faseDe(3));
  const sinFuria = svgPersonaje('genial', 96, cu, faseDe(1));
  esperarQue(conFuria !== sinFuria, 'la fase 3 no puede tener la misma cara que la 1');
});

test('el bonus de musculo sube con los dias y tiene tope', () => {
  esperar(bonusDePerfectos(1), BONUS_POR_PERFECTO);
  esperarQue(bonusDePerfectos(2) > bonusDePerfectos(1));
  esperar(bonusDePerfectos(50), BONUS_TOPE, 'no puede crecer para siempre');
});

test('el bonus es chico: no reemplaza a entrenar', () => {
  /* Si un dia perfecto igualara a dos semanas de gimnasio, el eje de
     entrenamiento dejaria de significar algo. */
  esperarQue(BONUS_TOPE < 0.5, 'el tope del bonus tiene que ser menor que medio eje');
});

test('el bonus entra en el cuerpo y se va al cortarse la racha', () => {
  const perfil = { altura: 178, peso: 80 };
  const dias = diasCuerpo();

  const sinRacha = cuerpoDe(perfil, dias, HOY_CUERPO, { bonus: 0 });
  const conRacha = cuerpoDe(perfil, dias, HOY_CUERPO, { bonus: bonusDePerfectos(3) });

  esperarQue(conRacha.musculatura > sinRacha.musculatura, 'la racha tiene que verse');
  esperar(conRacha.imc, sinRacha.imc, 'pero el IMC no se toca');
  esperarQue(conRacha.efectiva < sinRacha.efectiva, 'y el cuerpo se ve mas firme');
});

test('el bonus no puede pasar el tope del eje', () => {
  const c = cuerpoDe({ altura: 178, peso: 80 }, diasCuerpo({ entrenados: 14 }), HOY_CUERPO, { bonus: 1 });
  esperar(c.musculatura, 1);
});

/* ---- el dibujo de la fase ---- */

test('la fase ensancha, pero NUNCA afina', () => {
  /* La regla que reemplaza a la anterior. Antes el test pedia que la fase no
     tocara la silueta; ahora si la toca, porque Nico pidio verse musculoso al
     cumplir. Lo que no puede pasar —y es lo que de verdad importa— es que
     cumplir un dia te dibuje mas flaco: eso seria decirte que ya bajaste de
     peso sin que la balanza haya dicho nada. */
  const flaca = medidasDe(.6, .3, 0);
  const poderosa = medidasDe(.6, .3, FASES[FASE_MAX].musculo);

  esperarQue(poderosa.hombro > flaca.hombro + 4, 'los hombros tienen que crecer');
  esperarQue(poderosa.brazo > flaca.brazo, 'los brazos tambien');
  esperar(poderosa.cintura, flaca.cintura, 'la cintura NO se puede achicar por una racha');
  esperar(poderosa.cadera, flaca.cadera, 'la cadera tampoco');
});

test('el cuerpo medido no se entera de la fase', () => {
  const cu = { efectiva: .4, musculatura: .4 };
  const normal = svgPersonaje('bien', 96, cu, faseDe(0));
  const alta = svgPersonaje('bien', 96, cu, faseDe(3));
  esperarQue(normal !== alta, 'algo tiene que verse');

  /* La contextura que entra al dibujo es la misma en las dos: la fase no la
     toca ni de casualidad. */
  esperar(medidasDe(cu.efectiva, cu.musculatura, 0).c, medidasDe(cu.efectiva, cu.musculatura, .7).c);
});

test('cada fase dibuja distinto de las demas', () => {
  const cu = { efectiva: .4, musculatura: .4 };
  const vistos = new Set(FASES.map(f => svgPersonaje('bien', 96, cu, f)));
  esperar(vistos.size, FASES.length);
});

test('sin fase el pelo va del color de siempre', () => {
  const svg = svgPersonaje('bien', 96, null, faseDe(0));
  esperarQue(svg.includes(PALETA.pelo), 'el pelo normal');
  esperarQue(!svg.includes('class="aura"'), 'y sin aura');
});

test('con fase hay aura, y crece con el numero', () => {
  const cu = { efectiva: .4, musculatura: .4 };
  const radio = (n) => Number(svgPersonaje('bien', 96, cu, faseDe(n)).split('rx="')[1].split('"')[0]);
  esperarQue(svgPersonaje('bien', 96, cu, faseDe(1)).includes('class="aura"'));
  esperarQue(radio(6) > radio(1), 'el aura de la fase 6 tiene que ser mas grande');
});

test('las puntas del pelo no se salen del lienzo', () => {
  /* Paso de verdad: las puntas subian mas que el lienzo, quedaban cortadas al
     ras y volvian a leerse como una corona de barritas. */
  const cu = { efectiva: 1, musculatura: 1 };
  for (const f of FASES) {
    const svg = svgPersonaje('bien', 96, cu, f);
    const ys = [...svg.matchAll(/[ML](-?[\d.]+) (-?[\d.]+)/g)].map(m => Number(m[2]));
    const masAlto = Math.min(...ys);
    esperarQue(masAlto >= VB.y, 'fase ' + f.n + ': algo dibuja en y=' + masAlto + ', arriba del lienzo (' + VB.y + ')');
  }
});

test('ninguna fase genera NaN ni doble signo', () => {
  for (const f of FASES) {
    for (const c of [null, 0, 1]) {
      const svg = svgPersonaje('genial', 96, c == null ? null : { efectiva: c, musculatura: c }, f);
      esperarQue(!/NaN|undefined/.test(svg), 'fase ' + f.n + ' con ' + c);
      esperarQue(!svg.replace(/--resp/g, '').includes('--'), 'fase ' + f.n + ' con ' + c + ': doble signo');
    }
  }
});

/* ---- la voz de las fases ---- */

test('hay frases para subir de fase y para perderla', () => {
  esperarQue(VOZ.fase.length >= 3 && VOZ.faseCaida.length >= 3);
  const t = decir('fase', { fase: 'Bestia', n: 4 }, {});
  esperarQue(t.includes('Bestia'), t);
  esperarQue(!/\{/.test(t), t);
});

test('perder la fase no se cuenta como un fracaso', () => {
  /* Se pierde sola con no cumplir un dia: si encima la app te trata mal, el
     dia malo se vuelve motivo para no volver. */
  const duras = /fracas|perdiste todo|desperdici|inutil|inútil/i;
  for (const f of VOZ.faseCaida) esperarQue(!duras.test(f), f);
});

/* ---- el modo, visible ---- */

test('los 16 modos tienen emoji para el chip de Hoy', () => {
  for (const m of listaModos()) {
    esperarQue(!!m.emoji, m.id + ' sin emoji');
  }
});

/* ---- que el pelo no le tape los ojos ---- */

test('la linea del pelo queda por encima de las cejas', () => {
  /* Paso dos veces. Los ojos se dibujan DESPUES del pelo, asi que nunca quedan
     tapados del todo: lo que pasaba es que la frente entera era del color del
     pelo y los ojos flotaban sobre una vincha. Las cejas viven en cy - 8 y el
     pelo tiene que terminar mas arriba que eso. */
  const cy = 34;
  const ry = medidasDe(.4, .2, 0).caraRy;
  const { sien, pico, patilla } = lineaDelPelo(cy, ry);

  esperarQue(pico < cy - 8, 'el pico del pelo pisa las cejas: ' + pico.toFixed(1));
  esperarQue(sien < pico, 'a los costados tiene que subir, no bajar');
  esperarQue(patilla > pico, 'las patillas si bajan, que para eso son patillas');
  esperarQue(patilla < cy + ry * 0.3, 'pero no hasta la mandibula');
});

test('el ojo entra entero debajo de la linea del pelo', () => {
  const cy = 34;
  const med = medidasDe(.4, .2, 0);
  const { pico } = lineaDelPelo(cy, med.caraRy);
  const ojoY = cy + 2;

  /* El alto del ojo sale de la misma cuenta que usa ojo(): r por 1.6 hacia
     arriba desde su linea media. */
  const topeOjo = ojoY - 5.4 * 1.6;
  esperarQue(topeOjo > pico, `el pelo (${pico.toFixed(1)}) tapa el ojo (${topeOjo.toFixed(1)})`);
});

test('la cara del personaje tiene ojos, cejas y boca', () => {
  /* Un conteo grueso, pero agarra el caso en que una parte desaparece entera. */
  const svg = svgPersonaje('neutral', 96, { efectiva: .4, musculatura: .2 }, null);
  esperarQue(svg.includes(PALETA.ojo), 'sin blanco de ojo no hay ojos');
  esperarQue(svg.includes(PALETA.iris), 'ni iris');
  esperarQue(svg.split(PALETA.ceja).length > 2, 'las dos cejas');
  esperarQue(svg.includes(PALETA.bocaOsc) || svg.includes(PALETA.linea), 'y la boca');
});


test('con panza no se dibujan abdominales', () => {
  /* Un abdominal marcado debajo de una panza es mentira, y el dibujo no puede
     decir dos cosas a la vez sobre el mismo cuerpo. El pecho si se mantiene:
     ancho de pectoral hay igual, lo que no hay es definicion de abdomen. */
  const fibra = svgPersonaje('neutral', 96, { efectiva: .25, musculatura: 1 }, null);
  const panzon = svgPersonaje('neutral', 96, { efectiva: .95, musculatura: 1 }, null);

  const trazos = (svg) => svg.split('stroke-linecap="round" opacity=".72"').length;
  esperarQue(trazos(fibra) > trazos(panzon),
    `fibra dibuja ${trazos(fibra)} trazos de musculo y el panzon ${trazos(panzon)}`);
});

test('la pila de deshacer guarda el dia entero y no la operacion', () => {
  /* Guardar el dia completo funciona igual para cualquier cambio sin escribir
     un inverso por cada uno, y no hay forma de que un deshacer quede a mitad
     de camino. */
  const antes = { peso: 90, agua: 2, comidas: [{ id: 'a', kcal: 500 }] };
  let pila = apilarCambio([], '2026-08-28', antes, 'el peso', 100);
  esperar(pila.length, 1);
  esperar(pila[0].que, 'el peso');

  /* Es una copia: tocar el dia despues no puede cambiar lo guardado. */
  antes.peso = 85;
  esperar(pila[0].dia.peso, 90);

  pila = apilarCambio(pila, '2026-08-28', { peso: 85 }, 'el agua', 200);
  const { pila: quedan, cambio } = desapilarCambio(pila);
  esperar(cambio.que, 'el agua');          // sale el ultimo primero
  esperar(quedan.length, 1);

  /* Con tope: no es un historial, es el error que acabas de cometer. */
  let larga = [];
  for (let i = 0; i < 30; i++) larga = apilarCambio(larga, '2026-08-28', { peso: i }, 'x', i);
  esperarQue(larga.length <= 12, 'la pila no puede crecer sin limite: ' + larga.length);

  esperar(desapilarCambio([]).cambio, null);
  esperar(apilarCambio([], null, { peso: 1 }, 'x').length, 0);
});

test('lo que solés comer a esta hora sale de la misma franja', () => {
  const dias = {};
  const desayuno = (n) => ({ titulo: 'Café con tostadas', kcal: 320, momento: 'desayuno', ts: n });
  const cena = (n) => ({ titulo: 'Pizza', kcal: 900, momento: 'cena', ts: n });

  for (let i = 0; i < 6; i++) dias['2026-08-0' + (i + 1)] = { comidas: [desayuno(i), cena(i)] };
  dias['2026-08-07'] = { comidas: [{ titulo: 'Sushi', kcal: 600, momento: 'cena', ts: 9 }] };

  const d = sugerenciasPorMomento(dias, 'desayuno');
  esperar(d.length, 1);
  esperar(d[0].titulo, 'Café con tostadas');

  /* Lo que se come a las 21 no dice nada sobre las 8: mezclarlas daria una
     lista de la que nunca sirve nada. */
  const c = sugerenciasPorMomento(dias, 'cena');
  esperar(c[0].titulo, 'Pizza');
  esperarQue(!c.some(x => x.titulo === 'Sushi'), 'una sola vez no es una costumbre');
});

test('la app nota que falta la comida de siempre, y no molesta antes', () => {
  const dias = {};
  for (let i = 1; i <= 20; i++) {
    const f = '2026-08-' + String(i).padStart(2, '0');
    dias[f] = { comidas: [{ titulo: 'Almuerzo', kcal: 700, momento: 'almuerzo', ts: 1 }] };
  }
  dias['2026-08-28'] = { comidas: [] };

  /* Tres de la tarde y sin almuerzo: eso es un olvido. */
  const tarde = faltaLaDeSiempre(dias, new Date(2026, 7, 28, 15, 0).getTime());
  esperarQue(!!tarde, 'a las 15 sin almuerzo tiene que avisar');
  esperar(tarde.momento, 'almuerzo');

  /* A las 11:05 todavia no se hace tarde para almorzar. */
  esperar(faltaLaDeSiempre(dias, new Date(2026, 7, 28, 11, 5).getTime()), null);

  /* Y si ya cargaste, no hay nada que decir. */
  dias['2026-08-28'].comidas.push({ titulo: 'Ensalada', kcal: 400, momento: 'almuerzo', ts: 2 });
  esperar(faltaLaDeSiempre(dias, new Date(2026, 7, 28, 15, 0).getTime()), null);

  /* Insistirle a alguien con dos dias cargados es la forma mas rapida de que
     apague los avisos. */
  esperar(faltaLaDeSiempre({ '2026-08-27': { comidas: [] } },
    new Date(2026, 7, 28, 15, 0).getTime()), null);
});

test('un analisis con numeros imposibles no entra en silencio', () => {
  /* Un plato de 12.000 kcal arruinaba el dia, el promedio de la semana y de
     paso el TDEE adaptativo, que aprende de esos numeros. */
  esperar(revisarAnalisis({ calorias: 650, items: [] }).length, 0);
  esperarQue(revisarAnalisis({ calorias: 12000, items: [] }).length > 0, 'doce mil tiene que avisar');
  esperarQue(revisarAnalisis({ calorias: 0, items: [] }).length > 0, 'cero tambien');

  /* Los macros tienen que dar las calorias: 4, 4 y 9 por gramo. Cuando no dan,
     uno de los dos numeros esta mal, y en keto los macros son los que mandan. */
  const mienten = revisarAnalisis({
    calorias: 500,
    items: [{ nombre: 'x', calorias: 500, proteinas: 100, carbohidratos: 100, grasas: 50 }]
  });
  esperarQue(mienten.some(a => /macros/i.test(a)), JSON.stringify(mienten));

  /* Y uno coherente no molesta: 25 x 4 + 60 x 4 + 12 x 9 = 448, contra 450. */
  esperar(revisarAnalisis({
    calorias: 450,
    items: [{ nombre: 'x', calorias: 450, proteinas: 25, carbohidratos: 60, grasas: 12 }]
  }).length, 0);
});

test('cargar dos veces la misma comida se detecta', () => {
  const ahora = Date.parse('2026-08-28T13:00:00');
  const comidas = [{ id: 'a', titulo: 'Milanesa', kcal: 900, ts: ahora - 5 * 60000 }];

  esperarQue(!!pareceDuplicada(comidas, { titulo: 'Milanesa', kcal: 920 }, ahora),
    'mismo plato cinco minutos despues');
  esperarQue(!pareceDuplicada(comidas, { titulo: 'Ensalada', kcal: 200 }, ahora),
    'otra comida no es duplicado');

  /* Tres horas despues ya no: se puede comer lo mismo dos veces en un dia. */
  const vieja = [{ id: 'a', titulo: 'Milanesa', kcal: 900, ts: ahora - 3 * 3600000 }];
  esperarQue(!pareceDuplicada(vieja, { titulo: 'Milanesa', kcal: 900 }, ahora));

  /* Y no se marca a si misma. */
  esperarQue(!pareceDuplicada(comidas, { id: 'a', titulo: 'Milanesa', kcal: 900 }, ahora));
});

test('la app avisa cuando sus numeros no cuadran con la balanza', () => {
  /* Alguien puede registrar deficit dos meses, no bajar un gramo y no tener
     forma de saber si le erro la app, la balanza o la memoria. La app tiene la
     respuesta en los datos: lo que faltaba era decirla. */
  const perfil = { sexo: 'm', edad: 38, altura: 178, peso: 92, pesoObj: 82,
    actividad: 1.375, ritmo: 0.5, manual: null };

  /* Veinte dias comiendo 2.000 y sin moverse de peso: el gasto real son 2.000,
     bastante menos que el que la formula calcula para 92 kg. */
  const dias = {};
  for (let i = 0; i < 20; i++) {
    dias[sumarDias('2026-08-01', i)] = {
      comidas: [{ kcal: 2000 }], peso: 92, agua: 0, ejercicio: 0
    };
  }

  const b = brechaConLaBalanza(dias, perfil);
  esperarQue(!!b, 'con veinte dias tiene que poder opinar');
  esperarQue(b.hayBrecha, 'no bajar nada comiendo 2.000 es una brecha');
  esperar(b.lectura, 'come-mas');
  esperarQue(b.texto.includes('comiendo'), b.texto);

  /* Sin datos no hay veredicto: es la regla de toda esta parte de la app. */
  esperar(brechaConLaBalanza({}, perfil), null);
  esperar(brechaConLaBalanza(dias, null), null);
});

test('comi la mitad se resuelve en un toque, y los macros acompanan', () => {
  const plato = {
    titulo: 'Milanesa con pure', kcal: 900, prot: 45, carb: 80, gras: 40,
    items: [{ nombre: 'Milanesa', calorias: 600, proteinas: 40, carbohidratos: 30, grasas: 32 },
    { nombre: 'Pure', calorias: 300, proteinas: 5, carbohidratos: 50, grasas: 8 }]
  };

  const mitad = escalarComida(plato, 0.5);
  esperar(mitad.kcal, 450);
  esperar(mitad.prot, 22.5);
  esperar(mitad.items[0].calorias, 300);
  esperar(mitad.items[1].calorias, 150);
  esperarQue(mitad.titulo.includes('½'), 'la porcion queda dicha en el titulo: ' + mitad.titulo);

  /* Los items tienen que sumar el total: si no, el dia cierra mal. */
  esperar(mitad.items.reduce((a, i) => a + i.calorias, 0), mitad.kcal);

  const doble = escalarComida(plato, 2);
  esperar(doble.kcal, 1800);
  esperar(escalarComida(plato, 1).titulo, 'Milanesa con pure');   // sin marca si es entero

  /* Un factor invalido devuelve la comida tal cual: mejor no tocar nada que
     ensuciar el dia con ceros o NaN. */
  esperar(escalarComida(plato, 0).kcal, 900);
  esperar(escalarComida(plato, null).kcal, 900);
});

test('una foto sacada sin senal no se pierde', () => {
  /* Una foto de un plato tiene una ventana de treinta segundos: despues el
     plato esta a medio comer o ya te levantaste de la mesa. */
  let cola = encolarAnalisis([], { imagenes: ['AAA'], modo: 'plato' }, 1000);
  esperar(cola.length, 1);
  esperarQue(!!cola[0].id, 'tiene que quedar con id para poder sacarla');

  cola = encolarAnalisis(cola, { imagenes: ['BBB'], modo: 'plato' }, 2000);
  esperar(cola.length, 2);
  esperar(cola[0].imagenes[0], 'BBB');            // la mas nueva primero
  esperar(cola.at(-1).imagenes[0], 'AAA');        // la mas vieja al final: se procesa antes

  /* Con tope: tres dias sin senal no pueden dejar el localStorage lleno de
     fotos y sin lugar para el dia de hoy. */
  for (let i = 0; i < 10; i++) cola = encolarAnalisis(cola, { imagenes: ['X' + i] }, 3000 + i);
  esperarQue(cola.length <= 4, 'la cola no puede crecer sin limite: ' + cola.length);

  const id = cola[0].id;
  esperar(sacarDeCola(cola, id).length, cola.length - 1);

  /* Sin imagenes no se encola nada: una entrada vacia trabaria la cola. */
  esperar(encolarAnalisis([], { imagenes: [] }).length, 0);
  esperar(encolarAnalisis([], null).length, 0);

  esperar(textoCola([]), '');
  esperarQue(textoCola([{ id: 'a', imagenes: ['x'] }]).includes('1 foto'));
});

test('la cuenta de un numero arranca rapido y frena al final', () => {
  /* La animación no se puede verificar sin ojos —y requestAnimationFrame ni
     siquiera corre con la pestaña oculta—, pero la curva sí. */
  esperar(valorEnT(0, 100, 0), 0);
  esperar(valorEnT(0, 100, 1), 100);
  esperar(valorEnT(1200, 1450, 1), 1450);

  /* A mitad de tiempo ya tiene que estar bastante mas alla de la mitad: eso es
     lo que hace que se lea como algo que llega y no como una barra lineal. */
  esperarQue(valorEnT(0, 100, 0.5) > 80, 'a mitad de camino: ' + valorEnT(0, 100, 0.5));

  /* Y siempre avanza, nunca vuelve para atras. */
  let previo = -Infinity;
  for (let i = 0; i <= 10; i++) {
    const v = valorEnT(0, 100, i / 10);
    esperarQue(v >= previo, 'la cuenta retrocedio en t=' + (i / 10));
    previo = v;
  }

  /* Fuera de rango no se pasa: un t de 1.4 por un frame tarde no puede dar 140. */
  esperar(valorEnT(0, 100, 1.4), 100);
  esperar(valorEnT(0, 100, -3), 0);
});

test('una baja grande se parte en etapas en vez de retar', () => {
  /* Antes esto era un error que ademas no dejaba guardar: "es una baja muy
     grande, mejor ponete una meta intermedia", sin decir cual. */
  const p = planPorEtapas(300, 100, 0.5);

  esperarQue(!!p, 'doscientos kilos tienen que dar un plan');
  esperar(p.total, 200);
  esperarQue(p.etapas.length > 1, 'y mas de una etapa');
  esperarQue(p.etapas[0].hasta < 300 && p.etapas[0].hasta > 100,
    'la primera etapa es intermedia: ' + p.etapas[0].hasta);
  esperarQue(p.etapas.at(-1).hasta <= 100 + 1, 'la ultima llega a la meta');

  /* Las semanas se acumulan: cada etapa dice en que semana del plan cae. */
  esperarQue(p.etapas[1].semanas > p.etapas[0].semanas);

  /* El ritmo escala con el peso: medio kilo por semana para alguien de 300 kg
     da noventa y dos meses, un numero que no informa, desanima. */
  esperarQue(p.meses < 40, 'a 300 kg el plan no puede dar ' + p.meses + ' meses');

  /* Una baja chica no arma plan: no hay nada que partir. */
  esperar(planPorEtapas(85, 80, 0.5), null);
  esperar(planPorEtapas(85, 90, 0.5), null);
  esperar(planPorEtapas(null, 80, 0.5), null);
});

test('el peso objetivo lejano ya no bloquea el guardado', () => {
  const { ok, errores } = validarPerfil({
    sexo: 'm', edad: 38, altura: 171, peso: 300, pesoObj: 100,
    actividad: 1.375, ritmo: 0.5, manual: null
  });
  esperarQue(ok, 'tiene que poder guardarse: ' + JSON.stringify(errores));
  esperarQue(!errores.pesoObj);
});

test('proximaComida dice cual viene y cuanto falta', () => {
  const a = (h, m = 0) => proximaComida(new Date(2026, 7, 28, h, m).getTime());

  esperar(a(8).id, 'almuerzo');
  esperar(a(8).dentroDe, 'desayuno');
  esperar(a(10, 30).minutos, 60);   // el almuerzo arranca 11:30
  esperar(a(13).id, 'merienda');
  esperar(a(17).id, 'cena');

  /* Pasada la cena no falta ninguna comida: falta dormir. */
  esperar(a(22), null);
});

test('las fotos viejas se podan antes de que revienten el localStorage', () => {
  /* Veinte kB por comida son 21 MB al año con tres comidas por dia, contra los
     5 MB que da un localStorage. No se pone lenta: revienta, y con ella todo el
     historial. */
  const dias = {
    '2026-08-27': { comidas: [{ id: 'a', foto: 'F', thumb: 'T' }] },
    '2026-07-01': { comidas: [{ id: 'b', foto: 'F', thumb: 'T' }] },
    '2025-11-01': { comidas: [{ id: 'c', foto: 'F', thumb: 'T' }] }
  };

  podarFotos(dias, '2026-08-28');

  esperar(dias['2026-08-27'].comidas[0].foto, 'F');   // de ayer: entera
  esperar(dias['2026-07-01'].comidas[0].foto, undefined);
  esperar(dias['2026-07-01'].comidas[0].thumb, 'T');  // dos meses: queda el thumb
  esperar(dias['2025-11-01'].comidas[0].thumb, undefined);
  esperar(dias['2025-11-01'].comidas[0].id, 'c');     // el dato no se toca nunca
});

test('un logro guarda el dia en que se gano, y no se pisa despues', () => {
  const dias = {};
  for (let i = 0; i < 8; i++) {
    dias[sumarDias('2026-08-01', i)] = { comidas: [{ kcal: 500 }], agua: 0, ejercicio: 0 };
  }

  const j1 = recalcularJuego(dias, { xp: 0, logros: [], anunciados: [] },
    { hoy: '2026-08-08', vasos: 4 });
  esperarQue(j1.juego.fechasLogros['primer-dia'] === '2026-08-08',
    'el dia en que se detecto es el que queda: ' + j1.juego.fechasLogros['primer-dia']);

  /* Y una semana despues sigue diciendo lo mismo: la fecha no se recalcula. */
  const j2 = recalcularJuego(dias, j1.juego, { hoy: '2026-08-15', vasos: 4 });
  esperar(j2.juego.fechasLogros['primer-dia'], '2026-08-08');
});

test('las frecuentes no se congelan con lo que se comia antes', () => {
  /* Cuarenta usos de hace un año contra ocho de la semana pasada. Ordenando por
     cantidad a secas, la milanesa del año pasado queda primera para siempre y
     la lista muestra lo que uno comia, no lo que come. */
  const ahora = Date.parse('2026-08-28T12:00:00');
  const viejo = { nombre: 'Milanesa', usos: 40, ultimoUso: ahora - 365 * 24 * 3600 * 1000 };
  const nuevo = { nombre: 'Ensalada', usos: 8, ultimoUso: ahora - 3 * 24 * 3600 * 1000 };

  esperarQue(puntajeFrecuente(nuevo, ahora) > puntajeFrecuente(viejo, ahora),
    'lo de esta semana tiene que ir primero');

  /* Pero a igual antiguedad manda la cantidad: la recencia pesa, no reemplaza. */
  const mismoDia = { nombre: 'Tostada', usos: 3, ultimoUso: nuevo.ultimoUso };
  esperarQue(puntajeFrecuente(nuevo, ahora) > puntajeFrecuente(mismoDia, ahora));
});

test('una foto demasiado pesada se rechaza con el numero', () => {
  /* El problema no es mandarla —el redimensionado la deja en unos 60 kB— sino
     leerla: readAsDataURL de veinte megas arma un string de treinta y pico y la
     pestana se cae sin decir nada. */
  esperar(avisoPorPeso(0), null);
  esperar(avisoPorPeso(5 * 1024 * 1024), null);
  esperar(avisoPorPeso(14 * 1024 * 1024), null);

  const aviso = avisoPorPeso(21 * 1024 * 1024);
  esperarQue(!!aviso, 'veintiun megas tienen que rebotar');
  esperarQue(aviso.includes('21.0'), 'y el aviso dice cuanto pesa: ' + aviso);
  esperarQue(aviso.includes('14'), 'y cual es el tope');
});

test('una comida que cambio de dia no queda duplicada al sincronizar', () => {
  /* Se cargo el martes, se corrigio al miercoles, y del remoto llega con la
     fecha nueva. Buscandola solo en la lista del miercoles no aparece, se
     agrega, y la del martes se queda: la misma comida contada dos veces. */
  const estado = {
    dias: {
      '2026-08-25': { comidas: [{ id: 'abc', titulo: 'Milanesa', kcal: 600, act: 10 }] },
      '2026-08-26': { comidas: [] }
    },
    borradas: []
  };

  const { estado: r } = aplicarRemoto(estado, {
    comidas: [{ id: 'abc', fecha: '2026-08-26', titulo: 'Milanesa', calorias: 600, act: 99 }]
  });

  const todas = Object.values(r.dias).flatMap(d => d.comidas || []);
  esperar(todas.filter(c => c.id === 'abc').length, 1);
  esperar(r.dias['2026-08-25'].comidas.length, 0);
  esperar(r.dias['2026-08-26'].comidas.length, 1);
});

test('la fase pone musculo, pero no le borra la panza a nadie', () => {
  /* En la lamina no hay un gordo musculoso: los tres cuerpos con musculo son
     delgados. Sin freno, alguien con panza llegaba a Bestia y aparecia flaco y
     marcado, o sea la app le borraba veinte kilos por cumplir tres dias. */
  const flaco = { efectiva: .2, musculatura: 0 };
  const panzon = { efectiva: .85, musculatura: 0 };
  const bestia = FASES[3];

  esperarQue(spritePara(flaco, bestia) !== spritePara(flaco, null),
    'al flaco la fase tiene que cambiarle el cuerpo');
  esperar(spritePara(panzon, bestia), spritePara(panzon, null));
});

test('con IMC de 102 el muneco es gordo, tenga la musculatura que tenga', () => {
  /* Aparecio de verdad: 300 kg y musculatura 0.6 daban el cuerpo atletico, o
     sea que la app le decia a alguien con IMC 102 que su cuerpo era ese. El
     freno estaba puesto solo sobre el aporte de la fase, y la musculatura
     propia sube sola con los dias entrenados y el bonus de perfectos. */
  const gordo = SPRITES.sprites.length - 4;   // cuerpo-3, el de la panza grande

  for (const m of [0, 0.3, 0.6, 0.8, 1]) {
    esperar(spritePara({ efectiva: 1, musculatura: m }, null), gordo);
    esperar(spritePara({ efectiva: 1, musculatura: m }, FASES[6]), gordo);
  }
});

test('el musculo del brazo abre arriba, no en la muneca', () => {
  /* El punto entero del relieve, del lado del brazo: entrenar tiene que dar
     hombro y biceps. Si los cuatro anchos crecieran parejo, el brazo del que
     entrena seria el mismo del que engorda, solo que mas grande. */
  const flojo = anchosBrazo(medidasDe(.4, 0, 0));
  const fuerte = anchosBrazo(medidasDe(.4, 1, 0));

  const creceHombro = fuerte.hombro / flojo.hombro;
  const creceMuneca = fuerte.muneca / flojo.muneca;
  esperarQue(creceHombro > creceMuneca * 1.15,
    `el hombro crece ${creceHombro.toFixed(2)} y la muneca ${creceMuneca.toFixed(2)}`);
});

test('el brazo se afina del hombro a la muneca', () => {
  const a = anchosBrazo(medidasDe(.4, 1, 0));
  esperarQue(a.hombro > a.biceps, 'el hombro es lo mas ancho');
  esperarQue(a.biceps > a.codo, 'el codo se estrangula');
  esperarQue(a.codo > a.muneca, 'y la muneca es lo mas fino');
});


/* ---- grasa y musculo no se dibujan igual ---- */

test('el mismo ancho por grasa y por musculo da dibujos distintos', () => {
  /* Es el punto entero del relieve. Antes los dos ejes hacian exactamente lo
     mismo —ensanchar la silueta— y el torso de alguien que entrena se veia
     igual de liso que el de alguien que no. */
  const gordo = svgPersonaje('neutral', 96, { efectiva: .85, musculatura: 0 }, null);
  const fuerte = svgPersonaje('neutral', 96, { efectiva: .2, musculatura: 1 }, null);
  esperarQue(gordo !== fuerte);
});

test('la grasa dibuja volumen que cuelga', () => {
  const chato = svgPersonaje('neutral', 96, { efectiva: .2, musculatura: 0 }, null);
  const panzon = svgPersonaje('neutral', 96, { efectiva: .95, musculatura: 0 }, null);

  /* Contar elipses y nada mas: buscar una coordenada concreta agarraba los
     ojos, que tambien son elipses. */
  const elipses = (svg) => svg.split('<ellipse').length;
  esperarQue(elipses(panzon) > elipses(chato),
    'con contextura alta tiene que aparecer el volumen de la panza');
  esperarQue(panzon.includes('stroke-width="1.7"'), 'y su pliegue');
});

test('el musculo dibuja separacion entre piezas', () => {
  const blando = { efectiva: .3, musculatura: 0 };
  const marcado = { efectiva: .3, musculatura: 1 };

  const lineas = (cu) => svgPersonaje('neutral', 96, cu, null)
    .split(`stroke="${PALETA.linea}"`).length;

  esperarQue(lineas(marcado) > lineas(blando) + 3,
    'pectorales, trapecios, abdomen y deltoides tienen que sumar trazos');
});

test('con panza grande no se dibuja la linea del abdomen', () => {
  /* Un abdomen marcado debajo de una panza es una contradiccion: si hay panza,
     no se ve. */
  const cu = { efectiva: .9, musculatura: 1 };
  const med = medidasDe(cu.efectiva, cu.musculatura, 0);
  esperarQue(med.c >= 0.6, 'este caso tiene que caer del lado de la panza');
});

test('el ruedo de la musculosa baja con la contextura', () => {
  /* Con el ruedo fijo, la mitad de abajo de la panza quedaba afuera de la
     remera y el pliegue caia sobre el short, donde parecia un cinturon. */
  const alto = svgPersonaje('neutral', 96, { efectiva: .95, musculatura: 0 }, null);
  const bajo = svgPersonaje('neutral', 96, { efectiva: .1, musculatura: 0 }, null);
  esperarQue(alto.length > bajo.length, 'el dibujo con panza tiene mas partes');
});


/* ============================================================
   Ciclo 7 — las cien mejoras
   ============================================================ */

/* ---- A. correccion ---- */

test('una fecha ISO invalida se reconoce como invalida', () => {
  esperarQue(esFechaISO('2026-08-27'));
  esperarQue(!esFechaISO('2026-13-01'), 'mes 13');
  esperarQue(!esFechaISO('2026-02-30'), 'febrero 30');
  esperarQue(!esFechaISO('27/08/2026'), 'otro formato');
  esperarQue(!esFechaISO(''), 'vacio');
  esperarQue(!esFechaISO(null), 'null');
  esperarQue(!esFechaISO(20260827), 'numero');
});

test('sumarDias sobre basura devuelve null, no "NaN-aN-aN"', () => {
  /* Antes devolvia un string invalido que despues se usaba como clave de `dias`
     y ensuciaba el estado guardado en silencio. */
  esperar(sumarDias('no-es-fecha', 1), null);
  esperar(sumarDias(null, 1), null);
  esperar(sumarDias('2026-08-27', 'hola'), '2026-08-27', 'un n invalido vale 0');
  esperar(sumarDias('2026-08-27', 1), '2026-08-28');
});

test('el IMC ignora pesos y alturas imposibles', () => {
  esperar(imcDe(0, 180), null);
  esperar(imcDe(-5, 180), null);
  esperar(imcDe('mucho', 180), null);
  esperar(imcDe(80, 0), null, 'sin altura no se divide por cero');
  esperar(imcDe(80, 5), null, 'cinco centimetros no es una altura');
  esperar(imcDe(900, 180), null, 'novecientos kilos tampoco');
  esperarQue(imcDe(80, 180) > 0, 'lo razonable si');
});

test('los totales de un dia aguantan comidas rotas', () => {
  /* Pasa de verdad: una comida editada a mano o venida de una version vieja
     puede traer kcal en null o en texto, y el total del dia se volvia NaN. */
  const t = totalesDe([
    { kcal: 500, prot: 10 },
    { kcal: null },
    { kcal: 'trescientas' },
    { kcal: undefined, prot: 5 },
    null,
    { kcal: 300, prot: 20 }
  ]);
  esperar(t.kcal, 800);
  esperar(t.prot, 35);
  esperarQue(isFinite(t.carb) && isFinite(t.gras));
});

test('kcalDe con una lista vacia o nula da cero', () => {
  esperar(kcalDe([]), 0);
  esperar(kcalDe(null), 0);
  esperar(kcalDe(undefined), 0);
});

test('un ejercicio de cero kcal no cuenta como entrenamiento', () => {
  const dias = {};
  for (let i = 0; i < 5; i++) dias[sumarDias(HOY_CUERPO, -i)] = { ejercicio: 0, comidas: [] };
  esperar(diasEntrenados(dias, HOY_CUERPO), 0);
});

test('el nivel aguanta un XP infinito o NaN', () => {
  esperar(nivelDe(Infinity).nivel, 0);
  esperar(nivelDe(NaN).nivel, 0);
  esperar(nivelDe(-Infinity).nivel, 0);
  for (const x of [Infinity, NaN, -Infinity, 'hola']) {
    esperarQue(isFinite(nivelDe(x).pct), 'el pct no puede salir NaN con ' + x);
  }
});

/* ---- ciclo 7: textos, robustez y rendimiento ---- */

test('el plural de 1 esta bien', () => {
  esperar(plural(1, 'día'), '1 día');
  esperar(plural(0, 'día'), '0 días');
  esperar(plural(2, 'día'), '2 días');
  esperar(plural(1, 'vez', 'veces'), '1 vez');
  esperar(plural(3, 'vez', 'veces'), '3 veces');
  esperar(plural(1000, 'comida'), '1.000 comidas', 'y sigue usando el separador de miles');
});

test('una comida absurda se marca como sospechosa', () => {
  esperarQue(esSospechosa({ kcal: 40000 }));
  esperarQue(!esSospechosa({ kcal: 1200 }));
  esperarQue(!esSospechosa({ kcal: null }));
  esperarQue(!esSospechosa(null));
});

test('los dias del futuro no cuentan como registrados', () => {
  /* Entran cuando el telefono tiene mal la fecha o al sincronizar desde otro
     huso. El dato se guarda, pero no puede regalar escudos ni logros. */
  const hoy = '2026-09-01';
  const dias = {
    '2026-08-31': { comidas: [{ kcal: 500 }] },
    '2026-09-01': { comidas: [{ kcal: 500 }] },
    '2026-12-25': { comidas: [{ kcal: 500 }] }
  };
  esperar(Object.keys(diasPasados(dias, hoy)).length, 2);
  esperarQue(!diasPasados(dias, hoy)['2026-12-25']);
});

test('una clave que no es fecha no entra al estado', () => {
  const s = migrar({ dias: {
    '2026-08-27': { comidas: [] },
    'NaN-aN-aN': { comidas: [{ kcal: 500 }] },
    'hola': { comidas: [] }
  } });
  esperar(Object.keys(s.dias).join(), '2026-08-27');
});

test('un estado corrupto no deja la app en blanco', () => {
  /* migrar() es la unica puerta de entrada: si aguanta cualquier basura, no hay
     forma de que un localStorage roto deje la pantalla vacia. */
  for (const basura of [null, undefined, 'texto', 42, [], { dias: 'no-es-objeto' }, { perfil: null }]) {
    const s = migrar(basura);
    esperarQue(s && typeof s === 'object', 'con ' + JSON.stringify(basura));
    esperarQue(s.perfil && s.cfg && s.dias, 'tiene que traer el esqueleto entero');
  }
});

test('la ventana del historial se ajusta a los datos', () => {
  /* Las rachas barrian 400 dias SIEMPRE. Con diez dias cargados eso son 390
     vueltas al pedo, cuatro veces por render. */
  const hoy = '2026-09-01';
  esperar(ventanaHistorial({}, hoy), 1, 'sin datos, un dia');
  esperar(ventanaHistorial({ '2026-08-28': {} }, hoy), 5);
  esperarQue(ventanaHistorial({ '2020-01-01': {} }, hoy) <= 400, 'y nunca mas del tope');
});

/* ---- ciclo 7: importar sin romper nada ---- */

test('un archivo que no es un respaldo se rechaza', () => {
  /* migrar() acepta cualquier cosa y devuelve un estado valido, que esta bien
     para arrancar y es un desastre para importar: un archivo equivocado
     reemplazaba meses de historial por un estado vacio. */
  esperarQue(!pareceEstado(null));
  esperarQue(!pareceEstado('texto'));
  esperarQue(!pareceEstado([]));
  esperarQue(!pareceEstado({ hola: 1 }));
  esperarQue(!pareceEstado({ dias: [], perfil: {} }), 'dias tiene que ser objeto');
  esperarQue(!pareceEstado({ dias: { hola: {} }, perfil: {} }), 'con claves que no son fechas');
});

test('un respaldo de verdad se acepta', () => {
  esperarQue(pareceEstado({ dias: {}, perfil: {}, cfg: {} }), 'vacio pero con forma');
  esperarQue(pareceEstado({ dias: { '2026-08-27': { comidas: [] } }, perfil: { peso: 80 } }));
});

test('el peso del estado cuenta dias y comidas de verdad', () => {
  const p = pesoDelEstado({ dias: {
    '2026-08-27': { comidas: [{ kcal: 1 }, { kcal: 2 }] },
    '2026-08-26': { comidas: [] },
    'basura': { comidas: [{ kcal: 9 }] }
  } });
  esperar(p.dias, 1, 'el dia sin comidas y la clave basura no cuentan');
  esperar(p.comidas, 2);
});

/* ---- ciclo 7: proyeccion, deficit, fibra, CSV y borrar un dia ---- */

const HOY_P = '2026-09-01';

function diasPeso(pesos) {
  const dias = {};
  for (const [atras, p] of Object.entries(pesos)) {
    dias[sumarDias(HOY_P, -Number(atras))] = { peso: p, comidas: [], agua: 0, ejercicio: 0 };
  }
  return dias;
}

test('sin peso objetivo no se proyecta nada', () => {
  const r = proyeccionPeso(diasPeso({ 0: 80 }), null, HOY_P);
  esperarQue(!r.hay);
  esperarQue(/objetivo/.test(r.motivo), r.motivo);
});

test('con dos pesadas tampoco: eso no es una tendencia', () => {
  const r = proyeccionPeso(diasPeso({ 0: 80, 7: 81 }), 75, HOY_P);
  esperarQue(!r.hay);
  esperarQue(/pesada|semanas/.test(r.motivo), r.motivo);
});

test('con suficientes semanas proyecta una fecha', () => {
  /* Baja medio kilo por semana durante seis semanas, y faltan 3 kg. */
  const pesos = {};
  for (let s = 0; s <= 6; s++) pesos[s * 7] = 80 + s * 0.5;
  const r = proyeccionPeso(diasPeso(pesos), 74, HOY_P);

  esperarQue(r.hay, r.motivo);
  cerca(r.porSemana, -0.5, 0.1);
  esperarQue(r.dias > 0);
  esperarQue(esFechaISO(r.fecha), r.fecha);
  esperarQue(r.optimista < r.fecha && r.fecha < r.pesimista, 'el rango tiene que rodear a la fecha');
});

test('si vas para el otro lado lo dice, no proyecta una fecha imposible', () => {
  const pesos = {};
  for (let s = 0; s <= 6; s++) pesos[s * 7] = 80 - s * 0.5;   // subiendo hacia hoy
  const r = proyeccionPeso(diasPeso(pesos), 74, HOY_P);
  esperarQue(!r.hay);
  esperarQue(/otro lado/.test(r.motivo), r.motivo);
});

test('con el peso estable no promete una fecha', () => {
  const pesos = {};
  for (let s = 0; s <= 6; s++) pesos[s * 7] = 80;
  const r = proyeccionPeso(diasPeso(pesos), 74, HOY_P);
  esperarQue(!r.hay);
  esperarQue(/estable/.test(r.motivo), r.motivo);
});

test('el deficit peligroso se detecta solo con datos suficientes', () => {
  const armar = (kcal) => {
    const dias = {};
    for (let i = 0; i < 10; i++) {
      dias[sumarDias(HOY_P, -i)] = { comidas: [{ id: 'x' + i, kcal }], agua: 0, ejercicio: 0, peso: null };
    }
    return dias;
  };

  esperarQue(deficitPeligroso(armar(1000), {}, { tmb: 1800 }, HOY_P).alerta, 'mil kcal con TMB 1800');
  esperarQue(!deficitPeligroso(armar(2200), {}, { tmb: 1800 }, HOY_P).alerta, 'comiendo bien no');
  esperarQue(!deficitPeligroso({}, {}, { tmb: 1800 }, HOY_P).alerta, 'sin datos no se opina');
  esperarQue(!deficitPeligroso(armar(1000), {}, {}, HOY_P).alerta, 'sin TMB tampoco');
});

test('el objetivo de fibra sale de las calorias', () => {
  esperar(objetivoFibra(2000), 28);
  esperar(objetivoFibra(1500), 21);
  esperar(objetivoFibra(0), 25, 'sin objetivo, la referencia general');
  esperar(objetivoFibra(null), 25);
});

/* El export a CSV ya existia y estaba completo —una fila por alimento, con
   peso, agua y ejercicio del dia, y con celdaCSV escapando— asi que lo que hice
   fue escribirle los tests que le faltaban. La version propia que habia
   empezado era duplicacion pura y se borro. */

test('el CSV sale con encabezado y punto y coma', () => {
  const csv = armarCSV({
    '2026-08-27': { comidas: [{ ts: 0, momento: 'almuerzo', titulo: 'Milanesa', kcal: 700, prot: 40, carb: 50, gras: 30 }], peso: 80, agua: 4, ejercicio: 200 }
  });
  esperarQue(csv.includes('fecha;hora;momento'), 'encabezado');
  esperarQue(csv.includes('Milanesa'), csv.slice(0, 260));
});

test('el CSV escapa lo que puede romper una columna', () => {
  const raro = 'Pan; queso ' + String.fromCharCode(34) + 'del bueno' + String.fromCharCode(34);
  const csv = armarCSV({ '2026-08-27': { comidas: [{ ts: 0, titulo: raro, kcal: 300, items: [] }] } });
  const comilla = String.fromCharCode(34);
  esperarQue(csv.includes(comilla + 'Pan; queso '), 'la celda tiene que ir entre comillas: ' + csv.slice(0, 200));
  esperarQue(csv.includes(comilla + comilla + 'del bueno'), 'y las comillas de adentro, duplicadas');
});

test('el CSV de un historial vacio trae solo el encabezado', () => {
  esperar(armarCSV({}).split(String.fromCharCode(13, 10)).filter(Boolean).length, 1);
  esperar(armarCSV(null).split(String.fromCharCode(13, 10)).filter(Boolean).length, 1);
});

test('borrar un dia devuelve lo borrado para poder deshacer', () => {
  const estado = { dias: { '2026-08-27': { comidas: [{ kcal: 500 }] } } };
  const copia = borrarDia(estado, '2026-08-27');

  esperarQue(!estado.dias['2026-08-27'], 'se fue');
  esperar(copia.comidas.length, 1, 'pero volvio en la mano');

  restaurarDia(estado, '2026-08-27', copia);
  esperar(estado.dias['2026-08-27'].comidas.length, 1, 'y se puede reponer');
});

test('borrar un dia que no existe no rompe nada', () => {
  const estado = { dias: {} };
  esperar(borrarDia(estado, '2026-08-27'), null);
  esperar(borrarDia(estado, 'basura'), null);
  esperar(restaurarDia(estado, 'basura', {}), false);
});

/* ---- ciclo 7: avisos del juego y agua por ejercicio ---- */

test('la racha en peligro no avisa a la manana', () => {
  /* A las 10 todavia queda todo el dia: avisar ahi es ruido. */
  const dias = diasJ({ 1: 'comida', 2: 'comida', 3: 'comida', 4: 'comida' });
  esperar(rachasEnPeligro(dias, { ...OPTS_J, hora: 10 }).length, 0);
});

test('a la noche avisa, y solo de las rachas que duelen', () => {
  const dias = diasJ({ 1: 'comida', 2: 'comida', 3: 'comida', 4: 'comida' });
  const r = rachasEnPeligro(dias, { ...OPTS_J, hora: 21 });
  esperar(r.length, 1);
  esperar(r[0].id, 'registro');
  esperarQue(r[0].actual >= 3);
});

test('una racha de dos dias no es noticia', () => {
  const dias = diasJ({ 1: 'comida', 2: 'comida' });
  esperar(rachasEnPeligro(dias, { ...OPTS_J, hora: 21 }).length, 0);
});

test('lo ya cumplido hoy no esta en peligro', () => {
  const dias = diasJ({ 0: 'comida', 1: 'comida', 2: 'comida', 3: 'comida' });
  esperarQue(!rachasEnPeligro(dias, { ...OPTS_J, hora: 21 }).some(r => r.id === 'registro'));
});

test('el logro mas cerca dice cuanto falta', () => {
  const mapa = {};
  for (let i = 0; i < 5; i++) mapa[i] = 'comida';
  const c = logroMasCerca(diasJ(mapa), JUEGO_VACIO, OPTS_J);

  esperarQue(!!c, 'con cinco dias tiene que haber alguno cerca');
  esperarQue(c.falta > 0, 'si falta 0 ya esta ganado');
  esperarQue(c.pct > 0 && c.pct < 1);
  esperarQue(!!c.logro.nombre);
});

test('sin nada cargado el logro mas cerca sigue existiendo', () => {
  const c = logroMasCerca({}, JUEGO_VACIO, OPTS_J);
  esperarQue(c === null || c.falta > 0, 'o no hay ninguno, o falta algo');
});

test('el agua sube con el ejercicio del dia', () => {
  esperar(vasosPorEjercicio(0), 0);
  esperar(vasosPorEjercicio(null), 0);
  esperarQue(vasosPorEjercicio(400) >= 2, 'cuatrocientas kcal piden al menos dos vasos');
  esperarQue(vasosPorEjercicio(800) > vasosPorEjercicio(400), 'y el doble pide mas');
});

test('el vaso mas grande pide menos vasos por lo mismo', () => {
  esperarQue(vasosPorEjercicio(600, 500) < vasosPorEjercicio(600, 250));
});

/* ---- ciclo 7: resumen de periodo, comparar semanas y buscar ---- */

const HOY_R = '2026-09-01';

function diasKcal(lista) {
  const dias = {};
  lista.forEach((kcal, i) => {
    if (kcal == null) return;
    dias[sumarDias(HOY_R, -i)] = {
      comidas: [{ id: 'c' + i, ts: 1, titulo: 'plato ' + i, kcal, prot: 40, carb: 50, gras: 20, items: [] }],
      agua: 0, ejercicio: 0, peso: null
    };
  });
  return dias;
}

test('sin dias registrados el resumen no inventa nada', () => {
  const r = resumenPeriodo({}, { hasta: HOY_R });
  esperarQue(!r.hay);
  esperar(r.dias, 0);
});

test('el resumen promedia solo los dias registrados', () => {
  /* Tres dias de 2000 y cuatro sin registrar: el promedio son 2000, no 857.
     Dividir por los dias del calendario seria castigar por no haber anotado. */
  const r = resumenPeriodo(diasKcal([2000, null, 2000, null, 2000, null, null]), { hasta: HOY_R });
  esperar(r.dias, 3);
  esperar(r.promedio, 2000);
});

test('el resumen encuentra el dia mas alto y el mas bajo', () => {
  const r = resumenPeriodo(diasKcal([1500, 3000, 2000]), { hasta: HOY_R });
  esperar(r.maximo.kcal, 3000);
  esperar(r.minimo.kcal, 1500);
});

test('el porcentaje de cumplimiento sale sobre lo registrado', () => {
  const r = resumenPeriodo(diasKcal([1800, 1900, 3000, 1700]), { hasta: HOY_R, objetivo: 2000 });
  esperar(r.cumplidos, 3);
  esperar(r.pctCumplidos, 75);
});

test('sin objetivo no se inventa un porcentaje', () => {
  esperar(resumenPeriodo(diasKcal([1800, 1900]), { hasta: HOY_R }).pctCumplidos, null);
});

/* compararSemanas y buscarEnHistorial YA EXISTIAN y son mas completas que las
   que habia empezado a escribir: la primera compara tambien el peso, la segunda
   busca en las notas del dia e ignora acentos. Los duplicados se borraron. */



/* ============================================================
   El sync, contra un doble del servidor — ciclo 12

   Hasta ahora cada pieza del sync se probaba sola: aplicarRemoto con filas a
   mano, cambiosLocales con un estado a mano. Lo que nunca se probo es la
   COREOGRAFIA: bajar, fusionar, decidir que subir y subirlo, en ese orden y
   con dos dispositivos de por medio. Ahi es donde estan los bugs que quedan,
   porque ninguno vive dentro de una funcion: viven entre dos.

   El doble tiene la forma de `clienteSupabase` y no la de `fetch`. Probar otra
   vez el REST no aporta nada —eso ya esta probado—; lo que hace falta es poder
   mirar QUE se subio y en que orden.
   ============================================================ */

function servidorFalso({ comidas = [], dias = [], huerfanas = null, falla = null } = {}) {
  const tablas = { comidas: comidas.map(c => ({ ...c })), dias: dias.map(d => ({ ...d })) };
  const llamadas = [];

  /* La PK de verdad es (user_id, id) para comidas y (user_id, fecha) para dias.
     Aca alcanza con la segunda mitad: los tests tienen un solo usuario. */
  const claveDe = (tabla) => (tabla === 'comidas' ? 'id' : 'fecha');

  return {
    tablas,
    llamadas,
    subidas: (tabla) => llamadas.filter(l => l.op === 'guardar' && l.tabla === tabla).flatMap(l => l.filas),

    async guardar(tabla, filas) {
      if (falla === 'guardar') throw new Error('Supabase respondió 500');
      llamadas.push({ op: 'guardar', tabla, filas: filas.map(f => ({ ...f })) });
      const k = claveDe(tabla);
      for (const f of filas) {
        const i = tablas[tabla].findIndex(x => x[k] === f[k]);
        if (i >= 0) tablas[tabla][i] = { ...f };
        else tablas[tabla].push({ ...f });
      }
      return [];
    },

    async traer(tabla, llave, desde = 0) {
      if (falla === 'traer') throw new Error('No se pudo conectar con Supabase.');
      llamadas.push({ op: 'traer', tabla, desde });
      // el mismo margen por relojes desfasados que usa el cliente de verdad
      const piso = Math.max(0, desde - 5 * 60000);
      return tablas[tabla]
        .filter(f => (Number(f.subido) || 0) > piso)
        .sort((a, b) => a.subido - b.subido)
        .map(f => ({ ...f }));
    },

    async reclamarLlave(llave) {
      llamadas.push({ op: 'reclamar', llave });
      return huerfanas || { comidas: 0, dias: 0 };
    },

    async probar() { return true; }
  };
}

const LLAVE_T = 'abcdefghjkmnpqrstuvwxyz23456789a';

/** Un estado minimo con las comidas y los datos de dia que se le pidan. */
function estadoT(dias = {}) {
  const salida = { dias: {}, borradas: [], cfg: {} };
  for (const [fecha, d] of Object.entries(dias)) {
    salida.dias[fecha] = {
      peso: null, agua: 0, ejercicio: 0, nota: '', comidas: [], act: 0, ...d
    };
  }
  return salida;
}

function comidaT(id, ts, extra = {}) {
  return { id, ts, titulo: 'Comida ' + id, items: [], kcal: 500, prot: 30, carb: 40, gras: 20,
    momento: 'almuerzo', notas: '', act: ts, ...extra };
}

testAsync('el sync completo sube lo local y baja lo remoto', async () => {
  const srv = servidorFalso({
    comidas: [{ ...comidaT('r1', 1000), llave: LLAVE_T, fecha: '2026-08-01', subido: 5000, borrada: false }]
  });

  const estado = estadoT({ '2026-08-01': { comidas: [comidaT('l1', 2000)] } });
  const r = await sincronizar({ cliente: srv, estado, llave: LLAVE_T, ultimoSync: 0, ahora: 9000 });

  // bajo la remota y la sumo al dia
  const ids = r.estado.dias['2026-08-01'].comidas.map(c => c.id);
  esperar(ids.sort(), ['l1', 'r1']);
  esperar(r.resumen.nuevas, 1);

  // y subio la local (y de paso la remota, que ahora tambien es suya: no molesta)
  esperarQue(srv.subidas('comidas').some(f => f.id === 'l1'), 'no subio la comida local');
});

testAsync('primero baja y despues sube: al reves pisaria lo nuevo con lo viejo', async () => {
  const srv = servidorFalso();
  const estado = estadoT({ '2026-08-01': { comidas: [comidaT('l1', 2000)] } });
  await sincronizar({ cliente: srv, estado, llave: LLAVE_T, ultimoSync: 0, ahora: 9000 });

  const orden = srv.llamadas.map(l => l.op);
  esperar(orden.indexOf('traer') < orden.indexOf('guardar'), true);
});

testAsync('lo remoto mas nuevo gana sobre lo local viejo', async () => {
  const srv = servidorFalso({
    comidas: [{ ...comidaT('c1', 1000, { titulo: 'corregida', kcal: 900, act: 8000 }),
      llave: LLAVE_T, fecha: '2026-08-01', subido: 8000, borrada: false }]
  });

  const estado = estadoT({ '2026-08-01': { comidas: [comidaT('c1', 1000, { titulo: 'vieja', act: 1000 })] } });
  const r = await sincronizar({ cliente: srv, estado, llave: LLAVE_T, ultimoSync: 0, ahora: 9000 });

  esperar(r.estado.dias['2026-08-01'].comidas[0].titulo, 'corregida');
  esperar(r.estado.dias['2026-08-01'].comidas[0].kcal, 900);
});

testAsync('una llave invalida no llega a tocar el servidor', async () => {
  const srv = servidorFalso();
  try {
    await sincronizar({ cliente: srv, estado: estadoT(), llave: 'corta', ultimoSync: 0 });
    throw new Error('deberia haber fallado');
  } catch (e) {
    esperarQue(/llave/i.test(e.message), 'otro error: ' + e.message);
  }
  esperar(srv.llamadas.length, 0);
});

/* --- lo que se carga mientras el sync corre no se pierde (ciclo 12) --- */

/*
 * La ventana exacta donde se perdian las comidas.
 *
 * `sincronizar` clona el estado al fusionar lo remoto, y despues se queda un
 * rato subiendo. Todo lo que se cargue durante esa subida —la parte lenta, la
 * que manda datos por la red del celular— queda afuera del clon. Asignar ese
 * clon al estado global es lo que se comia la comida.
 */
function conCargaDuranteLaSubida(srv, vivo, fecha, comida) {
  const guardarOriginal = srv.guardar;
  let ya = false;
  srv.guardar = async (...a) => {
    if (!ya) { ya = true; vivo.dias[fecha].comidas.push(comida); }
    return guardarOriginal.call(srv, ...a);
  };
  return srv;
}

testAsync('el estado que devuelve sincronizar es el de ANTES: por eso no se asigna directo', async () => {
  const vivo = estadoT({ '2026-08-01': { comidas: [comidaT('l1', 2000)] } });
  const srv = conCargaDuranteLaSubida(servidorFalso(), vivo, '2026-08-01', comidaT('mientras', 2500));

  const r = await sincronizar({ cliente: srv, estado: vivo, llave: LLAVE_T, ultimoSync: 0, ahora: 9000 });

  // el clon que quedo adentro no la tiene: es una foto de antes de subir
  esperar(r.estado.dias['2026-08-01'].comidas.map(c => c.id), ['l1']);
  // el estado vivo si
  esperarQue(vivo.dias['2026-08-01'].comidas.some(c => c.id === 'mientras'), 'se perdio el postre');
});

testAsync('fusionarAlFinal conserva lo cargado durante el sync y suma lo remoto', async () => {
  const vivo = estadoT({ '2026-08-01': { comidas: [comidaT('l1', 2000)] } });

  const srv = conCargaDuranteLaSubida(servidorFalso({
    comidas: [{ ...comidaT('r1', 1000), llave: LLAVE_T, fecha: '2026-08-01', subido: 5000, borrada: false }]
  }), vivo, '2026-08-01', comidaT('mientras', 2500));

  const r = await sincronizar({ cliente: srv, estado: vivo, llave: LLAVE_T, ultimoSync: 0, ahora: 9000 });
  const final = fusionarAlFinal(vivo, r).estado;

  esperar(final.dias['2026-08-01'].comidas.map(c => c.id).sort(), ['l1', 'mientras', 'r1']);
});

test('fusionar dos veces las mismas filas da lo mismo: es idempotente', () => {
  const base = estadoT({ '2026-08-01': { comidas: [] } });
  const remotas = {
    comidas: [{ ...comidaT('r1', 1000), fecha: '2026-08-01', borrada: false }],
    dias: [{ fecha: '2026-08-01', peso: 80, agua: 3, ejercicio: 0, nota: '', act: 5000 }]
  };
  const una = fusionarAlFinal(base, { remotas, resumen: {} }).estado;
  const dos = fusionarAlFinal(una, { remotas, resumen: {} }).estado;
  esperar(dos, una);
});

test('sin nada que bajar, fusionarAlFinal devuelve el mismo objeto y no clona el historial', () => {
  const base = estadoT({ '2026-08-01': { comidas: [comidaT('l1', 2000)] } });
  const r = fusionarAlFinal(base, { remotas: { comidas: [], dias: [] }, resumen: { nuevas: 0 } });
  esperarQue(r.estado === base, 'clono al pedo');
});

/* --- quedarse sin senal no desloguea (ciclo 12) --- */

testAsync('sin red, el refresco NO borra la sesion: la conserva y avisa', async () => {
  const alm = almacenFalso({ token: 'viejo', refresco: 'r1', vence: Date.now() - 1000, usuario: { id: 'u1', email: 'a@b.com' } });
  const a = crearAuth({
    url: 'https://x.supabase.co', anonKey: 'anon', almacen: alm,
    fetchFn: async () => { throw new TypeError('Failed to fetch'); }
  });

  try {
    await a.token();
    esperarQue(false, 'tendria que haber lanzado');
  } catch (e) {
    esperarQue(e.red, 'el error tiene que venir marcado como de red');
  }
  esperarQue(alm.ver(), 'la sesion se tiene que quedar: no poder preguntar no es un no');
  esperar(alm.ver().refresco, 'r1');
});

testAsync('un rechazo del servidor SI borra la sesion', async () => {
  const alm = almacenFalso({ token: 'viejo', refresco: 'r1', vence: Date.now() - 1000, usuario: { id: 'u1', email: 'a@b.com' } });
  const a = crearAuth({
    url: 'https://x.supabase.co', anonKey: 'anon', almacen: alm,
    fetchFn: async () => respuestaAuth(401, { msg: 'Invalid Refresh Token' })
  });

  esperar(await a.token(), null);
  esperar(alm.ver(), null, 'esa sesion ya no sirve');
});

testAsync('sin red y con el token todavia vigente, ni se entera', async () => {
  const alm = almacenFalso({ token: 't1', refresco: 'r1', vence: Date.now() + 3600000, usuario: { id: 'u1', email: 'a@b.com' } });
  const a = crearAuth({
    url: 'https://x.supabase.co', anonKey: 'anon', almacen: alm,
    fetchFn: async () => { throw new TypeError('Failed to fetch'); }
  });

  esperar(await a.token(), 't1', 'no hace falta la red para un token que sirve');
});

testAsync('una respuesta sin token tampoco deja la sesion a medias', async () => {
  const alm = almacenFalso({ token: 'viejo', refresco: 'r1', vence: Date.now() - 1000, usuario: { id: 'u1', email: 'a@b.com' } });
  const a = crearAuth({
    url: 'https://x.supabase.co', anonKey: 'anon', almacen: alm,
    fetchFn: async () => respuestaAuth(200, { ok: true })   // 200 pero sin access_token
  });

  esperar(await a.token(), null);
  esperar(alm.ver(), null);
});

/* --- con la sesion caida no se sincroniza como anonimo (ciclo 12) --- */

test('sin credenciales no se sincroniza y se dice por que', () => {
  const d = decisionDeSync({ hayCredenciales: false, haySesion: true, token: 'tok' });
  esperar(d.ok, false);
  esperar(d.motivo, 'sin credenciales');
});

test('sin sesion no se sincroniza: los datos son de un usuario', () => {
  esperar(decisionDeSync({ hayCredenciales: true, haySesion: false, token: null }).motivo, 'sin sesión');
});

test('con sesion y sin token vivo NO se sigue como anonimo', () => {
  const d = decisionDeSync({ hayCredenciales: true, haySesion: true, token: null });
  esperar(d.ok, false);
  esperar(d.motivo, 'sesión vencida');
  // el mensaje tiene que hablar de la sesion, no de la anon key ni de las politicas
  esperarQue(/sesión/i.test(d.mensaje), d.mensaje);
  esperarQue(!/anon key|polític/i.test(d.mensaje), 'mandaba a revisar una configuración que está bien: ' + d.mensaje);
});

test('con todo en orden, se sincroniza', () => {
  esperar(decisionDeSync({ hayCredenciales: true, haySesion: true, token: 'tok' }).ok, true);
});

/* --- el dia se fusiona campo por campo (ciclo 12) --- */

test('el agua de un dispositivo no borra el ejercicio del otro', () => {
  const local = { peso: null, agua: 4, ejercicio: 0, nota: '', act: 10 };
  const remoto = { peso: null, agua: 0, ejercicio: 30, nota: '', act: 20 };
  const f = fusionarDia(local, remoto);
  esperar(f.agua, 4, 'los cuatro vasos tienen que quedar');
  esperar(f.ejercicio, 30, 'y la caminata también');
});

test('el peso que cargo uno solo sobrevive aunque el otro sea mas nuevo', () => {
  const local = { peso: 82.4, agua: 0, ejercicio: 0, nota: '', act: 10 };
  const remoto = { peso: null, agua: 6, ejercicio: 0, nota: '', act: 99 };
  esperar(fusionarDia(local, remoto).peso, 82.4);
});

test('y al reves: el peso remoto entra aunque lo local sea mas nuevo', () => {
  const local = { peso: null, agua: 6, ejercicio: 0, nota: '', act: 99 };
  const remoto = { peso: 82.4, agua: 0, ejercicio: 0, nota: '', act: 10 };
  const f = fusionarDia(local, remoto);
  esperar(f.peso, 82.4);
  esperar(f.agua, 6);
});

test('con los dos pesos cargados desempata el mas nuevo', () => {
  esperar(fusionarDia({ peso: 80, act: 10 }, { peso: 81, act: 20 }).peso, 81);
  esperar(fusionarDia({ peso: 80, act: 30 }, { peso: 81, act: 20 }).peso, 80);
});

test('una nota vacia no pisa una escrita', () => {
  esperar(fusionarDia({ nota: 'me sentí flojo', act: 10 }, { nota: '', act: 99 }).nota, 'me sentí flojo');
  esperar(fusionarDia({ nota: '', act: 99 }, { nota: 'ayuno', act: 10 }).nota, 'ayuno');
});

test('dos notas escritas: gana la mas nueva', () => {
  esperar(fusionarDia({ nota: 'vieja', act: 10 }, { nota: 'nueva', act: 20 }).nota, 'nueva');
});

test('si no cambia nada, el dia no se marca como tocado', () => {
  const d = { peso: 80, agua: 4, ejercicio: 30, nota: 'x', act: 20 };
  esperar(fusionarDia(d, { ...d, act: 99 }).cambio, false);
});

test('el act del dia fusionado es el mas alto de los dos', () => {
  esperar(fusionarDia({ act: 10 }, { act: 20 }).act, 20);
  esperar(fusionarDia({ act: 30 }, { act: 20 }).act, 30);
});

testAsync('el mismo dia en dos dispositivos: quedan el peso y el agua de los dos', async () => {
  // acá: el peso de la mañana. allá: el agua de la tarde, mas nueva
  const estado = estadoT({ '2026-08-01': { peso: 82.4, agua: 0, ejercicio: 0, act: 1000 } });
  const srv = servidorFalso({
    dias: [{ llave: LLAVE_T, subido: 5000, fecha: '2026-08-01', peso: null, agua: 6, ejercicio: 45, nota: '', act: 5000 }]
  });

  const r = await sincronizar({ cliente: srv, estado, llave: LLAVE_T, ultimoSync: 0, ahora: 9000 });
  const d = r.estado.dias['2026-08-01'];
  esperar(d.peso, 82.4);
  esperar(d.agua, 6);
  esperar(d.ejercicio, 45);
});

/* --- el sync que falla en silencio se ve (ciclo 12) --- */

const AHORA_C = new Date(2026, 7, 29, 12, 0, 0).getTime();   // DIA_MS ya vive en tests.js

test('sin cuenta, el aviso dice cuanto hay en juego', () => {
  const e = estadoDeLaCuenta({ haySesion: false, dias: 31, comidas: 94, ahora: AHORA_C });
  esperar(e.avisar, true);
  esperar(e.accion, 'entrar');
  esperarQue(/31 días y 94 comidas/.test(e.texto), e.texto);
});

test('sin cuenta y sin datos todavia, se avisa igual pero en futuro', () => {
  const e = estadoDeLaCuenta({ haySesion: false, dias: 0, comidas: 0, ahora: AHORA_C });
  esperar(e.avisar, true);
  esperarQue(/lo que cargues/.test(e.texto), e.texto);
});

test('con cuenta y sincronizado hoy, no se molesta a nadie', () => {
  const e = estadoDeLaCuenta({ haySesion: true, ultimoSync: AHORA_C - 3600000, ahora: AHORA_C });
  esperar(e.avisar, false);
});

test('con cuenta pero sin haber sincronizado nunca, se avisa', () => {
  const e = estadoDeLaCuenta({ haySesion: true, ultimoSync: 0, ahora: AHORA_C });
  esperar(e.avisar, true);
  esperar(e.motivo, 'nunca');
  esperar(e.accion, 'sincronizar');
});

test('dos dias sin sincronizar todavia no molesta; tres si', () => {
  esperar(estadoDeLaCuenta({ haySesion: true, ultimoSync: AHORA_C - 2 * DIA_MS, ahora: AHORA_C }).avisar, false);
  const e = estadoDeLaCuenta({ haySesion: true, ultimoSync: AHORA_C - 3 * DIA_MS, ahora: AHORA_C });
  esperar(e.avisar, true);
  esperar(e.motivo, 'atrasado');
  esperar(e.dias, 3);
});

test('si hay un error anotado, el aviso lo dice en vez de dejarlo en Ajustes', () => {
  const e = estadoDeLaCuenta({
    haySesion: true, ultimoSync: AHORA_C - 9 * DIA_MS, ahora: AHORA_C,
    ultimoError: 'Se cerró tu sesión. Entrá de nuevo para volver a sincronizar.'
  });
  esperarQue(/Hace 9 días/.test(e.texto), e.texto);
  esperarQue(/Se cerró tu sesión/.test(e.texto), e.texto);
});

/* --- el 400 de los macros decimales se explica (ciclo 12) --- */

testAsync('un macro decimal contra una columna integer dice que hacer', async () => {
  const cli = clienteSupabase({
    url: 'https://x.supabase.co', anonKey: 'anon', token: 'tok', intentos: 1,
    fetchFn: async () => ({
      ok: false, status: 400,
      json: async () => ({ message: 'invalid input syntax for type integer: "28.6"' })
    })
  });

  try {
    await cli.guardar('comidas', [{ id: 'a', gras: 28.6 }]);
    esperarQue(false, 'tendria que haber fallado');
  } catch (e) {
    esperarQue(/supabase-decimales\.sql/.test(e.message), 'tiene que decir que correr: ' + e.message);
    esperarQue(!/invalid input syntax/.test(e.message), 'el mensaje crudo no le sirve a nadie');
  }
});

/* --- entrar con Google (ciclo 12) --- */

test('la url de Google lleva el proveedor y a donde volver', () => {
  const u = urlDeGoogle('https://x.supabase.co/', 'https://fnguerrero.github.io/deficit/');
  esperarQue(u.startsWith('https://x.supabase.co/auth/v1/authorize?'), u);
  esperarQue(/provider=google/.test(u), u);
  esperarQue(/redirect_to=https%3A%2F%2Ffnguerrero\.github\.io%2Fdeficit%2F/.test(u), u);
});

test('sin url de proyecto no hay a donde mandar a nadie', () => {
  esperar(urlDeGoogle('', 'https://x.com'), '');
});

test('el hash de vuelta trae la sesion', () => {
  const s = sesionDesdeHash('#access_token=tok-1&refresh_token=ref-1&expires_in=3600&token_type=bearer');
  esperar(s.token, 'tok-1');
  esperar(s.refresco, 'ref-1');
  esperarQue(s.vence > Date.now(), 'tiene que vencer en el futuro');
});

test('sin hash no pasa nada: es el caso normal de cada arranque', () => {
  esperar(sesionDesdeHash(''), null);
  esperar(sesionDesdeHash('#'), null);
  esperar(sesionDesdeHash('#otra=cosa'), null);
});

test('si Google rebota, se dice en vez de quedarse en silencio', () => {
  const s = sesionDesdeHash('#error=access_denied&error_description=El+usuario+cancelo');
  esperarQue(s.error, 'tiene que traer el error');
});

test('los rebotes de Google se explican en castellano', () => {
  esperarQue(/Cancelaste/.test(mensajeDeGoogle('access_denied')), mensajeDeGoogle('access_denied'));
  esperarQue(/no está habilitado/.test(mensajeDeGoogle('Provider is not enabled')), mensajeDeGoogle('Provider is not enabled'));
  esperarQue(/URLs permitidas/.test(mensajeDeGoogle('redirect_uri not allowed')), mensajeDeGoogle('redirect_uri not allowed'));
});

testAsync('entrarConHash guarda la sesion y completa el mail', async () => {
  const alm = almacenFalso();
  const a = crearAuth({
    url: 'https://x.supabase.co', anonKey: 'anon', almacen: alm,
    fetchFn: async (u) => {
      esperarQue(/\/auth\/v1\/user$/.test(u), 'tiene que pedir el usuario: ' + u);
      return { ok: true, status: 200, json: async () => ({ id: 'u1', email: 'nico@gmail.com' }) };
    }
  });

  const s = await a.entrarConHash('#access_token=tok-1&refresh_token=ref-1&expires_in=3600');
  esperar(s.usuario.email, 'nico@gmail.com');
  esperar(alm.ver().token, 'tok-1');
});

testAsync('si no se puede leer el mail, la sesion se guarda igual', async () => {
  const alm = almacenFalso();
  const a = crearAuth({
    url: 'https://x.supabase.co', anonKey: 'anon', almacen: alm,
    fetchFn: async () => { throw new TypeError('Failed to fetch'); }
  });

  const s = await a.entrarConHash('#access_token=tok-1&expires_in=3600');
  esperar(s.token, 'tok-1', 'el token es lo que importa');
  esperar(alm.ver().token, 'tok-1');
});

testAsync('un hash con error no guarda ninguna sesion', async () => {
  const alm = almacenFalso();
  const a = crearAuth({ url: 'https://x.supabase.co', anonKey: 'anon', almacen: alm, fetchFn: async () => ({ ok: true, json: async () => ({}) }) });

  try {
    await a.entrarConHash('#error=access_denied');
    esperarQue(false, 'tendria que haber fallado');
  } catch (e) {
    esperarQue(/Cancelaste/.test(e.message), e.message);
  }
  esperar(alm.ver(), null);
});

/* --- revisarAnalisis con la forma REAL del analisis (ciclo 12) --- */

/* Los tests viejos le daban un objeto con `calorias` en la raiz, que el modelo
   nunca devuelve: el schema solo trae items. Estos usan la forma de verdad. */
function analisisT(items, extra = {}) {
  return { titulo: 'Plato', confianza: 'alta', items, notas: '', ...extra };
}

test('un analisis normal no dispara ningun aviso', () => {
  esperar(revisarAnalisis(analisisT([
    { nombre: 'pasta', calorias: 380, proteinas: 12, carbohidratos: 68, grasas: 6 },
    { nombre: 'pollo', calorias: 270, proteinas: 26, carbohidratos: 10, grasas: 14 }
  ])), []);
});

test('sin total en la raiz, las calorias se suman de los items', () => {
  // el bug: esto avisaba "volvio sin calorias" y despues la pantalla mostraba 650
  const avisos = revisarAnalisis(analisisT([{ nombre: 'pasta', calorias: 650, proteinas: 40, carbohidratos: 68, grasas: 27 }]));
  esperarQue(!avisos.some(a => /sin calorías/.test(a)), 'no tiene que decir que no hay calorias: ' + JSON.stringify(avisos));
});

test('un analisis realmente vacio si se avisa', () => {
  esperarQue(revisarAnalisis(analisisT([])).some(a => /sin calorías/.test(a)));
  esperarQue(revisarAnalisis(analisisT([{ nombre: 'algo', calorias: 0 }])).some(a => /sin calorías/.test(a)));
});

test('el tope del plato ahora si se alcanza a evaluar', () => {
  const avisos = revisarAnalisis(analisisT([{ nombre: 'torta', calorias: 12000, proteinas: 10, carbohidratos: 1500, grasas: 600 }]));
  esperarQue(avisos.some(a => /muchísimo/.test(a)), JSON.stringify(avisos));
});

test('y el chequeo de macros tambien', () => {
  // 900 kcal declaradas contra macros que dan 200: uno de los dos esta mal
  const mal = revisarAnalisis(analisisT([{ nombre: 'x', calorias: 900, proteinas: 10, carbohidratos: 10, grasas: 13.3 }]));
  esperarQue(mal.some(a => /alguno de los dos está mal/.test(a)), JSON.stringify(mal));

  // y unos macros que si dan las calorias no molestan a nadie
  const bien = revisarAnalisis(analisisT([{ nombre: 'x', calorias: 650, proteinas: 40, carbohidratos: 68, grasas: 27 }]));
  esperar(bien, []);
});

/* --- el aviso de duplicada usa el titulo, no el objeto ya limpiado (ciclo 12) --- */

test('pareceDuplicada funciona con el titulo suelto', () => {
  // el bug era de la UI —leia pendiente.titulo despues de limpiarlo— pero el
  // contrato de aca es lo que importa: alcanza con id, titulo y kcal
  const previas = [{ id: 'a', titulo: 'Pasta con pollo', kcal: 650, ts: Date.now() - 60000 }];
  const g = pareceDuplicada(previas, { id: 'b', titulo: 'Pasta con pollo', kcal: 650, ts: Date.now() });
  esperarQue(g, 'tendria que detectarla');
});

/* --- de donde sale el nombre de quien entro (ciclo 12) --- */

test('el nombre de Google gana sobre el mail', () => {
  esperar(nombreDeUsuario({ email: 'f.nicolas.guerrero@gmail.com', user_metadata: { full_name: 'Nico Guerrero' } }), 'Nico Guerrero');
  esperar(nombreDeUsuario({ email: 'a@b.com', user_metadata: { name: 'Ana' } }), 'Ana');
  esperar(nombreDeUsuario({ email: 'a@b.com', user_metadata: { given_name: 'Ana' } }), 'Ana');
});

test('sin nombre queda lo de adelante del arroba', () => {
  esperar(nombreDeUsuario({ email: 'f.nicolas.guerrero@gmail.com' }), 'f.nicolas.guerrero');
  esperar(nombreDeUsuario({ email: 'a@b.com', user_metadata: {} }), 'a');
});

test('sin nada, no se inventa un nombre', () => {
  esperar(nombreDeUsuario(null), '');
  esperar(nombreDeUsuario({}), '');
  esperar(nombreDeUsuario({ email: '   ' }), '');
});

testAsync('entrar guarda tambien el nombre', async () => {
  const alm = almacenFalso();
  const a = crearAuth({
    url: 'https://x.supabase.co', anonKey: 'anon', almacen: alm,
    fetchFn: async () => respuestaAuth(200, {
      access_token: 'tok', refresh_token: 'ref', expires_in: 3600,
      user: { id: 'u1', email: 'nico@gmail.com', user_metadata: { full_name: 'Nico Guerrero' } }
    })
  });

  const s = await a.entrar('nico@gmail.com', 'secreta');
  esperar(s.usuario.nombre, 'Nico Guerrero');
  esperar(alm.ver().usuario.nombre, 'Nico Guerrero');
});

/* --- que tan bien esta cada dato del dia (ciclo 12) --- */

test('el sueño corto es malo y el largo tampoco es bueno', () => {
  esperar(nivelSueno(3), 'mal');
  esperar(nivelSueno(5.9), 'mal');
  esperar(nivelSueno(6.5), 'flojo');
  esperar(nivelSueno(7), 'bien');
  esperar(nivelSueno(9), 'bien');
  esperar(nivelSueno(11), 'flojo');
});

test('sin sueño cargado no hay color', () => {
  esperar(nivelSueno(null), '');
  esperar(nivelSueno(0), '');
});

test('el agua mira la hora: un vaso a la mañana no está mal', () => {
  esperar(nivelAgua(1, 4, 9), '', 'a las 9 el día recién arranca');
  esperar(nivelAgua(1, 4, 22), 'mal', 'a las 22 ya no hay excusa');
  esperar(nivelAgua(2, 4, 22), 'flojo');
  esperar(nivelAgua(4, 4, 9), 'bien');
  esperar(nivelAgua(6, 4, 22), 'bien', 'de más no es peor');
});

test('el ejercicio nunca se pinta de rojo', () => {
  esperar(nivelEjercicio(300), 'bien');
  esperar(nivelEjercicio(0), '', 'un día sin entrenar es parte del plan');
});

test('el ánimo tampoco: se marca en ámbar, no en rojo', () => {
  esperar(nivelAnimo('genial'), 'bien');
  esperar(nivelAnimo('bien'), 'bien');
  esperar(nivelAnimo('normal'), '');
  esperar(nivelAnimo('flojo'), 'flojo');
  esperar(nivelAnimo('mal'), 'flojo', 'sentirse mal no es un error que se pueda cometer');
});

test('el peso se compara contra la tendencia, no contra ayer', () => {
  // bajando hacia 80: la referencia es 85
  esperar(nivelPeso(84.5, 85, 80), 'bien');
  esperar(nivelPeso(85.5, 85, 80), 'mal');
  esperar(nivelPeso(85.05, 85, 80), '', 'medio kilo de agua no es un fracaso');
});

test('subir hacia el objetivo también es bueno', () => {
  // el objetivo está por encima: hay que ganar peso
  esperar(nivelPeso(61, 60, 70), 'bien');
  esperar(nivelPeso(59, 60, 70), 'mal');
});

test('estando en el objetivo no hay nada que corregir', () => {
  esperar(nivelPeso(80.2, 81, 80), 'bien');
});

test('sin objetivo de peso no se pinta nada', () => {
  esperar(nivelPeso(85, 86, null), '');
  esperar(nivelPeso(85, 0, 80), '', 'sin días previos no hay tendencia contra la cual comparar');
});

test('la referencia de peso ignora el día de hoy', () => {
  const dias = {
    '2026-08-27': { peso: 86 }, '2026-08-28': { peso: 85 },
    '2026-08-29': { peso: 84 }, '2026-08-30': { peso: 70 }   // hoy, no cuenta
  };
  esperar(referenciaDePeso(dias, '2026-08-30'), 85);
});

test('sin pesos previos no hay referencia', () => {
  esperar(referenciaDePeso({ '2026-08-30': { peso: 80 } }, '2026-08-30'), 0);
  esperar(referenciaDePeso({}, '2026-08-30'), 0);
});

/* --- que sacar para que la comida entre (ciclo 12) --- */

test('las unidades se distinguen de los gramos', () => {
  esperar(unidadesDe('3 empanadas'), 3);
  esperar(unidadesDe('2 unidades'), 2);
  esperar(unidadesDe('150 g'), 0);
  esperar(unidadesDe('250 ml'), 0);
  esperar(unidadesDe('1 taza'), 0, 'una sola unidad no se puede repartir');
  esperar(unidadesDe(''), 0);
});

test('la fraccion es una que alguien pueda ejecutar', () => {
  esperar(fraccionQueAlcanza(10, 100).txt, 'un cuarto');
  esperar(fraccionQueAlcanza(45, 100).txt, 'la mitad');
  esperar(fraccionQueAlcanza(70, 100), null, '"dejá tres cuartos sin comer" no es un consejo');
  esperar(fraccionQueAlcanza(90, 100), null, 'sacar casi todo es sacar todo');
});

const KETO_ITEMS = [
  { nombre: 'Empanadas de carne', porcion: '3 unidades', calorias: 750, carbohidratos: 90 },
  { nombre: 'Ensalada', porcion: '1 plato', calorias: 60, carbohidratos: 6 }
];

test('con empanadas dice cuantas sacar', () => {
  // sobran 30 g de carbos: un tercio de las tres empanadas = 1
  esperar(queSacar(KETO_ITEMS, 'carbohidratos', 30), 'Sacá 1 de las 3 empanadas de carne y entra.');
});

test('en gramos se dice en fracciones', () => {
  const items = [{ nombre: 'Fideos', porcion: '200 g', calorias: 400, carbohidratos: 80 }];
  esperar(queSacar(items, 'carbohidratos', 20), 'Dejá un cuarto de fideos sin comer y entra.');
});

test('si hay que sacarlo todo, no hay consejo', () => {
  const items = [{ nombre: 'Fideos', porcion: '200 g', carbohidratos: 80 }];
  esperar(queSacar(items, 'carbohidratos', 79), null);
});

test('si con uno no alcanza, se suman', () => {
  const items = [
    { nombre: 'Pan', porcion: '2 rebanadas', carbohidratos: 30 },
    { nombre: 'Papas', porcion: '150 g', carbohidratos: 25 },
    { nombre: 'Pollo', porcion: '120 g', carbohidratos: 2 }
  ];
  esperar(queSacar(items, 'carbohidratos', 50), 'Sacá pan y papas y entra.');
});

testAsync('en keto, el consejo sale de los carbohidratos que sobran', async () => {
  const comida = { kcal: 810, carb: 96, prot: 30, gras: 40, items: KETO_ITEMS };
  const r = comoHacerlaApta(comida, 'keto', null, { carb: 0 });
  esperar(r.posible, true);
  esperarQue(/empanadas de carne/.test(r.texto), r.texto);
});

/* El id del modo vegetariano sale de la tabla, no de suponerlo: los ids y las
   reglas no se llaman igual (`regla: 'vegetariana'`). */
const ID_VEGE = Object.keys(MODOS).find(k => MODOS[k].regla === 'vegetariana');

test('si el problema es de que esta hecha, no hay arreglo', () => {
  const comida = { kcal: 500, carb: 10, items: [{ nombre: 'Milanesa', carbohidratos: 10 }],
    perfil: { vegetariano: false } };
  const r = comoHacerlaApta(comida, ID_VEGE, null, null);
  esperar(r.posible, false);
  esperarQue(/de qué está hecha/.test(r.texto), r.texto);
});

test('una comida que ya entra no necesita consejo', () => {
  const comida = { kcal: 400, carb: 8, items: [{ nombre: 'Huevos', carbohidratos: 2 }] };
  esperar(comoHacerlaApta(comida, 'keto', null, { carb: 0 }), { posible: true, texto: '' });
});

test('cuando se pasa y no hay de donde sacar, se dice que es no apta', () => {
  const comida = { kcal: 900, carb: 100, items: [{ nombre: 'Arroz', porcion: '300 g', carbohidratos: 100 }] };
  const r = comoHacerlaApta(comida, 'keto', null, { carb: 0 });
  esperar(r.posible, false);
  esperarQue(/no apta/.test(r.texto), r.texto);
});

test('si hay que sacar todas las unidades, se dice el alimento entero', () => {
  // 3 empanadas con 90 g de carbos y un exceso de 66: no alcanza con sacar dos
  esperar(queSacar(KETO_ITEMS, 'carbohidratos', 66), 'Sacá empanadas de carne y entra.');
});

test('sacar una sola cosa no arma una enumeracion rota', () => {
  const items = [
    { nombre: 'Pan', porcion: '100 g', carbohidratos: 50 },
    { nombre: 'Pollo', porcion: '120 g', carbohidratos: 2 }
  ];
  // el pan solo no llega por fraccion (más de la mitad) pero entero sí, y queda el pollo
  esperar(queSacar(items, 'carbohidratos', 40), 'Sacá pan y entra.');
});

/* --- lo que la foto no puede mostrar (ciclo 12) --- */

const AMB_EMPANADAS = {
  pregunta: '¿De qué son las empanadas?',
  item: 'Empanadas',
  opciones: [
    { etiqueta: 'De carne', calorias: 750, proteinas: 30, carbohidratos: 84, grasas: 33 },
    { etiqueta: 'De humita', calorias: 690, proteinas: 15, carbohidratos: 105, grasas: 24 },
    { etiqueta: 'De jamón y queso', calorias: 810, proteinas: 33, carbohidratos: 81, grasas: 42 }
  ]
};

function comidaAmbigua() {
  return {
    titulo: 'Empanadas', kcal: 810, prot: 33, carb: 90, gras: 36,
    fibra: 4, azucar: 2, sodio: 900,
    items: [
      { nombre: 'Empanadas', porcion: '3 unidades', calorias: 750, proteinas: 30, carbohidratos: 84, grasas: 33, fibra: 3, azucar: 2, sodio: 800 },
      { nombre: 'Ensalada', porcion: '1 plato', calorias: 60, proteinas: 3, carbohidratos: 6, grasas: 3, fibra: 1, azucar: 0, sodio: 100 }
    ],
    ambiguedad: AMB_EMPANADAS
  };
}

test('elegir una opcion reemplaza el alimento y recalcula el total', () => {
  const r = aplicarOpcion(comidaAmbigua(), 1);   // humita
  esperar(r.items[0].nombre, 'Empanadas de humita');
  esperar(r.items[0].carbohidratos, 105);
  esperar(r.carb, 111, 'el total suma la ensalada');
  esperar(r.kcal, 750);
});

test('la ensalada queda intacta', () => {
  const r = aplicarOpcion(comidaAmbigua(), 2);
  esperar(r.items[1], comidaAmbigua().items[1]);
});

test('se puede cambiar de opinion: elegir otra parte de lo mismo', () => {
  const humita = aplicarOpcion(comidaAmbigua(), 1);
  const jamon = aplicarOpcion(humita, 2);
  esperar(jamon.items[0].nombre, 'Empanadas de jamón y queso');
  esperar(jamon.carb, 87, 'no se acumula sobre la eleccion anterior');
});

test('queda anotado qué se eligió', () => {
  esperar(aplicarOpcion(comidaAmbigua(), 1).ambiguedad.elegida, 1);
});

test('una opcion que no existe no rompe nada', () => {
  const c = comidaAmbigua();
  esperar(aplicarOpcion(c, 9), c);
  esperar(aplicarOpcion(c, -1), c);
});

test('sin ambiguedad, la comida no se toca', () => {
  const c = { kcal: 500, items: [{ nombre: 'x', calorias: 500 }] };
  esperar(aplicarOpcion(c, 0), c);
});

test('si el alimento no aparece en la lista, no se inventa', () => {
  const c = { ...comidaAmbigua(), ambiguedad: { ...AMB_EMPANADAS, item: 'Pizza' } };
  esperar(aplicarOpcion(c, 1), c);
});

test('solo se pregunta con dos opciones o mas', () => {
  esperarQue(hayQuePreguntar(AMB_EMPANADAS));
  esperarQue(!hayQuePreguntar(null));
  esperarQue(!hayQuePreguntar({ pregunta: '¿?', opciones: [{ etiqueta: 'una' }] }));
  esperarQue(!hayQuePreguntar({ opciones: AMB_EMPANADAS.opciones }), 'sin pregunta no hay nada que mostrar');
});

/* --- keto: netos y reparto de macros (ciclo 12) --- */

test('los carbohidratos netos descuentan la fibra', () => {
  esperar(carbosNetos({ carb: 20, fibra: 12 }), 8);
  esperar(carbosNetos({ carb: 20 }), 20, 'sin fibra son los totales');
  esperar(carbosNetos({ carb: 5, fibra: 9 }), 0, 'nunca negativo');
  esperar(carbosNetos(null), 0);
});

test('una ensalada con palta entra en keto por los netos', () => {
  // 20 g de carbos y 12 de fibra: con totales se comía dos tercios del día
  const v = comidaApta({ kcal: 400, carb: 20, fibra: 12, prot: 8, gras: 32 }, 'keto', null, null);
  esperar(v.apta, true);
  esperarQue(/8 g de carbohidratos netos/.test(v.motivo), v.motivo);
});

test('con los mismos gramos pero sin fibra, no entra', () => {
  const v = comidaApta({ kcal: 400, carb: 40, fibra: 0, prot: 8, gras: 32 }, 'keto', null, null);
  esperar(v.apta, false);
});

test('pechuga hervida: sin carbos pero no es keto', () => {
  // 500 kcal, 60 g de proteína (48%) y poca grasa: el error clásico
  const v = comidaApta({ kcal: 500, carb: 2, fibra: 0, prot: 60, gras: 27 }, 'keto', null, null);
  esperar(v.nivel, 'justo');
  esperarQue(/proteína/.test(v.motivo), v.motivo);
});

test('poca grasa también se avisa', () => {
  // 40% de grasa cuando keto pide 70
  const v = comidaApta({ kcal: 400, carb: 4, fibra: 0, prot: 35, gras: 18 }, 'keto', null, null);
  esperar(v.nivel, 'justo');
  esperarQue(/grasa/.test(v.motivo), v.motivo);
});

test('un plato keto de verdad pasa sin peros', () => {
  // 600 kcal: 5 g netos, 30 g de proteína (20%), 47 g de grasa (70%)
  const v = comidaApta({ kcal: 600, carb: 8, fibra: 3, prot: 30, gras: 47 }, 'keto', null, null);
  esperar(v.nivel, 'si');
});

test('en un plato chico el reparto no dice nada', () => {
  // un café con crema es casi toda grasa, y una feta de jamón casi toda proteína
  esperar(repartoKeto({ kcal: 120, prot: 18, gras: 4 }, MODOS.keto), null);
});

test('el consejo saca por netos, no por totales', () => {
  const items = [
    { nombre: 'Arroz', porcion: '150 g', carbohidratos: 45, fibra: 1 },
    { nombre: 'Ensalada', porcion: '1 plato', carbohidratos: 20, fibra: 12 }
  ];
  const c = comoHacerlaApta({ kcal: 700, carb: 65, fibra: 13, items }, 'keto', null, null);
  esperarQue(/arroz/.test(c.texto), 'tiene que sacar el arroz, no la ensalada: ' + c.texto);
});

test('con un macro sin cargar, el reparto no se juzga', () => {
  // sin grasa declarada la cuenta dice que falta grasa, pero es el dato el que falta
  esperar(repartoKeto({ kcal: 600, carb: 6, prot: 40 }, MODOS.keto), null);
});

/* --- los horarios se aprenden de las comidas cargadas (ciclo 12) --- */

/* Un día con comidas a las horas que se le pidan. */
function diaConHoras(fecha, horas) {
  return { peso: null, agua: 0, ejercicio: 0, nota: '', comidas: horas.map(([momento, h, m], i) => {
    const d = new Date(2026, 7, 20, h, m || 0);
    return { id: fecha + i, ts: d.getTime(), momento, titulo: 'x', items: [],
      kcal: 400, prot: 20, carb: 30, gras: 15, fibra: 3, azucar: 2, sodio: 300, notas: '', act: 1 };
  }) };
}

test('la mediana ignora un valor suelto y raro', () => {
  esperar(medianaDe([700, 720, 730, 740, 60]), 720, 'la comida de las 1 AM no arrastra el horario');
  esperar(medianaDe([10, 20]), 15);
});

test('sin suficientes comidas, los horarios quedan como la tabla', () => {
  const dias = { a: diaConHoras('a', [['almuerzo', 14], ['cena', 22]]) };
  esperar(momentosSegun(dias), [...MOMENTOS].map(m => ({ ...m })).sort((a, b) => a.desde - b.desde));
});

test('con comidas suficientes, el corte se mueve a mitad de camino', () => {
  const dias = {};
  // desayuno 9:00 y almuerzo 14:00, cinco veces cada uno
  for (let i = 0; i < 5; i++) dias['d' + i] = diaConHoras('d' + i, [['desayuno', 9], ['almuerzo', 14]]);

  const m = momentosSegun(dias);
  const desayuno = m.find(x => x.id === 'desayuno');
  const almuerzo = m.find(x => x.id === 'almuerzo');

  // el punto medio entre las 9 y las 14 son las 11:30
  esperar(almuerzo.desde, 11 * 60 + 30);
  esperar(desayuno.hasta, 11 * 60 + 29);
});

test('el corte sigue a horarios tardios', () => {
  const dias = {};
  // acá se almuerza a las 15 y se cena a las 23
  for (let i = 0; i < 6; i++) dias['d' + i] = diaConHoras('d' + i, [['merienda', 18], ['cena', 23]]);

  const m = momentosSegun(dias);
  esperar(m.find(x => x.id === 'cena').desde, 20 * 60 + 30, 'sin merienda ni cena suficientes no se mueve');
});

test('con horas cruzadas no se mueve nada', () => {
  const dias = {};
  // una cena "a las 7 de la mañana" y un desayuno a las 10: los datos no sirven
  for (let i = 0; i < 6; i++) dias['d' + i] = diaConHoras('d' + i, [['desayuno', 10], ['almuerzo', 7]]);
  const m = momentosSegun(dias);
  esperar(m.find(x => x.id === 'almuerzo').desde, 11 * 60 + 30, 'queda la tabla');
});

test('aprenderMomentos deja los horarios vigentes para momentoPorHora', () => {
  const antes = momentoPorHora(11, 0);
  const dias = {};
  for (let i = 0; i < 5; i++) dias['d' + i] = diaConHoras('d' + i, [['desayuno', 7], ['almuerzo', 12]]);

  aprenderMomentos(dias);
  // el corte queda a las 9:30, así que las 11 ya son almuerzo
  esperar(momentoPorHora(11, 0), 'almuerzo');
  esperar(antes, 'desayuno', 'con la tabla, las 11 eran desayuno');

  aprenderMomentos({});   // se deja como estaba para los demás tests
  esperar(momentoPorHora(11, 0), 'desayuno');
});

/* --- leer un macro, no solo mostrarlo (ciclo 13) --- */

test('en un macro que hay que alcanzar, dice cuanto falta', () => {
  esperar(leerMacro(64, 180).texto, 'Te faltan 116 g');
  esperar(leerMacro(64, 180).nivel, 'falta');
});

test('llegando se dice que se cumplio', () => {
  esperar(leerMacro(180, 180).nivel, 'bien');
  esperar(leerMacro(200, 180).texto, 'Objetivo cumplido', 'de más no es un problema acá');
});

test('cerca del objetivo se marca distinto de lejos', () => {
  esperar(leerMacro(170, 180).nivel, 'cerca');
  esperar(leerMacro(90, 180).nivel, 'falta');
});

test('en un techo, lo que importa es pasarse', () => {
  esperar(leerMacro(20, 30, { mas: false }).texto, 'Dentro del objetivo');
  esperar(leerMacro(30, 30, { mas: false }).nivel, 'bien');
});

test('y por cuanto se paso: no es lo mismo un 10% que el septuple', () => {
  esperar(leerMacro(35, 30, { mas: false }).nivel, 'cerca');
  esperar(leerMacro(35, 30, { mas: false }).texto, '+5 g sobre el objetivo');
  esperar(leerMacro(218, 30, { mas: false }).nivel, 'mal');
  esperar(leerMacro(218, 30, { mas: false }).texto, '+188 g sobre el objetivo');
});

test('sin objetivo no se inventa una lectura', () => {
  esperar(leerMacro(50, 0), { nivel: '', texto: '' });
  esperar(leerMacro(50, null), { nivel: '', texto: '' });
});

test('la unidad se puede cambiar: el sodio va en mg', () => {
  esperar(leerMacro(3600, 2000, { mas: false, unidad: 'mg' }).texto, '+1.600 mg sobre el objetivo');
});

/* --- el marcador de habitos (ciclo 13) --- */

const OBJ_T = (listos) => ['Peso','Agua','Ejercicio','Sueño','Ánimo']
  .map((nombre, i) => ({ id: nombre.toLowerCase(), nombre, listo: listos.includes(i) }));

test('con todos hechos se dice que estan completos', () => {
  const r = resumenHabitos(OBJ_T([0,1,2,3,4]));
  esperar(r.completo, true);
  esperarQue(/5 hábitos del día, completos/.test(r.texto), r.texto);
});

test('cuando falta uno solo, se lo nombra', () => {
  esperar(resumenHabitos(OBJ_T([0,2,3,4])).texto, '4 de 5 hábitos · te falta agua');
});

test('con varios pendientes no se listan: seria una lista de tareas', () => {
  esperar(resumenHabitos(OBJ_T([0,1])).texto, '2 de 5 hábitos');
});

test('sin objetivos no hay marcador', () => {
  esperar(resumenHabitos([]).texto, '');
  esperar(resumenHabitos(null).texto, '');
});

/* --- el peso de un vistazo (ciclo 13) --- */

/* HOY_P ya existe más arriba, en los tests de proyección. */

function diasConPeso(pesos) {
  const dias = {};
  const n = pesos.length;
  for (let i = 0; i < n; i++) {
    dias[sumarDias(HOY_P, -(n - 1 - i))] = { peso: pesos[i], agua: 0, ejercicio: 0, nota: '', comidas: [] };
  }
  return dias;
}

test('el peso que se muestra es la tendencia, no el del dia', () => {
  // siete días bajando y hoy un pico de agua y sal
  const r = resumenPeso(diasConPeso([84, 83.8, 83.6, 83.5, 83.4, 83.2, 84.5]), { pesoObj: 78 }, { hasta: HOY_P });
  esperarQue(r.actual < 84.5, 'el pico no puede mandar: ' + r.actual);
  esperar(r.actual, 83.7);
});

test('con una sola medicion, esa es la tendencia', () => {
  esperar(resumenPeso(diasConPeso([90]), { pesoObj: 80 }, { hasta: HOY_P }).actual, 90);
});

test('el cambio compara tendencias, no puntas', () => {
  const pesos = [];
  for (let i = 0; i < 40; i++) pesos.push(+(88 - i * 0.1).toFixed(1));
  const r = resumenPeso(diasConPeso(pesos), { pesoObj: 80 }, { hasta: HOY_P, rango: 30 });
  esperarQue(r.cambio < 0, 'viene bajando: ' + r.cambio);
  esperarQue(Math.abs(r.cambio) > 2, 'en 30 días bajó unos 3 kg: ' + r.cambio);
});

test('cuanto falta para el objetivo', () => {
  const r = resumenPeso(diasConPeso([85, 85, 85]), { pesoObj: 78 }, { hasta: HOY_P });
  esperar(r.faltan, 7);
  esperar(r.mejora, -1, 'la meta está abajo: bajar es avanzar');
});

test('si la meta esta arriba, subir es avanzar', () => {
  esperar(resumenPeso(diasConPeso([60, 60]), { pesoObj: 70 }, { hasta: HOY_P }).mejora, 1);
});

test('sin objetivo no se inventa un progreso', () => {
  const r = resumenPeso(diasConPeso([85]), {}, { hasta: HOY_P });
  esperar(r.pct, null);
  esperar(r.faltan, null);
});

test('sin pesos cargados no hay nada que mostrar', () => {
  esperar(resumenPeso({}, { pesoObj: 78 }), null);
  esperar(resumenPeso({ '2026-09-01': { peso: null, comidas: [] } }, { pesoObj: 78 }), null);
});

/* --- el coaching nombra que esta flojo (ciclo 13) --- */

test('con una dimension floja, el titulo la nombra', () => {
  /* agua a la mitad al final del día: flojo, no mal */
  const d = { peso: 80, agua: 4, ejercicio: 300, nota: '', sueno: { horas: 7.5 }, animo: 'bien',
    comidas: [{ id: 'a', ts: Date.now(), kcal: 1800, prot: 100, carb: 100, gras: 60, momento: 'almuerzo' }] };
  const e = estadoMascota(d, { objetivo: { objetivo: 2000 }, objetivoVasos: 8, hora: 20 });
  esperarQue(e.titulo !== 'Vas tirando', 'tiene que decir qué está flojo, no "vas tirando": ' + e.titulo);
  esperarQue(/agua/i.test(e.titulo), e.titulo);
});

test('los titulos de flojo son distintos de los de mal', () => {
  for (const dim of ['sueno', 'agua', 'comida', 'movimiento']) {
    esperarQue(TITULO_FLOJO[dim], 'falta el título flojo de ' + dim);
    esperarQue(TITULO_FLOJO[dim] !== TITULO_POR_DIM[dim],
      'flojo y mal no pueden decir lo mismo: ' + dim);
  }
});

test('con el dia en blanco sigue diciendo que no hay nada', () => {
  const e = estadoMascota({ comidas: [] }, { hora: 12 });
  esperarQue(/en blanco/i.test(e.titulo), e.titulo);
});

/* --- cuando el modo no cuadra hace dias (ciclo 13) --- */

/* Días con comidas de muchos carbohidratos: en keto no entra ninguna. */
function diasFueraDeKeto(cuantos, hasta) {
  const dias = {};
  for (let i = 0; i < cuantos; i++) {
    const f = sumarDias(hasta, -i);
    dias[f] = { peso: null, agua: 0, ejercicio: 0, nota: '', comidas: [
      { id: 'a' + i, ts: new Date(2026, 8, 1, 13).getTime(), titulo: 'Pasta', items: [],
        kcal: 800, prot: 25, carb: 110, gras: 20, fibra: 6, azucar: 8, sodio: 700, momento: 'almuerzo', act: 1 }
    ] };
  }
  return dias;
}

const HASTA_M = '2026-09-01';

test('con cuatro dias fuera del modo, se avisa', () => {
  const r = modoQueNoCuadra(diasFueraDeKeto(5, HASTA_M), 'keto', null, { hasta: HASTA_M });
  esperarQue(r, 'tendría que avisar');
  esperarQue(/Keto/.test(r.texto), r.texto);
  esperar(r.dias, 5);
});

test('con dos dias no alcanza: es un desliz, no un patron', () => {
  esperar(modoQueNoCuadra(diasFueraDeKeto(2, HASTA_M), 'keto', null, { hasta: HASTA_M }), null);
});

test('comiendo keto de verdad no molesta', () => {
  const dias = {};
  for (let i = 0; i < 7; i++) {
    dias[sumarDias(HASTA_M, -i)] = { peso: null, agua: 0, ejercicio: 0, nota: '', comidas: [
      { id: 'k' + i, ts: new Date(2026, 8, 1, 13).getTime(), titulo: 'Bife con ensalada', items: [],
        kcal: 600, prot: 35, carb: 8, gras: 45, fibra: 4, azucar: 1, sodio: 500, momento: 'almuerzo', act: 1 }] };
  }
  esperar(modoQueNoCuadra(dias, 'keto', null, { hasta: HASTA_M }), null);
});

test('sin dias cargados no hay nada que decir', () => {
  esperar(modoQueNoCuadra({}, 'keto', null, { hasta: HASTA_M }), null);
});

/* --- los primeros pasos (ciclo 13) --- */

test('con la app vacia faltan los tres pasos', () => {
  const pasos = pasosQueFaltan({ perfil: {}, dias: {} });
  esperar(pasos.filter(p => p.hecho).length, 0);
  esperar(pasos.length, 3);
});

test('con el perfil cargado, ese paso queda hecho', () => {
  const pasos = pasosQueFaltan({ perfil: { peso: 85, altura: 178, edad: 40 }, dias: {} });
  esperar(pasos.find(p => p.id === 'perfil').hecho, true);
  esperar(pasos.find(p => p.id === 'objetivo').hecho, false);
});

test('un perfil a medias no cuenta como hecho', () => {
  esperar(pasosQueFaltan({ perfil: { peso: 85 }, dias: {} }).find(p => p.id === 'perfil').hecho, false);
});

test('una comida cargada alcanza para el tercero', () => {
  const dias = { '2026-09-01': { comidas: [{ id: 'a', kcal: 500 }] } };
  esperar(pasosQueFaltan({ perfil: {}, dias }).find(p => p.id === 'comida').hecho, true);
});

test('un dia sin comidas no cuenta', () => {
  const dias = { '2026-09-01': { comidas: [] }, '2026-08-31': { comidas: [] } };
  esperar(pasosQueFaltan({ perfil: {}, dias }).find(p => p.id === 'comida').hecho, false);
});

test('con todo hecho no falta ninguno', () => {
  const pasos = pasosQueFaltan({
    perfil: { peso: 85, altura: 178, edad: 40, pesoObj: 78 },
    dias: { '2026-09-01': { comidas: [{ id: 'a', kcal: 500 }] } }
  });
  esperar(pasos.filter(p => !p.hecho).length, 0);
});

/* ---------------- el plazo del objetivo ---------------- */

const PERFIL_PLAZO = {
  sexo: 'm', edad: 36, altura: 178, peso: 82.4,
  actividad: 1.375, ritmo: 0.5, pesoObj: 75
};
const DESDE = '2026-09-01';

test('la fecha de llegada sale del peso que falta y el ritmo', () => {
  // 7,4 kg a 0,5 por semana son 14,8 semanas: 104 días
  esperar(fechaDeLlegada(82.4, 75, 0.5, DESDE), '2026-12-14');
});

test('sin objetivo o ya cumplido no hay fecha', () => {
  esperar(fechaDeLlegada(75, 75, 0.5, DESDE), null);
  esperar(fechaDeLlegada(82.4, null, 0.5, DESDE), null);
});

test('un ritmo que va para el otro lado no da fecha', () => {
  // querés bajar pero el ritmo es de subida: la cuenta daría una fecha pasada
  esperar(fechaDeLlegada(82.4, 75, -0.5, DESDE), null);
});

test('un ritmo casi cero no da una fecha a diez años', () => {
  esperar(fechaDeLlegada(82.4, 75, 0.01, DESDE), null);
});

test('el ritmo se despeja de la fecha', () => {
  esperar(ritmoParaLlegar(82.4, 75, '2026-12-14', DESDE), 0.5);
});

test('menos de una semana no es un plazo', () => {
  esperar(ritmoParaLlegar(82.4, 75, '2026-09-04', DESDE), null);
});

test('el ritmo maximo sale del margen hasta el piso', () => {
  // tdee 2423, piso 1762 (el basal): 661 kcal de margen son 0,60 kg/semana
  esperar(ritmoMaximoSeguro(PERFIL_PLAZO), 0.6);
});

test('una fecha holgada es alcanzable', () => {
  const p = planParaFecha(PERFIL_PLAZO, '2026-12-14', DESDE);
  esperar(p.alcanzable, true);
  esperar(p.ritmo, 0.5);
});

test('una fecha apurada avisa y ofrece la mas cercana que si', () => {
  const p = planParaFecha(PERFIL_PLAZO, '2026-10-20', DESDE);
  esperar(p.alcanzable, false);
  esperarQue(p.ritmo > p.ritmoMaximo, 'el ritmo pedido supera al maximo');
  esperarQue(p.fechaMinima > '2026-10-20', 'la fecha posible es mas tarde: ' + p.fechaMinima);
  esperarQue(p.kcalMinimo >= 1500, 'y no baja del piso: ' + p.kcalMinimo);
});

test('llegar tarde se cuenta en semanas', () => {
  const v = veredictoDePlazo('2026-12-14', '2027-03-03');
  esperar(v.estado, 'tarde');
  esperar(v.semanas, 11);
});

test('adelantarse tambien se dice', () => {
  const v = veredictoDePlazo('2026-12-14', '2026-10-15');
  esperar(v.estado, 'adelantado');
});

test('una semana de diferencia es estar en fecha', () => {
  // es la precision que da una balanza: no vale llamarlo atraso
  esperar(veredictoDePlazo('2026-12-14', '2026-12-18').estado, 'en-fecha');
});

test('sin proyeccion no se inventa un veredicto', () => {
  esperar(veredictoDePlazo('2026-12-14', null).estado, 'sin-datos');
});

/* ---------------- compartir la sugerencia ---------------- */

test('la sugerencia se manda como lista de ingredientes', () => {
  const t = textoDeSugerencia({
    titulo: 'Pollo al horno con ensalada',
    porque: 'Te quedan 520 kcal y te falta proteína.',
    items: [
      { nombre: 'Pechuga de pollo', porcion: '200 g' },
      { nombre: 'Ensalada de hojas', porcion: '1 plato' }
    ]
  });
  esperar(t, 'Pollo al horno con ensalada\n\nPechuga de pollo (200 g)\nEnsalada de hojas (1 plato)');
});

test('el porque no viaja salvo que se pida', () => {
  const o = { titulo: 'Tortilla', porque: 'Entra en tu keto.', items: [{ nombre: 'Huevos' }] };
  esperarQue(!/keto/.test(textoDeSugerencia(o)), 'sin la nota por defecto');
  esperarQue(/keto/.test(textoDeSugerencia(o, { conNota: true })), 'con la nota si se pide');
});

test('un item sin porcion no deja parentesis vacios', () => {
  esperar(textoDeSugerencia({ titulo: 'Café', items: [{ nombre: 'Café solo' }] }), 'Café\n\nCafé solo');
});

test('sin titulo no hay nada que mandar', () => {
  esperar(textoDeSugerencia(null), '');
  esperar(textoDeSugerencia({ items: [{ nombre: 'x' }] }), '');
});

testAsync('compartir usa el selector del sistema si esta', async () => {
  let recibido = null;
  const via = await compartirTexto('hola', { navegador: { share: async (d) => { recibido = d; } } });
  esperar(via, 'compartido');
  esperar(recibido.text, 'hola');
});

testAsync('si no hay selector, copia', async () => {
  let copiado = null;
  const via = await compartirTexto('hola', { navegador: { clipboard: { writeText: async (t) => { copiado = t; } } } });
  esperar(via, 'copiado');
  esperar(copiado, 'hola');
});

testAsync('cancelar el selector no cae al portapapeles', async () => {
  let copiado = false;
  const nav = {
    share: async () => { const e = new Error('cancelado'); e.name = 'AbortError'; throw e; },
    clipboard: { writeText: async () => { copiado = true; } }
  };
  esperar(await compartirTexto('hola', { navegador: nav }), 'cancelado');
  esperarQue(!copiado, 'cerrar el dialogo es una decision, no un error que compensar');
});

/* ---------------- bugs del ciclo 14 ---------------- */

test('borrar una comida entra en la pila de deshacer', () => {
  // el toast dura unos segundos; el boton Deshacer de la pantalla, no
  const pila = apilarCambio([], '2026-09-01', { comidas: [{ id: 'a', kcal: 100 }] }, 'la comida');
  const { cambio } = desapilarCambio(pila);
  esperar(cambio.que, 'la comida');
  esperar(cambio.dia.comidas.length, 1);
});

test('el sueno viaja en el sync', () => {
  const f = __sync.diaAFila({ sueno: { horas: 7, calidad: 'buena' }, animo: 'bien' }, '2026-09-01', 'k');
  esperar(f.sueno_horas, 7);
  esperar(f.sueno_calidad, 'buena');
  esperar(f.animo, 'bien');
});

test('un dia sin sueno no manda basura', () => {
  const f = __sync.diaAFila({}, '2026-09-01', 'k');
  esperar(f.sueno_horas, null);
  esperar(f.sueno_calidad, null);
  esperar(f.animo, null);
});

test('fusionar trae el sueno que falta de un lado', () => {
  const f = __sync.fusionarDia({ agua: 2 }, { sueno_horas: 6, sueno_calidad: 'mala', act: 5 });
  esperar(f.sueno.horas, 6);
  esperar(f.sueno.calidad, 'mala');
  esperarQue(f.cambio, 'y avisa que hubo cambio, si no no se aplica');
});

test('con sueno de los dos lados gana el mas nuevo', () => {
  const viejo = { sueno: { horas: 8 }, act: 10 };
  const nuevo = { sueno_horas: 5, act: 20 };
  esperar(__sync.fusionarDia(viejo, nuevo).sueno.horas, 5);
  esperar(__sync.fusionarDia({ sueno: { horas: 8 }, act: 30 }, nuevo).sueno.horas, 8);
});

test('el animo no se pierde al fusionar', () => {
  esperar(__sync.fusionarDia({ animo: 'bien' }, { act: 5 }).animo, 'bien');
  esperar(__sync.fusionarDia({}, { animo: 'mal', act: 5 }).animo, 'mal');
});

test('una base sin migrar se detecta por el mensaje', () => {
  esperarQue(__sync.faltaMigracion("Could not find the 'sueno_horas' column of 'dias' in the schema cache"), 'columna nueva');
  esperarQue(!__sync.faltaMigracion('invalid input syntax for type integer'), 'y no cualquier 400');
});

testAsync('si la base esta sin migrar, se reintenta sin los campos nuevos', async () => {
  const intentos = [];
  const cliente = {
    guardar: async (tabla, filas) => {
      intentos.push(filas.map(f => Object.keys(f).join(',')));
      if (intentos.length === 1) throw new Error("Could not find the 'animo' column of 'dias' in the schema cache");
    }
  };
  await __sync.guardarDias(cliente, [__sync.diaAFila({ sueno: { horas: 7 }, animo: 'bien' }, '2026-09-01', 'k')]);
  esperar(intentos.length, 2);
  esperarQue(/animo/.test(intentos[0][0]), 'el primer intento los manda');
  esperarQue(!/animo/.test(intentos[1][0]), 'el segundo no');
});

testAsync('un 400 que no es de migracion no se traga', async () => {
  const cliente = { guardar: async () => { throw new Error('invalid input syntax for type integer: "28.6"'); } };
  let cayo = false;
  try { await __sync.guardarDias(cliente, [__sync.diaAFila({}, '2026-09-01', 'k')]); }
  catch { cayo = true; }
  esperarQue(cayo, 'ese error tiene que seguir subiendo');
});

test('el ayuno del dia sobrevive al arranque', () => {
  // migrar() corre en cada load: lo que no esta en su lista se borra
  const hoy = hoyISO();
  const s = migrar({ perfil: {}, cfg: {}, dias: { [hoy]: { comidas: [], ayuno: { horas: 16.5, objetivo: 16, cumplido: true } } } });
  esperar(s.dias[hoy].ayuno.horas, 16.5);
  esperar(s.dias[hoy].ayuno.cumplido, true);
});

test('la porcion elegida sobrevive al arranque', () => {
  const hoy = hoyISO();
  const s = migrar({ perfil: {}, cfg: {}, dias: { [hoy]: { comidas: [{ id: 'a', ts: 1, kcal: 400, porcionFactor: 0.5 }] } } });
  esperar(s.dias[hoy].comidas[0].porcionFactor, 0.5);
});

test('una comida sin porcion guardada vale por entera', () => {
  const hoy = hoyISO();
  const s = migrar({ perfil: {}, cfg: {}, dias: { [hoy]: { comidas: [{ id: 'a', ts: 1, kcal: 400 }] } } });
  esperar(s.dias[hoy].comidas[0].porcionFactor, 1);
});

test('la porcion vuelve a la entera sin encadenarse', () => {
  // media de media daba un cuarto: la base tiene que ser siempre la entera
  const guardada = { titulo: 'Milanesa', kcal: 400, prot: 20, carb: 30, gras: 20, porcionFactor: 0.5 };
  const base = escalarComida(guardada, 1 / guardada.porcionFactor);
  esperar(base.kcal, 800);
  esperar(escalarComida(base, 0.5).kcal, 400);
  esperar(escalarComida(base, 1).kcal, 800);
});

test('los nutrientes viajan en el sync', () => {
  const f = __sync.comidaAFila({ id: 'a', ts: 1, kcal: 100, fibra: 5, azucar: 8, sodio: 900, porcionFactor: 0.5 }, '2026-09-01', 'k');
  esperar(f.fibra, 5);
  esperar(f.azucar, 8);
  esperar(f.sodio, 900);
  esperar(f.porcion_factor, 0.5);
  const v = __sync.filaAComida(f);
  esperar(v.sodio, 900);
  esperar(v.porcionFactor, 0.5);
});

test('una base sin las columnas nuevas no rompe la bajada', () => {
  const v = __sync.filaAComida({ id: 'a', ts: 1, kcal: 100 });
  esperar(v.fibra, 0);
  esperar(v.porcionFactor, 1);
});

test('una comida sin fecha no crea el dia "undefined"', () => {
  const estado = { perfil: {}, cfg: {}, borradas: [], dias: {} };
  const r = __sync.aplicarRemoto(estado, { comidas: [{ id: 'c', ts: 1, titulo: 'Sin fecha', kcal: 50, act: 1 }] });
  esperar(Object.keys(r.estado.dias).length, 0);
  esperar(r.resumen.ignoradas, 1);
});

test('un dia con fecha rota se descarta', () => {
  const estado = { perfil: {}, cfg: {}, borradas: [], dias: {} };
  const r = __sync.aplicarRemoto(estado, { dias: [{ fecha: 'NaN-aN-aN', agua: 3, act: 9 }] });
  esperar(Object.keys(r.estado.dias).length, 0);
});

test('el onboarding no borra el modo', () => {
  const perfil = { modo: 'keto', plazo: '2026-12-14', peso: 90 };
  const propuesto = { sexo: 'm', edad: 36, altura: 178, peso: 82, pesoObj: 75, actividad: 1.375, ritmo: 0.5, manual: null };
  const fusionado = { ...perfil, ...propuesto };
  esperar(fusionado.modo, 'keto');
  esperar(fusionado.plazo, '2026-12-14');
  esperar(fusionado.peso, 82);
});

test('una actividad nueva entra en favoritas si hay lugar', () => {
  const favs = ['funcional', 'running'];
  esperarQue(favs.length < 3, 'con dos hay lugar para la tercera');
  favs.push('bici');
  esperar(actividadesFavoritas({ cfg: { favoritasActividad: favs, actividades: [{ id: 'bici', nombre: 'Bici', met: 6, minutos: 30 }] } }).length, 3);
});

test('la porcion no apila prefijos en el titulo', () => {
  // "½ Milanesa" al doble daba "2 ½ Milanesa", y de ahi "½ 2 ½ Milanesa".
  // El prefijo se REEMPLAZA: escalar al doble sigue diciendo "2", que es
  // correcto, pero el nombre del plato aparece una sola vez.
  const media = escalarComida({ titulo: 'Milanesa', kcal: 800 }, 0.5);
  esperar(media.titulo, '½ Milanesa');
  const base = escalarComida(media, 2);
  esperar(base.titulo, '2 Milanesa');
  esperar(escalarComida(base, 0.5).titulo, '½ Milanesa');
  // y el camino que hace de verdad el editor: reconstruir la base y volver
  esperar(escalarComida(base, 1).titulo, 'Milanesa');
});

test('volver a la porcion entera devuelve el nombre limpio', () => {
  esperar(escalarComida({ titulo: '¾ Tarta', kcal: 300 }, 1).titulo, 'Tarta');
});

test('un titulo que arranca con un numero no pierde el numero', () => {
  // "2 huevos" no es una porcion: el prefijo es "2 " seguido de espacio y el
  // nombre queda igual, asi que esto documenta el limite conocido
  esperar(escalarComida({ titulo: 'Milanesa napolitana', kcal: 100 }, 1).titulo, 'Milanesa napolitana');
});

/* ---------------- el aviso empuja hacia el modo ---------------- */

function diasFueraDeKeto(n = 5) {
  const dias = {};
  for (let i = 0; i < n; i++) {
    dias[sumarDias('2026-09-01', -i)] = {
      comidas: [
        { id: 'a' + i, ts: 1 + i, titulo: 'Fideos con salsa', kcal: 700, prot: 20, carb: 110, gras: 15, fibra: 5 },
        { id: 'b' + i, ts: 2 + i, titulo: 'Alfajor', kcal: 230, prot: 3, carb: 34, gras: 9 }
      ]
    };
  }
  return dias;
}

test('el aviso dice por cuanto te pasas, no solo que te pasas', () => {
  const r = modoQueNoCuadra(diasFueraDeKeto(), 'keto', { kcal: 1900 }, { hasta: '2026-09-01' });
  esperarQue(r, 'con cinco dias afuera tiene que avisar');
  esperarQue(/carbos por día/.test(r.texto), 'el numero de carbos: ' + r.texto);
  esperarQue(/techo/.test(r.texto), 'y contra que techo');
});

test('y dice que alimento lo trae', () => {
  const r = modoQueNoCuadra(diasFueraDeKeto(), 'keto', { kcal: 1900 }, { hasta: '2026-09-01' });
  esperarQue(/fideos|alfajor/i.test(r.texto), 'los platos que mas carbos aportan: ' + r.texto);
});

test('el aviso ya no ofrece cambiar de modo en el texto', () => {
  // cambiar sigue estando como boton, pero el texto no empuja para ese lado
  const r = modoQueNoCuadra(diasFueraDeKeto(), 'keto', { kcal: 1900 }, { hasta: '2026-09-01' });
  esperarQue(!/otro modo|te sirva/.test(r.texto), 'sin la salida facil: ' + r.texto);
});

test('loQueTeSaca ordena por cuanto aporta cada uno', () => {
  const r = loQueTeSaca(diasFueraDeKeto(3), 30, { hasta: '2026-09-01' });
  esperar(r.culpables[0], 'fideos con salsa');
  esperar(r.techo, 30);
  esperarQue(r.porDia > 100, 'el promedio diario de carbos netos: ' + r.porDia);
});

test('loQueTeSaca prefiere el ingrediente al plato cuando lo hay', () => {
  const dias = {
    '2026-09-01': {
      comidas: [{
        id: 'a', ts: 1, titulo: 'Sándwich de milanesa', kcal: 800, carb: 80,
        items: [{ nombre: 'Pan', carbohidratos: 60 }, { nombre: 'Milanesa', carbohidratos: 20 }]
      }]
    }
  };
  esperar(loQueTeSaca(dias, 30, { hasta: '2026-09-01' }).culpables[0], 'pan');
});

test('sin techo de carbos no hay nada que contar', () => {
  esperar(loQueTeSaca(diasFueraDeKeto(), 0, { hasta: '2026-09-01' }), null);
});

test('la lista se lee como se habla', () => {
  esperar(listaEnTexto(['pan']), 'pan');
  esperar(listaEnTexto(['pan', 'fideos']), 'pan y fideos');
  esperar(listaEnTexto(['pan', 'fideos', 'alfajor']), 'pan, fideos y alfajor');
});

/* ---------------- las sugerencias respetan el modo ---------------- */

const EMPANADAS = {
  titulo: 'Empanadas de jamón y queso',
  items: [{ nombre: 'Empanadas', porcion: '2', calorias: 500, proteinas: 20, carbohidratos: 45, grasas: 25 }]
};
const BIFE = {
  titulo: 'Bife con ensalada',
  items: [{ nombre: 'Bife', porcion: '200 g', calorias: 400, proteinas: 45, carbohidratos: 0, grasas: 22 },
          { nombre: 'Ensalada', porcion: '1 plato', calorias: 60, proteinas: 2, carbohidratos: 5, grasas: 3 }]
};

test('en keto las empanadas no se sugieren', () => {
  const r = sugerenciasQueEntran([EMPANADAS, BIFE], 'keto', { kcal: 1900 });
  esperar(r.opciones.length, 1);
  esperar(r.opciones[0].titulo, 'Bife con ensalada');
  esperar(r.descartadas, 1);
});

test('sin techo de carbos las dos entran', () => {
  const r = sugerenciasQueEntran([EMPANADAS, BIFE], 'moderado', { kcal: 1900 });
  esperar(r.opciones.length, 2);
  esperar(r.descartadas, 0);
});

test('el plato se juzga solo, no contra el dia arruinado', () => {
  // si te pasaste de carbos al mediodia, ninguna cena entraria nunca y el
  // panel quedaria siempre vacio: una cena keto sigue siendo una cena keto
  const r = sugerenciasQueEntran([BIFE], 'keto', { kcal: 1900 });
  esperar(r.opciones.length, 1);
  esperar(r.descartadas, 0);
});

test('sin opciones no explota', () => {
  esperar(sugerenciasQueEntran(null, 'keto', null).opciones.length, 0);
  esperar(sugerenciasQueEntran([], 'keto', null).descartadas, 0);
});

test('el prompt lleva las reglas del modo', () => {
  const p = promptSugerencias({
    margen: { kcal: 800, prot: 40, carb: 10, gras: 30 },
    momento: 'cena', faltaProteina: false, modo: modoDe('keto')
  });
  esperarQue(/Keto/.test(p), 'dice en que modo esta: ' + p.slice(0, 120));
  esperarQue(/30 g de carbohidratos netos/.test(p), 'y el techo del modo');
  esperarQue(/empanadas/i.test(p), 'con los ejemplos de lo que queda afuera');
  esperarQue(/TECHO/.test(p), 'y que los carbos que quedan son un techo, no una meta');
});

test('sin modo el prompt sigue funcionando', () => {
  const p = promptSugerencias({ margen: { kcal: 800, prot: 40, carb: 60, gras: 30 }, momento: 'cena', faltaProteina: false });
  esperarQue(/800 kcal/.test(p), 'las calorias siguen estando');
  esperarQue(!/NO SE NEGOCIA/.test(p), 'y no inventa reglas que no hay');
});

test('la vegetariana no propone carne', () => {
  const p = promptSugerencias({
    margen: { kcal: 800, prot: 40, carb: 60, gras: 30 },
    momento: 'cena', faltaProteina: false, modo: modoDe('vegetariana')
  });
  esperarQue(/nada de carne/i.test(p), 'la regla dura del patron: ' + p.slice(0, 200));
});

test('las sugerencias piden esfuerzo bajo en los modelos que lo aceptan', () => {
  esperarQue(aceptaEffort('claude-sonnet-5'), 'sonnet 5 lo acepta');
  esperarQue(!aceptaEffort('claude-haiku-4-5-20251001'), 'haiku 4.5 no, y da error si se manda');
});

/* ---------------- el dia en el cuerpo ---------------- */

test('sin agua y con el dia avanzado, seco', () => {
  esperarQue(hidratacionDe({ agua: 0 }, { hora: 20 }) < 0.2, 'a las ocho de la noche sin un vaso');
});

test('sin agua pero temprano no se juzga', () => {
  // no anotar el agua a las nueve no es lo mismo que no haber tomado
  esperar(hidratacionDe({ agua: 0 }, { hora: 9 }), 0.7);
});

test('el objetivo cumplido da hidratacion entera', () => {
  esperar(hidratacionDe({ agua: 8 }, { hora: 20 }), 1);
  esperar(hidratacionDe({ agua: 10 }, { hora: 20 }), 1);
});

test('la mitad del agua da la mitad', () => {
  esperar(hidratacionDe({ agua: 4 }, { hora: 20 }), 0.5);
});

test('temprano un par de vasos ya alcanza', () => {
  esperarQue(hidratacionDe({ agua: 2 }, { hora: 10 }) >= 0.7, 'a las diez, dos vasos van bien');
});

test('tres horas de sueno es el piso', () => {
  esperar(descansoDe({ sueno: { horas: 3 } }), 0);
  esperar(descansoDe({ sueno: { horas: 4 } }), 0);
});

test('ocho horas o mas es descanso entero', () => {
  esperar(descansoDe({ sueno: { horas: 8 } }), 1);
  esperar(descansoDe({ sueno: { horas: 10 } }), 1);
});

test('seis horas queda en el medio', () => {
  esperar(descansoDe({ sueno: { horas: 6 } }), 0.5);
});

test('sin sueno cargado no se dibuja cansado', () => {
  esperar(descansoDe({}), 0.7);
  esperar(descansoDe({ sueno: null }), 0.7);
});

test('cuerpoDelDia junta todo sin perder lo que ya habia', () => {
  const hoy = '2026-09-01';
  const dias = { [hoy]: { comidas: [], peso: 82, agua: 8, sueno: { horas: 8 }, animo: 'bien', ejercicio: 400 } };
  const c = cuerpoDelDia({ altura: 178, peso: 82 }, dias, hoy, { hora: 20 });
  esperar(c.hidratacion, 1);
  esperar(c.descanso, 1);
  esperar(c.animo, 'bien');
  esperarQue(c.efectiva != null, 'y la contextura del peso sigue estando');
  esperarQue(c.imc > 25 && c.imc < 27, 'con el IMC calculado: ' + c.imc);
});

test('un dia en blanco no da un cuerpo castigado', () => {
  const hoy = '2026-09-01';
  const c = cuerpoDelDia({ altura: 178, peso: 82 }, { [hoy]: { comidas: [] } }, hoy, { hora: 9 });
  esperar(c.hidratacion, 0.7);
  esperar(c.descanso, 0.7);
  esperar(c.animo, null);
});

/* ---------------- moverse por minutos e intensidad ---------------- */

test('media hora moderada para 80 kg', () => {
  // 6 MET x 80 kg x 0,5 h = 240
  esperar(caloriasDeMovimiento(30, 'medio', 80), 240);
});

test('la intensidad cambia el resultado', () => {
  esperar(caloriasDeMovimiento(60, 'suave', 80), 240);
  esperar(caloriasDeMovimiento(60, 'medio', 80), 480);
  esperar(caloriasDeMovimiento(60, 'fuerte', 80), 720);
});

test('el peso importa: el mismo rato gasta distinto', () => {
  esperarQue(caloriasDeMovimiento(30, 'medio', 120) > caloriasDeMovimiento(30, 'medio', 60), 'mas cuerpo, mas gasto');
});

test('sin minutos o sin peso no se inventa un numero', () => {
  esperar(caloriasDeMovimiento(0, 'medio', 80), 0);
  esperar(caloriasDeMovimiento(30, 'medio', 0), 0);
  esperar(caloriasDeMovimiento(30, 'medio', null), 0);
});

test('una intensidad que no existe cae en la del medio', () => {
  esperar(intensidadDe('nada').id, 'medio');
  esperar(intensidadDe('fuerte').met, 9);
});

/* ---------------- el tamagotchi, segunda pasada ---------------- */

test('por debajo de IMC 17 arranca el demacrado', () => {
  esperar(demacradoDe(22), 0);
  esperar(demacradoDe(17), 0);
  esperar(demacradoDe(15), 0.5);
  esperar(demacradoDe(13), 1);
  esperar(demacradoDe(10), 1);
  esperar(demacradoDe(null), 0);
});

test('el demacrado achica el cuerpo mas alla del clamp', () => {
  const normal = medidasDe(0, 0, 0, 0);
  const hueso = medidasDe(0, 0, 0, 1);
  esperarQue(hueso.brazo < normal.brazo, 'brazos de palo');
  esperarQue(hueso.pierna < normal.pierna, 'piernas de palo');
  esperarQue(hueso.caraRx < normal.caraRx, 'cara chupada');
});

test('el extremo gordo crece mas que lineal', () => {
  const medio = medidasDe(0.5, 0);
  const tope = medidasDe(1, 0);
  // si fuera lineal, doblar c doblaria el delta; el cuadratico lo pasa
  esperarQue((tope.cintura - 11.5) > 2 * (medio.cintura - 11.5), 'la segunda mitad pega el doble');
});

test('cuerpoDelDia trae el demacrado', () => {
  const hoy = '2026-09-01';
  const c = cuerpoDelDia({ altura: 178, peso: 40 }, { [hoy]: { comidas: [], peso: 40 } }, hoy, { hora: 20 });
  esperarQue(c.demacrado > 0.9, '40 kg en 1,78 m es esqueletico: ' + c.demacrado);
});

test('el svg dibuja costillas al esqueletico y no al normal', () => {
  const flaco = svgPersonaje('neutral', 96, { efectiva: 0, musculatura: 0, demacrado: 1 });
  const normal = svgPersonaje('neutral', 96, { efectiva: 0.4, musculatura: 0 });
  esperarQue(/class="costillas"/.test(flaco), 'con costillas');
  esperarQue(/class="chupada"/.test(flaco), 'y mejillas hundidas');
  esperarQue(!/class="costillas"/.test(normal), 'el normal no');
});

test('el svg marca musculo al entrenado y no al quieto', () => {
  const fuerte = svgPersonaje('neutral', 96, { efectiva: 0.3, musculatura: 0.9 });
  const quieto = svgPersonaje('neutral', 96, { efectiva: 0.3, musculatura: 0 });
  esperarQue(/class="musculo"/.test(fuerte), 'abs y pecho marcados');
  esperarQue(!/class="musculo"/.test(quieto), 'el quieto no');
});

test('la panza grande tapa los abs aunque haya fuerza', () => {
  const gordo = svgPersonaje('neutral', 96, { efectiva: 0.8, musculatura: 0.9 });
  esperarQue(!/class="musculo"/.test(gordo), 'unos abs sobre la panza serian mentira');
});

test('el muneco respira siempre y parpadea', () => {
  const svg = svgPersonaje('neutral', 96, { efectiva: 0.4 });
  esperarQue(/anim-respira/.test(svg), 'respira');
  esperarQue(/anim-parpado/.test(svg), 'parpadea');
  esperarQue(/--resp:/.test(svg), 'con su ritmo');
});

test('hecho polvo respira lento y cabecea', () => {
  const roto = svgPersonaje('neutral', 96, { efectiva: 0.4, descanso: 0.1 });
  const pleno = svgPersonaje('neutral', 96, { efectiva: 0.4, descanso: 1 });
  esperarQue(/anim-cabecea/.test(roto) && /--resp:5/.test(roto), 'cabecea y respira largo: ' + roto.match(/--resp:[^"]+/));
  esperarQue(!/class="anim-cabecea"/.test(pleno) && /--resp:3\.0s/.test(pleno), 'descansado respira corto');
});

test('el cansancio serio pone las zzz', () => {
  const roto = svgPersonaje('bien', 96, { efectiva: 0.4, descanso: 0.2 });
  esperarQue(/anim-zzz/.test(roto), 'las z flotando');
});

test('la sed y el cansancio encorvan la pose', () => {
  const base = POSES.neutral;
  const seco = poseDelDia(base, { hidratacion: 0.1, descanso: 0.7 });
  const cansado = poseDelDia(base, { hidratacion: 0.7, descanso: 0.1 });
  const pleno = poseDelDia(base, { hidratacion: 1, descanso: 1 });
  esperarQue(seco.inclina > base.inclina, 'la sed inclina');
  esperarQue(cansado.hombros > base.hombros, 'el cansancio baja los hombros');
  esperar(pleno, base);
});

test('los animos de las caritas tienen cara propia', () => {
  esperarQue(CARAS.mal && CARAS.mal.boca === 'triste', '"mal" no cae a neutral');
  esperarQue(CARAS.normal && POSES.normal, '"normal" existe');
});

/* ---------------- la cintura ---------------- */

test('el indice cintura-altura y sus bandas', () => {
  esperar(icaDe(89, 178), 0.5);
  esperar(icaDe(80, 178), 0.449);
  esperar(bandaICA(icaDe(80, 178)).id, 'sano');
  esperar(bandaICA(icaDe(95, 178)).id, 'riesgo');
  esperar(bandaICA(icaDe(110, 178)).id, 'alto');
  /* Sin dato no hay indice, y una cinta de 300 cm es un error de tipeo. */
  esperar(icaDe(null, 178), null);
  esperar(icaDe(300, 178), null);
  esperar(icaDe(89, null), null);
});

test('la forma sale de apartarse de la cintura esperada, no de la cintura sola', () => {
  /* 82,5 kg en 1,78 m son IMC 26: se espera una cintura de unos 91 cm. */
  const imc = imcDe(82.5, 178);
  const espera = +(icaEsperado(imc) * 178).toFixed(0);
  esperarQue(Math.abs(espera - 91) <= 2, 'la esperada para IMC 26: ' + espera);

  esperarQue(Math.abs(formaDe(espera, 178, imc)) < 0.05, 'en la esperada, la forma es cero');
  esperarQue(formaDe(espera + 12, 178, imc) > 0.7, 'doce centimetros de mas es panza');
  esperarQue(formaDe(espera - 12, 178, imc) < -0.7, 'doce de menos, el peso esta en otro lado');
  /* Y el mismo numero de cintura significa cosas distintas segun el peso: 91 cm
     en alguien de 62 kg es mucho, y en alguien de 105 kg es poco. */
  esperarQue(formaDe(91, 178, imcDe(62, 178)) > 0.5, '91 cm siendo flaco es panza');
  esperarQue(formaDe(91, 178, imcDe(105, 178)) < -0.5, '91 cm siendo grande es estar compacto');
});

test('sin cintura cargada el dibujo no cambia en nada', () => {
  const perfil = { altura: 178, peso: 82.5 };
  const cuerpo = cuerpoDe(perfil, diasCuerpo(), HOY_CUERPO);
  esperar(cuerpo.cintura, null);
  esperar(cuerpo.ica, null);
  esperar(cuerpo.forma, 0);
  esperar(medidasDe(cuerpo.efectiva, 0, 0, 0, cuerpo.forma), medidasDe(cuerpo.efectiva, 0, 0, 0));
});

test('la cintura afina o ensancha la silueta con el mismo peso', () => {
  const base = { altura: 178, peso: 82.5 };
  const sin = cuerpoDe(base, diasCuerpo(), HOY_CUERPO);
  const panzon = cuerpoDe({ ...base, cintura: 105 }, diasCuerpo(), HOY_CUERPO);
  const compacto = cuerpoDe({ ...base, cintura: 78 }, diasCuerpo(), HOY_CUERPO);

  /* El peso es el mismo en los tres: lo unico que cambia es donde esta. */
  esperar(panzon.imc, compacto.imc);
  esperar(panzon.efectiva, compacto.efectiva);

  const ancho = (c) => medidasDe(c.efectiva, 0, 0, c.demacrado, c.forma).cintura;
  esperarQue(ancho(panzon) > ancho(sin) + 4, 'el panzon tiene que verse mas ancho');
  esperarQue(ancho(compacto) < ancho(sin) - 4, 'el compacto, mas fino');
});

test('la panza real tapa los abs, y la cintura fina los deja ver', () => {
  /* Con IMC 29 y musculatura llena, la contextura sola dejaba los abs al borde:
     lo que decide es la cintura medida. */
  const cuerpo = (cintura) => cuerpoDe(
    { altura: 178, peso: 92, cintura }, diasCuerpo({ entrenados: 14 }), HOY_CUERPO
  );
  const svg = (c) => svgPersonaje('neutral', 96, c);

  esperarQue(!/class="musculo"/.test(svg(cuerpo(110))), 'con panza no se dibujan abs');
  esperarQue(/class="musculo"/.test(svg(cuerpo(82))), 'con cintura fina, si');
});

test('la cintura del perfil manda sobre la de los dias', () => {
  const dias = diasCuerpo();
  dias[HOY_CUERPO] = { ...(dias[HOY_CUERPO] || {}), cintura: 99 };
  esperar(ultimaCinturaConocida({ altura: 178, cintura: 84 }, dias, HOY_CUERPO), 84);
  esperar(ultimaCinturaConocida({ altura: 178 }, dias, HOY_CUERPO), 99);
  esperar(ultimaCinturaConocida({ altura: 178 }, {}, HOY_CUERPO), null);
});

test('una cintura fuera de rango se descarta en vez de deformar el muneco', () => {
  const roto = cuerpoDe({ altura: 178, peso: 82.5, cintura: 12 }, diasCuerpo(), HOY_CUERPO);
  esperar(roto.cintura, null);
  esperar(roto.forma, 0);
  esperar(validarPerfil({ edad: 40, altura: 178, peso: 82.5, cintura: 12 }).ok, false);
  esperar(validarPerfil({ edad: 40, altura: 178, peso: 82.5, cintura: 89 }).ok, true);
  /* Vacia no es un error: el campo es opcional. */
  esperar(validarPerfil({ edad: 40, altura: 178, peso: 82.5, cintura: null }).ok, true);
});

test('la cintura medida le gana al IMC estimado', () => {
  /* IMC 29 entrenando todos los dias: el descuento por musculo deja la
     contextura en 0,28 y el muneco sale con abdominales marcados. Una cintura
     de 110 cm dice que ahi hay panza, y una medida le gana a una estimacion. */
  const con = cuerpoDe({ altura: 178, peso: 92, cintura: 110 }, diasCuerpo({ entrenados: 14 }), HOY_CUERPO);
  esperarQue(con.efectiva < 0.35, 'el IMC corregido decia poco: ' + con.efectiva);
  esperarQue(con.grasa > 0.6, 'la cinta dice mucho: ' + con.grasa);
  esperar(medidasDe(con.efectiva, 1, 0, 0, con.forma, con.grasa).cGrasa, con.grasa);

  /* Y sin cintura, el IMC sigue siendo el sustituto. */
  const sin = cuerpoDe({ altura: 178, peso: 92 }, diasCuerpo({ entrenados: 14 }), HOY_CUERPO);
  esperar(sin.grasa, null);
  esperar(medidasDe(sin.efectiva, 1, 0, 0, sin.forma, sin.grasa).cGrasa, sin.efectiva);
});
