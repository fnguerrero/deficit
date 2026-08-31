/*
 * chequeos.js — lo que decide si un dato es creíble.
 *
 * Salió de analisis.js, que se pasó de su límite. Ahí quedó la estadística
 * sobre el historial; acá, las cuatro preguntas incómodas: ¿este análisis tiene
 * sentido?, ¿esto ya lo cargaste?, ¿tus números cuadran con la balanza?, ¿esa
 * meta entra en una sola cuesta?
 *
 * Es la regla 2 de la app —"la app no miente"— hecha código.
 */

function revisarAnalisis(r) {
  if (!r) return [];
  const avisos = [];

  /*
   * Las calorías del plato SE SUMAN de los items.
   *
   * El schema del modelo no tiene un total: solo `items`, cada uno con lo suyo.
   * Esta función leía `r.calorias`, que no existe nunca, así que el total daba
   * 0 siempre. Consecuencia: cada foto disparaba "el análisis volvió sin
   * calorías" —y acto seguido la pantalla mostraba las calorías, porque el
   * resto de la app sí las suma— y los otros dos chequeos, el tope del plato y
   * la coherencia de los macros, quedaban detrás de un `kcal > 0` y no corrían
   * nunca.
   *
   * Los tests pasaban porque le daban de comer un objeto con `calorias` en la
   * raíz, que es una forma que la app real no produce.
   */
  const kcal = Number(r.calorias ?? r.kcal) || sumarItems(r.items).calorias || 0;

  if (kcal > TOPE_PLATO) {
    avisos.push(`${Math.round(kcal)} kcal en un plato es muchísimo. Revisalo antes de guardarlo.`);
  }
  if (kcal <= 0) {
    avisos.push('El análisis volvió sin calorías. Cargalo a mano o sacá otra foto.');
  }

  for (const it of (r.items || [])) {
    if ((Number(it.calorias) || 0) > TOPE_ITEM) {
      avisos.push(`"${it.nombre || 'Un alimento'}" con ${Math.round(it.calorias)} kcal no cierra.`);
      break;
    }
  }

  /*
   * Y los macros tienen que dar las calorías: 4 por gramo de proteína y de
   * carbohidrato, 9 por el de grasa. Cuando no dan, uno de los dos números está
   * mal, y como los macros son los que mandan en keto o en definición, callarse
   * significa dejar que un modo funcione sobre datos inventados.
   */
  const items = r.items || [];
  if (items.length && kcal > 0) {
    const suma = items.reduce((a, i) => ({
      p: a.p + (Number(i.proteinas) || 0),
      c: a.c + (Number(i.carbohidratos) || 0),
      g: a.g + (Number(i.grasas) || 0)
    }), { p: 0, c: 0, g: 0 });

    const porMacros = suma.p * 4 + suma.c * 4 + suma.g * 9;
    if (porMacros > 0 && Math.abs(porMacros - kcal) > Math.max(150, kcal * 0.35)) {
      avisos.push(`Los macros dan ${Math.round(porMacros)} kcal y el total dice ${Math.round(kcal)}: alguno de los dos está mal.`);
    }
  }

  return avisos;
}

/*
 * ¿Ya cargaste esto hace un rato?
 *
 * Pasa de verdad: se saca la foto, no se ve el toast porque la pantalla estaba
 * apagada, se saca de nuevo. O se toca "repetir" dos veces. El día queda con el
 * doble y nadie se entera hasta que el gráfico de la semana no cierra.
 */
