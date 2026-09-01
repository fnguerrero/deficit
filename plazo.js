/* ============================================================
   El plazo: cuándo llegás al objetivo, y si vas a tiempo.

   El peso objetivo y el ritmo ya definían una fecha —7,4 kg a 0,5 por semana
   son quince semanas— pero esa fecha no se decía en ningún lado: se elegía un
   ritmo y el plazo quedaba implícito. Acá se hace explícito, y se puede entrar
   por la otra punta: decir la fecha y que salga el ritmo.
   ============================================================ */

/* 1 kg de grasa ≈ 7700 kcal. El mismo número que usa calcularPlan(). */
const KCAL_POR_KG = 7700;

/* Menos de esto es ruido: con 0,05 kg/semana la fecha se va a diez años y el
   número deja de significar algo. */
const RITMO_MINIMO = 0.05;

/** Un peso cargado de verdad, y no un campo vacío que Number() convierte en 0. */
function numeroDe(v) {
  return v != null && v !== '' && isFinite(Number(v)) && Number(v) > 0;
}

/**
 * La fecha en la que llegás al objetivo con un ritmo dado.
 *
 * Devuelve null cuando no hay nada que proyectar: sin objetivo, ya llegaste,
 * o el ritmo va para el otro lado.
 */
function fechaDeLlegada(pesoActual, pesoObjetivo, kgSemana, desde = hoyISO()) {
  /* `Number(null)` es 0, no NaN: sin este filtro, "todavía no puse objetivo"
     se leía como "mi objetivo es pesar cero" y devolvía una fecha en 2029. */
  if (!numeroDe(pesoActual) || !numeroDe(pesoObjetivo) || kgSemana == null) return null;

  const a = Number(pesoActual), o = Number(pesoObjetivo), r = Number(kgSemana);
  if (!isFinite(a) || !isFinite(o) || !isFinite(r)) return null;
  if (Math.abs(r) < RITMO_MINIMO) return null;

  const falta = a - o;
  if (Math.abs(falta) < 0.1) return null;

  /* Bajar necesita ritmo de bajada y subir de subida: con los signos cruzados
     la cuenta daría una fecha en el pasado. */
  if ((falta > 0) !== (r > 0)) return null;

  const semanas = Math.abs(falta) / Math.abs(r);
  return sumarDias(desde, Math.ceil(semanas * 7));
}

/** El ritmo, en kg por semana, que hace falta para llegar en esa fecha. */
function ritmoParaLlegar(pesoActual, pesoObjetivo, fecha, desde = hoyISO()) {
  if (!numeroDe(pesoActual) || !numeroDe(pesoObjetivo) || !fecha) return null;

  const a = Number(pesoActual), o = Number(pesoObjetivo);
  if (!isFinite(a) || !isFinite(o)) return null;

  const dias = diasEntre(desde, fecha);
  if (dias < 7) return null;      // menos de una semana no es un plazo

  const falta = a - o;
  if (Math.abs(falta) < 0.1) return null;

  return +((falta / dias) * 7).toFixed(2);
}

/**
 * El ritmo más rápido que se puede sostener sin bajar del piso.
 *
 * El piso es el mismo de calcularPlan(): nunca por debajo del metabolismo
 * basal, ni de 1.500 kcal en hombres y 1.200 en mujeres. Prometer una fecha
 * que exige comer menos que eso es prometer algo que no se va a cumplir.
 */
function ritmoMaximoSeguro(perfil) {
  const plan = calcularPlan(perfil);
  if (!plan) return null;
  const margen = plan.tdee - plan.piso;
  if (margen <= 0) return 0;
  return +((margen * 7) / KCAL_POR_KG).toFixed(2);
}

/**
 * El plan para una fecha pedida.
 *
 * Si entra, devuelve el ritmo y las calorías que salen de ahí. Si no, dice
 * cuál es la fecha más cercana que sí se puede, en vez de aceptar un plan que
 * la app misma va a recortar después contra el piso.
 */
function planParaFecha(perfil, fecha, desde = hoyISO()) {
  if (!perfil || !fecha) return null;

  const ritmo = ritmoParaLlegar(perfil.peso, perfil.pesoObj, fecha, desde);
  if (ritmo == null) return null;

  const max = ritmoMaximoSeguro(perfil);
  const plan = calcularPlan({ ...perfil, ritmo: Math.abs(ritmo), manual: null });

  /* Subir de peso no tiene piso de seguridad que controlar acá: el piso existe
     para no comer de menos. */
  if (ritmo <= 0 || max == null || Math.abs(ritmo) <= max) {
    return { alcanzable: true, ritmo, kcal: plan ? plan.objetivo : null, fechaMinima: fecha };
  }

  const planMax = calcularPlan({ ...perfil, ritmo: max, manual: null });
  return {
    alcanzable: false,
    ritmo,
    kcal: plan ? plan.objetivo : null,
    kcalMinimo: planMax ? planMax.objetivo : null,
    ritmoMaximo: max,
    fechaMinima: fechaDeLlegada(perfil.peso, perfil.pesoObj, max, desde)
  };
}

/**
 * Si vas a tiempo: la fecha que prometía tu plan contra la que sale de tu
 * ritmo real.
 *
 * "Vas lento" no dice nada; "llegás once semanas tarde" sí. Es la misma
 * información que ya daba el veredicto, contada como uno la piensa.
 */
function veredictoDePlazo(prometida, proyectada, hoy = hoyISO()) {
  if (!prometida) return null;
  if (!proyectada) return { estado: 'sin-datos', dias: null, semanas: null };

  const dias = diasEntre(prometida, proyectada);
  const semanas = Math.round(Math.abs(dias) / 7);

  /* Una semana para cualquier lado es la precisión que da una balanza: dentro
     de eso se está en fecha, no adelantado ni atrasado. */
  if (Math.abs(dias) <= 7) return { estado: 'en-fecha', dias, semanas: 0, proyectada };
  if (dias > 0) return { estado: 'tarde', dias, semanas, proyectada };
  return { estado: 'adelantado', dias, semanas, proyectada };
}
