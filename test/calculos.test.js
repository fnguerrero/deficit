/* Cuentas: porciones, objetivos, plan por fecha, escudos y adherencia.
   Correr: node --test */

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { cargarApp } = require('./cargar');

const app = cargarApp();

/* Lo que sale del contexto de `vm` trae otros Object y Array: para comparar
   con deepEqual se pasa a objetos de este lado. */
const plano = (o) => JSON.parse(JSON.stringify(o));

const PERFIL = { sexo: 'm', edad: 30, altura: 175, peso: 80, pesoObj: 75, actividad: 1.55, ritmo: 0.5 };

test('totalesDe no se vuelve NaN con una comida rota', () => {
  const t = app.totalesDe([{ kcal: 500, prot: 30 }, { kcal: null, prot: 'x' }, null]);
  assert.equal(t.kcal, 500);
  assert.equal(t.prot, 30);
});

test('objetivoEfectivo suma el ejercicio y redondea', () => {
  assert.equal(app.objetivoEfectivo(1939.6, 250.2), 2190);
  assert.equal(app.objetivoEfectivo(2000, undefined), 2000);
});

test('escalarComida escala también fibra, azúcar y sodio', () => {
  const ensalada = {
    titulo: 'Ensalada', kcal: 200, prot: 5, carb: 20, gras: 10, fibra: 12, azucar: 6, sodio: 300,
    items: [{ nombre: 'Lechuga', calorias: 200, proteinas: 5, carbohidratos: 20, grasas: 10, fibra: 12 }]
  };
  const media = app.escalarComida(ensalada, 0.5);
  assert.equal(media.carb, 10);
  assert.equal(media.fibra, 6);
  assert.equal(media.azucar, 3);
  assert.equal(media.sodio, 150);
  assert.equal(media.items[0].fibra, 6);
  /* los netos se mantienen proporcionales: 8 g enteros, 4 g la mitad */
  assert.equal(app.carbosNetos(media), 4);
  /* y a un alimento que no traía el dato no se le inventa */
  assert.equal('sodio' in media.items[0], false);
});

test('comidasCopiadas: la copia es nueva para el sync', () => {
  const ts = Date.parse('2026-10-25T15:00:00-03:00');
  const [copia] = app.comidasCopiadas([{ id: 'a', ts: 1, act: 1, momento: 'cena', kcal: 700 }], '2026-10-25', ts);
  assert.equal(copia.act, ts);
  assert.notEqual(copia.id, 'a');
  assert.equal(app.hoyISO(new Date(copia.ts)), '2026-10-25');
});

test('migrar: una comida sin hora queda en su propio día, no en la noche anterior', () => {
  const s = app.migrar({ perfil: {}, dias: { '2026-08-27': { comidas: [{ id: 'x', kcal: 300 }] } } });
  const c = s.dias['2026-08-27'].comidas[0];
  assert.equal(app.hoyISO(new Date(c.ts)), '2026-08-27');
});

test('fusionarEstados completa los campos del día que acá estaban vacíos', () => {
  const actual = { perfil: {}, dias: { '2026-10-20': { comidas: [], agua: 3 } } };
  const archivo = {
    perfil: {},
    dias: {
      '2026-10-20': {
        comidas: [], agua: 5, pasos: 9000, cintura: 95, animo: 'bien',
        sueno: { horas: 7.5 }, ayuno: { horas: 14 },
        ejercicio: 300, movimientos: [{ ts: 1, nombre: 'Correr', emoji: '🏃', minutos: 30, kcal: 300 }]
      }
    }
  };
  const { estado } = app.fusionarEstados(actual, archivo);
  const d = estado.dias['2026-10-20'];
  assert.equal(d.agua, 3, 'lo de acá no se pisa');
  assert.equal(d.pasos, 9000);
  assert.equal(d.cintura, 95);
  assert.equal(d.animo, 'bien');
  assert.deepEqual(plano(d.sueno), { horas: 7.5 });
  assert.deepEqual(plano(d.ayuno), { horas: 14 });
  assert.equal(d.ejercicio, 300);
  assert.equal(d.movimientos.length, 1);
});