function pareceDuplicada(comidas, nueva, ahora = Date.now(), minutos = 25) {
  if (!nueva) return null;
  const kcal = Number(nueva.kcal ?? nueva.calorias) || 0;
  const titulo = normalizar(String(nueva.titulo || ''));

  return (comidas || []).find(c => {
    if (!c || c.id === nueva.id) return false;
    if ((ahora - (c.ts || c.act || 0)) > minutos * 60000) return false;

    const suKcal = Number(c.kcal) || 0;
    const mismoTitulo = titulo && normalizar(String(c.titulo || '')) === titulo;
    /* Con el titulo igual alcanza una diferencia chica; sin titulo hace falta
       que las calorias sean casi iguales, o se marcarian dos platos distintos
       que casualmente pesan parecido. */
    const cerca = Math.abs(suKcal - kcal) <= (mismoTitulo ? Math.max(60, kcal * 0.15) : 5);
    return mismoTitulo ? cerca : (cerca && kcal > 0);
  }) || null;
}

function brechaConLaBalanza(dias, perfil, minDias = 14) {
  const medido = tdeeAdaptativo(dias, minDias);
  if (!medido) return null;

  const plan = calcularPlan(perfil);
  if (!plan || !plan.tdee) return null;

  const dif = medido.tdee - plan.tdee;
  if (Math.abs(dif) < BRECHA_MINIMA) {
    return { hayBrecha: false, dif: Math.round(dif), medido: medido.tdee, estimado: plan.tdee };
  }

  return {
    hayBrecha: true,
    dif: Math.round(dif),
    medido: medido.tdee,
    estimado: plan.tdee,
    dias: medido.dias,
    /* El signo dice cuál de las dos cosas está pasando. Que el gasto medido sea
       MAYOR al estimado significa que el peso baja más rápido de lo que las
       comidas cargadas explican: o se come menos de lo que se cree, o quedaron
       comidas sin cargar. Al revés es el caso incómodo. */
    lectura: dif > 0 ? 'gasta-mas' : 'come-mas',
    texto: dif > 0
      ? `Según la balanza gastás unas ${Math.abs(Math.round(dif))} kcal más por día de lo que la app calculaba. O te movés más de lo declarado, o quedaron comidas sin cargar.`
      : `Según la balanza estás comiendo unas ${Math.abs(Math.round(dif))} kcal más por día de lo que registrás. Puede ser lo que la app estima de menos en las fotos, o comidas que no llegaste a cargar.`
  };
}

function planPorEtapas(peso, objetivo, kgPorSemana = 0.5) {
  const p = Number(peso), o = Number(objetivo);
  if (!(p > 0) || !(o > 0) || o >= p) return null;

  const total = p - o;
  if (total <= p * ETAPA_PCT * 1.5) return null;

  /*
   * El ritmo escala con el peso, y por eso no alcanza con el del selector.
   *
   * Medio kilo por semana es razonable para alguien de 85 kg y absurdo para
   * alguien de 300: da noventa y dos meses, un numero que no informa, desanima.
   * El estandar clinico es de 0,5 a 1 % del peso corporal por semana, asi que se
   * toma el mayor entre lo elegido y ese medio punto.
   */
  const elegido = Number(kgPorSemana) > 0 ? Number(kgPorSemana) : 0.5;
  const ritmo = Math.max(elegido, p * 0.005);
  const etapas = [];
  let actual = p;
  let semanas = 0;

  /* El tramo se calcula sobre el peso de CADA etapa, no sobre el inicial: bajar
     el 10 % de 140 son catorce kilos, y el 10 % de 100 son diez. */
  /* El tope es alto a proposito: bajar de 300 a 100 en tramos del 10 % son once
     etapas, y un plan que se corta antes de llegar a la meta no es un plan. La
     pantalla ya se encarga de no listarlas todas. */
  while (actual > o && etapas.length < 20) {
    const tramo = Math.min(actual - o, Math.max(2, Math.round(actual * ETAPA_PCT)));
    const hasta = Math.round((actual - tramo) * 10) / 10;
    semanas += Math.ceil(tramo / ritmo);
    etapas.push({ n: etapas.length + 1, desde: actual, hasta, kg: tramo, semanas });
    actual = hasta;
  }

  return {
    etapas,
    total: Math.round(total * 10) / 10,
    semanas,
    meses: Math.round(semanas / 4.35)
  };
}
