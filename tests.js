/* ============================================================
   tests.js — runner propio, sin dependencias.
   Corre contra core.js (lógica pura). Resultado en window.__resultados.
   ============================================================ */

const R = { total: 0, fallos: 0, detalle: [] };

function test(nombre, fn) {
  try {
    fn();
    R.detalle.push({ ok: true, nombre });
  } catch (e) {
    R.fallos++;
    R.detalle.push({ ok: false, nombre, error: e.message });
  }
  R.total++;
}

function iguales(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function esperar(real, esperado, msg) {
  if (!iguales(real, esperado)) {
    throw new Error(`${msg || ''} esperaba ${JSON.stringify(esperado)}, dio ${JSON.stringify(real)}`);
  }
}

function esperarQue(cond, msg) {
  if (!cond) throw new Error(msg || 'condición falsa');
}

function cerca(real, esperado, tol, msg) {
  if (Math.abs(real - esperado) > tol) {
    throw new Error(`${msg || ''} esperaba ~${esperado} (±${tol}), dio ${real}`);
  }
}

/* ============================================================
   Fechas
   ============================================================ */

test('hoyISO devuelve YYYY-MM-DD', () => {
  esperarQue(/^\d{4}-\d{2}-\d{2}$/.test(hoyISO()), 'formato inválido: ' + hoyISO());
});

test('hoyISO respeta la fecha local, no UTC', () => {
  // 23:30 hora local: en UTC ya sería el día siguiente, y no queremos eso
  const d = new Date(2026, 7, 19, 23, 30, 0);
  esperar(hoyISO(d), '2026-08-19');
});

test('sumarDias avanza y retrocede', () => {
  esperar(sumarDias('2026-08-19', 1), '2026-08-20');
  esperar(sumarDias('2026-08-19', -1), '2026-08-18');
});

test('sumarDias cruza fin de mes', () => {
  esperar(sumarDias('2026-08-31', 1), '2026-09-01');
  esperar(sumarDias('2026-03-01', -1), '2026-02-28');
});

test('sumarDias cruza fin de año', () => {
  esperar(sumarDias('2026-12-31', 1), '2027-01-01');
});

test('diasEntre cuenta bien', () => {
  esperar(diasEntre('2026-08-19', '2026-08-26'), 7);
  esperar(diasEntre('2026-08-26', '2026-08-19'), -7);
  esperar(diasEntre('2026-08-19', '2026-08-19'), 0);
});

test('etiquetaFecha distingue hoy y ayer', () => {
  esperar(etiquetaFecha('2026-08-19', '2026-08-19'), 'Hoy');
  esperar(etiquetaFecha('2026-08-18', '2026-08-19'), 'Ayer');
  esperarQue(etiquetaFecha('2026-08-10', '2026-08-19').length > 3, 'debería dar una fecha con formato largo');
});

/* ============================================================
   Cálculo nutricional
   ============================================================ */

const PERFIL = {
  sexo: 'm', edad: 38, altura: 178, peso: 92, pesoObj: 82,
  actividad: 1.375, ritmo: 0.5, manual: null
};

test('calcularPlan devuelve null sin datos mínimos', () => {
  esperar(calcularPlan(null), null);
  esperar(calcularPlan({ sexo: 'm', edad: 38 }), null);
  esperar(calcularPlan({ sexo: 'm', edad: 38, altura: 178 }), null);
});

test('TMB por Mifflin-St Jeor (hombre)', () => {
  // 10*92 + 6.25*178 - 5*38 + 5 = 920 + 1112.5 - 190 + 5 = 1847.5 -> 1848
  esperar(calcularPlan(PERFIL).tmb, 1848);
});

test('TMB por Mifflin-St Jeor (mujer)', () => {
  // 10*65 + 6.25*165 - 5*30 - 161 = 650 + 1031.25 - 150 - 161 = 1370.25 -> 1370
  const p = { ...PERFIL, sexo: 'f', peso: 65, altura: 165, edad: 30 };
  esperar(calcularPlan(p).tmb, 1370);
});

test('TDEE aplica el factor de actividad', () => {
  esperar(calcularPlan(PERFIL).tdee, Math.round(1848 * 1.375));
});

test('objetivo = TDEE menos el déficit del ritmo elegido', () => {
  const c = calcularPlan(PERFIL);
  esperar(c.objetivo, c.tdee - Math.round((0.5 * 7700) / 7));
});

test('el piso de seguridad evita objetivos por debajo de la TMB', () => {
  // ritmo agresivo sobre una persona chica: el crudo daría menos que la TMB
  const p = { sexo: 'f', edad: 30, altura: 160, peso: 55, pesoObj: 50, actividad: 1.2, ritmo: 1, manual: null };
  const c = calcularPlan(p);
  esperarQue(c.ajustado === true, 'debería marcar que ajustó');
  esperar(c.objetivo, c.piso);
  esperarQue(c.objetivo >= c.tmb, 'el objetivo nunca puede quedar bajo la TMB');
});

test('el objetivo manual pisa el calculado', () => {
  const c = calcularPlan({ ...PERFIL, manual: 1700 });
  esperar(c.objetivo, 1700);
});

test('con objetivo manual el ritmo se recalcula', () => {
  const c = calcularPlan({ ...PERFIL, manual: 1700 });
  esperar(c.deficitReal, c.tdee - 1700);
  cerca(c.kgSemana, (c.deficitReal * 7) / 7700, 0.01);
});

test('las semanas hasta la meta salen del ritmo real', () => {
  const c = calcularPlan(PERFIL);
  esperar(c.semanas, Math.ceil((92 - 82) / c.kgSemana));
});

test('sin peso objetivo no hay proyección', () => {
  esperar(calcularPlan({ ...PERFIL, pesoObj: null }).semanas, null);
});

test('si ya estás en el peso meta no proyecta', () => {
  esperar(calcularPlan({ ...PERFIL, peso: 80, pesoObj: 82 }).semanas, null);
});

test('los macros suman el total de calorías', () => {
  const c = calcularPlan(PERFIL);
  const kcal = c.macros.prot * 4 + c.macros.carb * 4 + c.macros.gras * 9;
  cerca(kcal, c.objetivo, 12, 'los macros deberían reconstruir el objetivo');
});

/* ============================================================
   Suma de comidas
   ============================================================ */

test('sumarComidas con lista vacía da todo en cero', () => {
  for (const entrada of [[], null]) {
    const r = sumarComidas(entrada);
    esperarQue(Object.values(r).every(v => v === 0), 'todo tiene que ser cero, dio: ' + JSON.stringify(r));
  }
});

test('sumarComidas acumula y redondea', () => {
  const r = sumarComidas([
    { kcal: 430.4, prot: 32.2, carb: 22, gras: 23 },
    { kcal: 180.2, prot: 4, carb: 30.4, gras: 5 }
  ]);
  esperar({ kcal: r.kcal, prot: r.prot, carb: r.carb, gras: r.gras },
          { kcal: 611, prot: 36, carb: 52, gras: 28 });
});

test('sumarComidas ignora basura en los campos', () => {
  const r = sumarComidas([{ kcal: 'no soy número', prot: null, carb: undefined, gras: 10 }]);
  esperar({ kcal: r.kcal, prot: r.prot, carb: r.carb, gras: r.gras },
          { kcal: 0, prot: 0, carb: 0, gras: 10 });
});

/* ============================================================
   Migración de estado
   ============================================================ */

test('migrar(null) devuelve el estado por defecto', () => {
  const s = migrar(null);
  esperar(s.esquema, ESQUEMA);
  esperar(s.dias, {});
  esperar(s.perfil.actividad, 1.55);
});

test('migrar no rompe con basura', () => {
  esperar(migrar('texto suelto').esquema, ESQUEMA);
  esperar(migrar(42).esquema, ESQUEMA);
  esperar(migrar([]).esquema, ESQUEMA);
});

test('migrar conserva los datos de un state viejo (sin esquema)', () => {
  const viejo = {
    perfil: { sexo: 'm', edad: 38, altura: 178, peso: 92 },
    dias: {
      '2026-08-18': {
        peso: 92.5,
        comidas: [{ id: 'a1', ts: 123, titulo: 'Milanesa', items: [], kcal: 610, prot: 36, carb: 52, gras: 28 }]
      }
    },
    cfg: { apiKey: 'sk-ant-xxx', modelo: 'claude-opus-5' }
  };
  const s = migrar(viejo);
  esperar(s.perfil.edad, 38);
  esperar(s.cfg.apiKey, 'sk-ant-xxx');
  esperar(s.dias['2026-08-18'].peso, 92.5);
  esperar(s.dias['2026-08-18'].comidas[0].kcal, 610);
  esperar(s.esquema, ESQUEMA, 'debería quedar en el esquema nuevo');
});

test('migrar completa los campos que faltan en el perfil viejo', () => {
  const s = migrar({ perfil: { edad: 40 } });
  esperar(s.perfil.ritmo, 0.5, 'el default tiene que estar');
  esperar(s.perfil.edad, 40, 'y el dato viejo tiene que sobrevivir');
});

test('migrar sanea comidas incompletas', () => {
  const s = migrar({ dias: { '2026-08-18': { comidas: [{ kcal: 200 }] } } });
  const c = s.dias['2026-08-18'].comidas[0];
  esperarQue(!!c.id, 'debería inventar un id');
  esperar(c.titulo, 'Comida');
  esperar(c.prot, 0);
  esperar(c.items, []);
});

test('migrar descarta días corruptos sin tirar todo abajo', () => {
  const s = migrar({ dias: { '2026-08-18': null, '2026-08-19': { peso: 90, comidas: [] } } });
  esperar(Object.keys(s.dias), ['2026-08-19']);
});

test('migrar es idempotente', () => {
  const viejo = { perfil: { edad: 38, altura: 178, peso: 92 }, dias: { '2026-08-18': { peso: 92, comidas: [] } } };
  const a = migrar(viejo);
  const b = migrar(a);
  esperar(b, a, 'migrar dos veces tiene que dar lo mismo');
});

test('clonar no comparte referencias', () => {
  const o = { a: { b: 1 } };
  const c = clonar(o);
  c.a.b = 2;
  esperar(o.a.b, 1);
});

/* ============================================================
   Validación del perfil
   ============================================================ */

const PERFIL_OK = { sexo: 'm', edad: 38, altura: 178, peso: 92, pesoObj: 82, actividad: 1.375, ritmo: 0.5, manual: null };

test('validarPerfil acepta un perfil correcto', () => {
  const { ok, errores } = validarPerfil(PERFIL_OK);
  esperarQue(ok, 'debería ser válido, dio: ' + JSON.stringify(errores));
});

test('validarPerfil exige los tres datos del cálculo', () => {
  const { ok, errores } = validarPerfil({ sexo: 'm' });
  esperarQue(!ok, 'no debería pasar');
  esperarQue(!!errores.edad && !!errores.altura && !!errores.peso, 'faltan los tres mensajes');
  esperarQue(!errores.pesoObj, 'el peso objetivo sí puede quedar vacío');
});

test('validarPerfil rechaza valores fuera de rango', () => {
  esperarQue(!!validarPerfil({ ...PERFIL_OK, edad: 5 }).errores.edad, 'edad 5');
  esperarQue(!!validarPerfil({ ...PERFIL_OK, edad: 130 }).errores.edad, 'edad 130');
  esperarQue(!!validarPerfil({ ...PERFIL_OK, altura: 17 }).errores.altura, 'altura 17 (metros en vez de cm)');
  esperarQue(!!validarPerfil({ ...PERFIL_OK, peso: 9 }).errores.peso, 'peso 9');
  esperarQue(!!validarPerfil({ ...PERFIL_OK, manual: 300 }).errores.manual, 'objetivo de 300 kcal');
});

test('validarPerfil avisa si la meta es más alta que el peso actual', () => {
  const { ok, errores } = validarPerfil({ ...PERFIL_OK, pesoObj: 95 });
  esperarQue(!ok);
  esperarQue(/por encima/.test(errores.pesoObj), 'dio: ' + errores.pesoObj);
});

test('validarPerfil avisa si la baja es desmedida', () => {
  const { errores } = validarPerfil({ ...PERFIL_OK, peso: 100, pesoObj: 45 });
  esperarQue(/meta intermedia/.test(errores.pesoObj || ''), 'dio: ' + errores.pesoObj);
});

test('validarPerfil deja pasar el objetivo manual vacío', () => {
  esperarQue(validarPerfil({ ...PERFIL_OK, manual: null }).ok);
  esperarQue(validarPerfil({ ...PERFIL_OK, manual: '' }).ok);
});

test('los mensajes de error dicen qué se espera', () => {
  const msg = validarPerfil({ ...PERFIL_OK, altura: 17 }).errores.altura;
  esperarQue(msg.includes('100') && msg.includes('250') && msg.includes('cm'), 'dio: ' + msg);
});

/* ============================================================
   Almacenamiento y exportación
   ============================================================ */

test('usoAlmacenamiento calcula el porcentaje', () => {
  const u = usoAlmacenamiento('x'.repeat(1024), 10240);   // 1 KB sobre 10 KB
  esperar(u.bytes, 1024);
  esperar(u.kb, 1);
  esperar(u.pct, 10);
  esperarQue(!u.alerta && !u.critico);
});

test('usoAlmacenamiento marca alerta al 75% y crítico al 90%', () => {
  esperarQue(usoAlmacenamiento('x'.repeat(7600), 10000).alerta, 'debería alertar al 76%');
  esperarQue(!usoAlmacenamiento('x'.repeat(7600), 10000).critico, 'todavía no es crítico');
  esperarQue(usoAlmacenamiento('x'.repeat(9500), 10000).critico, 'al 95% es crítico');
});

test('usoAlmacenamiento con vacío no rompe', () => {
  esperar(usoAlmacenamiento('').bytes, 0);
  esperar(usoAlmacenamiento(null).pct, 0);
});

test('pesoDeThumbs cuenta solo las comidas con foto', () => {
  const dias = {
    '2026-08-19': { comidas: [{ thumb: 'x'.repeat(2048) }, { thumb: null }] },
    '2026-08-20': { comidas: [{ thumb: 'x'.repeat(1024) }] }
  };
  const r = pesoDeThumbs(dias);
  esperar(r.cantidad, 2);
  esperar(r.kb, 3);
});

test('pesoDeThumbs sin datos da cero', () => {
  esperar(pesoDeThumbs({}), { cantidad: 0, kb: 0 });
  esperar(pesoDeThumbs(null).cantidad, 0);
});

const DIAS_CSV = {
  '2026-08-19': {
    peso: 92.5, agua: 6, ejercicio: 300,
    comidas: [{
      id: 'a', ts: new Date(2026, 7, 19, 13, 5).getTime(), momento: 'almuerzo',
      titulo: 'Milanesa con puré', kcal: 610, prot: 36, carb: 52, gras: 28,
      items: [
        { nombre: 'Milanesa', porcion: '180 g', calorias: 430, proteinas: 32, carbohidratos: 22, grasas: 23 },
        { nombre: 'Puré', porcion: '200 g', calorias: 180, proteinas: 4, carbohidratos: 30, grasas: 5 }
      ]
    }]
  }
};

test('armarCSV arma la cabecera y una fila por alimento', () => {
  const filas = armarCSV(DIAS_CSV).split('\r\n');
  esperar(filas.length, 3, 'cabecera + 2 alimentos');
  esperarQue(filas[0].startsWith('fecha;hora;momento'), 'dio: ' + filas[0]);
  esperarQue(filas[1].includes('Milanesa'), 'dio: ' + filas[1]);
  esperarQue(filas[2].includes('Puré'), 'dio: ' + filas[2]);
});

test('el CSV lleva los datos del día en cada fila', () => {
  const fila = armarCSV(DIAS_CSV).split('\r\n')[1].split(';');
  esperar(fila[0], '2026-08-19');
  esperar(fila[2], 'Almuerzo');
  esperar(fila[6], '430', 'las calorías del alimento, no las de la comida');
  esperar(fila[10], '92,5', 'el peso con coma decimal');
  esperar(fila[11], '6', 'los vasos de agua');
  esperar(fila[12], '300', 'las calorías de ejercicio');
});

test('el CSV usa el total de la comida si no hay desglose', () => {
  const dias = { '2026-08-19': { peso: null, agua: 0, ejercicio: 0, comidas: [
    { id: 'x', ts: Date.now(), momento: 'cena', titulo: 'Pizza', kcal: 800, prot: 30, carb: 90, gras: 32, items: [] }
  ] } };
  const filas = armarCSV(dias).split('\r\n');
  esperar(filas.length, 2);
  esperarQue(filas[1].includes('Pizza;Pizza'), 'el título hace de alimento, dio: ' + filas[1]);
});

test('celdaCSV escapa lo que rompería el archivo', () => {
  esperar(celdaCSV('normal'), 'normal');
  esperar(celdaCSV('con;punto y coma'), '"con;punto y coma"');
  esperar(celdaCSV('con "comillas"'), '"con ""comillas"""');
  esperar(celdaCSV(null), '');
});

test('un alimento con punto y coma no corre las columnas', () => {
  const dias = { '2026-08-19': { peso: null, agua: 0, ejercicio: 0, comidas: [
    { id: 'x', ts: Date.now(), momento: 'cena', titulo: 'Mix', kcal: 100, prot: 0, carb: 0, gras: 0,
      items: [{ nombre: 'Pan; manteca', porcion: '1', calorias: 100, proteinas: 0, carbohidratos: 0, grasas: 0 }] }
  ] } };
  const fila = armarCSV(dias).split('\r\n')[1];
  esperarQue(fila.includes('"Pan; manteca"'), 'dio: ' + fila);
  esperar(fila.split(';').length, 14, 'el punto y coma escapado agrega un corte falso pero el campo va entrecomillado');
});

test('armarCSV ordena por fecha', () => {
  const dias = {
    '2026-08-20': { peso: null, agua: 0, ejercicio: 0, comidas: [{ id: 'b', ts: Date.now(), titulo: 'Segundo', momento: 'cena', kcal: 1, prot: 0, carb: 0, gras: 0, items: [] }] },
    '2026-08-18': { peso: null, agua: 0, ejercicio: 0, comidas: [{ id: 'a', ts: Date.now(), titulo: 'Primero', momento: 'cena', kcal: 1, prot: 0, carb: 0, gras: 0, items: [] }] }
  };
  const filas = armarCSV(dias).split('\r\n');
  esperarQue(filas[1].includes('Primero'), 'el 18 va antes que el 20');
});

test('armarCSV sin datos devuelve solo la cabecera', () => {
  esperar(armarCSV({}).split('\r\n').length, 1);
  esperar(armarCSV(null).split('\r\n').length, 1);
});

/* ============================================================
   Calibración de la estimación
   ============================================================ */

const FOTO_FALSA = 'data:image/jpeg;base64,AAAA';

function refsConEstimacion(pares) {
  // pares: [[real, estimado], ...]
  let refs = [];
  pares.forEach(([real], i) => {
    refs = agregarReferencia(refs, { nombre: 'Ref ' + i, kcalReal: real, foto: FOTO_FALSA }, 1000 + i);
  });
  // agregarReferencia mete al principio, así que se invierte para emparejar
  const ids = refs.map(r => r.id).reverse();
  pares.forEach(([, estimado], i) => {
    refs = anotarEstimacion(refs, ids[i], { kcal: estimado, modelo: 'claude-opus-5' }, 2000);
  });
  return refs;
}

test('agregarReferencia exige nombre, calorías reales y foto', () => {
  const casos = [
    [{ kcalReal: 300, foto: FOTO_FALSA }, /nombre/],
    [{ nombre: 'Yogur', foto: FOTO_FALSA }, /calorías reales/],
    [{ nombre: 'Yogur', kcalReal: 300 }, /foto/]
  ];
  for (const [entrada, patron] of casos) {
    let msg = '';
    try { agregarReferencia([], entrada); } catch (e) { msg = e.message; }
    esperarQue(patron.test(msg), 'dio: ' + msg);
  }
});

test('agregarReferencia guarda lo necesario', () => {
  const [r] = agregarReferencia([], { nombre: 'Yogur', kcalReal: 120, protReal: 10, foto: FOTO_FALSA }, 1000);
  esperar(r.nombre, 'Yogur');
  esperar(r.kcalReal, 120);
  esperar(r.protReal, 10);
  esperar(r.ultima, null, 'todavía no se corrió');
});

test('agregarReferencia respeta el tope', () => {
  let refs = [];
  for (let i = 0; i < MAX_REFERENCIAS + 4; i++) {
    refs = agregarReferencia(refs, { nombre: 'r' + i, kcalReal: 100, foto: FOTO_FALSA }, 1000 + i);
  }
  esperar(refs.length, MAX_REFERENCIAS);
});

test('borrarReferencia saca solo la pedida', () => {
  let refs = agregarReferencia([], { nombre: 'A', kcalReal: 100, foto: FOTO_FALSA }, 1000);
  refs = agregarReferencia(refs, { nombre: 'B', kcalReal: 200, foto: FOTO_FALSA }, 2000);
  const quedan = borrarReferencia(refs, refs[0].id);
  esperar(quedan.length, 1);
  esperar(quedan[0].nombre, 'A');
});

test('medirCalibracion sin corridas devuelve null', () => {
  const refs = agregarReferencia([], { nombre: 'A', kcalReal: 100, foto: FOTO_FALSA }, 1000);
  esperar(medirCalibracion(refs), null);
  esperar(medirCalibracion([]), null);
});

test('medirCalibracion calcula el error promedio', () => {
  // 100→110 (+10%), 200→180 (-10%), 300→300 (0%)
  const m = medirCalibracion(refsConEstimacion([[100, 110], [200, 180], [300, 300]]));
  esperar(m.n, 3);
  cerca(m.errorPromedio, 6.7, 0.1, 'promedio de 10, 10 y 0');
  cerca(m.sesgo, 0, 0.1, 'se compensan: no hay sesgo');
});

test('medirCalibracion detecta que subestima siempre', () => {
  const m = medirCalibracion(refsConEstimacion([[500, 400], [1000, 800], [300, 240]]));
  esperar(m.sesgo, -20, 'las tres quedan 20% cortas');
  esperar(m.errorPromedio, 20);
});

test('medirCalibracion marca la peor y la mejor', () => {
  // 100→105 es +5%, 200→400 es +100%, 300→290 es -3,3%
  const m = medirCalibracion(refsConEstimacion([[100, 105], [200, 400], [300, 290]]));
  esperar(m.peor.real, 200, 'la que se fue al doble');
  esperar(m.mejor.real, 300, 'la mejor es la de menor error absoluto, aunque se quede corta');
});

test('medirCalibracion ignora las referencias sin estimación', () => {
  let refs = refsConEstimacion([[100, 110]]);
  refs = agregarReferencia(refs, { nombre: 'Sin correr', kcalReal: 500, foto: FOTO_FALSA }, 3000);
  esperar(medirCalibracion(refs).n, 1);
});

test('el veredicto cambia según el error', () => {
  esperar(veredictoCalibracion(6).nivel, 'bueno');
  esperar(veredictoCalibracion(10).nivel, 'bueno');
  esperar(veredictoCalibracion(15).nivel, 'aceptable');
  esperar(veredictoCalibracion(35).nivel, 'flojo');
  esperarQue(/Preciso/.test(veredictoCalibracion(35).texto), 'el veredicto flojo tiene que sugerir qué hacer');
});

test('textoSesgo dice para qué lado se equivoca', () => {
  esperarQue(/por debajo/.test(textoSesgo(-18)), 'dio: ' + textoSesgo(-18));
  esperarQue(/por encima/.test(textoSesgo(18)), 'dio: ' + textoSesgo(18));
  esperarQue(/ningún lado/.test(textoSesgo(2)), 'dio: ' + textoSesgo(2));
});

test('anotarEstimacion solo toca la referencia pedida', () => {
  let refs = agregarReferencia([], { nombre: 'A', kcalReal: 100, foto: FOTO_FALSA }, 1000);
  refs = agregarReferencia(refs, { nombre: 'B', kcalReal: 200, foto: FOTO_FALSA }, 2000);
  const id = refs.find(r => r.nombre === 'A').id;
  refs = anotarEstimacion(refs, id, { kcal: 110, modelo: 'x' }, 3000);
  esperar(refs.find(r => r.nombre === 'A').ultima.kcal, 110);
  esperar(refs.find(r => r.nombre === 'B').ultima, null);
});

/* ---- sesgo aprendido de las correcciones ---- */

function correcciones(pares) {
  // pares: [[estimado, corregido], ...]
  let lista = [];
  pares.forEach(([e, c], i) => { lista = registrarCorreccion(lista, e, c, 1000 + i); });
  return lista;
}

test('registrarCorreccion anota la diferencia en porcentaje', () => {
  const [c] = registrarCorreccion([], 400, 500, 1000);
  esperar(c.estimado, 400);
  esperar(c.corregido, 500);
  esperar(c.pct, -20, 'estimó 20% menos de lo que era');
});

test('registrarCorreccion ignora los ajustes chicos', () => {
  esperar(registrarCorreccion([], 500, 505, 1000).length, 0, '1% es redondeo, no corrección');
  esperar(registrarCorreccion([], 500, 600, 1000).length, 1);
});

test('registrarCorreccion ignora valores imposibles', () => {
  esperar(registrarCorreccion([], 0, 500, 1000).length, 0);
  esperar(registrarCorreccion([], 500, 0, 1000).length, 0);
});

test('registrarCorreccion respeta el tope', () => {
  let lista = [];
  for (let i = 0; i < MAX_CORRECCIONES + 8; i++) lista = registrarCorreccion(lista, 400, 500, 1000 + i);
  esperar(lista.length, MAX_CORRECCIONES);
});

test('sesgoAprendido pide un mínimo de muestras', () => {
  esperar(sesgoAprendido(correcciones([[400, 500], [300, 380]])), null, 'dos no alcanzan');
  esperar(sesgoAprendido([]), null);
  esperarQue(!!sesgoAprendido(correcciones([[400, 500], [300, 380], [200, 250], [800, 950], [600, 720]])));
});

test('sesgoAprendido detecta que subestima siempre', () => {
  const s = sesgoAprendido(correcciones([[400, 500], [320, 400], [800, 1000], [160, 200], [240, 300]]));
  esperar(s.n, 5);
  esperar(s.sesgo, -20);
  esperarQue(s.consistente, 'las cinco para el mismo lado');
  esperarQue(s.avisar, 'un 20% sistemático merece aviso');
  esperar(s.lado, 'de menos');
});

test('sesgoAprendido no avisa si las correcciones se compensan', () => {
  const s = sesgoAprendido(correcciones([[500, 400], [400, 500], [600, 500], [500, 600], [700, 600]]));
  esperarQue(!s.avisar, 'sin un lado dominante no hay nada que avisar');
  esperarQue(s.error > 0, 'aunque el error individual exista');
});

test('sesgoAprendido no avisa por diferencias chicas', () => {
  const s = sesgoAprendido(correcciones([[470, 500], [280, 300], [190, 200], [940, 1000], [750, 800]]));
  esperar(s.sesgo, -6, 'un 6% pareja');
  esperarQue(s.consistente);
  esperarQue(!s.avisar, 'por debajo del 15% no vale la pena molestar');
});

test('migrar conserva las correcciones y descarta las rotas', () => {
  const s = migrar({ correcciones: [
    { ts: 1000, estimado: 400, corregido: 500, pct: -20 },
    { ts: 2000, estimado: 0, corregido: 500 },
    null
  ] });
  esperar(s.correcciones.length, 1);
});

test('migrar conserva las referencias y descarta las rotas', () => {
  const s = migrar({ referencias: [
    { id: 'r1', nombre: 'Buena', kcalReal: 300, foto: FOTO_FALSA },
    { id: 'r2', nombre: 'Sin kcal', kcalReal: 0 },
    null
  ] });
  esperar(s.referencias.length, 1);
  esperar(s.referencias[0].nombre, 'Buena');
});

/* ============================================================
   Diagnóstico y errores
   ============================================================ */

test('registrarError deja lo último arriba', () => {
  let e = registrarError([], { ts: 1000, mensaje: 'Primero' });
  e = registrarError(e, { ts: 20000, mensaje: 'Segundo' });
  esperar(e[0].mensaje, 'Segundo');
  esperar(e.length, 2);
});

test('registrarError no repite el mismo error en ráfaga', () => {
  let e = registrarError([], { ts: 1000, mensaje: 'Falló algo' });
  e = registrarError(e, { ts: 2000, mensaje: 'Falló algo' });
  esperar(e.length, 1, 'el mismo error dos segundos después no se anota de nuevo');

  e = registrarError(e, { ts: 30000, mensaje: 'Falló algo' });
  esperar(e.length, 2, 'pero medio minuto después sí');
});

test('registrarError corta los mensajes larguísimos', () => {
  const [e] = registrarError([], { ts: 1000, mensaje: 'x'.repeat(1000) });
  esperar(e.mensaje.length, 300);
});

test('registrarError completa lo que falta', () => {
  const [e] = registrarError([], { ts: 1000 });
  esperar(e.mensaje, 'Error sin mensaje');
  esperar(e.linea, 0);
});

test('registrarError respeta el tope', () => {
  let e = [];
  for (let i = 0; i < MAX_ERRORES + 5; i++) e = registrarError(e, { ts: 1000 + i * 10000, mensaje: 'error ' + i });
  esperar(e.length, MAX_ERRORES);
});

test('armarDiagnostico resume el estado', () => {
  const st = stateDePrueba();
  st.errores = [{ ts: 1000, mensaje: 'algo' }];
  const d = armarDiagnostico({ version: 'deficit-v46', sw: 'activo', online: true, state: st,
    cuota: { kb: 120, pct: 3 }, pantalla: '375×812', agente: 'Chrome' });

  esperar(d.version, 'deficit-v46');
  esperar(d.dias, 4);
  esperar(d.comidas, 4);
  esperar(d.conexion, 'con conexión');
  esperar(d.almacenamiento, '120 KB (3%)');
  esperar(d.errores, 1);
  esperar(d.apiKey, 'sin cargar');
});

test('armarDiagnostico no rompe con un estado pelado', () => {
  const d = armarDiagnostico({ state: {}, online: false });
  esperar(d.dias, 0);
  esperar(d.comidas, 0);
  esperar(d.conexion, 'sin conexión');
  esperar(d.version, '—');
});

test('armarDiagnostico recorta el user agent', () => {
  const d = armarDiagnostico({ state: {}, agente: 'x'.repeat(500) });
  esperar(d.agente.length, 120);
});

test('diagnosticoATexto arma algo pegable', () => {
  const d = armarDiagnostico({ version: 'deficit-v46', state: stateDePrueba(), online: true });
  const txt = diagnosticoATexto(d, [{ ts: Date.parse('2026-08-20T12:00:00'), mensaje: 'Se rompió algo', origen: 'app.js', linea: 42 }]);

  esperarQue(txt.startsWith('Déficit — diagnóstico'), 'dio: ' + txt.slice(0, 40));
  esperarQue(txt.includes('deficit-v46'), 'falta la versión');
  esperarQue(txt.includes('Se rompió algo'), 'falta el error');
  esperarQue(txt.includes('app.js:42'), 'falta dónde pasó');
});

test('diagnosticoATexto sin errores no inventa la sección', () => {
  const txt = diagnosticoATexto(armarDiagnostico({ state: {} }), []);
  esperarQue(!txt.includes('Últimos errores'));
});

test('migrar conserva los errores y descarta los rotos', () => {
  const s = migrar({ errores: [{ ts: 1000, mensaje: 'ok' }, { mensaje: 'sin fecha' }, null] });
  esperar(s.errores.length, 1);
});

/* ============================================================
   Fusión al importar
   ============================================================ */

function estadoCon(dias, extra = {}) {
  return migrar({ dias, ...extra });
}

const COMIDA_A = { id: 'a', ts: new Date(2026, 7, 19, 13, 0).getTime(), momento: 'almuerzo', titulo: 'Milanesa', items: [], kcal: 430, prot: 32, carb: 22, gras: 23 };
const COMIDA_B = { id: 'b', ts: new Date(2026, 7, 19, 21, 0).getTime(), momento: 'cena', titulo: 'Sopa', items: [], kcal: 200, prot: 10, carb: 20, gras: 5 };
const COMIDA_C = { id: 'c', ts: new Date(2026, 7, 18, 13, 0).getTime(), momento: 'almuerzo', titulo: 'Guiso', items: [], kcal: 700, prot: 35, carb: 80, gras: 22 };

test('fusionar trae los días que no estaban', () => {
  const actual = estadoCon({ '2026-08-19': { comidas: [COMIDA_A] } });
  const backup = estadoCon({ '2026-08-18': { comidas: [COMIDA_C] } });

  const { estado, resumen } = fusionarEstados(actual, backup);
  esperar(Object.keys(estado.dias).sort(), ['2026-08-18', '2026-08-19']);
  esperar(resumen.diasNuevos, 1);
  esperar(resumen.comidasNuevas, 1);
});

test('fusionar suma las comidas nuevas de un día que ya existía', () => {
  const actual = estadoCon({ '2026-08-19': { comidas: [COMIDA_A] } });
  const backup = estadoCon({ '2026-08-19': { comidas: [COMIDA_B] } });

  const { estado, resumen } = fusionarEstados(actual, backup);
  esperar(estado.dias['2026-08-19'].comidas.length, 2);
  esperar(resumen.comidasNuevas, 1);
  esperar(resumen.comidasRepetidas, 0);
});

test('fusionar no duplica la misma comida', () => {
  const actual = estadoCon({ '2026-08-19': { comidas: [COMIDA_A] } });
  const backup = estadoCon({ '2026-08-19': { comidas: [COMIDA_A] } });

  const { estado, resumen } = fusionarEstados(actual, backup);
  esperar(estado.dias['2026-08-19'].comidas.length, 1);
  esperar(resumen.comidasRepetidas, 1);
});

test('fusionar reconoce la misma comida con otro id', () => {
  const actual = estadoCon({ '2026-08-19': { comidas: [COMIDA_A] } });
  const backup = estadoCon({ '2026-08-19': { comidas: [{ ...COMIDA_A, id: 'otro-id' }] } });

  const { estado } = fusionarEstados(actual, backup);
  esperar(estado.dias['2026-08-19'].comidas.length, 1, 'mismo horario, título y kcal: es la misma');
});

test('fusionar deja las comidas ordenadas por hora', () => {
  const actual = estadoCon({ '2026-08-19': { comidas: [COMIDA_B] } });
  const backup = estadoCon({ '2026-08-19': { comidas: [COMIDA_A] } });

  const { estado } = fusionarEstados(actual, backup);
  esperar(estado.dias['2026-08-19'].comidas.map(c => c.titulo), ['Milanesa', 'Sopa']);
});

test('fusionar completa los huecos sin pisar lo que hay', () => {
  const actual = estadoCon({ '2026-08-19': { comidas: [COMIDA_A], peso: 92, agua: 0, nota: '' } });
  const backup = estadoCon({ '2026-08-19': { comidas: [COMIDA_A], peso: 85, agua: 6, nota: 'del backup' } });

  const { estado } = fusionarEstados(actual, backup);
  const d = estado.dias['2026-08-19'];
  esperar(d.peso, 92, 'el peso de acá no se pisa');
  esperar(d.agua, 6, 'pero el agua que faltaba se completa');
  esperar(d.nota, 'del backup');
});

test('fusionar suma los usos de los alimentos frecuentes', () => {
  const actual = estadoCon({}, { frecuentes: [{ nombre: 'Pan', calorias: 200, usos: 3, ultimoUso: 1000 }] });
  const backup = estadoCon({}, { frecuentes: [{ nombre: 'pan', calorias: 220, usos: 5, ultimoUso: 2000 }] });

  const { estado } = fusionarEstados(actual, backup);
  esperar(estado.frecuentes.length, 1, 'no duplica por mayúsculas');
  esperar(estado.frecuentes[0].usos, 8);
  esperar(estado.frecuentes[0].calorias, 220, 'gana el valor más reciente');
});

test('fusionar conserva el favorito de cualquiera de los dos', () => {
  const actual = estadoCon({}, { frecuentes: [{ nombre: 'Pan', calorias: 200, usos: 1, favorito: false }] });
  const backup = estadoCon({}, { frecuentes: [{ nombre: 'Pan', calorias: 200, usos: 1, favorito: true }] });
  esperarQue(fusionarEstados(actual, backup).estado.frecuentes[0].favorito);
});

test('fusionar trae las recetas que faltan y no duplica', () => {
  const receta = { id: 'r1', nombre: 'Desayuno', items: [{ nombre: 'Avena', calorias: 230 }], kcal: 230, usos: 2 };
  const actual = estadoCon({}, { recetas: [] });
  const backup = estadoCon({}, { recetas: [receta] });

  const { estado, resumen } = fusionarEstados(actual, backup);
  esperar(estado.recetas.length, 1);
  esperar(resumen.recetasNuevas, 1);

  const otraVez = fusionarEstados(estado, backup);
  esperar(otraVez.estado.recetas.length, 1, 'importar dos veces no la duplica');
});

test('fusionar completa el perfil solo donde falta', () => {
  const actual = estadoCon({}, { perfil: { edad: 38, altura: null, peso: null } });
  const backup = estadoCon({}, { perfil: { edad: 50, altura: 178, peso: 92 } });

  const { estado } = fusionarEstados(actual, backup);
  esperar(estado.perfil.edad, 38, 'la edad de acá manda');
  esperar(estado.perfil.altura, 178, 'la altura que faltaba se completa');
});

test('fusionar suma el gasto de API de los dos', () => {
  const actual = estadoCon({}, { uso: { llamadas: 3, costo: 0.05, tokens: 5000 } });
  const backup = estadoCon({}, { uso: { llamadas: 2, costo: 0.02, tokens: 3000 } });

  const { estado } = fusionarEstados(actual, backup);
  esperar(estado.uso.llamadas, 5);
  cerca(estado.uso.costo, 0.07, 0.000001);
  esperar(estado.uso.tokens, 8000);
});

test('fusionar es idempotente', () => {
  const actual = estadoCon({ '2026-08-19': { comidas: [COMIDA_A] } });
  const backup = estadoCon({ '2026-08-18': { comidas: [COMIDA_C] } });

  const una = fusionarEstados(actual, backup).estado;
  const dos = fusionarEstados(una, backup).estado;
  esperar(dos.dias, una.dias, 'fusionar el mismo backup dos veces no cambia nada');
});

test('fusionar no toca el estado que recibe', () => {
  const actual = estadoCon({ '2026-08-19': { comidas: [COMIDA_A] } });
  const copia = clonar(actual);
  fusionarEstados(actual, estadoCon({ '2026-08-18': { comidas: [COMIDA_C] } }));
  esperar(actual.dias, copia.dias);
});

test('mismaComida distingue comidas parecidas pero distintas', () => {
  esperarQue(mismaComida(COMIDA_A, { ...COMIDA_A, id: 'x' }));
  esperarQue(!mismaComida(COMIDA_A, { ...COMIDA_A, kcal: 500 }), 'otras calorías, otra comida');
  esperarQue(!mismaComida(COMIDA_A, { ...COMIDA_A, titulo: 'Otra cosa' }));
  esperarQue(!mismaComida(COMIDA_A, { ...COMIDA_A, ts: COMIDA_A.ts + 3600000 }), 'una hora después es otra');
});

/* ============================================================
   Revisión de datos
   ============================================================ */

function comida(id, campos) {
  return { id, ts: Date.now(), momento: 'almuerzo', titulo: 'Comida ' + id, items: [], kcal: 0, prot: 0, carb: 0, gras: 0, ...campos };
}

test('kcalDeMacros usa 4/4/9', () => {
  esperar(kcalDeMacros(30, 20, 10), 30 * 4 + 20 * 4 + 10 * 9);
  esperar(kcalDeMacros(0, 0, 0), 0);
  esperar(kcalDeMacros(null, undefined, 'x'), 0);
});

test('revisarDatos no se queja de una comida coherente', () => {
  const dias = { '2026-08-19': { comidas: [comida('a', { kcal: 430, prot: 32, carb: 22, gras: 23 })] } };
  esperar(revisarDatos(dias, '2026-08-20'), []);
});

test('revisarDatos encuentra las kcal que no cierran', () => {
  // macros dan 630, pero dice 200
  const dias = { '2026-08-19': { comidas: [comida('a', { kcal: 200, prot: 50, carb: 50, gras: 25 })] } };
  const p = revisarDatos(dias, '2026-08-20');
  esperar(p.length, 1);
  esperar(p[0].tipo, 'no-cierra');
  esperar(p[0].sugerido, 625);
  esperarQue(p[0].arreglable);
});

test('revisarDatos tolera diferencias chicas', () => {
  // el redondeo de cada macro no puede disparar un aviso
  const dias = { '2026-08-19': { comidas: [comida('a', { kcal: 430, prot: 32, carb: 22, gras: 22 })] } };
  esperar(revisarDatos(dias, '2026-08-20'), []);
});

test('revisarDatos marca las comidas sin kcal pero con macros', () => {
  const dias = { '2026-08-19': { comidas: [comida('a', { kcal: 0, prot: 20, carb: 30, gras: 10 })] } };
  const p = revisarDatos(dias, '2026-08-20');
  esperar(p[0].tipo, 'sin-kcal');
  esperar(p[0].sugerido, 290);
});

test('revisarDatos ignora las comidas sin macros', () => {
  // una suma rápida no tiene desglose: no hay con qué comparar
  const dias = { '2026-08-19': { comidas: [comida('a', { kcal: 250 })] } };
  esperar(revisarDatos(dias, '2026-08-20'), []);
});

test('revisarDatos detecta valores negativos y exagerados', () => {
  const dias = { '2026-08-19': { comidas: [
    comida('a', { kcal: -100, prot: 10, carb: 10, gras: 10 }),
    comida('b', { kcal: 9000, prot: 100, carb: 100, gras: 100 })
  ] } };
  const tipos = revisarDatos(dias, '2026-08-20').map(p => p.tipo);
  esperar(tipos, ['negativo', 'exagerado']);
});

test('revisarDatos avisa de fechas futuras', () => {
  const dias = { '2026-09-01': { comidas: [comida('a', { kcal: 400, prot: 25, carb: 25, gras: 11 })] } };
  const p = revisarDatos(dias, '2026-08-20');
  esperar(p[0].tipo, 'fecha-futura');
  esperarQue(!p[0].arreglable, 'eso no se arregla solo');
});

test('arreglarDatos recalcula solo lo arreglable', () => {
  const dias = {
    '2026-08-19': { comidas: [
      comida('a', { kcal: 200, prot: 50, carb: 50, gras: 25 }),
      comida('b', { kcal: -100, prot: 10, carb: 10, gras: 10 })
    ] }
  };
  const problemas = revisarDatos(dias, '2026-08-20');
  const r = arreglarDatos(dias, problemas);

  esperar(r.arreglados, 1);
  esperar(r.dias['2026-08-19'].comidas[0].kcal, 625);
  esperar(r.dias['2026-08-19'].comidas[1].kcal, -100, 'lo que no es arreglable queda igual');
});

test('arreglarDatos no toca los días originales', () => {
  const dias = { '2026-08-19': { comidas: [comida('a', { kcal: 200, prot: 50, carb: 50, gras: 25 })] } };
  const copia = clonar(dias);
  arreglarDatos(dias, revisarDatos(dias, '2026-08-20'));
  esperar(dias, copia);
});

test('arreglar deja los datos limpios', () => {
  const dias = { '2026-08-19': { comidas: [comida('a', { kcal: 200, prot: 50, carb: 50, gras: 25 })] } };
  const r = arreglarDatos(dias, revisarDatos(dias, '2026-08-20'));
  esperar(revisarDatos(r.dias, '2026-08-20'), [], 'después de arreglar no queda nada por avisar');
});

/* ============================================================
   Informe del mes
   ============================================================ */

function stateDePrueba() {
  return {
    perfil: { sexo: 'm', edad: 38, altura: 178, peso: 91, pesoObj: 82, actividad: 1.375, ritmo: 0.5, manual: null },
    dias: {
      '2026-07-31': { nota: '', agua: 0, ejercicio: 0, peso: 93, comidas: [{ id: 'x', ts: tsEnMomento('2026-07-31', 'cena'), momento: 'cena', kcal: 2000, prot: 100, carb: 0, gras: 0, items: [] }] },
      '2026-08-01': { nota: 'Arranqué bien', agua: 8, ejercicio: 300, peso: 92, comidas: [
        { id: 'a', ts: tsEnMomento('2026-08-01', 'desayuno'), momento: 'desayuno', kcal: 400, prot: 20, carb: 40, gras: 12, items: [] },
        { id: 'b', ts: tsEnMomento('2026-08-01', 'cena'), momento: 'cena', kcal: 1200, prot: 60, carb: 90, gras: 40, items: [] }
      ] },
      '2026-08-02': { nota: '', agua: 5, ejercicio: 0, peso: 91.5, comidas: [
        { id: 'c', ts: tsEnMomento('2026-08-02', 'almuerzo'), momento: 'almuerzo', kcal: 2400, prot: 90, carb: 200, gras: 80, items: [] }
      ] },
      '2026-08-03': { nota: '', agua: 0, ejercicio: 0, peso: null, comidas: [] }
    },
    frecuentes: [], recetas: [], cacheAnalisis: {}, historialAnalisis: [],
    uso: { llamadas: 0, costo: 0, tokens: 0 }, cfg: {}
  };
}

test('datosDelMes toma solo los días de ese mes', () => {
  const d = datosDelMes(stateDePrueba(), '2026-08');
  esperar(d.dias, 2, 'el 31 de julio no cuenta y el 3 no tiene comidas');
  esperar(d.filas.map(f => f.dia), [1, 2]);
});

test('datosDelMes calcula promedios y peso', () => {
  const d = datosDelMes(stateDePrueba(), '2026-08');
  esperar(d.promedio, 2000, '(1600 + 2400) / 2');
  esperar(d.promedioProt, 85);
  esperar(d.pesoInicial, 92);
  esperar(d.pesoFinal, 91.5);
  esperar(d.deltaPeso, -0.5);
});

test('datosDelMes marca la diferencia contra el objetivo', () => {
  const d = datosDelMes(stateDePrueba(), '2026-08');
  esperar(d.filas[0].diferencia, 1600 - d.objetivo);
  esperarQue(d.filas[1].diferencia > 0, 'el día de 2400 se pasó');
});

test('armarInforme arma el HTML con todas las secciones', () => {
  const html = armarInforme(stateDePrueba(), '2026-08');
  esperarQue(html.startsWith('<!DOCTYPE html>'), 'tiene que ser un documento entero');
  esperarQue(html.includes('agosto de 2026'), 'falta el nombre del mes');
  esperarQue(html.includes('Días registrados'), 'faltan las tarjetas');
  esperarQue(html.includes('Día por día'), 'falta la tabla');
  esperarQue(html.includes('Dónde se fueron las calorías'), 'falta el reparto');
  esperarQue(html.includes('@media print'), 'falta el estilo de impresión');
});

test('el informe trae una fila por día con datos', () => {
  const html = armarInforme(stateDePrueba(), '2026-08');
  const filas = html.split('<tr>').length - 2;   // menos la del encabezado
  esperar(filas, 2);
});

test('el informe muestra las notas del día', () => {
  esperarQue(armarInforme(stateDePrueba(), '2026-08').includes('Arranqué bien'));
});

test('el informe escapa el HTML de las notas', () => {
  const s = stateDePrueba();
  s.dias['2026-08-01'].nota = '<script>alert(1)</script>';
  const html = armarInforme(s, '2026-08');
  esperarQue(!html.includes('<script>alert(1)</script>'), 'no puede quedar el script crudo');
  esperarQue(html.includes('&lt;script&gt;'), 'tiene que quedar escapado');
});

test('armarInforme devuelve null si el mes está vacío', () => {
  esperar(armarInforme(stateDePrueba(), '2026-12'), null);
});

test('escaparHTML cubre los caracteres peligrosos', () => {
  esperar(escaparHTML('<b>"x" & y</b>'), '&lt;b&gt;&quot;x&quot; &amp; y&lt;/b&gt;');
  esperar(escaparHTML(null), '');
});

/* ============================================================
   Formato de números
   ============================================================ */

test('fmtNum usa separador de miles argentino', () => {
  esperar(fmtNum(1991), '1.991');
  esperar(fmtNum(15234), '15.234');
  esperar(fmtNum(999), '999');
});

test('fmtNum usa coma decimal', () => {
  esperar(fmtNum(0.5, 1), '0,5');
  esperar(fmtNum(92.35, 2), '92,35');
});

test('fmtNum redondea a los decimales pedidos', () => {
  esperar(fmtNum(2.567, 1), '2,6');
  esperar(fmtNum(2.4, 0), '2');
});

test('fmtNum con basura no rompe', () => {
  esperar(fmtNum(null), '0');
  esperar(fmtNum('no soy número'), '—');
  esperar(fmtNum(Infinity), '—');
});

test('fmtKcal arma el texto completo', () => {
  esperar(fmtKcal(1991), '1.991 kcal');
  esperar(fmtKcal(2450.6), '2.451 kcal');
});

test('fmtDelta pone el signo adelante', () => {
  esperar(fmtDelta(350), '+350');
  esperar(fmtDelta(-350), '-350');
  esperar(fmtDelta(0), '0');
  esperar(fmtDelta(-0.33, 2, 'kg'), '-0,33 kg');
});

test('fmtPeso siempre lleva un decimal', () => {
  esperar(fmtPeso(92), '92,0 kg');
  esperar(fmtPeso(91.25), '91,3 kg');
});

/* ============================================================
   Análisis de la serie
   ============================================================ */

/** Arma un objeto `dias` de prueba: n días con kcal fijas y peso opcional. */
function diasDePrueba({ desde, cantidad, kcal = 2000, pesoInicial = null, deltaDiario = 0, huecos = [] }) {
  const dias = {};
  for (let i = 0; i < cantidad; i++) {
    const f = sumarDias(desde, i);
    if (huecos.includes(i)) continue;
    dias[f] = {
      agua: 0, ejercicio: 0,
      peso: pesoInicial == null ? null : +(pesoInicial + deltaDiario * i).toFixed(2),
      comidas: [{ id: 'c' + i, ts: Date.parse(f), titulo: 'Día ' + i, items: [], kcal, prot: 0, carb: 0, gras: 0 }]
    };
  }
  return dias;
}

test('mediaMovil suaviza la serie', () => {
  const serie = [
    { f: '2026-08-01', kg: 90 }, { f: '2026-08-02', kg: 92 }, { f: '2026-08-03', kg: 88 }
  ];
  const m = mediaMovil(serie, 3);
  esperar(m[0].kg, 90);
  esperar(m[1].kg, 91);
  esperar(m[2].kg, 90);
});

test('mediaMovil marca cuántas muestras usó', () => {
  const serie = Array.from({ length: 10 }, (_, i) => ({ f: sumarDias('2026-08-01', i), kg: 90 }));
  const m = mediaMovil(serie, 7);
  esperar(m[0].muestras, 1, 'el primer punto solo se tiene a sí mismo');
  esperar(m[6].muestras, 7);
  esperar(m[9].muestras, 7, 'no puede pasarse de la ventana');
});

test('mediaMovil aplana el ruido diario', () => {
  // sube y baja 2 kg día por medio alrededor de 90
  const serie = Array.from({ length: 8 }, (_, i) => ({ f: sumarDias('2026-08-01', i), kg: i % 2 ? 92 : 88 }));
  const m = mediaMovil(serie, 7);
  cerca(m.at(-1).kg, 90, 0.6, 'la media tiene que quedar cerca del centro');
});

test('recortarSerie deja la serie corta como está', () => {
  const serie = Array.from({ length: 30 }, (_, i) => ({ f: sumarDias('2026-08-20', -29 + i), kg: 90 + i }));
  esperar(recortarSerie(serie, 120), serie);
});

test('recortarSerie submuestrea las series largas', () => {
  const serie = Array.from({ length: 400 }, (_, i) => ({ f: sumarDias('2026-08-20', -399 + i), kg: 90 + i * 0.01 }));
  const r = recortarSerie(serie, 120);
  esperar(r.length, 120);
  esperar(r[0].f, serie[0].f, 'el primero se conserva');
  esperar(r.at(-1).f, serie.at(-1).f, 'y el último también');
});

test('recortarSerie mantiene el orden', () => {
  const serie = Array.from({ length: 300 }, (_, i) => ({ f: sumarDias('2026-08-20', -299 + i), kg: 90 }));
  const r = recortarSerie(serie, 50);
  const ordenada = [...r].sort((a, b) => a.f.localeCompare(b.f));
  esperar(r.map(x => x.f), ordenada.map(x => x.f));
});

test('mediaMovil con serie vacía', () => {
  esperar(mediaMovil([], 7), []);
  esperar(mediaMovil(null, 7), []);
});

test('rachaDias cuenta los días seguidos', () => {
  const dias = diasDePrueba({ desde: sumarDias('2026-08-20', -4), cantidad: 5 });
  esperar(rachaDias(dias, '2026-08-20'), 5);
});

test('rachaDias corta en el primer hueco', () => {
  const dias = diasDePrueba({ desde: sumarDias('2026-08-20', -6), cantidad: 7, huecos: [3] });
  esperar(rachaDias(dias, '2026-08-20'), 3, 'solo cuentan los días desde el hueco para acá');
});

test('rachaDias no se corta porque hoy esté vacío todavía', () => {
  const dias = diasDePrueba({ desde: sumarDias('2026-08-20', -3), cantidad: 3 });  // ayer y antes
  esperar(rachaDias(dias, '2026-08-20'), 3);
});

test('rachaDias sin datos da cero', () => {
  esperar(rachaDias({}, '2026-08-20'), 0);
});

test('progresoPeso mide lo recorrido hacia la meta', () => {
  esperar(progresoPeso(92, 87, 82), 50);
  esperar(progresoPeso(92, 92, 82), 0);
  esperar(progresoPeso(92, 82, 82), 100);
});

test('progresoPeso no se pasa de los límites', () => {
  esperar(progresoPeso(92, 80, 82), 100, 'pasarse de la meta es 100%, no 120%');
  esperar(progresoPeso(92, 95, 82), 0, 'subir de peso no da negativo');
});

test('progresoPeso sin datos devuelve null', () => {
  esperar(progresoPeso(null, 87, 82), null);
  esperar(progresoPeso(92, 87, null), null);
});

test('balanceSemanal suma consumo contra gasto', () => {
  const dias = diasDePrueba({ desde: sumarDias('2026-08-20', -6), cantidad: 7, kcal: 2000 });
  const b = balanceSemanal(dias, 2500, '2026-08-20');
  esperar(b.dias, 7);
  esperar(b.consumido, 14000);
  esperar(b.gastado, 17500);
  esperar(b.balance, -3500, 'déficit de 3500 en la semana');
  cerca(b.kg, -0.45, 0.01);
  esperar(b.promedio, 2000);
});

test('balanceSemanal suma el ejercicio al gasto', () => {
  const dias = diasDePrueba({ desde: sumarDias('2026-08-20', -6), cantidad: 7, kcal: 2000 });
  Object.values(dias).forEach(d => { d.ejercicio = 300; });
  const b = balanceSemanal(dias, 2500, '2026-08-20');
  esperar(b.gastado, 7 * 2800);
});

test('balanceSemanal ignora los días sin cargar', () => {
  const dias = diasDePrueba({ desde: sumarDias('2026-08-20', -6), cantidad: 7, huecos: [0, 1] });
  const b = balanceSemanal(dias, 2500, '2026-08-20');
  esperar(b.dias, 5, 'solo los días con comidas');
});

test('tdeeAdaptativo estima el gasto real', () => {
  // 15 días comiendo 2000 y bajando 1 kg: gasto real = 2000 + 7700/14
  const dias = diasDePrueba({
    desde: sumarDias('2026-08-20', -14), cantidad: 15,
    kcal: 2000, pesoInicial: 92, deltaDiario: -1 / 14
  });
  const r = tdeeAdaptativo(dias);
  esperar(r.dias, 14);
  cerca(r.deltaPeso, 1, 0.01);
  cerca(r.tdee, 2000 + 7700 / 14, 2);
});

test('tdeeAdaptativo detecta que se gasta menos de lo previsto', () => {
  // come 2000 por día y no baja nada: su gasto real es 2000
  const dias = diasDePrueba({
    desde: sumarDias('2026-08-20', -14), cantidad: 15,
    kcal: 2000, pesoInicial: 90, deltaDiario: 0
  });
  esperar(tdeeAdaptativo(dias).tdee, 2000);
});

test('tdeeAdaptativo pide historial suficiente', () => {
  esperar(tdeeAdaptativo({}), null);
  const pocos = diasDePrueba({ desde: sumarDias('2026-08-20', -4), cantidad: 5, pesoInicial: 90, deltaDiario: -0.1 });
  esperar(tdeeAdaptativo(pocos), null, 'con 5 días no alcanza');
});

test('tdeeAdaptativo se niega si faltan muchos días', () => {
  const dias = diasDePrueba({
    desde: sumarDias('2026-08-20', -14), cantidad: 15,
    kcal: 2000, pesoInicial: 92, deltaDiario: -0.07,
    huecos: [1, 2, 3, 4, 5, 6, 7]      // más de la mitad sin cargar
  });
  esperar(tdeeAdaptativo(dias), null, 'sin cobertura el promedio no representa nada');
});

test('tdeeAdaptativo necesita al menos dos pesos', () => {
  const dias = diasDePrueba({ desde: sumarDias('2026-08-20', -14), cantidad: 15, kcal: 2000 });
  esperar(tdeeAdaptativo(dias), null);
});

/* ============================================================
   Lectura de los datos
   ============================================================ */

/** Días armados a medida para los tests de análisis. */
/* Hasta dónde llegan los días que arma el helper. Toda función que cuente hacia
   atrás desde "hoy" tiene que recibir esta fecha, o el test se rompe solo cuando
   el calendario avanza. */
const FIN_FIXTURE = '2026-08-20';

function diasArmados({ hasta = FIN_FIXTURE, cantidad = 14, kcal = 2000, prot = 100,
                       pesoInicial = null, deltaDiario = 0, momento = 'almuerzo', huecos = [] } = {}) {
  const dias = {};
  for (let i = 0; i < cantidad; i++) {
    if (huecos.includes(i)) continue;
    const f = sumarDias(hasta, -i);
    const valor = typeof kcal === 'function' ? kcal(i, f) : kcal;
    dias[f] = {
      nota: '', agua: 0, ejercicio: 0,
      peso: pesoInicial == null ? null : +(pesoInicial + deltaDiario * i).toFixed(2),
      comidas: [{
        id: 'c' + i, ts: tsEnMomento(f, momento), momento, titulo: 'Día', items: [],
        kcal: valor, prot, carb: 0, gras: 0
      }]
    };
  }
  return dias;
}

/* ---- proyección de peso ---- */

test('proyectarPeso usa la tendencia, no el último dato', () => {
  // baja 1 kg en 14 días -> medio kilo por semana
  const dias = diasArmados({ cantidad: 15, pesoInicial: 91, deltaDiario: 1 / 14 });
  const p = proyectarPeso(dias, 4);
  cerca(p.kgPorSemana, -0.5, 0.08);
  cerca(p.proyectado, p.actual - 2, 0.4, 'en 4 semanas baja cerca de 2 kg');
});

test('proyectarPeso avisa cuando el peso sube', () => {
  const dias = diasArmados({ cantidad: 15, pesoInicial: 90, deltaDiario: -1 / 14 });
  esperarQue(proyectarPeso(dias).kgPorSemana > 0, 'tiene que dar positivo si sube');
});

test('proyectarPeso pide serie suficiente', () => {
  esperar(proyectarPeso({}), null);
  esperar(proyectarPeso(diasArmados({ cantidad: 3, pesoInicial: 90, deltaDiario: 0.1 })), null);
});

test('proyectarPeso informa sobre cuántos días midió', () => {
  const dias = diasArmados({ cantidad: 15, pesoInicial: 91, deltaDiario: 1 / 14 });
  esperar(proyectarPeso(dias).diasDeDatos, 14);
});

/* ---- adherencia ---- */

test('adherencia cuenta los días dentro del objetivo', () => {
  const dias = diasArmados({ cantidad: 10, kcal: (i) => (i < 7 ? 1900 : 2400) });
  const a = adherencia(dias, 2000);
  esperar(a.dias, 10);
  esperar(a.dentro, 7);
  esperar(a.excedidos, 3);
  esperar(a.pct, 70);
});

test('adherencia marca aparte los días de comer muy poco', () => {
  const dias = diasArmados({ cantidad: 4, kcal: (i) => (i === 0 ? 900 : 1900) });
  const a = adherencia(dias, 2000);
  esperar(a.muyPorDebajo, 1, 'comer 900 con objetivo 2000 no es adherencia');
  esperar(a.dentro, 3);
});

test('adherencia suma el ejercicio al objetivo del día', () => {
  const dias = diasArmados({ cantidad: 3, kcal: 2300 });
  Object.values(dias).forEach(d => { d.ejercicio = 400; });
  esperar(adherencia(dias, 2000).dentro, 3, '2300 entra si quemaste 400');
});

test('adherencia sin datos o sin objetivo devuelve null', () => {
  esperar(adherencia({}, 2000), null);
  esperar(adherencia(diasArmados({ cantidad: 3 }), 0), null);
});

/* ---- reparto por momento ---- */

test('repartoPorMomento reparte el total en porcentajes', () => {
  const dias = {
    '2026-08-20': { nota: '', comidas: [
      { id: 'a', ts: tsEnMomento('2026-08-20', 'desayuno'), momento: 'desayuno', kcal: 300 },
      { id: 'b', ts: tsEnMomento('2026-08-20', 'almuerzo'), momento: 'almuerzo', kcal: 500 },
      { id: 'c', ts: tsEnMomento('2026-08-20', 'cena'), momento: 'cena', kcal: 1200 }
    ] }
  };
  const r = repartoPorMomento(dias);
  esperar(r.map(x => x.id), ['desayuno', 'almuerzo', 'cena'], 'en orden del día');
  esperar(r.find(x => x.id === 'cena').pct, 60);
  esperar(r.find(x => x.id === 'desayuno').pct, 15);
});

test('repartoPorMomento ignora los momentos sin comidas', () => {
  const dias = { '2026-08-20': { comidas: [{ id: 'a', ts: tsEnMomento('2026-08-20', 'cena'), momento: 'cena', kcal: 800 }] } };
  const r = repartoPorMomento(dias);
  esperar(r.length, 1);
  esperar(r[0].pct, 100);
});

test('repartoPorMomento sin datos devuelve vacío', () => {
  esperar(repartoPorMomento({}), []);
});

/* ---- patrón semanal ---- */

test('patronSemanal encuentra el día más flojo', () => {
  // 2026-08-20 es jueves; los sábados come 3000 y el resto 1800
  const dias = {};
  for (let i = 0; i < 28; i++) {
    const f = sumarDias('2026-08-20', -i);
    const [y, m, d] = f.split('-').map(Number);
    const esSabado = new Date(y, m - 1, d).getDay() === 6;
    dias[f] = { nota: '', comidas: [{ id: 'c' + i, ts: tsEnMomento(f, 'almuerzo'), momento: 'almuerzo', kcal: esSabado ? 3000 : 1800 }] };
  }
  const p = patronSemanal(dias, '2026-08-20');
  esperar(p.peor.nombre, 'Sábado');
  esperar(p.peor.promedio, 3000);
  esperar(p.mejor.promedio, 1800);
});

test('pluralDia respeta los días que ya terminan en s', () => {
  esperar(pluralDia('Lunes'), 'lunes');
  esperar(pluralDia('Viernes'), 'viernes');
  esperar(pluralDia('Sábado'), 'sábados');
  esperar(pluralDia('Domingo'), 'domingos');
});

test('patronSemanal necesita al menos dos días distintos', () => {
  const dias = { '2026-08-20': { comidas: [{ id: 'a', ts: Date.now(), kcal: 2000 }] } };
  esperar(patronSemanal(dias, '2026-08-20'), null);
});

/* ---- comparar semanas ---- */

test('compararSemanas mide el cambio de promedio', () => {
  const dias = diasArmados({ cantidad: 14, kcal: (i) => (i < 7 ? 1800 : 2200) });
  const c = compararSemanas(dias, '2026-08-20');
  esperar(c.actual.promedio, 1800);
  esperar(c.anterior.promedio, 2200);
  esperar(c.deltaPromedio, -400, 'esta semana comió 400 menos por día');
});

test('compararSemanas también compara el peso', () => {
  const dias = diasArmados({ cantidad: 14, pesoInicial: 90, deltaDiario: 0.1 });
  const c = compararSemanas(dias, '2026-08-20');
  esperarQue(c.deltaPeso < 0, 'el peso promedio bajó');
});

test('compararSemanas cuenta los días cargados de cada una', () => {
  const dias = diasArmados({ cantidad: 14, huecos: [0, 1, 2] });
  const c = compararSemanas(dias, '2026-08-20');
  esperar(c.actual.dias, 4);
  esperar(c.anterior.dias, 7);
  esperar(c.deltaDias, -3);
});

test('compararSemanas sin una de las dos semanas devuelve null', () => {
  esperar(compararSemanas(diasArmados({ cantidad: 5 }), '2026-08-20'), null);
  esperar(compararSemanas({}, '2026-08-20'), null);
});

/* ---- alerta de proteína ---- */

test('alertaProteina salta con tres días cortos seguidos', () => {
  const dias = diasArmados({ cantidad: 5, prot: 60 });
  // la fecha va explícita: el fixture termina el 2026-08-20, no en el hoy real
  const a = alertaProteina(dias, 150, FIN_FIXTURE);
  esperar(a.dias, 3);
  esperar(a.promedio, 60);
  esperar(a.falta, 90);
  esperar(a.pct, 40);
});

test('alertaProteina no salta si llega al 80%', () => {
  esperar(alertaProteina(diasArmados({ cantidad: 5, prot: 130 }), 150, FIN_FIXTURE), null);
});

test('alertaProteina no salta con un solo día flojo', () => {
  const dias = diasArmados({ cantidad: 5, prot: 150 });
  const hoy = '2026-08-20';
  dias[hoy].comidas[0].prot = 30;
  esperar(alertaProteina(dias, 150, hoy), null, 'un día no hace patrón');
});

test('alertaProteina pide tres días cargados', () => {
  esperar(alertaProteina(diasArmados({ cantidad: 2, prot: 20 }), 150, FIN_FIXTURE), null);
  esperar(alertaProteina({}, 150, FIN_FIXTURE), null);
  esperar(alertaProteina(diasArmados({ cantidad: 5, prot: 20 }), 0, FIN_FIXTURE), null);
});

/* ============================================================
   Porciones
   ============================================================ */

const ITEM = { nombre: 'Milanesa', porcion: '150 g', calorias: 400, proteinas: 30, carbohidratos: 20, grasas: 22 };

test('escalarItem multiplica los cuatro valores', () => {
  const r = escalarItem(ITEM, 2);
  esperar(r.calorias, 800);
  esperar(r.proteinas, 60);
  esperar(r.carbohidratos, 40);
  esperar(r.grasas, 44);
});

test('escalarItem con media porción redondea', () => {
  const r = escalarItem({ ...ITEM, calorias: 401, proteinas: 31 }, 0.5);
  esperar(r.calorias, 201);   // 200.5 -> 201
  esperar(r.proteinas, 16);   // 15.5 -> 16
});

test('escalarItem con factor 1 no cambia nada', () => {
  const r = escalarItem(ITEM, 1);
  esperar(r.calorias, ITEM.calorias);
  esperar(r.porcion, ITEM.porcion);
});

test('escalarItem no muta el item base', () => {
  const base = { ...ITEM };
  escalarItem(base, 2);
  esperar(base.calorias, 400);
});

test('escalarItem conserva el nombre', () => {
  esperar(escalarItem(ITEM, 1.5).nombre, 'Milanesa');
});

test('escalarPorcion multiplica la cantidad del texto', () => {
  esperar(escalarPorcion('150 g', 2), '300 g');
  esperar(escalarPorcion('1 taza', 2), '2 taza');
  esperar(escalarPorcion('200 g', 0.5), '100 g');
});

test('escalarPorcion usa coma decimal', () => {
  esperar(escalarPorcion('1 unidad', 1.5), '1,5 unidad');
});

test('escalarPorcion sin número anota el factor', () => {
  esperar(escalarPorcion('un plato', 2), 'un plato (×2)');
});

test('escalarPorcion sin porción cargada', () => {
  esperar(escalarPorcion('', 1), '');
  esperar(escalarPorcion('', 2), '×2');
});

test('escalar dos veces seguidas parte siempre de la base', () => {
  // este es el bug clásico: ×2 y después ×2 no puede dar ×4
  const a = escalarItem(ITEM, 2);
  const b = escalarItem(ITEM, 2);
  esperar(a.calorias, b.calorias);
  esperar(escalarItem(ITEM, 0.5).calorias, 200, 'volver a ×0,5 parte del original');
});

/* ============================================================
   Agua y ejercicio
   ============================================================ */

test('objetivoAgua sale de 35 ml por kg', () => {
  esperar(objetivoAgua(92), Math.round((92 * 35) / 250));  // 13
  esperar(objetivoAgua(70), 10);
});

test('objetivoAgua tiene un piso de 6 vasos', () => {
  esperar(objetivoAgua(30), 6);
});

test('objetivoAgua sin peso cargado usa el default de 8', () => {
  esperar(objetivoAgua(null), 8);
  esperar(objetivoAgua(0), 8);
});

test('objetivoEfectivo suma lo quemado al objetivo', () => {
  esperar(objetivoEfectivo(1991, 400), 2391);
});

test('objetivoEfectivo tolera valores vacíos', () => {
  esperar(objetivoEfectivo(1991, null), 1991);
  esperar(objetivoEfectivo(1991, undefined), 1991);
  esperar(objetivoEfectivo(null, 300), 300);
});

test('migrar arranca agua y ejercicio en cero', () => {
  const s = migrar({ dias: { '2026-08-19': { comidas: [] } } });
  esperar(s.dias['2026-08-19'].agua, 0);
  esperar(s.dias['2026-08-19'].ejercicio, 0);
});

test('migrar conserva agua y ejercicio ya cargados', () => {
  const s = migrar({ dias: { '2026-08-19': { agua: 5, ejercicio: 320, comidas: [] } } });
  esperar(s.dias['2026-08-19'].agua, 5);
  esperar(s.dias['2026-08-19'].ejercicio, 320);
});

/* ============================================================
   Registro de análisis
   ============================================================ */

test('registrarAnalisis pone lo último arriba', () => {
  let h = registrarAnalisis([], { ts: 1000, titulo: 'Primera', costo: 0.01, tokens: 100 });
  h = registrarAnalisis(h, { ts: 2000, titulo: 'Segunda', costo: 0.02, tokens: 200 });
  esperar(h[0].titulo, 'Segunda');
  esperar(h.length, 2);
});

test('registrarAnalisis completa lo que falta', () => {
  const [a] = registrarAnalisis([], { ts: 1000 });
  esperar(a.tipo, 'foto');
  esperar(a.costo, 0);
  esperar(a.precision, 'normal');
  esperar(a.deCache, false);
});

test('registrarAnalisis respeta el tope', () => {
  let h = [];
  for (let i = 0; i < MAX_HISTORIAL_ANALISIS + 10; i++) h = registrarAnalisis(h, { ts: 1000 + i, titulo: 't' + i });
  esperar(h.length, MAX_HISTORIAL_ANALISIS);
  esperar(h[0].titulo, 't' + (MAX_HISTORIAL_ANALISIS + 9), 'queda el más nuevo');
});

test('resumenAnalisis separa lo pagado de lo que salió del cache', () => {
  let h = [];
  h = registrarAnalisis(h, { ts: 1, costo: 0.02, tokens: 2000 });
  h = registrarAnalisis(h, { ts: 2, costo: 0.03, tokens: 3000 });
  h = registrarAnalisis(h, { ts: 3, costo: 0, tokens: 0, deCache: true });

  const r = resumenAnalisis(h);
  esperar(r.total, 3);
  esperar(r.pagados, 2);
  esperar(r.ahorrados, 1);
  cerca(r.costo, 0.05, 0.00001);
  esperar(r.tokens, 5000);
});

test('resumenAnalisis con historial vacío', () => {
  esperar(resumenAnalisis([]), { total: 0, pagados: 0, ahorrados: 0, costo: 0, tokens: 0 });
  esperar(resumenAnalisis(null).total, 0);
});

test('migrar conserva el registro y descarta filas rotas', () => {
  const s = migrar({ historialAnalisis: [{ ts: 1000, titulo: 'Buena' }, { titulo: 'Sin fecha' }, null] });
  esperar(s.historialAnalisis.length, 1);
  esperar(s.historialAnalisis[0].titulo, 'Buena');
});

/* ============================================================
   Búsqueda en el historial
   ============================================================ */

const DIAS_BUSQUEDA = {
  '2026-08-18': {
    nota: 'Día tranquilo', agua: 0, ejercicio: 0, peso: null,
    comidas: [
      { id: '1', ts: new Date(2026, 7, 18, 21, 0).getTime(), momento: 'cena', titulo: 'Pizza con amigos', kcal: 900, prot: 40, carb: 100, gras: 35,
        items: [{ nombre: 'Pizza muzzarella', calorias: 850 }, { nombre: 'Cerveza', calorias: 150 }] }
    ]
  },
  '2026-08-19': {
    nota: 'Me acordé de la pizza de ayer', agua: 0, ejercicio: 0, peso: null,
    comidas: [
      { id: '2', ts: new Date(2026, 7, 19, 13, 0).getTime(), momento: 'almuerzo', titulo: 'Ensalada', kcal: 300, prot: 10, carb: 20, gras: 15,
        items: [{ nombre: 'Lechuga', calorias: 20 }, { nombre: 'Pollo', calorias: 200 }] }
    ]
  },
  '2026-08-20': {
    nota: '', agua: 0, ejercicio: 0, peso: null,
    comidas: [
      { id: '3', ts: new Date(2026, 7, 20, 21, 0).getTime(), momento: 'cena', titulo: 'Pizza casera', kcal: 700, prot: 35, carb: 80, gras: 25,
        items: [{ nombre: 'Pizza integral', calorias: 700 }] }
    ]
  }
};

test('buscarEnHistorial encuentra por título', () => {
  const r = buscarEnHistorial(DIAS_BUSQUEDA, 'pizza');
  esperar(r.length, 3, 'dos títulos con pizza y una nota que la menciona');
  esperar(r[0].fecha, '2026-08-20', 'primero lo más reciente');
});

test('buscarEnHistorial encuentra por alimento', () => {
  const r = buscarEnHistorial(DIAS_BUSQUEDA, 'pollo');
  esperar(r.length, 1);
  esperar(r[0].donde, 'alimento');
  esperar(r[0].alimentos, ['Pollo']);
});

test('buscarEnHistorial encuentra por nota del día', () => {
  const r = buscarEnHistorial(DIAS_BUSQUEDA, 'tranquilo');
  esperar(r.length, 1);
  esperar(r[0].donde, 'nota');
});

test('buscarEnHistorial ignora acentos y mayúsculas', () => {
  esperar(buscarEnHistorial(DIAS_BUSQUEDA, 'PIZZA').length, 3);
  esperar(buscarEnHistorial(DIAS_BUSQUEDA, 'ensalada').length, 1);
});

test('buscarEnHistorial pide al menos dos letras', () => {
  esperar(buscarEnHistorial(DIAS_BUSQUEDA, 'p'), []);
  esperar(buscarEnHistorial(DIAS_BUSQUEDA, ''), []);
  esperar(buscarEnHistorial(DIAS_BUSQUEDA, '  '), []);
});

test('buscarEnHistorial sin coincidencias devuelve vacío', () => {
  esperar(buscarEnHistorial(DIAS_BUSQUEDA, 'sushi'), []);
});

test('buscarEnHistorial respeta el límite', () => {
  const dias = {};
  for (let i = 0; i < 60; i++) {
    dias[sumarDias('2026-08-20', -i)] = { nota: '', comidas: [{ id: 'x' + i, ts: Date.now(), titulo: 'Pizza', kcal: 100, items: [] }] };
  }
  esperar(buscarEnHistorial(dias, 'pizza', 10).length, 10);
});

test('resumenBusqueda suma veces, días y calorías', () => {
  const r = buscarEnHistorial(DIAS_BUSQUEDA, 'pizza');
  const res = resumenBusqueda(r);
  esperar(res.veces, 3);
  esperar(res.dias, 3);
  esperar(res.kcal, 900 + 300 + 700);
  esperar(res.promedio, Math.round(1900 / 3));
});

test('resumenBusqueda con lista vacía no divide por cero', () => {
  esperar(resumenBusqueda([]), { veces: 0, dias: 0, kcal: 0, promedio: 0 });
});

/* ============================================================
   Copiar días
   ============================================================ */

const COMIDAS_DIA = [
  { id: 'a', ts: new Date(2026, 7, 18, 8, 30).getTime(), momento: 'desayuno', titulo: 'Café', items: [], kcal: 200, prot: 5, carb: 20, gras: 8 },
  { id: 'b', ts: new Date(2026, 7, 18, 13, 0).getTime(), momento: 'almuerzo', titulo: 'Guiso', items: [], kcal: 700, prot: 35, carb: 80, gras: 22 }
];

test('comidasCopiadas mantiene el contenido', () => {
  const copias = comidasCopiadas(COMIDAS_DIA, '2026-08-20', new Date(2026, 7, 20, 22, 0).getTime());
  esperar(copias.length, 2);
  esperar(copias[0].titulo, 'Café');
  esperar(copias[1].kcal, 700);
  esperar(sumarComidas(copias).kcal, sumarComidas(COMIDAS_DIA).kcal);
});

test('comidasCopiadas les da ids nuevos', () => {
  const copias = comidasCopiadas(COMIDAS_DIA, '2026-08-20');
  esperarQue(copias[0].id !== 'a' && copias[1].id !== 'b', 'los ids no se pueden repetir');
  esperarQue(copias[0].id !== copias[1].id, 'ni entre ellas');
});

test('comidasCopiadas mueve la fecha pero respeta el momento', () => {
  const copias = comidasCopiadas(COMIDAS_DIA, '2026-08-20', new Date(2026, 7, 20, 22, 0).getTime());
  const d0 = new Date(copias[0].ts), d1 = new Date(copias[1].ts);
  esperar(hoyISO(d0), '2026-08-20');
  esperar(hoyISO(d1), '2026-08-20');
  esperar(d0.getHours(), 8, 'el desayuno sigue siendo a la mañana');
  esperar(d1.getHours(), 13, 'y el almuerzo al mediodía');
  esperar(copias[0].momento, 'desayuno');
});

test('comidasCopiadas no toca el original', () => {
  const original = clonar(COMIDAS_DIA);
  const copias = comidasCopiadas(COMIDAS_DIA, '2026-08-20');
  copias[0].kcal = 9999;
  esperar(COMIDAS_DIA, original);
});

test('comidasCopiadas con lista vacía', () => {
  esperar(comidasCopiadas([], '2026-08-20'), []);
  esperar(comidasCopiadas(null, '2026-08-20'), []);
});

test('diasConComidas lista del más nuevo al más viejo', () => {
  const dias = {
    '2026-08-18': { comidas: [{ kcal: 500 }] },
    '2026-08-20': { comidas: [{ kcal: 800 }, { kcal: 200 }] },
    '2026-08-19': { comidas: [] }
  };
  const lista = diasConComidas(dias);
  esperar(lista.map(d => d.fecha), ['2026-08-20', '2026-08-18'], 'el día vacío no aparece');
  esperar(lista[0].kcal, 1000);
  esperar(lista[0].comidas, 2);
});

test('diasConComidas excluye el día pedido', () => {
  const dias = {
    '2026-08-19': { comidas: [{ kcal: 100 }] },
    '2026-08-20': { comidas: [{ kcal: 200 }] }
  };
  esperar(diasConComidas(dias, '2026-08-20').map(d => d.fecha), ['2026-08-19']);
});

test('diasConComidas respeta el límite', () => {
  const dias = {};
  for (let i = 0; i < 40; i++) dias[sumarDias('2026-08-20', -i)] = { comidas: [{ kcal: 100 }] };
  esperar(diasConComidas(dias, null, 10).length, 10);
});

/* ============================================================
   Recetas
   ============================================================ */

const ITEMS_RECETA = [
  { nombre: 'Avena', porcion: '60 g', calorias: 230, proteinas: 8, carbohidratos: 40, grasas: 4 },
  { nombre: 'Banana', porcion: '1 unidad', calorias: 105, proteinas: 1, carbohidratos: 27, grasas: 0 },
  { nombre: 'Leche', porcion: '200 ml', calorias: 90, proteinas: 7, carbohidratos: 10, grasas: 3 }
];

test('guardarReceta calcula el total de la plantilla', () => {
  const [r] = guardarReceta([], 'Desayuno de siempre', ITEMS_RECETA, 1000);
  esperar(r.nombre, 'Desayuno de siempre');
  esperar(r.items.length, 3);
  esperar(r.kcal, 425);
  esperar(r.prot, 16);
  esperar(r.carb, 77);
  esperar(r.gras, 7);
  esperar(r.usos, 0);
});

test('guardarReceta exige nombre y alimentos', () => {
  let e1 = '', e2 = '';
  try { guardarReceta([], '   ', ITEMS_RECETA); } catch (e) { e1 = e.message; }
  try { guardarReceta([], 'Vacía', []); } catch (e) { e2 = e.message; }
  esperarQue(/nombre/.test(e1), 'dio: ' + e1);
  esperarQue(/alimento/.test(e2), 'dio: ' + e2);
});

test('guardarReceta descarta los alimentos sin nombre', () => {
  const [r] = guardarReceta([], 'Mix', [...ITEMS_RECETA, { nombre: '  ', calorias: 500 }], 1000);
  esperar(r.items.length, 3);
  esperar(r.kcal, 425, 'el item basura no suma');
});

test('guardarReceta reemplaza en vez de duplicar el mismo nombre', () => {
  let recetas = guardarReceta([], 'Desayuno', ITEMS_RECETA, 1000);
  recetas = guardarReceta(recetas, 'DESAYUNO', [ITEMS_RECETA[0]], 2000);
  esperar(recetas.length, 1, 'no debería duplicar por mayúsculas');
  esperar(recetas[0].items.length, 1, 'queda la versión nueva');
});

test('reemplazar una receta conserva sus usos', () => {
  let recetas = guardarReceta([], 'Desayuno', ITEMS_RECETA, 1000);
  recetas = aplicarReceta(recetas, recetas[0].id).recetas;
  recetas = aplicarReceta(recetas, recetas[0].id).recetas;
  recetas = guardarReceta(recetas, 'Desayuno', [ITEMS_RECETA[0]], 3000);
  esperar(recetas[0].usos, 2, 'la historia de uso no se pierde al editarla');
});

test('guardarReceta no guarda el andamiaje del editor', () => {
  const [r] = guardarReceta([], 'Con factor', [{ ...ITEMS_RECETA[0], factor: 2, base: { calorias: 115 } }], 1000);
  esperarQue(!('factor' in r.items[0]) && !('base' in r.items[0]), 'no van los campos internos');
});

test('aplicarReceta devuelve copias, no referencias', () => {
  const recetas = guardarReceta([], 'Desayuno', ITEMS_RECETA, 1000);
  const aplicada = aplicarReceta(recetas, recetas[0].id);
  aplicada.items[0].calorias = 9999;
  esperar(recetas[0].items[0].calorias, 230, 'editar lo aplicado no toca la receta');
});

test('aplicarReceta suma un uso', () => {
  const recetas = guardarReceta([], 'Desayuno', ITEMS_RECETA, 1000);
  const aplicada = aplicarReceta(recetas, recetas[0].id);
  esperar(aplicada.recetas[0].usos, 1);
  esperar(aplicada.titulo, 'Desayuno');
});

test('aplicarReceta con un id inexistente devuelve null', () => {
  esperar(aplicarReceta([], 'no-existe'), null);
});

test('borrarReceta saca solo la pedida', () => {
  let recetas = guardarReceta([], 'A', ITEMS_RECETA, 1000);
  recetas = guardarReceta(recetas, 'B', ITEMS_RECETA, 2000);
  const restantes = borrarReceta(recetas, recetas[0].id);
  esperar(restantes.length, 1);
  esperarQue(restantes[0].nombre !== recetas[0].nombre);
});

test('recetasOrdenadas pone primero las más usadas', () => {
  let recetas = guardarReceta([], 'Poco usada', ITEMS_RECETA, 1000);
  recetas = guardarReceta(recetas, 'Muy usada', ITEMS_RECETA, 2000);
  const id = recetas.find(r => r.nombre === 'Muy usada').id;
  recetas = aplicarReceta(recetas, id).recetas;
  recetas = aplicarReceta(recetas, id).recetas;
  esperar(recetasOrdenadas(recetas)[0].nombre, 'Muy usada');
});

test('las recetas tienen tope', () => {
  let recetas = [];
  for (let i = 0; i < MAX_RECETAS + 10; i++) recetas = guardarReceta(recetas, 'receta ' + i, ITEMS_RECETA, 1000 + i);
  esperar(recetas.length, MAX_RECETAS);
});

test('migrar conserva las recetas y descarta las rotas', () => {
  const s = migrar({ recetas: [
    { id: 'r1', nombre: 'Buena', items: [{ nombre: 'Pan', calorias: 100 }], kcal: 100, usos: 3 },
    { nombre: 'Sin items' },
    null
  ] });
  esperar(s.recetas.length, 1);
  esperar(s.recetas[0].usos, 3);
});

/* ============================================================
   Favoritos
   ============================================================ */

function frecuentesDePrueba() {
  return registrarFrecuentes([], [
    { nombre: 'Café con leche', porcion: '1 taza', calorias: 80, proteinas: 4, carbohidratos: 8, grasas: 3 },
    { nombre: 'Milanesa', porcion: '180 g', calorias: 430, proteinas: 32, carbohidratos: 22, grasas: 23 },
    { nombre: 'Manzana', porcion: '1 unidad', calorias: 90, proteinas: 0, carbohidratos: 24, grasas: 0 }
  ], 1000);
}

test('los alimentos nuevos no nacen favoritos', () => {
  esperar(favoritos(frecuentesDePrueba()).length, 0);
});

test('alternarFavorito marca y desmarca', () => {
  let f = frecuentesDePrueba();
  f = alternarFavorito(f, 'Milanesa');
  esperarQue(esFavorito(f, 'Milanesa'), 'debería quedar marcado');
  f = alternarFavorito(f, 'Milanesa');
  esperarQue(!esFavorito(f, 'Milanesa'), 'debería quedar desmarcado');
});

test('alternarFavorito ignora acentos y mayúsculas', () => {
  const f = alternarFavorito(frecuentesDePrueba(), 'CAFÉ CON LECHE');
  esperarQue(esFavorito(f, 'cafe con leche'), 'tiene que encontrarlo igual');
});

test('alternarFavorito no muta el array original', () => {
  const original = frecuentesDePrueba();
  const copia = clonar(original);
  alternarFavorito(original, 'Milanesa');
  esperar(original, copia);
});

test('alternarFavorito con un nombre que no existe no rompe', () => {
  const f = alternarFavorito(frecuentesDePrueba(), 'Sushi');
  esperar(f.length, 3);
  esperar(favoritos(f).length, 0);
});

test('favoritos devuelve solo los marcados, por uso', () => {
  let f = frecuentesDePrueba();
  f = alternarFavorito(f, 'Milanesa');
  f = alternarFavorito(f, 'Manzana');
  // la manzana se usa dos veces más
  f = registrarFrecuentes(f, [{ nombre: 'Manzana', calorias: 90 }], 2000);
  f = registrarFrecuentes(f, [{ nombre: 'Manzana', calorias: 90 }], 3000);

  const lista = favoritos(f);
  esperar(lista.length, 2);
  esperar(lista[0].nombre, 'Manzana', 'el más usado va primero');
});

test('registrarFrecuentes no pisa el favorito al actualizar el alimento', () => {
  let f = alternarFavorito(frecuentesDePrueba(), 'Milanesa');
  f = registrarFrecuentes(f, [{ nombre: 'Milanesa', calorias: 500 }], 4000);
  esperarQue(esFavorito(f, 'Milanesa'), 'usarlo de nuevo no lo desmarca');
  esperar(f.find(x => x.nombre === 'Milanesa').calorias, 500, 'y sí actualiza el valor');
});

test('favoritos respeta el límite', () => {
  let f = registrarFrecuentes([], Array.from({ length: 20 }, (_, i) => ({ nombre: 'a' + i, calorias: 10 })), 1000);
  for (let i = 0; i < 20; i++) f = alternarFavorito(f, 'a' + i);
  esperar(favoritos(f, 5).length, 5);
});

test('migrar conserva el flag de favorito', () => {
  const s = migrar({ frecuentes: [{ nombre: 'Pan', calorias: 200, favorito: true }, { nombre: 'Queso', calorias: 100 }] });
  esperarQue(esFavorito(s.frecuentes, 'Pan'), 'el favorito tiene que sobrevivir');
  esperarQue(!esFavorito(s.frecuentes, 'Queso'));
});

/* ============================================================
   Cambio de día
   ============================================================ */

test('msHastaMedianoche cuenta lo que falta', () => {
  const casiMedianoche = new Date(2026, 7, 20, 23, 59, 0);
  esperar(msHastaMedianoche(casiMedianoche, 0), 60000, 'falta un minuto');

  const mediodia = new Date(2026, 7, 20, 12, 0, 0);
  esperar(msHastaMedianoche(mediodia, 0), 12 * 3600000);
});

test('msHastaMedianoche agrega el margen', () => {
  const casi = new Date(2026, 7, 20, 23, 59, 59);
  esperar(msHastaMedianoche(casi, 2000), 1000 + 2000, 'cae después de las 00:00, no justo');
});

test('msHastaMedianoche cruza fin de mes sin romperse', () => {
  const finDeMes = new Date(2026, 7, 31, 22, 0, 0);
  esperar(msHastaMedianoche(finDeMes, 0), 2 * 3600000);
});

test('msHastaMedianoche siempre es positivo', () => {
  for (const h of [0, 1, 12, 23]) {
    esperarQue(msHastaMedianoche(new Date(2026, 7, 20, h, 30)) > 0, 'a las ' + h);
  }
});

/* ============================================================
   Recordatorios
   ============================================================ */

const HORARIOS = [
  { momento: 'desayuno', hora: '09:00' },
  { momento: 'almuerzo', hora: '13:30' },
  { momento: 'cena', hora: '21:30' }
];

test('minutosDeHora convierte y rechaza lo inválido', () => {
  esperar(minutosDeHora('09:00'), 540);
  esperar(minutosDeHora('13:30'), 810);
  esperar(minutosDeHora('00:00'), 0);
  esperar(minutosDeHora('25:00'), null);
  esperar(minutosDeHora('12:99'), null);
  esperar(minutosDeHora('nada'), null);
  esperar(minutosDeHora(''), null);
});

test('proximosRecordatorios devuelve solo los que faltan hoy', () => {
  const alMediodia = new Date(2026, 7, 20, 12, 0);
  const r = proximosRecordatorios(HORARIOS, alMediodia);
  esperar(r.map(x => x.momento), ['almuerzo', 'cena'], 'el desayuno ya pasó');
});

test('proximosRecordatorios calcula cuánto falta', () => {
  const alMediodia = new Date(2026, 7, 20, 12, 0);
  const r = proximosRecordatorios(HORARIOS, alMediodia);
  esperar(r[0].enMs, 90 * 60000, 'del mediodía a las 13:30 hay 90 minutos');
});

test('proximosRecordatorios saltea los momentos ya cargados', () => {
  const alMediodia = new Date(2026, 7, 20, 12, 0);
  const r = proximosRecordatorios(HORARIOS, alMediodia, ['almuerzo']);
  esperar(r.map(x => x.momento), ['cena']);
});

test('proximosRecordatorios de noche no devuelve nada', () => {
  esperar(proximosRecordatorios(HORARIOS, new Date(2026, 7, 20, 23, 0)), []);
});

test('proximosRecordatorios ordena por hora', () => {
  const desordenados = [
    { momento: 'cena', hora: '21:30' },
    { momento: 'desayuno', hora: '09:00' },
    { momento: 'almuerzo', hora: '13:30' }
  ];
  const r = proximosRecordatorios(desordenados, new Date(2026, 7, 20, 7, 0));
  esperar(r.map(x => x.momento), ['desayuno', 'almuerzo', 'cena']);
});

test('proximosRecordatorios ignora horarios rotos', () => {
  const conBasura = [...HORARIOS, { momento: 'snack', hora: '99:99' }];
  esperar(proximosRecordatorios(conBasura, new Date(2026, 7, 20, 7, 0)).length, 3);
  esperar(proximosRecordatorios(null, new Date()), []);
});

test('conArticulo usa el género correcto', () => {
  esperar(conArticulo('almuerzo'), 'el almuerzo');
  esperar(conArticulo('cena'), 'la cena');
  esperar(conArticulo('merienda'), 'la merienda');
  esperar(conArticulo('inventado'), 'la comida');
});

test('textoRecordatorio menciona la comida y lo que queda', () => {
  const conMargen = textoRecordatorio('almuerzo', 850);
  esperarQue(conMargen.includes('el almuerzo'), 'dio: ' + conMargen);
  esperarQue(conMargen.includes('850'), 'dio: ' + conMargen);

  const sinMargen = textoRecordatorio('cena', 0);
  esperarQue(sinMargen.includes('la cena') && !sinMargen.includes('kcal'), 'dio: ' + sinMargen);
  esperarQue(!textoRecordatorio('desayuno').includes('null'), 'sin margen no imprime null');
});

test('migrar deja los horarios por defecto si no hay', () => {
  const s = migrar({});
  esperar(s.cfg.horarios.length, 3);
  esperar(s.cfg.recordatorios, false, 'nunca arrancan activados');
});

test('migrar respeta los horarios que ya configuró', () => {
  const s = migrar({ cfg: { horarios: [{ momento: 'cena', hora: '20:00' }] } });
  esperar(s.cfg.horarios.length, 1);
  esperar(s.cfg.horarios[0].hora, '20:00');
});

/* ============================================================
   Momentos del día
   ============================================================ */

test('momentoPorHora cubre los cinco rangos', () => {
  esperar(momentoPorHora(8), 'desayuno');
  esperar(momentoPorHora(13), 'almuerzo');
  esperar(momentoPorHora(17), 'merienda');
  esperar(momentoPorHora(21), 'cena');
  esperar(momentoPorHora(2), 'snack');
});

test('momentoPorHora respeta los bordes', () => {
  esperar(momentoPorHora(4, 59), 'snack');
  esperar(momentoPorHora(5, 0), 'desayuno');
  esperar(momentoPorHora(10, 59), 'desayuno');
  esperar(momentoPorHora(11, 0), 'almuerzo');
  esperar(momentoPorHora(15, 29), 'almuerzo');
  esperar(momentoPorHora(15, 30), 'merienda');
  esperar(momentoPorHora(19, 29), 'merienda');
  esperar(momentoPorHora(19, 30), 'cena');
  esperar(momentoPorHora(23, 59), 'cena');
});

test('momentoDe saca el momento de un timestamp', () => {
  esperar(momentoDe(new Date(2026, 7, 19, 13, 0).getTime()), 'almuerzo');
  esperar(momentoDe(new Date(2026, 7, 19, 21, 45).getTime()), 'cena');
});

test('nombreMomento traduce el id', () => {
  esperar(nombreMomento('cena'), 'Cena');
  esperar(nombreMomento('inventado'), 'Otro');
});

test('agruparPorMomento arma los grupos en orden del día', () => {
  const comidas = [
    { id: 'c', ts: new Date(2026, 7, 19, 21, 0).getTime(), momento: 'cena', kcal: 700 },
    { id: 'd', ts: new Date(2026, 7, 19, 8, 0).getTime(), momento: 'desayuno', kcal: 300 },
    { id: 'a', ts: new Date(2026, 7, 19, 13, 0).getTime(), momento: 'almuerzo', kcal: 600 }
  ];
  const g = agruparPorMomento(comidas);
  esperar(g.map(x => x.id), ['desayuno', 'almuerzo', 'cena']);
  esperar(g[0].kcal, 300);
});

test('agruparPorMomento suma varias comidas del mismo momento', () => {
  const ts = new Date(2026, 7, 19, 13, 0).getTime();
  const g = agruparPorMomento([
    { id: '1', ts, momento: 'almuerzo', kcal: 500 },
    { id: '2', ts: ts + 600000, momento: 'almuerzo', kcal: 250 }
  ]);
  esperar(g.length, 1);
  esperar(g[0].kcal, 750);
  esperar(g[0].comidas.length, 2);
});

test('agruparPorMomento deduce el momento si la comida no lo tiene', () => {
  const g = agruparPorMomento([{ id: '1', ts: new Date(2026, 7, 19, 8, 30).getTime(), kcal: 300 }]);
  esperar(g[0].id, 'desayuno');
});

test('agruparPorMomento con lista vacía no rompe', () => {
  esperar(agruparPorMomento([]), []);
  esperar(agruparPorMomento(null), []);
});

test('horaDeMomento da una hora representativa', () => {
  esperar(horaDeMomento('desayuno'), 8);
  esperar(horaDeMomento('cena'), 21);
  esperar(horaDeMomento('lo que sea'), 12);
});

test('tsParaFecha usa la hora real si es hoy', () => {
  const ahora = new Date(2026, 7, 20, 16, 42);
  esperar(tsParaFecha('2026-08-20', 'merienda', ahora), ahora.getTime());
});

test('tsParaFecha fecha una comida de un día pasado en su momento', () => {
  const ahora = new Date(2026, 7, 20, 23, 0);        // la cargo de noche...
  const ts = tsParaFecha('2026-08-18', 'almuerzo', ahora);   // ...pero era el almuerzo del 18
  const d = new Date(ts);
  esperar(d.getDate(), 18);
  esperar(d.getHours(), 13, 'tiene que quedar a la hora del almuerzo, no a las 23');
});

test('una comida cargada a destiempo queda en el grupo correcto', () => {
  const ts = tsParaFecha('2026-08-18', 'desayuno', new Date(2026, 7, 20, 23, 0));
  esperar(momentoDe(ts), 'desayuno');
});

test('migrar le pone momento a las comidas viejas', () => {
  const ts = new Date(2026, 7, 19, 13, 15).getTime();
  const s = migrar({ dias: { '2026-08-19': { comidas: [{ id: 'x', ts, kcal: 500 }] } } });
  esperar(s.dias['2026-08-19'].comidas[0].momento, 'almuerzo');
});

/* ============================================================
   Alimentos frecuentes
   ============================================================ */

test('normalizar saca acentos, mayúsculas y espacios de más', () => {
  esperar(normalizar('  Milanesa  de  CARNE '), 'milanesa de carne');
  esperar(normalizar('Puré'), 'pure');
  esperar(normalizar('ÑOQUIS'), 'noquis');
  esperar(normalizar(null), '');
});

test('registrarFrecuentes agrega alimentos nuevos', () => {
  const r = registrarFrecuentes([], [
    { nombre: 'Milanesa', porcion: '180 g', calorias: 430, proteinas: 32, carbohidratos: 22, grasas: 23 },
    { nombre: 'Puré', porcion: '200 g', calorias: 180, proteinas: 4, carbohidratos: 30, grasas: 5 }
  ], 1000);
  esperar(r.length, 2);
  esperar(r[0].usos, 1);
  esperar(r.find(f => f.nombre === 'Milanesa').calorias, 430);
});

test('registrarFrecuentes cuenta los usos repetidos', () => {
  let r = registrarFrecuentes([], [{ nombre: 'Café con leche', calorias: 80 }], 1000);
  r = registrarFrecuentes(r, [{ nombre: 'café con leche', calorias: 85 }], 2000);
  esperar(r.length, 1, 'no debería duplicar por mayúsculas/acentos');
  esperar(r[0].usos, 2);
  esperar(r[0].calorias, 85, 'la estimación más reciente manda');
  esperar(r[0].ultimoUso, 2000);
});

test('registrarFrecuentes ordena por uso y después por reciente', () => {
  let r = registrarFrecuentes([], [{ nombre: 'Manzana', calorias: 90 }], 1000);
  r = registrarFrecuentes(r, [{ nombre: 'Pan', calorias: 200 }], 2000);
  r = registrarFrecuentes(r, [{ nombre: 'Pan', calorias: 200 }], 3000);
  esperar(r[0].nombre, 'Pan', 'el más usado va primero');
  esperar(r[1].nombre, 'Manzana');
});

test('registrarFrecuentes no muta el array original', () => {
  const original = registrarFrecuentes([], [{ nombre: 'Arroz', calorias: 130 }], 1000);
  const copia = clonar(original);
  registrarFrecuentes(original, [{ nombre: 'Arroz', calorias: 130 }], 2000);
  esperar(original, copia, 'la lista de entrada tiene que quedar intacta');
});

test('registrarFrecuentes ignora items sin nombre', () => {
  const r = registrarFrecuentes([], [{ nombre: '   ', calorias: 100 }, { calorias: 50 }], 1000);
  esperar(r.length, 0);
});

test('registrarFrecuentes corta en el máximo', () => {
  const muchos = Array.from({ length: MAX_FRECUENTES + 20 }, (_, i) => ({ nombre: 'alimento ' + i, calorias: i }));
  esperar(registrarFrecuentes([], muchos, 1000).length, MAX_FRECUENTES);
});

test('buscarFrecuentes filtra por texto parcial', () => {
  const lista = registrarFrecuentes([], [
    { nombre: 'Milanesa de carne', calorias: 430 },
    { nombre: 'Milanesa de pollo', calorias: 380 },
    { nombre: 'Ensalada', calorias: 90 }
  ], 1000);
  esperar(buscarFrecuentes(lista, 'mila').length, 2);
  esperar(buscarFrecuentes(lista, 'ensa')[0].nombre, 'Ensalada');
  esperar(buscarFrecuentes(lista, 'pizza').length, 0);
});

test('buscarFrecuentes prioriza los que empiezan con lo tipeado', () => {
  const lista = registrarFrecuentes([], [
    { nombre: 'Queso y pan', calorias: 300 },
    { nombre: 'Pan integral', calorias: 200 }
  ], 1000);
  esperar(buscarFrecuentes(lista, 'pan')[0].nombre, 'Pan integral');
});

test('buscarFrecuentes sin texto devuelve el top', () => {
  const lista = registrarFrecuentes([], [{ nombre: 'A', calorias: 1 }, { nombre: 'B', calorias: 2 }], 1000);
  esperar(buscarFrecuentes(lista, '', 1).length, 1);
});

test('buscarFrecuentes ignora acentos en la búsqueda', () => {
  const lista = registrarFrecuentes([], [{ nombre: 'Puré de papa', calorias: 180 }], 1000);
  esperar(buscarFrecuentes(lista, 'pure').length, 1);
  esperar(buscarFrecuentes(lista, 'PURÉ').length, 1);
});

test('migrar conserva y sanea los frecuentes', () => {
  const s = migrar({ frecuentes: [{ nombre: 'Pan', calorias: 200 }, { calorias: 10 }, null] });
  esperar(s.frecuentes.length, 1, 'descarta los que no tienen nombre');
  esperar(s.frecuentes[0].usos, 1, 'completa el default de usos');
});

/* ============================================================
   API de Claude (con fetch mockeado)
   ============================================================ */

/** Respuesta falsa con el shape real de la API. */
function respuestaOk(datos, usage) {
  const cuerpo = {
    content: [{ type: 'text', text: JSON.stringify(datos) }],
    stop_reason: 'end_turn',
    usage: usage || { input_tokens: 1500, output_tokens: 300 }
  };
  return {
    ok: true, status: 200,
    json: async () => cuerpo,
    clone() { return this; },
    headers: { get: () => null }
  };
}

function respuestaError(status, mensaje = '', retryAfter = null) {
  return {
    ok: false, status,
    json: async () => ({ error: { message: mensaje } }),
    clone() { return this; },
    headers: { get: (h) => (h === 'retry-after' ? retryAfter : null) }
  };
}

const COMIDA_OK = {
  titulo: 'Milanesa con puré',
  confianza: 'media',
  items: [{ nombre: 'Milanesa', porcion: '180 g', calorias: 430, proteinas: 32, carbohidratos: 22, grasas: 23 }],
  notas: 'estimado'
};

/* --- tests asíncronos: se registran y se esperan al final --- */
const pendientesAsync = [];
function testAsync(nombre, fn) {
  pendientesAsync.push({ nombre, fn });
}

/* ---- reintentos ---- */

testAsync('reintenta ante 429 y termina bien', async () => {
  let llamadas = 0;
  const fetchFn = async () => {
    llamadas++;
    return llamadas < 3 ? respuestaError(429, 'rate limit') : respuestaOk(COMIDA_OK);
  };
  const r = await analizarImagen({ fetchFn, apiKey: 'k', imagen: 'x', dormir: async () => {} });
  esperar(llamadas, 3, 'debería haber reintentado dos veces');
  esperar(r.titulo, 'Milanesa con puré');
});

testAsync('reintenta ante 500', async () => {
  let llamadas = 0;
  const fetchFn = async () => {
    llamadas++;
    return llamadas < 2 ? respuestaError(503, 'overloaded') : respuestaOk(COMIDA_OK);
  };
  await analizarImagen({ fetchFn, apiKey: 'k', imagen: 'x', dormir: async () => {} });
  esperar(llamadas, 2);
});

testAsync('NO reintenta ante 401', async () => {
  let llamadas = 0;
  const fetchFn = async () => { llamadas++; return respuestaError(401, 'bad key'); };
  try {
    await analizarImagen({ fetchFn, apiKey: 'k', imagen: 'x', dormir: async () => {} });
    throw new Error('debería haber tirado error');
  } catch (e) {
    esperarQue(/API key/.test(e.message), 'mensaje esperado sobre la key, dio: ' + e.message);
  }
  esperar(llamadas, 1, 'una key inválida no mejora reintentando');
});

testAsync('se rinde después de agotar los intentos', async () => {
  let llamadas = 0;
  const fetchFn = async () => { llamadas++; return respuestaError(429, 'rate limit'); };
  try {
    await analizarImagen({ fetchFn, apiKey: 'k', imagen: 'x', dormir: async () => {} });
    throw new Error('debería haber tirado error');
  } catch (e) {
    esperarQue(/Límite de uso/.test(e.message), 'dio: ' + e.message);
  }
  esperar(llamadas, 3, 'tres intentos y basta');
});

testAsync('el backoff crece y respeta retry-after', async () => {
  const esperas = [];
  let llamadas = 0;
  const fetchFn = async () => {
    llamadas++;
    if (llamadas === 1) return respuestaError(429, '', null);   // backoff normal
    if (llamadas === 2) return respuestaError(429, '', '5');    // la API pide 5 s
    return respuestaOk(COMIDA_OK);
  };
  await analizarImagen({ fetchFn, apiKey: 'k', imagen: 'x', dormir: async (ms) => { esperas.push(ms); } });
  esperar(esperas, [800, 5000]);
});

testAsync('reintenta también los errores de red', async () => {
  let llamadas = 0;
  const fetchFn = async () => {
    llamadas++;
    if (llamadas < 3) throw new TypeError('Failed to fetch');
    return respuestaOk(COMIDA_OK);
  };
  const r = await analizarImagen({ fetchFn, apiKey: 'k', imagen: 'x', dormir: async () => {} });
  esperar(llamadas, 3);
  esperar(r.confianza, 'media');
});

/* ---- cancelación ---- */

testAsync('un abort corta sin reintentar', async () => {
  let llamadas = 0;
  const fetchFn = async () => {
    llamadas++;
    const e = new Error('cancelado');
    e.name = 'AbortError';
    throw e;
  };
  try {
    await analizarImagen({ fetchFn, apiKey: 'k', imagen: 'x', dormir: async () => {} });
    throw new Error('debería haber propagado el abort');
  } catch (e) {
    esperar(e.name, 'AbortError');
  }
  esperar(llamadas, 1, 'si el usuario cancela no se reintenta');
});

testAsync('la señal de abort viaja en el request', async () => {
  let recibido = null;
  const ctrl = new AbortController();
  const fetchFn = async (url, opts) => { recibido = opts.signal; return respuestaOk(COMIDA_OK); };
  await analizarImagen({ fetchFn, apiKey: 'k', imagen: 'x', señal: ctrl.signal });
  esperarQue(recibido === ctrl.signal, 'el signal tiene que llegar al fetch');
});

/* ---- body y prompt ---- */

testAsync('el request lleva la imagen y las cabeceras correctas', async () => {
  let capturado = null;
  const fetchFn = async (url, opts) => { capturado = { url, opts }; return respuestaOk(COMIDA_OK); };
  await analizarImagen({ fetchFn, apiKey: 'mi-key', imagen: 'BASE64', modelo: 'claude-opus-5' });

  esperar(capturado.url, 'https://api.anthropic.com/v1/messages');
  esperar(capturado.opts.headers['x-api-key'], 'mi-key');
  esperar(capturado.opts.headers['anthropic-version'], '2023-06-01');
  esperar(capturado.opts.headers['anthropic-dangerous-direct-browser-access'], 'true');

  const body = JSON.parse(capturado.opts.body);
  esperar(body.model, 'claude-opus-5');
  esperar(body.messages[0].content[0].source.data, 'BASE64');
  esperar(body.output_config.format.type, 'json_schema');
  esperar(body.output_config.effort, 'medium');
});

test('armarBody no manda effort en modelos que no lo soportan', () => {
  const body = armarBody({ modelo: 'claude-haiku-4-5', imagen: 'x', prompt: 'p' });
  esperarQue(body.output_config.effort === undefined, 'Haiku 4.5 rechaza effort');
  esperar(body.output_config.format.type, 'json_schema');
});

test('armarBody sin schema no manda output_config.format', () => {
  const body = armarBody({ modelo: 'claude-opus-5', imagen: 'x', prompt: 'p', conSchema: false });
  esperarQue(!body.output_config.format, 'sin schema no va format');
});

test('el prompt lleva el contexto de la persona', () => {
  const p = construirPrompt({
    contexto: { momento: 'Almuerzo', objetivo: 1991, consumido: 610, frecuentes: ['Milanesa', 'Puré'] }
  });
  esperarQue(p.includes('Almuerzo'), 'falta el momento');
  esperarQue(p.includes('1991'), 'falta el objetivo');
  esperarQue(p.includes('610'), 'falta lo consumido');
  esperarQue(p.includes('Milanesa'), 'faltan los frecuentes');
  esperarQue(p.includes('no ajustes las calorías'), 'falta el recaudo de no sesgar la estimación');
});

test('sin contexto el prompt no inventa secciones', () => {
  const p = construirPrompt({});
  esperarQue(!p.includes('Contexto de la persona'), 'no debería haber sección de contexto');
});

test('el prompt de etiqueta es distinto al de plato', () => {
  const etiqueta = construirPrompt({ modo: 'etiqueta' });
  esperarQue(etiqueta.includes('etiqueta nutricional'), 'falta el enfoque de etiqueta');
  esperarQue(etiqueta.includes('porciones trae el envase'), 'tiene que pedir las porciones del envase');
  esperarQue(!etiqueta.includes('tamaño del plato'), 'no debería hablar del plato');
});

test('la corrección se incorpora al prompt', () => {
  const p = construirPrompt({ correccion: 'la milanesa era el doble de grande' });
  esperarQue(p.includes('el doble de grande'), 'falta el texto de la corrección');
  esperarQue(p.includes('tomando esa corrección como cierta'), 'falta la instrucción de priorizarla');
});

test('sin schema el prompt pide JSON explícito', () => {
  const p = construirPrompt({ conSchema: false });
  esperarQue(p.includes('objeto JSON válido'), 'falta la instrucción de formato');
});

testAsync('la corrección reenvía la estimación anterior', async () => {
  let body = null;
  const fetchFn = async (url, opts) => { body = JSON.parse(opts.body); return respuestaOk(COMIDA_OK); };
  await analizarImagen({
    fetchFn, apiKey: 'k', imagen: 'x',
    correccion: 'era el doble', previo: COMIDA_OK
  });
  esperar(body.messages.length, 3, 'user + assistant previo + user corrección');
  esperar(body.messages[1].role, 'assistant');
  esperarQue(body.messages[1].content[0].text.includes('Milanesa'), 'el previo tiene que ir en el assistant');
});

testAsync('si el modelo rechaza el schema, reintenta sin él', async () => {
  const bodies = [];
  let llamadas = 0;
  const fetchFn = async (url, opts) => {
    bodies.push(JSON.parse(opts.body));
    llamadas++;
    return llamadas === 1
      ? respuestaError(400, 'output_config.format not supported')
      : respuestaOk(COMIDA_OK);
  };
  const r = await analizarImagen({ fetchFn, apiKey: 'k', imagen: 'x' });
  esperar(llamadas, 2);
  esperarQue(!!bodies[0].output_config.format, 'el primer intento va con schema');
  esperarQue(!bodies[1].output_config.format, 'el segundo va sin schema');
  esperar(r.titulo, 'Milanesa con puré');
});

/* ---- sugerencias ---- */

const MARGEN = { kcal: 620, prot: 45, carb: 60, gras: 18 };

const SUGERENCIAS_OK = {
  opciones: [
    { titulo: 'Pollo con ensalada', porque: 'Cubre la proteína que te falta', items: [
      { nombre: 'Pechuga de pollo', porcion: '180 g', calorias: 300, proteinas: 55, carbohidratos: 0, grasas: 7 },
      { nombre: 'Ensalada mixta', porcion: '1 plato', calorias: 120, proteinas: 3, carbohidratos: 12, grasas: 7 }
    ] },
    { titulo: 'Omelette de claras', porque: 'Liviano y con proteína', items: [
      { nombre: 'Omelette', porcion: '4 claras', calorias: 200, proteinas: 28, carbohidratos: 2, grasas: 4 }
    ] }
  ]
};

test('el prompt de sugerencias lleva el margen real', () => {
  const p = promptSugerencias({ margen: MARGEN, momento: 'la cena' });
  esperarQue(p.includes('620 kcal'), 'faltan las calorías');
  esperarQue(p.includes('45 g de proteína'), 'faltan los macros');
  esperarQue(p.includes('la cena'), 'falta el momento');
  esperarQue(/nunca pasarse/i.test(p), 'tiene que pedir no pasarse');
});

test('el prompt prioriza proteína cuando falta', () => {
  const conFalta = promptSugerencias({ margen: MARGEN, momento: 'la cena', faltaProteina: true });
  const sinFalta = promptSugerencias({ margen: MARGEN, momento: 'la cena', faltaProteina: false });
  esperarQue(/Priorizá proteína/.test(conFalta), 'debería priorizarla');
  esperarQue(!/Priorizá proteína/.test(sinFalta), 'y si no falta, no');
});

test('el prompt usa los alimentos que ya come', () => {
  const p = promptSugerencias({ margen: MARGEN, momento: 'la cena', frecuentes: ['Pollo', 'Arroz'] });
  esperarQue(p.includes('Pollo, Arroz'), 'dio: ' + p.slice(-200));
});

testAsync('sugerirComida devuelve las opciones normalizadas', async () => {
  const fetchFn = async () => respuestaOk(SUGERENCIAS_OK, { input_tokens: 800, output_tokens: 400 });
  const r = await sugerirComida({ fetchFn, apiKey: 'k', margen: MARGEN });

  esperar(r.opciones.length, 2);
  esperar(r.opciones[0].titulo, 'Pollo con ensalada');
  esperar(r.opciones[0].items.length, 2);
  esperar(r.opciones[0].items[0].calorias, 300);
  cerca(r.costo, 800 / 1e6 * PRECIOS[MODELO_DEFAULT].entrada + 400 / 1e6 * PRECIOS[MODELO_DEFAULT].salida, 0.000001);
});

testAsync('sugerirComida manda el schema correcto', async () => {
  let body = null;
  const fetchFn = async (url, opts) => { body = JSON.parse(opts.body); return respuestaOk(SUGERENCIAS_OK); };
  await sugerirComida({ fetchFn, apiKey: 'k', margen: MARGEN });
  esperar(body.output_config.format.schema.required, ['opciones']);
  esperarQue(!body.messages[0].content.some(c => c.type === 'image'), 'no hace falta mandar fotos acá');
});

testAsync('sugerirComida no pregunta si casi no quedan calorías', async () => {
  let llamadas = 0;
  const fetchFn = async () => { llamadas++; return respuestaOk(SUGERENCIAS_OK); };
  let msg = '';
  try {
    await sugerirComida({ fetchFn, apiKey: 'k', margen: { kcal: 40, prot: 0, carb: 0, gras: 0 } });
  } catch (e) { msg = e.message; }
  esperarQue(/pocas calorías/.test(msg), 'dio: ' + msg);
  esperar(llamadas, 0, 'no gasta API para decir eso');
});

testAsync('sugerirComida descarta opciones vacías', async () => {
  const fetchFn = async () => respuestaOk({ opciones: [{ titulo: 'Vacía', porque: '', items: [] }, SUGERENCIAS_OK.opciones[0]] });
  const r = await sugerirComida({ fetchFn, apiKey: 'k', margen: MARGEN });
  esperar(r.opciones.length, 1);
  esperar(r.opciones[0].titulo, 'Pollo con ensalada');
});

testAsync('sugerirComida avisa si no entiende la respuesta', async () => {
  const fetchFn = async () => respuestaOk({ opciones: [] });
  let msg = '';
  try { await sugerirComida({ fetchFn, apiKey: 'k', margen: MARGEN }); } catch (e) { msg = e.message; }
  esperarQue(/No pude leer/.test(msg), 'dio: ' + msg);
});

/* ---- precisión ---- */

test('resolverPrecision elige modelo y esfuerzo', () => {
  esperar(resolverPrecision('rapido', 'claude-opus-5'), { modelo: 'claude-haiku-4-5', effort: null });
  esperar(resolverPrecision('normal', 'claude-opus-5'), { modelo: 'claude-opus-5', effort: 'medium' });
  esperar(resolverPrecision('preciso', 'claude-opus-5'), { modelo: 'claude-opus-5', effort: 'high' });
});

test('resolverPrecision con un valor raro cae en normal', () => {
  esperar(resolverPrecision('inventado', 'claude-opus-5').effort, 'medium');
  esperar(resolverPrecision(undefined, 'claude-sonnet-5').modelo, 'claude-sonnet-5');
});

testAsync('el modo rápido usa Haiku y no manda effort', async () => {
  let body = null;
  const fetchFn = async (url, opts) => { body = JSON.parse(opts.body); return respuestaOk(COMIDA_OK); };
  await analizarImagen({ fetchFn, apiKey: 'k', imagen: 'x', modelo: 'claude-opus-5', precision: 'rapido' });
  esperar(body.model, 'claude-haiku-4-5');
  esperarQue(body.output_config.effort === undefined, 'Haiku rechaza effort');
});

testAsync('el modo preciso sube el esfuerzo', async () => {
  let body = null;
  const fetchFn = async (url, opts) => { body = JSON.parse(opts.body); return respuestaOk(COMIDA_OK); };
  await analizarImagen({ fetchFn, apiKey: 'k', imagen: 'x', modelo: 'claude-opus-5', precision: 'preciso' });
  esperar(body.model, 'claude-opus-5');
  esperar(body.output_config.effort, 'high');
});

testAsync('el modo rápido sale más barato con los mismos tokens', async () => {
  const usage = { input_tokens: 2000, output_tokens: 400 };
  const fetchFn = async () => respuestaOk(COMIDA_OK, usage);

  const rapido = await analizarImagen({ fetchFn, apiKey: 'k', imagen: 'x', precision: 'rapido' });
  const normal = await analizarImagen({ fetchFn, apiKey: 'k', imagen: 'x', precision: 'normal' });
  esperarQue(rapido.costo < normal.costo, `rápido ${rapido.costo} debería ser menor que normal ${normal.costo}`);
});

testAsync('cambiar de precisión no reusa el resultado cacheado', async () => {
  let llamadas = 0;
  const fetchFn = async () => { llamadas++; return respuestaOk(COMIDA_OK); };
  const cache = cacheDePrueba();
  const imagen = 'la-foto'.repeat(50);

  await analizarImagen({ fetchFn, apiKey: 'k', imagen, cache, precision: 'rapido' });
  await analizarImagen({ fetchFn, apiKey: 'k', imagen, cache, precision: 'preciso' });
  esperar(llamadas, 2, 'pedir más precisión tiene que volver a preguntar');

  await analizarImagen({ fetchFn, apiKey: 'k', imagen, cache, precision: 'preciso' });
  esperar(llamadas, 2, 'pero repetir la misma precisión sí usa el cache');
});

/* ---- varias fotos ---- */

test('armarBody manda todas las imágenes en un solo mensaje', () => {
  const body = armarBody({ modelo: 'claude-opus-5', imagenes: ['A', 'B', 'C'], prompt: 'p' });
  esperar(body.messages.length, 1, 'una sola comida, un solo mensaje');

  const contenido = body.messages[0].content;
  const fotos = contenido.filter(c => c.type === 'image');
  esperar(fotos.length, 3);
  esperar(fotos.map(f => f.source.data), ['A', 'B', 'C']);
  esperar(contenido.at(-1).type, 'text', 'el texto va al final');
});

test('armarBody sigue aceptando una sola imagen', () => {
  const body = armarBody({ modelo: 'claude-opus-5', imagen: 'UNA', prompt: 'p' });
  esperar(body.messages[0].content.filter(c => c.type === 'image').length, 1);
});

test('armarBody sin imágenes manda solo el texto', () => {
  const body = armarBody({ modelo: 'claude-opus-5', prompt: 'p' });
  esperar(body.messages[0].content.length, 1);
  esperar(body.messages[0].content[0].type, 'text');
});

test('con varias fotos el prompt aclara que son la misma comida', () => {
  const p = construirPrompt({ cantidadFotos: 3 });
  esperarQue(p.includes('3 fotos'), 'falta la cantidad');
  esperarQue(/MISMA comida/i.test(p), 'tiene que decir que son la misma comida');
  esperarQue(/sin contar dos veces/i.test(p), 'y avisar de no duplicar');
});

test('con una sola foto el prompt no dice nada de eso', () => {
  esperarQue(!construirPrompt({ cantidadFotos: 1 }).includes('MISMA comida'));
});

testAsync('analizarImagen acepta varias fotos', async () => {
  let body = null;
  const fetchFn = async (url, opts) => { body = JSON.parse(opts.body); return respuestaOk(COMIDA_OK); };
  await analizarImagen({ fetchFn, apiKey: 'k', imagenes: ['foto1', 'foto2'] });
  esperar(body.messages[0].content.filter(c => c.type === 'image').length, 2);
});

testAsync('el cache distingue un set de fotos de otro', async () => {
  let llamadas = 0;
  const fetchFn = async () => { llamadas++; return respuestaOk(COMIDA_OK); };
  const cache = cacheDePrueba();

  await analizarImagen({ fetchFn, apiKey: 'k', imagenes: ['a'.repeat(100), 'b'.repeat(100)], cache });
  await analizarImagen({ fetchFn, apiKey: 'k', imagenes: ['a'.repeat(100), 'b'.repeat(100)], cache });
  esperar(llamadas, 1, 'el mismo set sale del cache');

  await analizarImagen({ fetchFn, apiKey: 'k', imagenes: ['a'.repeat(100)], cache });
  esperar(llamadas, 2, 'una foto menos ya es otra consulta');
});

/* ---- streaming ---- */

/** Respuesta SSE falsa: emite los chunks que se le pasen. */
function respuestaStream(chunks, usage) {
  const encoder = new TextEncoder();
  let i = 0;
  return {
    ok: true, status: 200,
    clone() { return this; },
    headers: { get: () => null },
    body: {
      getReader: () => ({
        read: async () => {
          if (i >= chunks.length) return { done: true, value: undefined };
          return { done: false, value: encoder.encode(chunks[i++]) };
        }
      })
    }
  };
}

/** Arma los eventos SSE de un JSON partido en pedazos. */
function chunksDe(json, pedazos = 4, usage = { input_tokens: 1200, output_tokens: 300 }) {
  const texto = JSON.stringify(json);
  const largo = Math.ceil(texto.length / pedazos);

  const eventos = [
    `event: message_start\ndata: ${JSON.stringify({ type: 'message_start', message: { usage: { input_tokens: usage.input_tokens } } })}\n\n`
  ];

  for (let i = 0; i < texto.length; i += largo) {
    const trozo = texto.slice(i, i + largo);
    eventos.push(`event: content_block_delta\ndata: ${JSON.stringify({ type: 'content_block_delta', delta: { type: 'text_delta', text: trozo } })}\n\n`);
  }

  eventos.push(`event: message_delta\ndata: ${JSON.stringify({ type: 'message_delta', delta: { stop_reason: 'end_turn' }, usage: { output_tokens: usage.output_tokens } })}\n\n`);
  return eventos;
}

testAsync('leerStream reconstruye el mensaje completo', async () => {
  const res = respuestaStream(chunksDe(COMIDA_OK));
  const data = await leerStream(res, null);
  esperar(JSON.parse(data.content[0].text).titulo, 'Milanesa con puré');
  esperar(data.stop_reason, 'end_turn');
  esperar(data.usage, { input_tokens: 1200, output_tokens: 300 });
});

testAsync('leerStream avisa el avance a medida que llega', async () => {
  const avances = [];
  const res = respuestaStream(chunksDe(COMIDA_OK, 5));
  await leerStream(res, (txt) => avances.push(txt.length));
  esperarQue(avances.length >= 4, 'debería haber avisado varias veces, dio ' + avances.length);
  esperarQue(avances[0] < avances.at(-1), 'el texto tiene que ir creciendo');
});

testAsync('leerStream tolera un evento partido entre dos chunks', async () => {
  // el corte cae justo en el medio de una línea data:
  const completos = chunksDe(COMIDA_OK, 2).join('');
  const corte = Math.floor(completos.length / 2);
  const res = respuestaStream([completos.slice(0, corte), completos.slice(corte)]);
  const data = await leerStream(res, null);
  esperar(JSON.parse(data.content[0].text).titulo, 'Milanesa con puré');
});

testAsync('leerStream ignora líneas basura y [DONE]', async () => {
  const chunks = [...chunksDe(COMIDA_OK, 2), 'data: [DONE]\n\n', ': ping\n\n', 'data: {no soy json}\n\n'];
  const data = await leerStream(respuestaStream(chunks), null);
  esperarQue(!!JSON.parse(data.content[0].text).titulo, 'igual tiene que salir el JSON bueno');
});

testAsync('analizarImagen en streaming devuelve lo mismo que sin streaming', async () => {
  let body = null;
  const fetchFn = async (url, opts) => { body = JSON.parse(opts.body); return respuestaStream(chunksDe(COMIDA_OK)); };
  const avances = [];

  const r = await analizarImagen({ fetchFn, apiKey: 'k', imagen: 'x', onProgreso: (t) => avances.push(t) });

  esperar(body.stream, true, 'tiene que pedir streaming');
  esperar(r.titulo, 'Milanesa con puré');
  esperar(r.items.length, 1);
  cerca(r.costo, 1200 / 1e6 * PRECIOS[MODELO_DEFAULT].entrada + 300 / 1e6 * PRECIOS[MODELO_DEFAULT].salida, 0.000001, 'el costo se calcula igual');
  esperarQue(avances.length > 0, 'y el avance llegó');
});

test('sin onProgreso el body no pide streaming', () => {
  const body = armarBody({ modelo: 'claude-opus-5', imagen: 'x', prompt: 'p' });
  esperarQue(body.stream === undefined, 'no debería mandar stream');
});

test('alimentosParciales lee los nombres del JSON incompleto', () => {
  const parcial = '{"titulo":"Plato","items":[{"nombre":"Milanesa","calorias":430},{"nombre":"Pur';
  esperar(alimentosParciales(parcial), ['Milanesa']);
});

test('alimentosParciales devuelve todos los que ya están', () => {
  const parcial = JSON.stringify({ items: [{ nombre: 'Arroz' }, { nombre: 'Pollo' }] });
  esperar(alimentosParciales(parcial), ['Arroz', 'Pollo']);
});

test('alimentosParciales con texto vacío no rompe', () => {
  esperar(alimentosParciales(''), []);
  esperar(alimentosParciales(null), []);
});

/* ---- cache de análisis ---- */

/** Cache de prueba: mismo contrato que el real, pero en memoria. */
function cacheDePrueba() {
  let datos = {};
  return {
    huella: (imagen, modo) => huellaImagen(imagen) + ':' + modo,
    leer: (h) => leerDeCache(datos, h),
    guardar: (h, valor) => { datos = guardarEnCache(datos, h, valor); },
    contenido: () => datos
  };
}

test('huellaImagen es estable y distingue imágenes', () => {
  const a = 'x'.repeat(5000);
  const b = 'x'.repeat(5000) + 'y';
  esperar(huellaImagen(a), huellaImagen(a), 'la misma imagen da la misma huella');
  esperarQue(huellaImagen(a) !== huellaImagen(b), 'imágenes distintas, huellas distintas');
  esperar(huellaImagen(''), '');
});

test('huellaImagen detecta un cambio en el medio de la imagen', () => {
  const base = 'abcdefghij'.repeat(500);
  const cambiada = base.slice(0, 2500) + 'Z' + base.slice(2501);
  esperarQue(huellaImagen(base) !== huellaImagen(cambiada), 'un byte distinto tiene que notarse');
});

test('guardarEnCache y leerDeCache van y vuelven', () => {
  const c = guardarEnCache({}, 'h1', { titulo: 'Pizza' }, 1000);
  esperar(leerDeCache(c, 'h1', 1000).titulo, 'Pizza');
  esperar(leerDeCache(c, 'no-esta', 1000), null);
});

test('el cache ignora las entradas viejas', () => {
  const c = guardarEnCache({}, 'h1', { titulo: 'Pizza' }, 0);
  const treintaYUnDias = 31 * 86400000;
  esperar(leerDeCache(c, 'h1', treintaYUnDias), null, 'a los 31 días ya no vale');
  esperarQue(!!leerDeCache(c, 'h1', 29 * 86400000), 'a los 29 sí');
});

test('el cache guarda copias, no referencias', () => {
  const valor = { titulo: 'Pizza', items: [{ nombre: 'Pizza' }] };
  const c = guardarEnCache({}, 'h1', valor, 1000);
  valor.items[0].nombre = 'Otra cosa';
  esperar(leerDeCache(c, 'h1', 1000).items[0].nombre, 'Pizza');
});

test('el cache tiene tope y tira lo más viejo', () => {
  let c = {};
  for (let i = 0; i < MAX_CACHE + 5; i++) c = guardarEnCache(c, 'h' + i, { n: i }, 1000 + i);
  esperar(Object.keys(c).length, MAX_CACHE);
  esperar(leerDeCache(c, 'h0', 2000), null, 'la primera ya no está');
  esperarQue(!!leerDeCache(c, 'h' + (MAX_CACHE + 4), 2000), 'la última sí');
});

testAsync('la misma foto no se paga dos veces', async () => {
  let llamadas = 0;
  const fetchFn = async () => { llamadas++; return respuestaOk(COMIDA_OK); };
  const cache = cacheDePrueba();
  const imagen = 'BASE64-DE-LA-FOTO'.repeat(100);

  const primera = await analizarImagen({ fetchFn, apiKey: 'k', imagen, cache });
  const segunda = await analizarImagen({ fetchFn, apiKey: 'k', imagen, cache });

  esperar(llamadas, 1, 'la segunda vez sale del cache');
  esperar(segunda.titulo, primera.titulo);
  esperar(segunda.deCache, true);
  esperar(segunda.costo, 0, 'lo cacheado no cuesta nada');
});

testAsync('una foto distinta sí llama a la API', async () => {
  let llamadas = 0;
  const fetchFn = async () => { llamadas++; return respuestaOk(COMIDA_OK); };
  const cache = cacheDePrueba();

  await analizarImagen({ fetchFn, apiKey: 'k', imagen: 'foto-uno'.repeat(50), cache });
  await analizarImagen({ fetchFn, apiKey: 'k', imagen: 'foto-dos'.repeat(50), cache });
  esperar(llamadas, 2);
});

testAsync('el modo etiqueta no reusa el análisis de plato', async () => {
  let llamadas = 0;
  const fetchFn = async () => { llamadas++; return respuestaOk(COMIDA_OK); };
  const cache = cacheDePrueba();
  const imagen = 'la-misma-foto'.repeat(50);

  await analizarImagen({ fetchFn, apiKey: 'k', imagen, cache, modo: 'plato' });
  await analizarImagen({ fetchFn, apiKey: 'k', imagen, cache, modo: 'etiqueta' });
  esperar(llamadas, 2, 'la misma foto leída como etiqueta es otra pregunta');
});

testAsync('una corrección siempre vuelve a preguntar', async () => {
  let llamadas = 0;
  const fetchFn = async () => { llamadas++; return respuestaOk(COMIDA_OK); };
  const cache = cacheDePrueba();
  const imagen = 'foto'.repeat(100);

  await analizarImagen({ fetchFn, apiKey: 'k', imagen, cache });
  await analizarImagen({ fetchFn, apiKey: 'k', imagen, cache, correccion: 'era el doble', previo: COMIDA_OK });
  esperar(llamadas, 2, 'corregir pide justamente una respuesta distinta');
});

testAsync('sin cache configurado todo sigue funcionando', async () => {
  let llamadas = 0;
  const fetchFn = async () => { llamadas++; return respuestaOk(COMIDA_OK); };
  await analizarImagen({ fetchFn, apiKey: 'k', imagen: 'x' });
  await analizarImagen({ fetchFn, apiKey: 'k', imagen: 'x' });
  esperar(llamadas, 2);
});

/* ---- interpretación ---- */

test('interpretarRespuesta normaliza los items', () => {
  const r = interpretarRespuesta({
    content: [{ type: 'text', text: JSON.stringify({ items: [{ nombre: 'Pan', calorias: '200' }] }) }]
  });
  esperar(r.items[0].calorias, 200, 'convierte el string a número');
  esperar(r.items[0].proteinas, 0, 'completa los macros que faltan');
  esperar(r.titulo, 'Comida', 'pone un título por defecto');
  esperar(r.confianza, 'media', 'confianza inválida cae en media');
});

test('interpretarRespuesta rescata el JSON envuelto en texto', () => {
  const r = interpretarRespuesta({
    content: [{ type: 'text', text: 'Claro, acá va:\n```json\n' + JSON.stringify(COMIDA_OK) + '\n```' }]
  });
  esperar(r.titulo, 'Milanesa con puré');
});

test('interpretarRespuesta avisa si no hay alimentos', () => {
  let msg = '';
  try {
    interpretarRespuesta({ content: [{ type: 'text', text: '{"titulo":"nada","items":[]}' }] });
  } catch (e) { msg = e.message; }
  esperarQue(/no reconoció/.test(msg), 'dio: ' + msg);
});

test('interpretarRespuesta detecta un refusal', () => {
  let msg = '';
  try {
    interpretarRespuesta({ stop_reason: 'refusal', content: [] });
  } catch (e) { msg = e.message; }
  esperarQue(/no pudo procesar/.test(msg), 'dio: ' + msg);
});

test('interpretarRespuesta avisa si la respuesta no es JSON', () => {
  let msg = '';
  try {
    interpretarRespuesta({ content: [{ type: 'text', text: 'no tengo idea de qué es esto' }] });
  } catch (e) { msg = e.message; }
  esperarQue(/no se pudo interpretar/.test(msg), 'dio: ' + msg);
});

/* ---- costo ---- */

test('costoAnalisis calcula con el precio del modelo', () => {
  // 1500 entrada + 300 salida en Opus 5 ($5 / $25 por millón)
  const c = costoAnalisis({ input_tokens: 1500, output_tokens: 300 }, 'claude-opus-5');
  cerca(c, 1500 / 1e6 * 5 + 300 / 1e6 * 25, 0.000001);
});

test('costoAnalisis distingue los modelos', () => {
  const usage = { input_tokens: 1500, output_tokens: 300 };
  const opus = costoAnalisis(usage, 'claude-opus-5');
  const haiku = costoAnalisis(usage, 'claude-haiku-4-5');
  esperarQue(haiku < opus, 'Haiku tiene que salir más barato');
});

test('costoAnalisis con datos faltantes da cero', () => {
  esperar(costoAnalisis(null, 'claude-opus-5'), 0);
  esperar(costoAnalisis({}, 'claude-opus-5'), 0);
});

test('costoAnalisis con modelo desconocido usa el default', () => {
  const usage = { input_tokens: 1000, output_tokens: 100 };
  esperar(costoAnalisis(usage, 'modelo-inventado'), costoAnalisis(usage, MODELO_DEFAULT));
});

test('formatearCosto muestra centavos cuando es chico', () => {
  esperarQue(formatearCosto(0.0045).includes('centavos'), 'dio: ' + formatearCosto(0.0045));
  esperarQue(formatearCosto(0.15).includes('US$'), 'dio: ' + formatearCosto(0.15));
  esperar(formatearCosto(0), '');
});

testAsync('el análisis devuelve tokens y costo', async () => {
  const fetchFn = async () => respuestaOk(COMIDA_OK, { input_tokens: 2000, output_tokens: 400 });
  const r = await analizarImagen({ fetchFn, apiKey: 'k', imagen: 'x', modelo: 'claude-opus-5' });
  esperar(r.tokens, { entrada: 2000, salida: 400 });
  // acá el modelo va explícito, así que el costo es el de Opus y no el del default
  cerca(r.costo, 2000 / 1e6 * PRECIOS['claude-opus-5'].entrada + 400 / 1e6 * PRECIOS['claude-opus-5'].salida, 0.000001);
  esperar(r.modelo, 'claude-opus-5');
});

testAsync('sin API key ni siquiera llama a la red', async () => {
  let llamadas = 0;
  const fetchFn = async () => { llamadas++; return respuestaOk(COMIDA_OK); };
  try {
    await analizarImagen({ fetchFn, apiKey: '', imagen: 'x' });
    throw new Error('debería haber tirado error');
  } catch (e) {
    esperarQue(/Falta la API key/.test(e.message), 'dio: ' + e.message);
  }
  esperar(llamadas, 0);
});

test('mensajeDeError traduce los códigos conocidos', () => {
  esperarQue(/API key/.test(mensajeDeError(401)), '401');
  esperarQue(/Límite de uso/.test(mensajeDeError(429)), '429');
  esperarQue(/problemas/.test(mensajeDeError(500)), '500');
  esperarQue(/saldo/.test(mensajeDeError(400, 'credit balance is too low')), 'saldo');
  esperarQue(/Error 418/.test(mensajeDeError(418, 'raro')), 'desconocido');
});

/* ============================================================
   Fibra, azúcar y sodio
   ============================================================ */

test('sumarComidas acumula los tres nutrientes nuevos', () => {
  const r = sumarComidas([
    { kcal: 300, prot: 10, carb: 40, gras: 8, fibra: 4, azucar: 12, sodio: 200 },
    { kcal: 200, prot: 5, carb: 20, gras: 6, fibra: 2, azucar: 8, sodio: 350 }
  ]);
  esperar(r.fibra, 6);
  esperar(r.azucar, 20);
  esperar(r.sodio, 550);
});

test('sumarComidas con comidas viejas los deja en cero', () => {
  const r = sumarComidas([{ kcal: 400, prot: 20, carb: 40, gras: 12 }]);
  esperar(r.fibra, 0);
  esperar(r.azucar, 0);
  esperar(r.sodio, 0);
  esperar(r.kcal, 400, 'y lo de siempre no cambia');
});

test('sumarItems también los acumula', () => {
  const r = sumarItems([
    { calorias: 100, proteinas: 5, carbohidratos: 10, grasas: 2, fibra: 3, azucar: 5, sodio: 100 },
    { calorias: 150, proteinas: 8, carbohidratos: 12, grasas: 4 }
  ]);
  esperar(r.fibra, 3);
  esperar(r.sodio, 100);
});

test('migrar deja los nutrientes en cero para lo ya guardado', () => {
  const s = migrar({ dias: { '2026-08-19': { comidas: [
    { id: 'v', ts: Date.now(), titulo: 'Vieja', kcal: 500, prot: 30, carb: 50, gras: 15 }
  ] } } });
  const c = s.dias['2026-08-19'].comidas[0];
  esperar(c.fibra, 0);
  esperar(c.azucar, 0);
  esperar(c.sodio, 0);
  esperar(c.kcal, 500, 'sin perder lo que había');
});

test('migrar conserva los nutrientes ya cargados', () => {
  const s = migrar({ dias: { '2026-08-19': { comidas: [
    { id: 'n', ts: Date.now(), titulo: 'Nueva', kcal: 300, prot: 10, carb: 40, gras: 8, fibra: 5, azucar: 12, sodio: 240 }
  ] } } });
  const c = s.dias['2026-08-19'].comidas[0];
  esperar(c.fibra, 5);
  esperar(c.sodio, 240);
});

test('nutrientesConDatos devuelve solo los que tienen algo', () => {
  esperar(nutrientesConDatos({ fibra: 0, azucar: 0, sodio: 0 }), []);
  esperar(nutrientesConDatos({ fibra: 5, azucar: 0, sodio: 300 }).map(n => n.id), ['fibra', 'sodio']);
});

test('los objetivos salen de las calorías del día', () => {
  const o = objetivosNutrientes(2000);
  esperar(o.fibra, 28, '14 g cada 1.000 kcal');
  esperar(o.azucar, 50, '10% de las calorías, en gramos');
  esperar(o.sodio, 2000, 'lo que recomienda la OMS');
});

test('el schema del análisis pide los tres', () => {
  const props = SCHEMA_COMIDA.properties.items.items;
  for (const campo of ['fibra', 'azucar', 'sodio']) {
    esperarQue(!!props.properties[campo], 'falta ' + campo);
    esperarQue(props.required.includes(campo), campo + ' tiene que estar en required');
  }
});

test('el prompt le dice al modelo qué hacer si no puede estimarlos', () => {
  const p = construirPrompt({});
  esperarQue(/poné 0/.test(p), 'tiene que poder decir que no sabe, dio: ' + p.slice(-300));
});

testAsync('interpretarRespuesta completa los nutrientes que falten', async () => {
  const sinNutrientes = {
    titulo: 'Plato', confianza: 'alta', notas: '',
    items: [{ nombre: 'Arroz', porcion: '100 g', calorias: 130, proteinas: 3, carbohidratos: 28, grasas: 0 }]
  };
  const r = await analizarImagen({ fetchFn: async () => respuestaOk(sinNutrientes), apiKey: 'k', imagen: 'x' });
  esperar(r.items[0].fibra, 0);
  esperar(r.items[0].sodio, 0);
});

testAsync('interpretarRespuesta conserva los nutrientes que sí vienen', async () => {
  const conNutrientes = {
    titulo: 'Plato', confianza: 'alta', notas: '',
    items: [{ nombre: 'Lentejas', porcion: '200 g', calorias: 230, proteinas: 18, carbohidratos: 40, grasas: 1, fibra: 16, azucar: 2, sodio: 8 }]
  };
  const r = await analizarImagen({ fetchFn: async () => respuestaOk(conNutrientes), apiKey: 'k', imagen: 'x' });
  esperar(r.items[0].fibra, 16);
  esperar(r.items[0].sodio, 8);
});

test('el informe suma los nutrientes solo si hay datos', () => {
  const s = stateDePrueba();
  const sinDatos = armarInforme(s, '2026-08');
  esperarQue(!sinDatos.includes('Fibra promedio'), 'sin datos no ensucia el informe');

  s.dias['2026-08-01'].comidas[0].fibra = 8;
  s.dias['2026-08-01'].comidas[0].azucar = 20;
  s.dias['2026-08-01'].comidas[0].sodio = 400;
  const conDatos = armarInforme(s, '2026-08');
  esperarQue(conDatos.includes('Fibra promedio'), 'con datos sí aparece');
  esperarQue(conDatos.includes('Sodio promedio'));
});

/* ============================================================
   Tope de gasto
   ============================================================ */

function historialGasto(costos, mes = hoyISO().slice(0, 7)) {
  return costos.map((costo, i) => ({
    ts: Date.parse(`${mes}-1${i % 9}T12:00:00`),
    costo: typeof costo === 'number' ? costo : costo.costo,
    deCache: typeof costo === 'number' ? false : !!costo.deCache,
    tipo: 'foto', titulo: '', modelo: '', precision: 'normal', tokens: 1000
  }));
}

test('gastoDelMes suma solo lo pagado de ese mes', () => {
  const mes = hoyISO().slice(0, 7);
  const historial = [
    ...historialGasto([0.02, 0.03, { costo: 0, deCache: true }], mes),
    { ts: Date.parse('2020-01-15T12:00:00'), costo: 5, deCache: false }
  ];
  cerca(gastoDelMes(historial, mes), 0.05, 0.00001, 'lo del cache no cuesta y lo de 2020 es otro mes');
});

test('gastoDelMes con historial vacío da cero', () => {
  esperar(gastoDelMes([], '2026-08'), 0);
  esperar(gastoDelMes(null, '2026-08'), 0);
});

test('estadoGasto calcula el porcentaje contra el tope', () => {
  const e = estadoGasto(historialGasto([1, 1]), { tope: 5 });
  esperar(e.gastado, 2);
  esperar(e.pct, 40);
  esperarQue(!e.avisar && !e.bloqueado);
  esperar(e.restante, 3);
});

test('estadoGasto avisa al 80%', () => {
  const e = estadoGasto(historialGasto([4.2]), { tope: 5 });
  esperar(e.pct, 84);
  esperarQue(e.avisar, 'tiene que avisar');
  esperarQue(!e.bloqueado, 'pero todavía no frenar');
});

test('estadoGasto bloquea al llegar al tope', () => {
  const e = estadoGasto(historialGasto([5]), { tope: 5 });
  esperarQue(e.bloqueado);
  esperarQue(!e.avisar, 'ya no avisa: directamente frena');
});

test('estadoGasto pasado del tope sigue bloqueado', () => {
  const e = estadoGasto(historialGasto([7]), { tope: 5 });
  esperarQue(e.bloqueado);
  esperar(e.restante, -2);
});

test('estadoGasto con tope en cero no frena nunca', () => {
  const e = estadoGasto(historialGasto([100]), { tope: 0 });
  esperarQue(!e.bloqueado, 'sin tope no hay freno');
  esperar(e.restante, Infinity);
});

test('el texto del tope dice qué hacer', () => {
  const bloqueado = textoTope(estadoGasto(historialGasto([5]), { tope: 5 }));
  esperarQue(/subirlo en Ajustes/.test(bloqueado), 'dio: ' + bloqueado);
  esperarQue(/codigo de barras|código de barras/.test(bloqueado), 'tiene que aclarar qué sigue andando');

  const avisando = textoTope(estadoGasto(historialGasto([4.2]), { tope: 5 }));
  esperarQue(/84%/.test(avisando), 'dio: ' + avisando);

  esperar(textoTope(estadoGasto(historialGasto([1]), { tope: 5 })), '', 'sin problema, sin texto');
});

test('el mes anterior no cuenta para el tope de este', () => {
  const anterior = sumarDias(hoyISO(), -40).slice(0, 7);
  const e = estadoGasto(historialGasto([10], anterior), { tope: 5 });
  esperar(e.gastado, 0);
  esperarQue(!e.bloqueado, 'el gasto del mes pasado no bloquea este');
});

test('el tope por defecto queda configurado al migrar', () => {
  esperar(migrar({}).cfg.topeGasto, TOPE_DEFECTO);
  esperar(migrar({ cfg: { topeGasto: 0 } }).cfg.topeGasto, 0, 'el que lo apagó a propósito sigue apagado');
});

/* ============================================================
   Respaldo
   ============================================================ */

const DIA_MS = 86400000;

test('diasSinRespaldo cuenta bien', () => {
  const ahora = Date.parse('2026-08-20T12:00:00');
  esperar(diasSinRespaldo(ahora - 3 * DIA_MS, ahora), 3);
  esperar(diasSinRespaldo(ahora, ahora), 0);
  esperar(diasSinRespaldo(null, ahora), null, 'nunca respaldó');
});

test('estadoRespaldo no molesta si no hay datos', () => {
  const r = estadoRespaldo({ ultimoRespaldo: null, dias: {}, ahora: 1000 });
  esperarQue(!r.avisar);
  esperar(r.texto, '');
});

test('estadoRespaldo avisa si nunca respaldó y ya hay historial', () => {
  const dias = {};
  for (let i = 0; i < 5; i++) dias['2026-08-0' + (i + 1)] = { comidas: [] };

  const r = estadoRespaldo({ ultimoRespaldo: null, dias, ahora: 1000 });
  esperarQue(r.avisar);
  esperarQue(/nunca/.test(r.texto), 'dio: ' + r.texto);
  esperarQue(/se pierden/.test(r.texto), 'tiene que decir qué está en juego');
});

test('estadoRespaldo con dos días no molesta todavía', () => {
  const dias = { '2026-08-01': { comidas: [] }, '2026-08-02': { comidas: [] } };
  esperarQue(!estadoRespaldo({ ultimoRespaldo: null, dias, ahora: 1000 }).avisar);
});

test('estadoRespaldo suaviza el aviso si el navegador prometió no borrar', () => {
  const dias = { a: { comidas: [] }, b: { comidas: [] }, c: { comidas: [] } };
  const conPersistencia = estadoRespaldo({ ultimoRespaldo: null, dias, ahora: 1000, persistente: true });
  esperarQue(/no está de más/.test(conPersistencia.texto), 'dio: ' + conPersistencia.texto);
});

test('estadoRespaldo avisa a los 14 días', () => {
  const ahora = Date.parse('2026-08-20T12:00:00');
  const dias = { a: { comidas: [] } };

  const reciente = estadoRespaldo({ ultimoRespaldo: ahora - 5 * DIA_MS, dias, ahora });
  esperarQue(!reciente.avisar);
  esperarQue(/hace 5 días/.test(reciente.texto), 'dio: ' + reciente.texto);

  const viejo = estadoRespaldo({ ultimoRespaldo: ahora - 20 * DIA_MS, dias, ahora });
  esperarQue(viejo.avisar);
  esperar(viejo.dias, 20);
});

test('estadoRespaldo usa el singular con un día', () => {
  const ahora = Date.parse('2026-08-20T12:00:00');
  const r = estadoRespaldo({ ultimoRespaldo: ahora - DIA_MS, dias: { a: { comidas: [] } }, ahora });
  esperarQue(/hace 1 día\./.test(r.texto), 'dio: ' + r.texto);
});

/* ============================================================
   Sincronización con Supabase (todo con un servidor simulado)
   ============================================================ */

/** Supabase de mentira: guarda filas en memoria y responde como el real. */
function supabaseFalso(inicial = { comidas: [], dias: [] }) {
  const tablas = clonar(inicial);
  const pedidos = [];

  const fetchFn = async (url, opciones = {}) => {
    const ruta = url.split('/rest/v1/')[1];
    const tabla = ruta.split('?')[0];
    pedidos.push({ url, metodo: opciones.method || 'GET', cuerpo: opciones.body ? JSON.parse(opciones.body) : null });

    if (!tablas[tabla]) {
      return { ok: false, status: 404, json: async () => ({ message: 'relation does not exist' }) };
    }

    if ((opciones.method || 'GET') === 'POST') {
      // upsert por (llave, id) en comidas y (llave, fecha) en días
      for (const fila of JSON.parse(opciones.body)) {
        const clave = tabla === 'comidas' ? 'id' : 'fecha';
        const pos = tablas[tabla].findIndex(f => f.llave === fila.llave && f[clave] === fila[clave]);
        if (pos >= 0) tablas[tabla][pos] = fila;
        else tablas[tabla].push(fila);
      }
      return { ok: true, status: 204, json: async () => [] };
    }

    const params = new URLSearchParams(ruta.split('?')[1] || '');
    const llave = (params.get('llave') || '').replace('eq.', '');
    const desde = Number((params.get('subido') || 'gt.0').replace('gt.', ''));

    const filas = tablas[tabla]
      .filter(f => f.llave === llave && (Number(f.subido) || 0) > desde)
      .sort((a, b) => a.subido - b.subido);

    return { ok: true, status: 200, json: async () => clonar(filas) };
  };

  return { fetchFn, tablas, pedidos };
}

function clienteDePrueba(servidor, señal = null) {
  return clienteSupabase({ url: 'https://xxx.supabase.co', anonKey: 'anon-de-prueba', fetchFn: servidor.fetchFn, señal });
}

function estadoConComidas(comidas, fecha = '2026-08-20') {
  const s = migrar(null);
  s.dias[fecha] = { peso: null, agua: 0, ejercicio: 0, nota: '', act: 0, comidas: clonar(comidas) };
  return s;
}

const LLAVE = 'abcdefghjkmnpqrstuvwxyz23456789a';

function comidaLocal(id, campos = {}) {
  return {
    id, ts: new Date(2026, 7, 20, 13, 0).getTime(), titulo: 'Comida ' + id, items: [],
    kcal: 500, prot: 30, carb: 50, gras: 15, momento: 'almuerzo', notas: '',
    thumb: null, foto: null, act: 1000, ...campos
  };
}

/* ---- llave ---- */

test('generarLlave arma una llave del largo esperado', () => {
  const l = generarLlave();
  esperar(l.length, LARGO_LLAVE);
  esperarQue(llaveValida(l), 'la que genera tiene que ser válida: ' + l);
});

test('generarLlave no repite', () => {
  const llaves = new Set(Array.from({ length: 50 }, () => generarLlave()));
  esperar(llaves.size, 50);
});

test('generarLlave evita los caracteres que se confunden', () => {
  const juntas = Array.from({ length: 20 }, () => generarLlave()).join('');
  esperarQue(!/[lo01]/.test(juntas), 'no puede haber l, o, 0 ni 1');
});

test('llaveValida rechaza lo que no corresponde', () => {
  esperarQue(!llaveValida(''), 'vacía');
  esperarQue(!llaveValida('corta'), 'corta');
  esperarQue(!llaveValida('A'.repeat(LARGO_LLAVE)), 'mayúsculas');
  esperarQue(!llaveValida('o'.repeat(LARGO_LLAVE)), 'caracteres excluidos');
  esperarQue(!llaveValida(null), 'nula');
});

test('llaveLegible la corta en bloques', () => {
  esperar(llaveLegible('abcdefgh23456789abcdefgh23456789'), 'abcdefgh 23456789 abcdefgh 23456789');
});

/* ---- cliente ---- */

test('clienteSupabase exige URL y clave', () => {
  let msg = '';
  try { clienteSupabase({ url: '', anonKey: 'x', fetchFn: async () => {} }); } catch (e) { msg = e.message; }
  esperarQue(/URL y la clave/.test(msg), 'dio: ' + msg);
});

testAsync('el cliente manda las cabeceras de Supabase', async () => {
  const servidor = supabaseFalso();
  await clienteDePrueba(servidor).probar(LLAVE);

  const pedido = servidor.pedidos[0];
  esperarQue(pedido.url.startsWith('https://xxx.supabase.co/rest/v1/comidas'), 'dio: ' + pedido.url);
  esperarQue(pedido.url.includes('llave=eq.' + LLAVE), 'tiene que filtrar por la llave');
});

testAsync('guardar manda las filas con el prefer de upsert', async () => {
  const servidor = supabaseFalso();
  await clienteDePrueba(servidor).guardar('comidas', [comidaAFila(comidaLocal('c1'), '2026-08-20', LLAVE)]);

  esperar(servidor.tablas.comidas.length, 1);
  esperar(servidor.pedidos[0].metodo, 'POST');
});

testAsync('guardar con lista vacía no llama a la red', async () => {
  const servidor = supabaseFalso();
  await clienteDePrueba(servidor).guardar('comidas', []);
  esperar(servidor.pedidos.length, 0);
});

testAsync('traer filtra por llave y por cuándo llegó al servidor', async () => {
  const servidor = supabaseFalso({
    comidas: [
      { llave: LLAVE, id: 'vieja', act: 500, subido: 500 },
      { llave: LLAVE, id: 'nueva', act: 2000, subido: 2000 },
      { llave: 'otra-llave-distinta-aaaaaaaaaaaa', id: 'ajena', act: 3000, subido: 3000 }
    ],
    dias: []
  });

  // el piso real es desde - 5 min por el margen de relojes, así que se pide bien arriba
  const filas = await clienteDePrueba(servidor).traer('comidas', LLAVE, 5 * 60000 + 1000);
  esperar(filas.map(f => f.id), ['nueva'], 'solo lo mío y posterior al último sync');
});

testAsync('el cliente traduce el 401 a algo entendible', async () => {
  const servidor = supabaseFalso();
  servidor.fetchFn = async () => ({ ok: false, status: 401, json: async () => ({ message: 'invalid key' }) });

  let msg = '';
  try { await clienteDePrueba(servidor).probar(LLAVE); } catch (e) { msg = e.message; }
  esperarQue(/rechazó la clave/.test(msg), 'dio: ' + msg);
});

testAsync('el cliente avisa si faltan las tablas', async () => {
  const servidor = supabaseFalso({});
  let msg = '';
  try { await clienteDePrueba(servidor).probar(LLAVE); } catch (e) { msg = e.message; }
  esperarQue(/supabase\.sql/.test(msg), 'tiene que decir qué hacer, dio: ' + msg);
});

testAsync('el cliente avisa si no hay conexión', async () => {
  const servidor = supabaseFalso();
  servidor.fetchFn = async () => { throw new TypeError('Failed to fetch'); };

  let msg = '';
  try { await clienteDePrueba(servidor).probar(LLAVE); } catch (e) { msg = e.message; }
  esperarQue(/No se pudo conectar/.test(msg), 'dio: ' + msg);
});

/* ---- forma de las filas ---- */

test('comidaAFila no manda las fotos', () => {
  const fila = comidaAFila(comidaLocal('c1', { thumb: 'data:...', foto: 'data:...' }), '2026-08-20', LLAVE);
  esperarQue(!('thumb' in fila) && !('foto' in fila), 'las fotos se quedan en el dispositivo');
  esperar(fila.llave, LLAVE);
  esperar(fila.fecha, '2026-08-20');
});

test('filaAComida conserva la foto local', () => {
  const fila = comidaAFila(comidaLocal('c1'), '2026-08-20', LLAVE);
  const local = comidaLocal('c1', { thumb: 'mi-foto' });
  esperar(filaAComida(fila, local).thumb, 'mi-foto', 'lo remoto no puede borrar la foto de acá');
  esperar(filaAComida(fila).thumb, null);
});

test('filaAComida sanea lo que viene del servidor', () => {
  const c = filaAComida({ id: 'x', kcal: '500', items: null, titulo: null });
  esperar(c.kcal, 500);
  esperar(c.items, []);
  esperar(c.titulo, 'Comida');
});

/* ---- qué se sube ---- */

test('cambiosLocales toma solo lo modificado después del último sync', () => {
  const estado = estadoConComidas([
    comidaLocal('vieja', { act: 500 }),
    comidaLocal('nueva', { act: 2000 })
  ]);
  const c = cambiosLocales(estado, 1000);
  esperar(c.comidas.map(x => x.comida.id), ['nueva']);
});

test('cambiosLocales incluye los días tocados', () => {
  const estado = estadoConComidas([comidaLocal('c1', { act: 100 })]);
  estado.dias['2026-08-20'].act = 3000;
  esperar(cambiosLocales(estado, 1000).dias.length, 1);
});

test('cambiosLocales incluye los borrados', () => {
  const estado = estadoConComidas([]);
  estado.borradas = [{ id: 'muerta', fecha: '2026-08-20', act: 2000 }];
  esperar(cambiosLocales(estado, 1000).borradas.length, 1);
});

test('cambiosLocales con todo viejo no devuelve nada', () => {
  const estado = estadoConComidas([comidaLocal('c1', { act: 500 })]);
  const c = cambiosLocales(estado, 1000);
  esperar(c.comidas.length + c.dias.length + c.borradas.length, 0);
});

/* ---- sincronización completa: los cuatro casos que importan ---- */

/** Simula un dispositivo: tiene su estado y sincroniza contra el servidor compartido. */
function dispositivo(servidor, estado = null) {
  return {
    estado: estado || migrar(null),
    ultimoSync: 0,
    async sincronizar(ahora = Date.now()) {
      const r = await sincronizar({
        cliente: clienteDePrueba(servidor),
        estado: this.estado,
        llave: LLAVE,
        ultimoSync: this.ultimoSync,
        ahora
      });
      this.estado = r.estado;
      this.ultimoSync = r.ultimoSync;
      return r.resumen;
    },
    comidas(fecha = '2026-08-20') {
      return (this.estado.dias[fecha]?.comidas || []).map(c => c.id);
    },
    comida(id, fecha = '2026-08-20') {
      return (this.estado.dias[fecha]?.comidas || []).find(c => c.id === id);
    }
  };
}

testAsync('subir: lo local llega al servidor', async () => {
  const servidor = supabaseFalso();
  const compu = dispositivo(servidor, estadoConComidas([comidaLocal('c1'), comidaLocal('c2')]));

  const resumen = await compu.sincronizar(5000);

  esperar(resumen.subidasComidas, 2);
  esperar(servidor.tablas.comidas.length, 2);
  esperar(servidor.tablas.comidas[0].llave, LLAVE);
});

testAsync('subir: no se manda dos veces lo que no cambió', async () => {
  const servidor = supabaseFalso();
  const compu = dispositivo(servidor, estadoConComidas([comidaLocal('c1')]));

  await compu.sincronizar(5000);
  const resumen = await compu.sincronizar(6000);
  esperar(resumen.subidasComidas, 0, 'la segunda vez no hay nada nuevo');
});

testAsync('bajar: el celular recibe lo que cargó la compu', async () => {
  const servidor = supabaseFalso();
  const compu = dispositivo(servidor, estadoConComidas([comidaLocal('c1'), comidaLocal('c2')]));
  const celu = dispositivo(servidor);

  await compu.sincronizar(5000);
  const resumen = await celu.sincronizar(6000);

  esperar(resumen.nuevas, 2);
  esperar(celu.comidas().sort(), ['c1', 'c2']);
  esperar(celu.comida('c1').kcal, 500);
});

testAsync('bajar: no duplica lo que ya estaba', async () => {
  const servidor = supabaseFalso();
  const compu = dispositivo(servidor, estadoConComidas([comidaLocal('c1')]));
  const celu = dispositivo(servidor);

  await compu.sincronizar(5000);
  await celu.sincronizar(6000);
  await celu.sincronizar(7000);

  esperar(celu.comidas(), ['c1']);
});

testAsync('bajar: la foto local no se pierde al recibir la versión remota', async () => {
  const servidor = supabaseFalso();
  const compu = dispositivo(servidor, estadoConComidas([comidaLocal('c1', { act: 5000, kcal: 700 })]));
  const celu = dispositivo(servidor, estadoConComidas([comidaLocal('c1', { act: 1000, thumb: 'mi-foto' })]));

  await compu.sincronizar(6000);
  await celu.sincronizar(7000);

  esperar(celu.comida('c1').kcal, 700, 'se actualizó con lo remoto');
  esperar(celu.comida('c1').thumb, 'mi-foto', 'pero la foto de acá sigue');
});

testAsync('conflicto: gana la edición más reciente', async () => {
  const servidor = supabaseFalso();
  const compu = dispositivo(servidor, estadoConComidas([comidaLocal('c1', { kcal: 500, act: 1000 })]));
  const celu = dispositivo(servidor, estadoConComidas([comidaLocal('c1', { kcal: 500, act: 1000 })]));

  await compu.sincronizar(2000);
  await celu.sincronizar(2100);

  // la misma comida editada en los dos lados; el celular la tocó después
  compu.estado.dias['2026-08-20'].comidas[0].kcal = 600;
  compu.estado.dias['2026-08-20'].comidas[0].act = 3000;
  celu.estado.dias['2026-08-20'].comidas[0].kcal = 900;
  celu.estado.dias['2026-08-20'].comidas[0].act = 4000;

  await compu.sincronizar(5000);
  await celu.sincronizar(5100);
  await compu.sincronizar(6000);

  esperar(compu.comida('c1').kcal, 900, 'la compu recibe la versión del celular, que es posterior');
  esperar(celu.comida('c1').kcal, 900);
});

testAsync('conflicto: lo viejo no pisa lo nuevo', async () => {
  const servidor = supabaseFalso();
  const compu = dispositivo(servidor, estadoConComidas([comidaLocal('c1', { kcal: 500, act: 1000 })]));
  const celu = dispositivo(servidor, estadoConComidas([comidaLocal('c1', { kcal: 900, act: 9000 })]));

  await compu.sincronizar(2000);       // sube la vieja
  const resumen = await celu.sincronizar(3000);

  esperar(celu.comida('c1').kcal, 900, 'la del celular es posterior: se queda');
  esperar(resumen.ignoradas, 1);
});

testAsync('borrado: lo borrado en un dispositivo no revive en el otro', async () => {
  const servidor = supabaseFalso();
  const compu = dispositivo(servidor, estadoConComidas([comidaLocal('c1'), comidaLocal('c2')]));
  const celu = dispositivo(servidor);

  await compu.sincronizar(2000);
  await celu.sincronizar(2100);
  esperar(celu.comidas().sort(), ['c1', 'c2']);

  // en la compu se borra una
  compu.estado.dias['2026-08-20'].comidas = compu.estado.dias['2026-08-20'].comidas.filter(c => c.id !== 'c1');
  compu.estado.borradas = [{ id: 'c1', fecha: '2026-08-20', act: 3000 }];

  await compu.sincronizar(4000);
  const resumen = await celu.sincronizar(4100);

  esperar(resumen.borradas, 1);
  esperar(celu.comidas(), ['c2'], 'en el celular también desaparece');
});

testAsync('borrado: una comida borrada no vuelve al sincronizar de nuevo', async () => {
  const servidor = supabaseFalso();
  const compu = dispositivo(servidor, estadoConComidas([comidaLocal('c1')]));
  const celu = dispositivo(servidor);

  await compu.sincronizar(2000);
  await celu.sincronizar(2100);

  compu.estado.dias['2026-08-20'].comidas = [];
  compu.estado.borradas = [{ id: 'c1', fecha: '2026-08-20', act: 3000 }];
  await compu.sincronizar(4000);
  await celu.sincronizar(4100);

  // el celular sincroniza tres veces más: no puede reaparecer
  await celu.sincronizar(5000);
  await celu.sincronizar(6000);
  esperar(celu.comidas(), []);
});

testAsync('borrado: si se borró acá, lo remoto viejo no la resucita', async () => {
  const servidor = supabaseFalso({
    comidas: [comidaAFila(comidaLocal('c1', { act: 1000 }), '2026-08-20', LLAVE)],
    dias: []
  });
  const celu = dispositivo(servidor);
  celu.estado.borradas = [{ id: 'c1', fecha: '2026-08-20', act: 5000 }];

  const resumen = await celu.sincronizar(6000);
  esperar(celu.comidas(), [], 'el borrado local es posterior: manda');
  esperar(resumen.ignoradas, 1);
});

testAsync('los días también sincronizan: peso, agua, ejercicio y nota', async () => {
  const servidor = supabaseFalso();
  const compu = dispositivo(servidor, estadoConComidas([comidaLocal('c1')]));
  compu.estado.dias['2026-08-20'] = {
    ...compu.estado.dias['2026-08-20'],
    peso: 91.5, agua: 6, ejercicio: 300, nota: 'buen día', act: 3000
  };

  const celu = dispositivo(servidor);
  await compu.sincronizar(4000);
  await celu.sincronizar(4100);

  const d = celu.estado.dias['2026-08-20'];
  esperar(d.peso, 91.5);
  esperar(d.agua, 6);
  esperar(d.ejercicio, 300);
  esperar(d.nota, 'buen día');
});

testAsync('el día más reciente gana', async () => {
  const servidor = supabaseFalso();
  const compu = dispositivo(servidor, estadoConComidas([]));
  compu.estado.dias['2026-08-20'] = { peso: 92, agua: 2, ejercicio: 0, nota: '', act: 1000, comidas: [] };

  const celu = dispositivo(servidor, estadoConComidas([]));
  celu.estado.dias['2026-08-20'] = { peso: 90, agua: 8, ejercicio: 0, nota: '', act: 9000, comidas: [] };

  await compu.sincronizar(2000);
  await celu.sincronizar(2100);
  await compu.sincronizar(3000);

  esperar(compu.estado.dias['2026-08-20'].peso, 90, 'el del celular es posterior');
  esperar(compu.estado.dias['2026-08-20'].agua, 8);
});

testAsync('las comidas quedan ordenadas por hora después de sincronizar', async () => {
  const servidor = supabaseFalso();
  const tarde = comidaLocal('cena', { ts: new Date(2026, 7, 20, 21, 0).getTime() });
  const temprano = comidaLocal('desayuno', { ts: new Date(2026, 7, 20, 8, 0).getTime() });

  const compu = dispositivo(servidor, estadoConComidas([tarde]));
  const celu = dispositivo(servidor, estadoConComidas([temprano]));

  await compu.sincronizar(2000);
  await celu.sincronizar(2100);

  esperar(celu.comidas(), ['desayuno', 'cena']);
});

testAsync('sincronizar rechaza una llave inválida', async () => {
  const servidor = supabaseFalso();
  let msg = '';
  try {
    await sincronizar({ cliente: clienteDePrueba(servidor), estado: migrar(null), llave: 'corta' });
  } catch (e) { msg = e.message; }
  esperarQue(/llave/.test(msg), 'dio: ' + msg);
  esperar(servidor.pedidos.length, 0, 'ni siquiera intenta');
});

testAsync('sincronizar no toca el estado que recibe', async () => {
  const servidor = supabaseFalso({
    comidas: [comidaAFila(comidaLocal('remota'), '2026-08-20', LLAVE)], dias: []
  });
  const estado = estadoConComidas([comidaLocal('local')]);
  const copia = clonar(estado);

  await sincronizar({ cliente: clienteDePrueba(servidor), estado, llave: LLAVE, ahora: 5000 });
  esperar(estado.dias, copia.dias, 'devuelve uno nuevo, no muta el original');
});

testAsync('tres dispositivos convergen al mismo estado', async () => {
  const servidor = supabaseFalso();
  const a = dispositivo(servidor, estadoConComidas([comidaLocal('a1', { act: 1000 })]));
  const b = dispositivo(servidor, estadoConComidas([comidaLocal('b1', { act: 2000 })]));
  const c = dispositivo(servidor);

  for (const d of [a, b, c]) await d.sincronizar(5000);
  for (const d of [a, b, c]) await d.sincronizar(6000);

  esperar(a.comidas().sort(), ['a1', 'b1']);
  esperar(b.comidas().sort(), ['a1', 'b1']);
  esperar(c.comidas().sort(), ['a1', 'b1']);
});

/* ============================================================
   Código de barras y Open Food Facts
   ============================================================ */

/* Respuesta real de Open Food Facts, recortada a los campos que se piden.
   Es un yogur griego que existe de verdad en la base. */
const OFF_YOGUR = {
  status: 1,
  product: {
    code: '7790742000811',
    product_name: 'Yogur griego natural',
    brands: 'La Serenísima',
    quantity: '160 g',
    serving_size: '1 pote (160 g)',
    serving_quantity: 160,
    image_front_small_url: 'https://images.openfoodfacts.org/yogur.jpg',
    nutriments: {
      'energy-kcal_100g': 97,
      proteins_100g: 8.5,
      carbohydrates_100g: 4.2,
      fat_100g: 5.1,
      fiber_100g: 0,
      sugars_100g: 4.2,
      salt_100g: 0.12
    }
  }
};

/* Un producto que solo trae energía en kJ, como pasa con varios europeos. */
const OFF_EN_KJ = {
  status: 1,
  product: {
    code: '80135463',
    product_name: 'Galletitas',
    brands: '',
    quantity: '200 g',
    nutriments: { energy_100g: 2100, proteins_100g: 7, carbohydrates_100g: 65, fat_100g: 20 }
  }
};

function respuestaOFF(datos, status = 200) {
  return { ok: status === 200, status, json: async () => datos };
}

function cacheProductos() {
  let datos = {};
  return {
    leer: (codigo) => leerProducto(datos, codigo),
    guardar: (p) => { datos = guardarProducto(datos, p); },
    contenido: () => datos
  };
}

/* ---- código ---- */

test('codigoValido acepta los formatos reales', () => {
  esperarQue(codigoValido('7790742000811'), 'EAN-13');
  esperarQue(codigoValido('80135463'), 'EAN-8');
  esperarQue(codigoValido('012345678905'), 'UPC-A');
  esperarQue(!codigoValido('123'), 'muy corto');
  esperarQue(!codigoValido('abcdefgh'), 'letras');
  esperarQue(!codigoValido(''), 'vacío');
});

test('limpiarCodigo saca lo que no sea número', () => {
  esperar(limpiarCodigo('779-074 200.0811'), '7790742000811');
});

/* ---- normalización ---- */

test('normalizarProducto arma la forma que usa la app', () => {
  const p = normalizarProducto(OFF_YOGUR);
  esperar(p.nombre, 'Yogur griego natural');
  esperar(p.marca, 'La Serenísima');
  esperar(p.gramosPorcion, 160);
  esperar(p.por100.calorias, 97);
  esperar(p.por100.proteinas, 8.5);
});

test('normalizarProducto convierte los kilojoules a calorías', () => {
  const p = normalizarProducto(OFF_EN_KJ);
  cerca(p.por100.calorias, 2100 / 4.184, 1, 'sin kcal directo hay que convertir');
});

test('normalizarProducto pasa la sal a sodio en miligramos', () => {
  // 0,12 g de sal ≈ 0,048 g de sodio = 48 mg
  esperar(normalizarProducto(OFF_YOGUR).por100.sodio, 48);
});

test('normalizarProducto usa el nombre en español si está', () => {
  const datos = clonar(OFF_YOGUR);
  datos.product.product_name_es = 'Yogur griego';
  esperar(normalizarProducto(datos).nombre, 'Yogur griego');
});

test('normalizarProducto devuelve null si no hay producto o nombre', () => {
  esperar(normalizarProducto({}), null);
  esperar(normalizarProducto({ product: { code: '1', nutriments: {} } }), null);
});

test('productoUtil descarta los que no tienen calorías', () => {
  esperarQue(productoUtil(normalizarProducto(OFF_YOGUR)));
  const sinDatos = normalizarProducto({ product: { code: '1', product_name: 'Algo', nutriments: {} } });
  esperarQue(!productoUtil(sinDatos));
});

/* ---- búsqueda ---- */

testAsync('buscarProducto trae y normaliza', async () => {
  let url = '';
  const fetchFn = async (u) => { url = u; return respuestaOFF(OFF_YOGUR); };

  const p = await buscarProducto('7790742000811', { fetchFn });
  esperar(p.nombre, 'Yogur griego natural');
  esperar(p.deCache, false);
  esperarQue(url.includes('/api/v2/product/7790742000811.json'), 'dio: ' + url);
  esperarQue(url.includes('fields='), 'tiene que pedir solo los campos que usa');
});

testAsync('buscarProducto usa el cache la segunda vez', async () => {
  let llamadas = 0;
  const fetchFn = async () => { llamadas++; return respuestaOFF(OFF_YOGUR); };
  const cache = cacheProductos();

  await buscarProducto('7790742000811', { fetchFn, cache });
  const segunda = await buscarProducto('7790742000811', { fetchFn, cache });

  esperar(llamadas, 1, 'el mismo producto no se pide dos veces');
  esperar(segunda.deCache, true);
  esperar(segunda.nombre, 'Yogur griego natural');
});

testAsync('buscarProducto rechaza códigos inválidos sin tocar la red', async () => {
  let llamadas = 0;
  const fetchFn = async () => { llamadas++; return respuestaOFF(OFF_YOGUR); };

  let msg = '';
  try { await buscarProducto('123', { fetchFn }); } catch (e) { msg = e.message; }
  esperarQue(/no parece válido/.test(msg), 'dio: ' + msg);
  esperar(llamadas, 0);
});

testAsync('buscarProducto avisa si el producto no está en la base', async () => {
  for (const respuesta of [respuestaOFF({ status: 0 }), respuestaOFF({}, 404)]) {
    let msg = '';
    try { await buscarProducto('7790742000811', { fetchFn: async () => respuesta }); } catch (e) { msg = e.message; }
    esperarQue(/no está en Open Food Facts/.test(msg), 'dio: ' + msg);
  }
});

testAsync('buscarProducto avisa si el producto no trae nutrientes', async () => {
  const sinDatos = { status: 1, product: { code: '7790742000811', product_name: 'Algo raro', nutriments: {} } };
  let msg = '';
  try { await buscarProducto('7790742000811', { fetchFn: async () => respuestaOFF(sinDatos) }); } catch (e) { msg = e.message; }
  esperarQue(/sin datos nutricionales/.test(msg), 'dio: ' + msg);
  esperarQue(/Algo raro/.test(msg), 'y tiene que decir de qué producto habla');
});

testAsync('buscarProducto avisa si no hay conexión', async () => {
  let msg = '';
  try {
    await buscarProducto('7790742000811', { fetchFn: async () => { throw new TypeError('Failed to fetch'); } });
  } catch (e) { msg = e.message; }
  esperarQue(/Revisá la conexión/.test(msg), 'dio: ' + msg);
});

/* ---- cache ---- */

test('el cache de productos respeta el tope', () => {
  let cache = {};
  for (let i = 0; i < MAX_PRODUCTOS + 20; i++) {
    cache = guardarProducto(cache, { codigo: 'c' + i, nombre: 'p' + i, por100: { calorias: 100 }, traido: 1000 + i });
  }
  esperar(Object.keys(cache).length, MAX_PRODUCTOS);
});

test('el cache descarta los productos viejos', () => {
  const cache = guardarProducto({}, { codigo: '1', nombre: 'Viejo', por100: { calorias: 100 }, traido: 0 });
  esperar(leerProducto(cache, '1', 91 * 86400000), null, 'a los 91 días se vuelve a pedir');
  esperarQue(!!leerProducto(cache, '1', 80 * 86400000), 'a los 80 todavía vale');
});

/* ---- porciones ---- */

test('porcionesDe ofrece la del envase, 100 g y el envase entero', () => {
  const p = normalizarProducto(OFF_YOGUR);
  const opciones = porcionesDe(p);
  esperar(opciones[0].gramos, 160, 'primero la porción declarada');
  esperarQue(opciones.some(o => o.gramos === 100), 'siempre 100 g');
});

test('porcionesDe no repite si la porción es el envase entero', () => {
  const p = normalizarProducto(OFF_YOGUR);
  const gramos = porcionesDe(p).map(o => o.gramos);
  esperar(gramos.length, new Set(gramos).size, 'sin duplicados');
});

test('porcionesDe funciona sin porción declarada', () => {
  const p = normalizarProducto(OFF_EN_KJ);
  const opciones = porcionesDe(p);
  esperarQue(opciones.some(o => o.gramos === 100));
  esperarQue(opciones.some(o => o.gramos === 200), 'el envase de 200 g');
});

/* ---- el alimento final ---- */

test('productoAItem escala los valores a los gramos elegidos', () => {
  const p = normalizarProducto(OFF_YOGUR);
  const item = productoAItem(p, 160);

  esperar(item.calorias, Math.round(97 * 1.6));
  esperar(item.proteinas, Math.round(8.5 * 1.6));
  esperar(item.porcion, '160 g');
});

test('productoAItem con 100 g deja los valores como vienen', () => {
  const item = productoAItem(normalizarProducto(OFF_YOGUR), 100);
  esperar(item.calorias, 97);
});

test('productoAItem suma la marca al nombre', () => {
  const item = productoAItem(normalizarProducto(OFF_YOGUR), 100);
  esperarQue(item.nombre.includes('La Serenísima'), 'dio: ' + item.nombre);
});

test('productoAItem no repite la marca si ya está en el nombre', () => {
  const datos = clonar(OFF_YOGUR);
  datos.product.product_name = 'Yogur La Serenísima';
  const item = productoAItem(normalizarProducto(datos), 100);
  esperar(item.nombre, 'Yogur La Serenísima');
});

test('productoAItem trae fibra, azúcar y sodio', () => {
  const item = productoAItem(normalizarProducto(OFF_YOGUR), 100);
  esperar(item.azucar, 4);
  esperar(item.sodio, 48);
  esperar(item.fibra, 0);
});

/* ============================================================
   Proxy: de dónde sale el acceso a la API
   ============================================================ */

const SIN_PROXY = { proxyUrl: '' };
const CON_PROXY = { proxyUrl: 'https://deficit-proxy.workers.dev' };

test('accesoApi usa la clave propia cuando está cargada', () => {
  const a = accesoApi({ apiKey: 'sk-mia' }, CON_PROXY);
  esperar(a.apiKey, 'sk-mia');
  esperar(a.proxyUrl, '', 'con clave propia no se pasa por el proxy');
});

test('accesoApi cae al proxy cuando no hay clave', () => {
  const a = accesoApi({ apiKey: '' }, CON_PROXY);
  esperar(a.apiKey, '');
  esperar(a.proxyUrl, 'https://deficit-proxy.workers.dev');
});

test('accesoApi ignora una clave que es solo espacios', () => {
  const a = accesoApi({ apiKey: '   ' }, CON_PROXY);
  esperar(a.proxyUrl, 'https://deficit-proxy.workers.dev', 'espacios no son una clave');
});

test('hayAcceso es falso solo si no hay ni clave ni proxy', () => {
  esperarQue(hayAcceso({ apiKey: 'k' }, SIN_PROXY), 'con clave hay acceso');
  esperarQue(hayAcceso({ apiKey: '' }, CON_PROXY), 'con proxy hay acceso');
  esperarQue(!hayAcceso({ apiKey: '' }, SIN_PROXY), 'sin nada no hay acceso');
});

testAsync('por el proxy no viaja la clave', async () => {
  let capturado = null;
  const fetchFn = async (url, opts) => { capturado = { url, opts }; return respuestaOk(COMIDA_OK); };

  await analizarImagen({ fetchFn, proxyUrl: 'https://mi-proxy.dev', imagen: 'BASE64' });

  esperar(capturado.url, 'https://mi-proxy.dev', 'tiene que pegarle al proxy, no a la API');
  esperar(capturado.opts.headers['x-api-key'], undefined, 'la clave no puede salir del navegador');
  esperar(capturado.opts.headers['anthropic-dangerous-direct-browser-access'], undefined);
  esperar(capturado.opts.headers['anthropic-version'], '2023-06-01', 'la versión sí viaja');
  esperar(JSON.parse(capturado.opts.body).messages[0].content[0].source.data, 'BASE64');
});

testAsync('sin proxy sigue yendo derecho a la API con la clave', async () => {
  let capturado = null;
  const fetchFn = async (url, opts) => { capturado = { url, opts }; return respuestaOk(COMIDA_OK); };

  await analizarImagen({ fetchFn, apiKey: 'sk-mia', imagen: 'x' });

  esperar(capturado.url, 'https://api.anthropic.com/v1/messages');
  esperar(capturado.opts.headers['x-api-key'], 'sk-mia');
});

testAsync('analizarImagen no exige clave si hay proxy', async () => {
  const fetchFn = async () => respuestaOk(COMIDA_OK);
  const r = await analizarImagen({ fetchFn, apiKey: '', proxyUrl: 'https://mi-proxy.dev', imagen: 'x' });
  esperarQue(r.items.length > 0, 'tiene que analizar igual, sin clave local');
});

testAsync('sin clave y sin proxy avisa que falta la key', async () => {
  const fetchFn = async () => { throw new Error('no debería llamar'); };
  try {
    await analizarImagen({ fetchFn, apiKey: '', imagen: 'x' });
    esperarQue(false, 'tendría que haber fallado');
  } catch (e) {
    esperarQue(/API key/.test(e.message), 'el mensaje tiene que hablar de la key: ' + e.message);
  }
});

testAsync('sugerirComida también sabe usar el proxy', async () => {
  let url = null;
  const fetchFn = async (u) => {
    url = u;
    return respuestaOk({ opciones: [{
      titulo: 'Ensalada de pollo',
      porque: 'Entra en lo que te queda y suma proteína',
      items: [{ nombre: 'Pollo', porcion: '150 g', calorias: 250, proteinas: 40, carbohidratos: 0, grasas: 9 }]
    }] });
  };

  await sugerirComida({
    fetchFn, apiKey: '', proxyUrl: 'https://mi-proxy.dev',
    margen: { kcal: 600, prot: 40 }
  });

  esperar(url, 'https://mi-proxy.dev');
});

testAsync('los reintentos del proxy no filtran la clave', async () => {
  const urls = [];
  const headers = [];
  let llamadas = 0;
  const fetchFn = async (u, o) => {
    urls.push(u); headers.push(o.headers); llamadas++;
    return llamadas < 3 ? respuestaError(429, 'rate limit') : respuestaOk(COMIDA_OK);
  };

  await analizarImagen({ fetchFn, proxyUrl: 'https://mi-proxy.dev', imagen: 'x', dormir: async () => {} });

  esperar(llamadas, 3, 'tiene que reintentar');
  esperarQue(urls.every(u => u === 'https://mi-proxy.dev'), 'todos los intentos van al proxy');
  esperarQue(headers.every(h => !h['x-api-key']), 'ningún reintento puede mandar la clave');
});


testAsync('con proxy, el 401 no manda a Ajustes', async () => {
  const fetchFn = async () => respuestaError(401, 'invalid key');
  try {
    await analizarImagen({ fetchFn, proxyUrl: 'https://mi-proxy.dev', imagen: 'x' });
    esperarQue(false, 'tendría que haber fallado');
  } catch (e) {
    esperarQue(/Cloudflare/.test(e.message), 'tiene que apuntar al proxy: ' + e.message);
    esperarQue(!/Ajustes/.test(e.message), 'mandar a Ajustes sería mentira: la clave no está ahí');
  }
});

testAsync('sin proxy, el 401 sigue mandando a Ajustes', async () => {
  const fetchFn = async () => respuestaError(401, 'invalid key');
  try {
    await analizarImagen({ fetchFn, apiKey: 'k', imagen: 'x' });
    esperarQue(false, 'tendría que haber fallado');
  } catch (e) {
    esperarQue(/Ajustes/.test(e.message), 'ahí sí está la clave: ' + e.message);
  }
});


/* ---- credenciales: locales vs las que vienen con la app ---- */

const APP_SUPA = { url: 'https://abc.supabase.co', anonKey: 'anon-de-la-app' };

test('resolverCredenciales usa las de la app cuando no hay locales', () => {
  const r = resolverCredenciales({}, APP_SUPA);
  esperar(r.url, 'https://abc.supabase.co');
  esperar(r.anonKey, 'anon-de-la-app');
  esperarQue(r.global, 'tiene que avisar que son las globales');
});

test('lo cargado a mano le gana al default de la app', () => {
  const r = resolverCredenciales({ url: 'https://mia.supabase.co', anonKey: 'mia' }, APP_SUPA);
  esperar(r.url, 'https://mia.supabase.co');
  esperar(r.anonKey, 'mia');
  esperarQue(!r.global, 'son propias, no globales');
});

test('sin nada en ningún lado no hay credenciales', () => {
  const r = resolverCredenciales({}, {});
  esperar(r.url, '');
  esperar(r.anonKey, '');
  esperarQue(!r.global, 'no hay default que usar');
});

test('resolverCredenciales le saca la barra final a la URL', () => {
  esperar(resolverCredenciales({ url: 'https://x.supabase.co/' }, {}).url, 'https://x.supabase.co');
});

test('una URL local con la clave de la app no cuenta como global', () => {
  const r = resolverCredenciales({ url: 'https://mia.supabase.co' }, APP_SUPA);
  esperar(r.url, 'https://mia.supabase.co');
  esperar(r.anonKey, 'anon-de-la-app', 'completa lo que falta');
  esperarQue(!r.global, 'hay algo local, así que los campos no están vacíos');
});

testAsync('el cliente arma bien la URL viniendo de las credenciales de la app', async () => {
  let visto = null;
  const cred = resolverCredenciales({}, APP_SUPA);
  const cli = clienteSupabase({
    url: cred.url, anonKey: cred.anonKey,
    fetchFn: async (u, o) => { visto = { u, o }; return { ok: true, status: 200, json: async () => [] }; }
  });

  await cli.probar('a'.repeat(32));
  esperarQue(visto.u.startsWith('https://abc.supabase.co/rest/v1/'), 'la base tiene que ser la de la app: ' + visto.u);
  esperar(visto.o.headers.apikey, 'anon-de-la-app');
});


/* ---- cuándo la app se puede actualizar sola ---- */

test('con la app ociosa se actualiza sola', () => {
  esperarQue(sePuedeActualizarSolo({}), 'sin nada en juego no hay que preguntar');
  esperarQue(sePuedeActualizarSolo({ modalAbierto: false, analizando: false, editando: false }), 'idem explícito');
});

test('con un modal abierto NO se actualiza sola', () => {
  esperarQue(!sePuedeActualizarSolo({ modalAbierto: true }), 'recargar le sacaría el modal de las manos');
});

test('con un análisis corriendo NO se actualiza sola', () => {
  esperarQue(!sePuedeActualizarSolo({ analizando: true }), 'se perdería el análisis ya pagado');
});

test('escribiendo NO se actualiza sola', () => {
  esperarQue(!sePuedeActualizarSolo({ editando: true }), 'se perdería lo tipeado');
});

test('alcanza con una sola razón para no actualizar', () => {
  esperarQue(!sePuedeActualizarSolo({ modalAbierto: true, analizando: false, editando: false }));
  esperarQue(!sePuedeActualizarSolo({ modalAbierto: true, analizando: true, editando: true }));
});


/* ---- cuándo sincronizar sola ---- */

test('no sincroniza sola si no está configurada', () => {
  esperarQue(!convieneSincronizar({ configurada: false, ultimoSync: 0, ahora: 1000000 }));
});

test('sincroniza al arrancar si nunca sincronizó', () => {
  esperarQue(convieneSincronizar({ configurada: true, ultimoSync: 0, ahora: 1000000 }));
});

test('no sincroniza de nuevo si acaba de hacerlo', () => {
  const ahora = 1000000;
  esperarQue(!convieneSincronizar({ configurada: true, ultimoSync: ahora - 30000, ahora }),
    'abrir y cerrar la app no tiene que disparar una ronda por vez');
});

test('vuelve a sincronizar pasado el piso de tiempo', () => {
  const ahora = 1000000;
  esperarQue(convieneSincronizar({ configurada: true, ultimoSync: ahora - 180000, ahora }));
});

test('el piso de tiempo es configurable', () => {
  const ahora = 1000000;
  esperarQue(convieneSincronizar({ configurada: true, ultimoSync: ahora - 5000, ahora, minimoMs: 1000 }));
});

testAsync('sincronizar no pisa el estado si el servidor falla a mitad', async () => {
  const estado = {
    dias: { '2026-08-20': { peso: 80, agua: 0, ejercicio: 0, nota: '', act: 1,
      comidas: [{ id: 'c1', ts: 1, titulo: 'Asado', items: [], kcal: 700, prot: 40, carb: 10, gras: 50, momento: 'almuerzo', act: 1 }] } },
    borradas: [], cfg: {}
  };
  const antes = JSON.stringify(estado);

  const cliente = {
    traer: async () => { throw new Error('se cortó la red'); },
    guardar: async () => [],
    probar: async () => true
  };

  try {
    await sincronizar({ cliente, estado, llave: 'a'.repeat(32), ultimoSync: 0 });
    esperarQue(false, 'tendría que haber propagado el error');
  } catch (e) {
    esperarQue(/red/.test(e.message), 'el error llega tal cual: ' + e.message);
  }

  esperar(JSON.stringify(estado), antes, 'el estado local no se puede haber tocado');
});



/* ---- reintentos del cliente de Supabase ---- */

function respuestaSupa(status, cuerpo = []) {
  return { ok: status >= 200 && status < 300, status, json: async () => cuerpo };
}

testAsync('un 503 de paso no rompe el sync: reintenta', async () => {
  let llamadas = 0;
  const cli = clienteSupabase({
    url: 'https://x.supabase.co', anonKey: 'k', dormir: async () => {},
    fetchFn: async () => { llamadas++; return llamadas < 3 ? respuestaSupa(503) : respuestaSupa(200, [{ id: 'c1' }]); }
  });

  const r = await cli.traer('comidas', 'a'.repeat(32));
  esperar(llamadas, 3, 'dos fallos y a la tercera va');
  esperar(r.length, 1);
});

testAsync('una clave mal puesta NO se reintenta: no va a cambiar', async () => {
  let llamadas = 0;
  const cli = clienteSupabase({
    url: 'https://x.supabase.co', anonKey: 'k', dormir: async () => {},
    fetchFn: async () => { llamadas++; return respuestaSupa(401, { message: 'bad key' }); }
  });

  try { await cli.traer('comidas', 'a'.repeat(32)); } catch { /* esperado */ }
  esperar(llamadas, 1, 'insistir con una clave inválida es perder el tiempo');
});

testAsync('el backoff crece entre intentos', async () => {
  const esperas = [];
  const cli = clienteSupabase({
    url: 'https://x.supabase.co', anonKey: 'k', base: 100,
    dormir: async (ms) => { esperas.push(ms); },
    fetchFn: async () => respuestaSupa(500)
  });

  try { await cli.traer('comidas', 'a'.repeat(32)); } catch { /* esperado */ }
  esperar(esperas, [100, 200], 'cada intento espera el doble que el anterior');
});

testAsync('si se cae la red del todo, avisa después de agotar los intentos', async () => {
  let llamadas = 0;
  const cli = clienteSupabase({
    url: 'https://x.supabase.co', anonKey: 'k', dormir: async () => {},
    fetchFn: async () => { llamadas++; throw new Error('offline'); }
  });

  try {
    await cli.traer('comidas', 'a'.repeat(32));
    esperarQue(false, 'tendría que haber fallado');
  } catch (e) {
    esperarQue(/conectar con Supabase/.test(e.message), e.message);
  }
  esperar(llamadas, 3);
});


/* ============================================================
   Modos
   ============================================================ */

/* Varón de 35 años, 180 cm, 85 kg, actividad moderada.
   TMB Mifflin = 10*85 + 6.25*180 - 5*35 + 5 = 850 + 1125 - 175 + 5 = 1805
   TDEE = 1805 * 1.55 = 2798 */
const PERFIL_M = { sexo: 'm', edad: 35, altura: 180, peso: 85, actividad: 1.55 };

/* Mujer de 30, 165 cm, 60 kg.
   TMB = 600 + 1031.25 - 150 - 161 = 1320 (redondeado) */
const PERFIL_F = { sexo: 'f', edad: 30, altura: 165, peso: 60, actividad: 1.55 };

test('el gasto basal sale de Mifflin-St Jeor', () => {
  const o = objetivoDeModo(PERFIL_M, 'mantenimiento');
  esperar(o.tmb, 1805, 'TMB calculado a mano');
  esperar(o.tdee, 2798, 'TDEE = TMB x 1,55');
});

test('la formula cambia con el genero', () => {
  esperar(objetivoDeModo(PERFIL_F, 'mantenimiento').tmb, 1320);
});

test('mantenimiento no aplica deficit', () => {
  const o = objetivoDeModo(PERFIL_M, 'mantenimiento');
  esperar(o.kcal, o.tdee, 'comes lo que gastas');
  esperar(o.kgSemana, 0);
});

test('cada modo baja lo que promete', () => {
  const tdee = objetivoDeModo(PERFIL_M, 'mantenimiento').tdee;
  esperar(objetivoDeModo(PERFIL_M, 'moderado').kcal, Math.round(tdee * 0.8));
  esperar(objetivoDeModo(PERFIL_M, 'agresivo').kcal, Math.round(tdee * 0.7));
  esperar(objetivoDeModo(PERFIL_M, 'definicion').kcal, Math.round(tdee * 0.85));
});

test('volumen suma en vez de restar', () => {
  const o = objetivoDeModo(PERFIL_M, 'volumen');
  esperarQue(o.kcal > o.tdee, 'tiene que comer por encima del gasto');
});

test('el objetivo sale del cuerpo, no de una constante', () => {
  const flaco = objetivoDeModo({ ...PERFIL_M, peso: 60 }, 'moderado');
  const grande = objetivoDeModo({ ...PERFIL_M, peso: 110 }, 'moderado');
  esperarQue(grande.kcal > flaco.kcal + 300, 'dos cuerpos distintos no pueden dar lo mismo');
});

test('los macros cierran con las calorias', () => {
  for (const m of ['mantenimiento', 'moderado', 'agresivo', 'definicion', 'volumen']) {
    const o = objetivoDeModo(PERFIL_M, m);
    const suma = o.prot * 4 + o.carb * 4 + o.gras * 9;
    esperarQue(Math.abs(suma - o.kcal) < 60, m + ': los macros suman ' + suma + ' contra ' + o.kcal);
  }
});

test('keto fija los carbohidratos en 30 g y llena con grasa', () => {
  const o = objetivoDeModo(PERFIL_M, 'keto');
  esperar(o.carb, 30);
  esperar(o.carbosMaxDia, 30);
  esperarQue(o.gras * 9 > o.kcal * 0.55, 'la mayoria de las calorias tienen que venir de grasa');
});

test('la proteina se calcula por kilo de peso', () => {
  const o = objetivoDeModo(PERFIL_M, 'definicion');
  esperarQue(o.prot >= 85 * 2.0, 'definicion pide ~2,2 g/kg y dio ' + o.prot + ' g para 85 kg');
});

/* ---- pisos de seguridad ---- */

test('ningun modo baja del piso de seguridad', () => {
  const chica = { sexo: 'f', edad: 60, altura: 150, peso: 48, actividad: 1.2 };
  const o = objetivoDeModo(chica, 'agresivo');
  esperarQue(o.kcal >= 1200, 'no puede quedar en ' + o.kcal);
  esperarQue(o.ajustado, 'tiene que avisar que lo ajusto');
  esperarQue(/musculo|músculo/.test(o.motivo), 'y explicar por que: ' + o.motivo);
});

test('el piso nunca queda por debajo del metabolismo basal', () => {
  const o = objetivoDeModo({ ...PERFIL_M, peso: 70 }, 'agresivo');
  esperarQue(o.kcal >= o.tmb, o.kcal + ' no puede ser menor que el basal ' + o.tmb);
});

test('sin datos del cuerpo no hay objetivo inventado', () => {
  esperar(objetivoDeModo({ sexo: 'm' }, 'moderado'), null);
  esperar(objetivoDeModo(null, 'moderado'), null);
});

test('un modo que ya no existe cae en el de siempre', () => {
  esperar(objetivoDeModo(PERFIL_M, 'inventado').modo, 'moderado');
});

/* ---- apta o no apta ---- */

const OBJ_M = objetivoDeModo(PERFIL_M, 'moderado');
const OBJ_KETO = objetivoDeModo(PERFIL_M, 'keto');

test('keto: una comida con muchos carbohidratos no entra', () => {
  const r = comidaApta({ kcal: 600, carb: 45, prot: 20 }, 'keto', OBJ_KETO, { carb: 0 });
  esperarQue(!r.apta, 'no puede entrar');
  esperarQue(/45 g/.test(r.motivo), 'el motivo tiene que decir el numero: ' + r.motivo);
});

test('keto: una comida baja en carbohidratos entra', () => {
  const r = comidaApta({ kcal: 600, carb: 6, prot: 40 }, 'keto', OBJ_KETO, { carb: 0 });
  esperarQue(r.apta);
  esperar(r.nivel, 'si');
});

test('keto: la misma comida deja de entrar si ya gastaste los carbohidratos', () => {
  const comida = { kcal: 400, carb: 12, prot: 20 };
  esperarQue(comidaApta(comida, 'keto', OBJ_KETO, { carb: 0 }).apta, 'a la manana entra');
  esperarQue(!comidaApta(comida, 'keto', OBJ_KETO, { carb: 25 }).apta, 'con 25 g ya gastados, no');
});

test('una comida que se lleva el dia entero no entra en ningun modo', () => {
  const r = comidaApta({ kcal: Math.round(OBJ_M.kcal * 0.7), carb: 80, prot: 30 }, 'moderado', OBJ_M);
  esperarQue(!r.apta);
  esperarQue(/% de tu objetivo/.test(r.motivo), r.motivo);
});

test('una comida grande pero razonable entra con aviso', () => {
  const r = comidaApta({ kcal: Math.round(OBJ_M.kcal * 0.5), carb: 60, prot: 40 }, 'moderado', OBJ_M);
  esperarQue(r.apta, 'entra');
  esperar(r.nivel, 'justo', 'pero avisando que es grande');
});

test('una comida normal entra sin ruido', () => {
  const r = comidaApta({ kcal: 500, carb: 50, prot: 35 }, 'moderado', OBJ_M);
  esperarQue(r.apta);
  esperar(r.nivel, 'si');
  esperar(r.motivo, '', 'sin motivo no hay nada que mostrar');
});

/* ---- recomendaciones ---- */

test('cada modo tiene sus propias recomendaciones', () => {
  const keto = recomendacionesDeModo('keto').join(' ');
  const vol = recomendacionesDeModo('volumen').join(' ');
  esperarQue(/carbohidratos escondidos/.test(keto), 'keto habla de carbohidratos');
  esperarQue(/fuerza/.test(vol), 'volumen habla de entrenar');
  esperarQue(keto !== vol, 'no pueden ser las mismas');
});

test('todos los modos tienen recomendaciones', () => {
  for (const m of listaModos()) {
    esperarQue(recomendacionesDeModo(m.id).length >= 3, m.id + ' tiene pocas');
  }
});

/* ---- actividades por MET ---- */

test('las calorias del ejercicio salen de MET x peso x horas', () => {
  const running = ACTIVIDADES.find(a => a.id === 'running');
  esperar(caloriasActividad(running, 85, 30), Math.round(9.8 * 85 * 0.5));
  esperar(caloriasActividad(running, 85, 60), Math.round(9.8 * 85));
});

test('cada actividad trae su duracion habitual', () => {
  const porId = (id) => ACTIVIDADES.find(a => a.id === id);
  esperar(porId('funcional').minutos, 60);
  esperar(porId('running').minutos, 30);
  esperar(porId('futbol').minutos, 60);
});

test('sin minutos usa la duracion por defecto de la actividad', () => {
  const f = ACTIVIDADES.find(a => a.id === 'funcional');
  esperar(caloriasActividad(f, 85), Math.round(6.0 * 85 * 1));
});

test('el mismo ejercicio gasta mas en alguien mas pesado', () => {
  const f = ACTIVIDADES.find(a => a.id === 'futbol');
  esperarQue(caloriasActividad(f, 100) > caloriasActividad(f, 70));
});

test('se pueden agregar actividades propias sin perder las del catalogo', () => {
  const estado = { cfg: { actividades: [{ id: 'escalada', nombre: 'Escalada', met: 8, minutos: 90 }] } };
  const todas = actividadesDe(estado);
  esperarQue(todas.some(a => a.id === 'escalada'), 'esta la propia');
  esperarQue(todas.some(a => a.id === 'running'), 'y siguen las de siempre');
});

test('una actividad del catalogo se puede ajustar sin duplicarla', () => {
  const estado = { cfg: { actividades: [{ id: 'running', nombre: 'Running', minutos: 45 }] } };
  const todas = actividadesDe(estado);
  esperar(todas.filter(a => a.id === 'running').length, 1, 'no puede aparecer dos veces');
  esperar(todas.find(a => a.id === 'running').minutos, 45, 'con la duracion propia');
  esperar(todas.find(a => a.id === 'running').met, 9.8, 'pero conservando el MET del catalogo');
});

test('las favoritas por defecto son tres', () => {
  esperar(actividadesFavoritas({ cfg: {} }).length, 3);
});

/* ---- agua ---- */

test('el objetivo de vasos sale del peso', () => {
  esperar(vasosObjetivo(85), Math.round((85 * 35) / 250));
  esperarQue(vasosObjetivo(50) >= 6, 'con un piso razonable');
  esperarQue(vasosObjetivo(140) <= 12, 'y un techo, o serian 20 vasos');
});


/* ---- veredicto: dice la verdad o dice que no sabe ---- */

/* Serie de dias con peso y comidas. deltaDiario positivo = mas peso en el
   pasado = la persona esta bajando. */
function serie({ dias = 14, kcalDia = 2000, pesoHoy = 85, bajaPorSemana = 0.5 } = {}) {
  const out = {};
  const porDia = bajaPorSemana / 7;
  for (let i = 0; i < dias; i++) {
    const f = sumarDias(FIN_FIXTURE, -i);
    out[f] = {
      peso: +(pesoHoy + porDia * i).toFixed(2),
      agua: 0, ejercicio: 0, nota: '', act: 1,
      comidas: [{ id: 'c' + i, ts: tsEnMomento(f, 'almuerzo'), momento: 'almuerzo',
                  titulo: 'Dia', items: [], kcal: kcalDia, prot: 100, carb: 100, gras: 50 }]
    };
  }
  return out;
}

test('con pocos dias no inventa una tendencia', () => {
  const v = veredictoProgreso(serie({ dias: 4 }), OBJ_M, FIN_FIXTURE);
  esperar(v.estado, 'sin-datos');
  esperarQue(/Faltan/.test(v.detalle), 'tiene que decir cuanto falta: ' + v.detalle);
  esperarQue(/agua y sal|inventada/.test(v.detalle), 'y por que no puede afirmar nada');
});

test('cuenta cuantos dias faltan, no dice "pocos"', () => {
  const v = veredictoProgreso(serie({ dias: 6 }), OBJ_M, FIN_FIXTURE);
  esperarQue(/4 dias de peso|4 días de peso/.test(v.detalle), 'faltan 4 para los 10: ' + v.detalle);
});

test('sin objetivo no se pronuncia', () => {
  esperar(veredictoProgreso(serie({}), null, FIN_FIXTURE).estado, 'sin-datos');
});

test('detecta que vas en camino', () => {
  // el objetivo moderado apunta a ~0,55 kg/semana; bajando eso, va bien
  const v = veredictoProgreso(serie({ dias: 21, kcalDia: 1500, bajaPorSemana: OBJ_M.kgSemana }), OBJ_M, FIN_FIXTURE);
  esperar(v.estado, 'bien');
  esperarQue(/kg por semana/.test(v.detalle), 'tiene que mostrar el numero real: ' + v.detalle);
});

test('detecta que no estas bajando, y no lo maquilla', () => {
  const v = veredictoProgreso(serie({ dias: 21, kcalDia: 1500, bajaPorSemana: 0 }), OBJ_M, FIN_FIXTURE);
  esperar(v.estado, 'mal');
  esperarQue(/No estas bajando|No estás bajando/.test(v.titulo), v.titulo);
  esperarQue(/registras|registrás|subestiman/.test(v.detalle), 'tiene que dar la explicacion mas probable: ' + v.detalle);
});

test('detecta que vas mas lento de lo previsto', () => {
  const v = veredictoProgreso(serie({ dias: 21, kcalDia: 1500, bajaPorSemana: OBJ_M.kgSemana * 0.3 }), OBJ_M, FIN_FIXTURE);
  esperar(v.estado, 'lento');
  esperarQue(/mas lento|más lento/.test(v.titulo), v.titulo);
});

test('avisa si estas bajando demasiado rapido', () => {
  const v = veredictoProgreso(serie({ dias: 21, kcalDia: 1200, bajaPorSemana: OBJ_M.kgSemana * 2 }), OBJ_M, FIN_FIXTURE);
  esperar(v.estado, 'rapido');
  esperarQue(/musculo|músculo/.test(v.detalle), 'tiene que decir el riesgo real: ' + v.detalle);
});

test('en mantenimiento, estar estable es ir bien', () => {
  const obj = objetivoDeModo(PERFIL_M, 'mantenimiento');
  const v = veredictoProgreso(serie({ dias: 21, kcalDia: obj.kcal, bajaPorSemana: 0 }), obj, FIN_FIXTURE);
  esperar(v.estado, 'bien');
  esperarQue(/manten/.test(v.titulo.toLowerCase()), v.titulo);
});

test('el veredicto muestra los numeros en que se apoya', () => {
  const v = veredictoProgreso(serie({ dias: 21, kcalDia: 1500, bajaPorSemana: 0.5 }), OBJ_M, FIN_FIXTURE);
  esperarQue(v.datos != null, 'tiene que traer los datos');
  esperarQue(typeof v.datos.kgSemanaReal === 'number', 'el ritmo real');
  esperarQue(typeof v.datos.adherencia === 'number', 'y la adherencia');
  esperarQue(v.datos.adherencia >= 0 && v.datos.adherencia <= 100, 'la adherencia es un porcentaje');
});

test('la adherencia cuenta los dias dentro del objetivo', () => {
  const v = veredictoProgreso(serie({ dias: 21, kcalDia: 1500, bajaPorSemana: 0.5 }), OBJ_M, FIN_FIXTURE);
  esperar(v.datos.adherencia, 100, '1500 esta por debajo del objetivo todos los dias');

  const v2 = veredictoProgreso(serie({ dias: 21, kcalDia: 4000, bajaPorSemana: 0.5 }), OBJ_M, FIN_FIXTURE);
  esperar(v2.datos.adherencia, 0, '4000 se pasa todos los dias');
});

test('el peso que sube tambien se detecta', () => {
  const v = veredictoProgreso(serie({ dias: 21, kcalDia: 3000, bajaPorSemana: -0.4 }), OBJ_M, FIN_FIXTURE);
  esperar(v.estado, 'mal', 'si sube, no puede decir que va bien');
});


/* ---- que modelo se usa y cuando conviene escalar ---- */

testAsync('un plato se analiza con Sonnet, no con Opus', async () => {
  let cuerpo = null;
  const fetchFn = async (u, o) => { cuerpo = JSON.parse(o.body); return respuestaOk(COMIDA_OK); };
  await analizarImagen({ fetchFn, apiKey: 'k', imagen: 'x', modo: 'plato' });
  esperar(cuerpo.model, 'claude-sonnet-5');
});

testAsync('una etiqueta se lee con Haiku: es transcribir, no estimar', async () => {
  let cuerpo = null;
  const fetchFn = async (u, o) => { cuerpo = JSON.parse(o.body); return respuestaOk(COMIDA_OK); };
  await analizarImagen({ fetchFn, apiKey: 'k', imagen: 'x', modo: 'etiqueta' });
  esperar(cuerpo.model, 'claude-haiku-4-5');
});

test('modeloPara elige segun lo que se mira', () => {
  esperar(modeloPara('plato'), 'claude-sonnet-5');
  esperar(modeloPara('etiqueta'), 'claude-haiku-4-5');
  esperar(modeloPara('plato', 'claude-opus-5'), 'claude-opus-5', 'un modelo elegido a mano manda');
});

test('con confianza baja conviene ofrecer el modelo grande', () => {
  esperarQue(convieneEscalar({ confianza: 'baja' }, 'claude-sonnet-5'));
});

test('con confianza alta no se gasta de mas', () => {
  esperarQue(!convieneEscalar({ confianza: 'alta' }, 'claude-sonnet-5'));
  esperarQue(!convieneEscalar({ confianza: 'media' }, 'claude-sonnet-5'));
});

test('no se ofrece escalar si ya se uso el modelo grande', () => {
  esperarQue(!convieneEscalar({ confianza: 'baja' }, 'claude-opus-5'), 'no hay a donde escalar');
});

test('sin resultado no hay nada que escalar', () => {
  esperarQue(!convieneEscalar(null, 'claude-sonnet-5'));
});

test('Sonnet cuesta bastante menos que Opus', () => {
  const opus = PRECIOS['claude-opus-5'];
  const sonnet = PRECIOS['claude-sonnet-5'];
  const haiku = PRECIOS['claude-haiku-4-5'];
  esperarQue(sonnet.salida < opus.salida, 'Sonnet tiene que ser mas barato');
  esperarQue(haiku.salida < sonnet.salida, 'y Haiku mas barato todavia');
});

/* ============================================================
   Resultado
   ============================================================ */

window.__resultados = R;

function pintar() {
  const cont = document.getElementById('salida');
  if (!cont) return;
  const head = document.getElementById('resumen');
  head.textContent = R.fallos === 0
    ? `${R.total} tests, todo en verde`
    : `${R.total} tests, ${R.fallos} fallando`;
  head.className = R.fallos === 0 ? 'ok' : 'mal';

  cont.innerHTML = '';
  for (const d of R.detalle) {
    const li = document.createElement('li');
    li.className = d.ok ? 'ok' : 'mal';
    li.textContent = (d.ok ? '✓ ' : '✗ ') + d.nombre + (d.ok ? '' : ' → ' + d.error);
    cont.appendChild(li);
  }
}

// los tests asíncronos corren después; __listo se resuelve cuando terminó todo
window.__listo = (async () => {
  for (const { nombre, fn } of pendientesAsync) {
    try {
      await fn();
      R.detalle.push({ ok: true, nombre });
    } catch (e) {
      R.fallos++;
      R.detalle.push({ ok: false, nombre, error: e.message });
    }
    R.total++;
  }
  pintar();
  return { total: R.total, fallos: R.fallos };
})();

pintar();