test('macrosParaKcal: los gramos suman las calorías pedidas', () => {
  for (const kcal of [1600, 2000, 2600]) {
    const m = app.macrosParaKcal(PERFIL, 'moderado', kcal);
    const suma = m.prot * 4 + m.carb * 4 + m.gras * 9;
    assert.ok(Math.abs(suma - kcal) <= 10, `${kcal} kcal dio ${suma}`);
  }
});

test('objetivoDeModo sigue dando los mismos macros que antes de separar la cuenta', () => {
  const o = app.objetivoDeModo(PERFIL, 'moderado');
  assert.deepEqual(plano(app.macrosParaKcal(PERFIL, 'moderado', o.kcal)), { prot: o.prot, carb: o.carb, gras: o.gras });
});

test('planParaFecha: para subir de peso da un superávit, no un déficit', () => {
  const p = { ...PERFIL, peso: 70, pesoObj: 75 };
  const plan = app.planParaFecha(p, '2027-01-03', '2026-10-25');
  const tdee = app.calcularPlan({ ...p, ritmo: 0 }).tdee;
  assert.ok(plan.ritmo < 0);
  assert.ok(plan.kcal > tdee, `${plan.kcal} debería superar el TDEE de ${tdee}`);
});

test('planParaFecha: para bajar sigue igual', () => {
  const plan = app.planParaFecha(PERFIL, '2027-03-01', '2026-10-25');
  const tdee = app.calcularPlan({ ...PERFIL, ritmo: 0 }).tdee;
  assert.ok(plan.ritmo > 0);
  assert.ok(plan.kcal < tdee);
});

test('aplicarEscudos no gasta un escudo en una racha que ya estaba cortada', () => {
  const hoy = '2026-10-25';
  const dias = {};
  /* ejercicio del -12 al -3; el -2 y el -1 en blanco */
  for (let i = 12; i >= 3; i--) dias[app.sumarDias(hoy, -i)] = { comidas: [], ejercicio: 300 };
  const juego = { escudosGastados: 0, escudosUsados: {} };
  const salvadas = app.aplicarEscudos(dias, juego, { hoy });
  assert.equal(salvadas.length, 0);
  assert.equal(juego.escudosGastados, 0);
});

test('aplicarEscudos sí lo gasta cuando falta solo ayer', () => {
  const hoy = '2026-10-25';
  const dias = {};
  for (let i = 12; i >= 2; i--) dias[app.sumarDias(hoy, -i)] = { comidas: [], ejercicio: 300 };
  const juego = { escudosGastados: 0, escudosUsados: {} };
  const salvadas = plano(app.aplicarEscudos(dias, juego, { hoy }));
  assert.ok(salvadas.some(s => s.id === 'entrenamiento'), JSON.stringify(salvadas));
});

test('esOptimo: una comida que es más del 60% del día no deja el día óptimo', () => {
  const ts = (h) => Date.parse(`2026-10-25T${h}:00-03:00`);
  const d = {
    comidas: [
      { id: 'a', ts: ts('09:00'), kcal: 1500, carb: 100, prot: 60, gras: 60, momento: 'desayuno' },
      { id: 'b', ts: ts('13:00'), kcal: 100, carb: 10, prot: 5, gras: 3, momento: 'almuerzo' },
      { id: 'c', ts: ts('17:00'), kcal: 100, carb: 10, prot: 5, gras: 3, momento: 'merienda' },
      { id: 'd', ts: ts('21:00'), kcal: 100, carb: 10, prot: 5, gras: 3, momento: 'cena' }
    ]
  };
  assert.equal(app.esOptimo('comidas', d, { modo: 'moderado', tope: 2000 }), false);
});

test('resumenPeriodo cuenta el ejercicio como parte del objetivo', () => {
  const dias = {};
  for (let i = 0; i < 7; i++) {
    dias[app.sumarDias('2026-10-25', -i)] = { comidas: [{ kcal: 2400 }], ejercicio: 500 };
  }
  const r = app.resumenPeriodo(dias, { hasta: '2026-10-25', largo: 7, objetivo: 2000 });
  assert.equal(r.pctCumplidos, 100);
});
