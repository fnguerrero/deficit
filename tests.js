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
  esperar(sumarComidas([]), { kcal: 0, prot: 0, carb: 0, gras: 0 });
  esperar(sumarComidas(null), { kcal: 0, prot: 0, carb: 0, gras: 0 });
});

test('sumarComidas acumula y redondea', () => {
  const r = sumarComidas([
    { kcal: 430.4, prot: 32.2, carb: 22, gras: 23 },
    { kcal: 180.2, prot: 4, carb: 30.4, gras: 5 }
  ]);
  esperar(r, { kcal: 611, prot: 36, carb: 52, gras: 28 });
});

test('sumarComidas ignora basura en los campos', () => {
  const r = sumarComidas([{ kcal: 'no soy número', prot: null, carb: undefined, gras: 10 }]);
  esperar(r, { kcal: 0, prot: 0, carb: 0, gras: 10 });
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
  cerca(r.costo, 2000 / 1e6 * 5 + 400 / 1e6 * 25, 0.000001);
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
