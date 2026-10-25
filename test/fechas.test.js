/* Fechas y cambio de dia, con la hora de Argentina (UTC-3, sin horario de
   verano). Correr: node --test test/ */

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { cargarApp } = require('./cargar');

const app = cargarApp();

/* Una hora de Buenos Aires escrita con su huso, para que el test diga lo mismo
   en cualquier maquina. */
const enBA = (texto) => new Date(texto + '-03:00');

test('la zona horaria de los tests es la de Argentina', () => {
  assert.equal(new Date('2026-10-25T12:00:00Z').getTimezoneOffset(), 180);
});

test('hoyISO: a las 23:59 de Buenos Aires sigue siendo hoy, aunque en UTC ya sea mañana', () => {
  assert.equal(app.hoyISO(enBA('2026-10-25T23:59:59')), '2026-10-25');
  assert.equal(app.hoyISO(enBA('2026-10-26T00:00:00')), '2026-10-26');
  assert.equal(app.hoyISO(enBA('2026-10-25T00:00:00')), '2026-10-25');
});

test('hoyISO: el 31 de diciembre a la noche no salta de año', () => {
  assert.equal(app.hoyISO(enBA('2026-12-31T22:30:00')), '2026-12-31');
});

test('esFechaISO rechaza lo que no es una fecha real', () => {
  assert.equal(app.esFechaISO('2026-02-28'), true);
  assert.equal(app.esFechaISO('2028-02-29'), true);
  assert.equal(app.esFechaISO('2026-02-29'), false);
  assert.equal(app.esFechaISO('2026-13-01'), false);
  assert.equal(app.esFechaISO('NaN-aN-aN'), false);
  assert.equal(app.esFechaISO(''), false);
  assert.equal(app.esFechaISO(null), false);
});

test('sumarDias cruza meses y años', () => {
  assert.equal(app.sumarDias('2026-10-31', 1), '2026-11-01');
  assert.equal(app.sumarDias('2026-12-31', 1), '2027-01-01');
  assert.equal(app.sumarDias('2026-03-01', -1), '2026-02-28');
  assert.equal(app.sumarDias('2028-03-01', -1), '2028-02-29');
  assert.equal(app.sumarDias('2026-10-25', 0), '2026-10-25');
  assert.equal(app.sumarDias('roto', 1), null);
});

test('diasEntre cuenta días de calendario, en los dos sentidos', () => {
  assert.equal(app.diasEntre('2026-10-24', '2026-10-25'), 1);
  assert.equal(app.diasEntre('2026-10-25', '2026-10-24'), -1);
  assert.equal(app.diasEntre('2026-12-25', '2027-01-01'), 7);
  assert.equal(app.diasEntre('2026-01-01', '2026-12-31'), 364);
});

test('msHastaMedianoche apunta a las 00:00 de Buenos Aires, más el margen', () => {
  assert.equal(app.msHastaMedianoche(enBA('2026-10-25T23:59:00'), 0), 60 * 1000);
  assert.equal(app.msHastaMedianoche(enBA('2026-10-25T21:00:00'), 2000), 3 * 3600 * 1000 + 2000);
  const cae = new Date(enBA('2026-10-25T18:30:00').getTime() + app.msHastaMedianoche(enBA('2026-10-25T18:30:00')));
  assert.equal(app.hoyISO(cae), '2026-10-26');
});

test('tsParaFecha: hoy usa la hora real; otro día cae adentro de ese día', () => {
  const ahora = enBA('2026-10-25T22:15:00');
  assert.equal(app.tsParaFecha('2026-10-25', 'cena', ahora), ahora.getTime());
  const ayer = app.tsParaFecha('2026-10-24', 'desayuno', ahora);
  assert.equal(app.hoyISO(new Date(ayer)), '2026-10-24');
});

test('momentoDe lee la hora local, no la de UTC', () => {
  /* 13:30 en Buenos Aires son 16:30 UTC: si leyera UTC daría merienda. */
  assert.equal(app.momentoDe(enBA('2026-10-25T13:30:00').getTime()), 'almuerzo');
  assert.equal(app.momentoDe(enBA('2026-10-25T08:30:00').getTime()), 'desayuno');
});

test('claveDePeriodo agrupa por el lunes de la semana', () => {
  /* el domingo 25/10/2026 pertenece a la semana del lunes 19 */
  assert.equal(app.claveDePeriodo('2026-10-25', 'semana'), '2026-10-19');
  assert.equal(app.claveDePeriodo('2026-10-26', 'semana'), '2026-10-26');
  /* y la semana que cruza el año queda del lado del lunes */
  assert.equal(app.claveDePeriodo('2027-01-01', 'semana'), '2026-12-28');
  assert.equal(app.claveDePeriodo('2026-10-25', 'mes'), '2026-10');
});
