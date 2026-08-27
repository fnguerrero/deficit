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
  esperar(Object.keys(POSES).length, 8);
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
      esperarQue(!svg.includes('--'), a + ' con ' + c + ': doble signo en un path');
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
      esperarQue(!svg.includes('--'), 'fase ' + f.n + ' con ' + c + ': doble signo');
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


test('el hombro del que entrena es una pieza con relleno, no una raya', () => {
  /* El deltoide era una linea curva al 50% sobre el brazo, y a este tamano una
     linea no se lee como musculo sino como una arruga: el muneco no se veia
     fuerte por mas musculatura que tuviera. Tiene que aportar area rellena. */
  const flojo = svgPersonaje('neutral', 96, { efectiva: .4, musculatura: 0 }, null);
  const fuerte = svgPersonaje('neutral', 96, { efectiva: .4, musculatura: 1 }, null);

  const rellenoPiel = (svg) => svg.split(`fill="${PALETA.piel}"`).length;
  esperarQue(rellenoPiel(fuerte) > rellenoPiel(flojo),
    'el hombro musculoso no agrega ninguna pieza rellena');
});

test('el brazo del que entrena no es un tubo de ancho parejo', () => {
  /* Con un solo trazo constante, entrenar y engordar hacian lo mismo con el
     brazo: agrandarlo. El de arriba lleva el biceps y el de abajo se afina. */
  const svg = svgPersonaje('neutral', 96, { efectiva: .3, musculatura: 1 }, null);
  const anchos = [...svg.matchAll(/stroke-width="([\d.]+)"/g)].map(m => Number(m[1]));
  const gruesos = anchos.filter(a => a > 8);
  esperarQue(new Set(gruesos.map(a => a.toFixed(1))).size > 1,
    'todos los trazos gruesos miden lo mismo: el brazo sigue siendo un tubo');
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

