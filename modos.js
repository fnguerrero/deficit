/* ============================================================
   modos.js — qué significa cada objetivo y si lo que comés entra.

   La app venía con un solo modo implícito: "comé menos de X". Acá cada modo
   define su déficit, su reparto de macros y sus propias reglas de qué es una
   comida que entra. Todo es cálculo local: no cuesta una llamada a la API.

   Esto es una calculadora con fórmulas públicas, no una indicación médica.
   Los pisos de seguridad están para que ningún modo devuelva un número que no
   se le debería recomendar a nadie.
   ============================================================ */

/* Pisos de seguridad. Por debajo de esto no se sostiene la masa muscular ni se
   cubren los micronutrientes, así que ningún modo puede bajar más. */
const PISO_KCAL = { m: 1500, f: 1200 };

/* Cuánto se puede bajar por semana sin resignar músculo. Más de 1 kg semanal
   sostenido es casi siempre agua y masa magra. */
const RITMO_MAXIMO = 1.0;

/**
 * Los modos.
 *
 * `deficitPct` es sobre el TDEE. `macros` es el reparto en porcentaje de
 * calorías, salvo keto, que se define por gramos fijos de carbohidratos porque
 * es la única forma de que la dieta funcione.
 */
const MODOS = {
  mantenimiento: {
    id: 'mantenimiento',
    emoji: '⚖️',
    nombre: 'Mantenimiento',
    resumen: 'Sostener el peso actual',
    detalle: 'Comés lo que gastás. Sirve para estabilizar después de un déficit largo.',
    deficitPct: 0,
    macros: { prot: 0.25, carb: 0.45, gras: 0.30 },
    proteinaPorKg: 1.6
  },

  moderado: {
    id: 'moderado',
    emoji: '📉',
    nombre: 'Déficit moderado',
    resumen: 'Bajar sin que se note tanto',
    detalle: 'Un 20% menos de lo que gastás: alrededor de medio kilo por semana. Es el que más gente sostiene en el tiempo.',
    deficitPct: 0.20,
    macros: { prot: 0.30, carb: 0.40, gras: 0.30 },
    proteinaPorKg: 1.8
  },

  agresivo: {
    id: 'agresivo',
    emoji: '🔥',
    nombre: 'Déficit agresivo',
    resumen: 'Bajar rápido, por poco tiempo',
    detalle: 'Un 30% menos. Baja rápido pero cuesta sostenerlo y da más hambre. No conviene más de 8 a 12 semanas seguidas.',
    deficitPct: 0.30,
    macros: { prot: 0.35, carb: 0.30, gras: 0.35 },
    proteinaPorKg: 2.0,
    aviso: 'Es exigente: conviene hablarlo con un profesional antes de sostenerlo mucho tiempo.'
  },

  definicion: {
    id: 'definicion',
    emoji: '💪',
    nombre: 'Definición',
    resumen: 'Bajar grasa cuidando el músculo',
    detalle: 'Déficit suave con mucha proteína, para que lo que baje sea grasa y no músculo. Va de la mano con entrenar fuerza.',
    deficitPct: 0.15,
    macros: { prot: 0.40, carb: 0.30, gras: 0.30 },
    proteinaPorKg: 2.2
  },

  keto: {
    id: 'keto',
    emoji: '🥑',
    nombre: 'Keto',
    resumen: 'Muy pocos carbohidratos',
    detalle: 'Menos de 30 g de carbohidratos por día para entrar en cetosis. El resto se reparte entre grasas y proteína.',
    deficitPct: 0.20,
    carbosMaxDia: 30,
    macros: { prot: 0.25, carb: 0.05, gras: 0.70 },
    proteinaPorKg: 1.8,
    aviso: 'Los primeros días suele haber cansancio. Conviene consultarlo si tomás medicación o tenés algo de base.'
  },

  /* Los que siguen son patrones alimentarios: no cambian tanto CUANTO comes
     como QUE comes. Igual llevan su deficit, porque la persona quiere una sola
     decision y no dos. */

  mediterranea: {
    id: 'mediterranea',
    emoji: '🫒',
    nombre: 'Mediterránea',
    resumen: 'Pescado, verduras y aceite de oliva',
    detalle: 'La dieta con más respaldo para la salud cardiovascular: mucho vegetal, legumbres, pescado y aceite de oliva; poca carne roja y casi nada ultraprocesado.',
    deficitPct: 0.15,
    macros: { prot: 0.25, carb: 0.40, gras: 0.35 },
    proteinaPorKg: 1.6,
    regla: 'mediterranea'
  },

  lowcarb: {
    id: 'lowcarb',
    emoji: '🥩',
    nombre: 'Low carb',
    resumen: 'Pocos carbohidratos, sin llegar a keto',
    detalle: 'Hasta unos 100 g de carbohidratos por día. Más llevadera que keto y con buena parte del beneficio.',
    deficitPct: 0.20,
    carbosMaxDia: 100,
    macros: { prot: 0.30, carb: 0.20, gras: 0.50 },
    proteinaPorKg: 1.8
  },

  altaproteina: {
    id: 'altaproteina',
    emoji: '🍗',
    nombre: 'Alta proteína',
    resumen: 'Proteína en todas las comidas',
    detalle: 'Sacia más y cuida el músculo. Cada comida tiene que aportar su parte, no toda la proteína en la cena.',
    deficitPct: 0.20,
    macros: { prot: 0.40, carb: 0.30, gras: 0.30 },
    proteinaPorKg: 2.2,
    regla: 'proteina'
  },

  vegetariana: {
    id: 'vegetariana',
    emoji: '🥗',
    nombre: 'Vegetariana',
    resumen: 'Sin carne, ave ni pescado',
    detalle: 'Cuidando la proteína, que es lo que más cuesta cubrir: legumbres, huevo, lácteos y frutos secos.',
    deficitPct: 0.15,
    macros: { prot: 0.25, carb: 0.45, gras: 0.30 },
    proteinaPorKg: 1.6,
    regla: 'vegetariana'
  },

  singluten: {
    id: 'singluten',
    emoji: '🌾',
    nombre: 'Sin gluten',
    resumen: 'Sin trigo, avena, cebada ni centeno',
    detalle: 'Para celiaquía o sensibilidad. Ojo con el gluten escondido en salsas, embutidos y rebozados.',
    deficitPct: 0.15,
    macros: { prot: 0.30, carb: 0.40, gras: 0.30 },
    proteinaPorKg: 1.8,
    regla: 'singluten'
  },

  paleo: {
    id: 'paleo',
    emoji: '🍖',
    nombre: 'Paleo',
    resumen: 'Nada de procesados ni cereales',
    detalle: 'Carne, pescado, huevo, verduras, frutas y frutos secos. Sin cereales, sin lácteos y sin nada de paquete.',
    deficitPct: 0.20,
    macros: { prot: 0.30, carb: 0.25, gras: 0.45 },
    proteinaPorKg: 2.0,
    regla: 'paleo'
  },

  dash: {
    id: 'dash',
    emoji: '🧂',
    nombre: 'DASH',
    resumen: 'Pensada para la presión alta',
    detalle: 'Mucha verdura y fruta, granos integrales, poca sal y poca grasa saturada. Es la que suelen indicar para hipertensión.',
    deficitPct: 0.15,
    macros: { prot: 0.25, carb: 0.50, gras: 0.25 },
    proteinaPorKg: 1.6,
    sodioMaxDia: 2300,
    regla: 'dash'
  },

  flexi: {
    id: 'flexi',
    emoji: '🌱',
    nombre: 'Flexitariana',
    resumen: 'Casi vegetariana, sin ser estricta',
    detalle: 'Base vegetal, con carne de vez en cuando. Más fácil de sostener que la vegetariana pura y con casi los mismos beneficios.',
    deficitPct: 0.18,
    macros: { prot: 0.25, carb: 0.45, gras: 0.30 },
    proteinaPorKg: 1.7,
    regla: 'flexi'
  },

  sinlactosa: {
    id: 'sinlactosa',
    emoji: '🥛',
    nombre: 'Sin lactosa',
    resumen: 'Sin leche ni derivados',
    detalle: 'Para intolerancia. Ojo con la lactosa escondida en panificados, embutidos y salsas.',
    deficitPct: 0.15,
    macros: { prot: 0.30, carb: 0.40, gras: 0.30 },
    proteinaPorKg: 1.8,
    regla: 'sinlactosa'
  },

  antiinflamatoria: {
    id: 'antiinflamatoria',
    emoji: '🫐',
    nombre: 'Antiinflamatoria',
    resumen: 'Menos azúcar y ultraprocesados',
    detalle: 'Pescado, verduras de hoja, frutos secos y aceite de oliva; afuera el azúcar agregada, los fritos y lo ultraprocesado.',
    deficitPct: 0.15,
    macros: { prot: 0.28, carb: 0.37, gras: 0.35 },
    proteinaPorKg: 1.8,
    regla: 'antiinflamatoria'
  },

  volumen: {
    id: 'volumen',
    emoji: '📈',
    nombre: 'Volumen limpio',
    resumen: 'Ganar músculo sin engordar de más',
    detalle: 'Un 10% por encima de lo que gastás, con proteína alta. Solo tiene sentido si entrenás fuerza.',
    deficitPct: -0.10,
    macros: { prot: 0.30, carb: 0.45, gras: 0.25 },
    proteinaPorKg: 2.0
  }
};

const MODO_DEFECTO = 'moderado';

/** El modo, tolerando que venga un id que ya no existe. */
function modoDe(id) {
  return MODOS[id] || MODOS[MODO_DEFECTO];
}

function listaModos() {
  return Object.values(MODOS);
}

/* ---------------- el objetivo del día según el modo ---------------- */

/**
 * Cuánto comer hoy y cómo repartirlo.
 *
 * El número sale del cuerpo de la persona —Mifflin-St Jeor por factor de
 * actividad— y no de una constante. Si el modo pide bajar más de lo que es
 * sano, el piso gana y se dice por qué.
 */
function objetivoDeModo(perfil, idModo = MODO_DEFECTO) {
  if (!perfil || !perfil.edad || !perfil.altura || !perfil.peso) return null;

  const modo = modoDe(idModo);
  const sexo = perfil.sexo === 'f' ? 'f' : 'm';

  const tmb = Math.round(10 * perfil.peso + 6.25 * perfil.altura - 5 * perfil.edad + (sexo === 'm' ? 5 : -161));
  const tdee = Math.round(tmb * Number(perfil.actividad || 1.55));

  let kcal = Math.round(tdee * (1 - modo.deficitPct));

  // El piso es el más alto entre el mínimo del sexo y el metabolismo basal:
  // comer por debajo del basal sostenido es lo que hace perder músculo.
  const piso = Math.max(PISO_KCAL[sexo], tmb);
  const ajustado = kcal < piso;
  let motivo = '';

  if (ajustado) {
    kcal = piso;
    motivo = `Tu objetivo se ajustó a ${kcal} kcal: bajar más rápido que esto haría perder músculo, no grasa.`;
  }

  // La proteína se calcula por kilo de peso, que es como se prescribe de verdad;
  // el porcentaje del modo se usa solo si eso diera un disparate.
  const protPorKg = Math.round(perfil.peso * modo.proteinaPorKg);
  const protPorPct = Math.round((kcal * modo.macros.prot) / 4);
  const prot = Math.round(Math.min(Math.max(protPorKg, protPorPct * 0.8), (kcal * 0.45) / 4));

  let carb;
  let gras;

  if (modo.carbosMaxDia) {
    // keto: los carbohidratos son un tope duro y la grasa absorbe el resto
    carb = modo.carbosMaxDia;
    gras = Math.max(0, Math.round((kcal - prot * 4 - carb * 4) / 9));
  } else {
    carb = Math.round((kcal * modo.macros.carb) / 4);
    gras = Math.max(0, Math.round((kcal - prot * 4 - carb * 4) / 9));
  }

  const deficitReal = tdee - kcal;
  const kgSemana = +((deficitReal * 7) / 7700).toFixed(2);

  return {
    modo: modo.id,
    nombre: modo.nombre,
    tmb,
    tdee,
    kcal,
    prot,
    carb,
    gras,
    carbosMaxDia: modo.carbosMaxDia || null,
    deficitReal,
    kgSemana,
    ajustado,
    motivo,
    aviso: modo.aviso || ''
  };
}

/* ---------------- ¿esta comida entra en el modo? ---------------- */

/**
 * Si una comida va con el modo, y por qué no cuando no va.
 *
 * Se juzga la comida sola, con lo que ya devolvió el análisis: no cuesta ni una
 * llamada más. `consumido` permite juzgar en contexto del día —lo que sobra en
 * el desayuno puede no sobrar en la cena.
 */
function comidaApta(comida, idModo = MODO_DEFECTO, objetivo = null, consumidoHoy = null) {
  const modo = modoDe(idModo);
  const kcal = Number(comida?.kcal) || 0;
  const carb = Number(comida?.carb) || 0;
  const prot = Number(comida?.prot) || 0;

  /* Lo que el analisis vio en el plato. Sin esto no se puede juzgar un patron
     alimentario, solo numeros: 600 kcal pueden ser salmon con ensalada o una
     hamburguesa de kiosco, y para mediterranea no es lo mismo. */
  const p = comida?.perfil || null;

  if (p && modo.regla) {
    const veredicto = porPatron(modo.regla, p, { kcal, prot, sodio: Number(comida?.sodio) || 0 });
    if (veredicto) return veredicto;
  }

  // keto: el carbohidrato es la regla, no una sugerencia
  if (modo.carbosMaxDia) {
    const yaConsumidos = Number(consumidoHoy?.carb) || 0;
    const tope = modo.carbosMaxDia;

    if (yaConsumidos + carb > tope) {
      const restantes = Math.max(0, tope - yaConsumidos);
      return {
        apta: false,
        nivel: 'no',
        motivo: `${Math.round(carb)} g de carbohidratos y te quedaban ${Math.round(restantes)} g para hoy.`
      };
    }
    if (carb > tope * 0.5) {
      return {
        apta: true,
        nivel: 'justo',
        motivo: `${Math.round(carb)} g de carbohidratos: entra, pero se lleva media jornada.`
      };
    }
    return { apta: true, nivel: 'si', motivo: `${Math.round(carb)} g de carbohidratos.` };
  }

  // el resto de los modos: la comida no debería comerse el día entero
  if (objetivo?.kcal) {
    const proporcion = kcal / objetivo.kcal;

    if (proporcion > 0.6) {
      return {
        apta: false,
        nivel: 'no',
        motivo: `${Math.round(proporcion * 100)}% de tu objetivo del día en una sola comida.`
      };
    }
    if (proporcion > 0.45) {
      return {
        apta: true,
        nivel: 'justo',
        motivo: `Es grande: ${Math.round(proporcion * 100)}% del día.`
      };
    }
  }

  // en definición la proteína es el punto: una comida sin proteína es una oportunidad perdida
  if (modo.proteinaPorKg >= 2 && kcal > 300 && prot < kcal * 0.15 / 4) {
    return {
      apta: true,
      nivel: 'justo',
      motivo: `Poca proteína para su tamaño: ${Math.round(prot)} g.`
    };
  }

  return { apta: true, nivel: 'si', motivo: '' };
}

/* ---------------- qué conviene hacer en cada modo ---------------- */

const RECOMENDACIONES = {
  mantenimiento: [
    'Pesate siempre en las mismas condiciones: en ayunas y después del baño.',
    'Si el peso se mueve más de 1 kg en dos semanas, ajustá las porciones antes que el modo.',
    'Es buen momento para acomodar horarios y sueño, que es lo que sostiene todo lo demás.'
  ],
  moderado: [
    'Apuntá a la proteína primero: es lo que evita que lo que baje sea músculo.',
    'Llená medio plato con verduras: llenan mucho y cuestan poco.',
    'Un día por encima del objetivo no arruina la semana. Lo que cuenta es el promedio.'
  ],
  agresivo: [
    'No lo sostengas más de 8 a 12 semanas seguidas: después conviene volver a mantenimiento.',
    'Priorizá proteína y verduras; el hambre va a estar y se maneja con volumen, no con fuerza de voluntad.',
    'Si aparecen mareos, frío constante o se corta el sueño, subí las calorías: eso no es disciplina, es señal.'
  ],
  definicion: [
    'Entrená fuerza. Sin ese estímulo, el déficit se lleva músculo también.',
    'Repartí la proteína entre todas las comidas, no toda en la cena.',
    'El espejo y la ropa te van a decir más que la balanza en este modo.'
  ],
  keto: [
    'Mirá los carbohidratos escondidos: salsas, aderezos, frutas y bebidas.',
    'Tomá más agua y no le escapes a la sal: la cetosis hace perder líquido y sodio.',
    'Los primeros días suele haber cansancio y dolor de cabeza. Pasa; si no pasa, revisalo.'
  ],
  volumen: [
    'Solo tiene sentido si estás entrenando fuerza en serio.',
    'Subir más de 0,5 kg por semana ya es grasa, no músculo.',
    'La proteína alta acá importa tanto como en un déficit.'
  ]
};

function recomendacionesDeModo(idModo = MODO_DEFECTO) {
  return RECOMENDACIONES[modoDe(idModo).id] || RECOMENDACIONES[MODO_DEFECTO];
}

/* ---------------- ¿voy bien o no? ---------------- */

/* Antes de esto no hay tendencia que valga: hay ruido. El peso se mueve un kilo
   por agua, sal y horarios, así que con pocos días cualquier conclusión es una
   moneda al aire disfrazada de dato. */
const DIAS_MINIMOS_PESO = 10;
const DIAS_MINIMOS_REGISTRO = 7;

/**
 * Un veredicto que se banca ser desmentido.
 *
 * La regla es no afirmar de más: si no hay datos, lo dice y cuenta cuántos días
 * faltan. Si los hay y las cosas van mal, también lo dice. Un "vas bien" de
 * cortesía sería peor que no decir nada, porque la persona toma decisiones con
 * esto.
 *
 * @param dias      el objeto de días del estado
 * @param objetivo  lo que devuelve objetivoDeModo
 */
function veredictoProgreso(dias, objetivo, hoy = hoyISO()) {
  const vacio = { estado: 'sin-datos', titulo: '', detalle: '', datos: null };
  if (!objetivo) return { ...vacio, titulo: 'Cargá tus datos', detalle: 'Sin altura, peso y edad no hay objetivo que seguir.' };

  const fechas = Object.keys(dias || {}).filter(f => f <= hoy).sort();

  const pesos = fechas
    .filter(f => Number(dias[f]?.peso) > 0)
    .map(f => ({ fecha: f, peso: Number(dias[f].peso) }));

  const registrados = fechas.filter(f => (dias[f]?.comidas || []).length);

  // 1) ¿alcanza para decir algo?
  if (pesos.length < DIAS_MINIMOS_PESO || registrados.length < DIAS_MINIMOS_REGISTRO) {
    const faltanPeso = Math.max(0, DIAS_MINIMOS_PESO - pesos.length);
    const faltanReg = Math.max(0, DIAS_MINIMOS_REGISTRO - registrados.length);
    const partes = [];
    if (faltanPeso) partes.push(`${faltanPeso} ${faltanPeso === 1 ? 'día' : 'días'} de peso`);
    if (faltanReg) partes.push(`${faltanReg} ${faltanReg === 1 ? 'día' : 'días'} de comidas`);

    return {
      estado: 'sin-datos',
      titulo: 'Todavía no puedo decirte',
      detalle: `Faltan ${partes.join(' y ')}. El peso se mueve un kilo por agua y sal, así que antes de eso cualquier conclusión sería inventada.`,
      datos: { diasPeso: pesos.length, diasRegistro: registrados.length }
    };
  }

  // 2) qué pasó de verdad con el peso: pendiente por cuadrados mínimos
  const t0 = new Date(pesos[0].fecha).getTime();
  const puntos = pesos.map(p => ({ x: (new Date(p.fecha).getTime() - t0) / 86400000, y: p.peso }));
  const n = puntos.length;
  const sx = puntos.reduce((a, p) => a + p.x, 0);
  const sy = puntos.reduce((a, p) => a + p.y, 0);
  const sxy = puntos.reduce((a, p) => a + p.x * p.y, 0);
  const sxx = puntos.reduce((a, p) => a + p.x * p.x, 0);
  const denom = n * sxx - sx * sx;

  const kgPorDia = denom === 0 ? 0 : (n * sxy - sx * sy) / denom;
  const kgSemanaReal = +(kgPorDia * 7).toFixed(2);
  const kgSemanaEsperado = objetivo.kgSemana;

  // 3) qué tan seguido se cumplió el objetivo de calorías
  const dentro = registrados.filter(f => {
    const total = (dias[f].comidas || []).reduce((a, c) => a + (Number(c.kcal) || 0), 0);
    return total <= objetivo.kcal * 1.05;
  }).length;
  const adherencia = Math.round((dentro / registrados.length) * 100);

  const datos = { kgSemanaReal, kgSemanaEsperado, adherencia, diasPeso: pesos.length, diasRegistro: registrados.length };
  const baja = -kgSemanaReal;            // positivo = está bajando
  const esperada = kgSemanaEsperado;

  // 4) el veredicto, en orden de lo que más importa saber

  if (esperada > 0 && baja <= 0.05) {
    return {
      estado: 'mal',
      titulo: 'No estás bajando',
      detalle: `En ${pesos.length} días el peso no se movió${baja < -0.05 ? ' o subió' : ''}. ` +
        `Con ${adherencia}% de días dentro del objetivo, lo más probable es que estés comiendo más de lo que registrás: ` +
        'las porciones a ojo se subestiman siempre para el mismo lado.',
      datos
    };
  }

  if (esperada > 0 && baja < esperada * 0.5) {
    return {
      estado: 'lento',
      titulo: 'Vas más lento de lo previsto',
      detalle: `Estás bajando ${baja.toFixed(2)} kg por semana y el plan apuntaba a ${esperada.toFixed(2)}. ` +
        `Cumpliste el objetivo el ${adherencia}% de los días. ` +
        (adherencia < 70
          ? 'Ahí está la explicación más simple: primero apuntá a sostenerlo, antes de tocar el número.'
          : 'Si venís cumpliendo, el gasto real puede ser menor al estimado: conviene bajar unas 150 kcal el objetivo.'),
      datos
    };
  }

  if (esperada > 0 && baja > esperada * 1.6) {
    return {
      estado: 'rapido',
      titulo: 'Estás bajando más rápido de lo sano',
      detalle: `${baja.toFixed(2)} kg por semana contra ${esperada.toFixed(2)} previstos. ` +
        'Sostenido, eso se lleva músculo además de grasa. Conviene subir el objetivo o pasar a un modo más suave.',
      datos
    };
  }

  if (esperada <= 0) {
    const estable = Math.abs(baja) < 0.25;
    return {
      estado: estable ? 'bien' : 'lento',
      titulo: estable ? 'Te estás manteniendo' : 'El peso se está moviendo',
      detalle: estable
        ? `El peso se movió ${Math.abs(baja).toFixed(2)} kg por semana, que es ruido normal.`
        : `Cambió ${baja.toFixed(2)} kg por semana, más de lo que se espera en mantenimiento.`,
      datos
    };
  }

  return {
    estado: 'bien',
    titulo: 'Vas en camino',
    detalle: `${baja.toFixed(2)} kg por semana, contra ${esperada.toFixed(2)} del plan, ` +
      `cumpliendo el objetivo el ${adherencia}% de los días. Seguí así.`,
    datos
  };
}

/* ---------------- ejercicio por actividad ---------------- */

/*
 * MET = cuántas veces el gasto en reposo. Es la tabla estándar (Compendium of
 * Physical Activities), la misma base que usa cualquier reloj deportivo.
 * kcal = MET × peso en kg × horas.
 *
 * Cargar "45 minutos de fútbol" es algo que alguien sabe; "480 kcal" no lo sabe
 * nadie. Por eso se elige la actividad y el número lo pone la app.
 */
const ACTIVIDADES = [
  { id: 'funcional', nombre: 'Funcional', emoji: '🏋️', met: 6.0, minutos: 60 },
  { id: 'running', nombre: 'Running', emoji: '🏃', met: 9.8, minutos: 30 },
  { id: 'futbol', nombre: 'Fútbol', emoji: '⚽', met: 7.0, minutos: 60 },
  { id: 'gimnasio', nombre: 'Pesas', emoji: '💪', met: 5.0, minutos: 60 },
  { id: 'bici', nombre: 'Bici', emoji: '🚴', met: 7.5, minutos: 45 },
  { id: 'natacion', nombre: 'Natación', emoji: '🏊', met: 7.0, minutos: 45 },
  { id: 'caminata', nombre: 'Caminata', emoji: '🚶', met: 3.5, minutos: 45 },
  { id: 'tenis', nombre: 'Tenis / pádel', emoji: '🎾', met: 6.5, minutos: 60 },
  { id: 'basquet', nombre: 'Básquet', emoji: '🏀', met: 6.5, minutos: 60 },
  { id: 'yoga', nombre: 'Yoga', emoji: '🧘', met: 3.0, minutos: 45 }
];

const FAVORITAS_DEFECTO = ['funcional', 'running', 'futbol'];

/** Las actividades del catálogo más las que agregó la persona. */
function actividadesDe(estado) {
  const propias = (estado?.cfg?.actividades || []).filter(a => a && a.id && a.nombre);
  const base = ACTIVIDADES.map(a => {
    // una actividad del catálogo puede tener duración o MET propios
    const ajuste = propias.find(p => p.id === a.id);
    return ajuste ? { ...a, ...ajuste } : a;
  });
  const nuevas = propias.filter(p => !ACTIVIDADES.some(a => a.id === p.id));
  return [...base, ...nuevas];
}

function actividadPorId(estado, id) {
  return actividadesDe(estado).find(a => a.id === id) || null;
}

/** Las que aparecen en Hoy, de un toque. */
function actividadesFavoritas(estado) {
  const ids = estado?.cfg?.favoritasActividad || FAVORITAS_DEFECTO;
  const todas = actividadesDe(estado);
  return ids.map(id => todas.find(a => a.id === id)).filter(Boolean);
}

/** Lo que gastó de verdad esa actividad, para ese cuerpo y ese tiempo. */
function caloriasActividad(actividad, pesoKg, minutos = null) {
  if (!actividad || !pesoKg) return 0;
  const mins = Number(minutos ?? actividad.minutos) || 0;
  return Math.round(actividad.met * Number(pesoKg) * (mins / 60));
}

/* ---------------- agua ---------------- */

/* 35 ml por kilo es la referencia habitual para un adulto sano; un vaso son
   250 ml. Redondeado a un rango razonable para que no dé 14 vasos. */
function vasosObjetivo(pesoKg) {
  if (!pesoKg) return 8;
  return Math.min(12, Math.max(6, Math.round((pesoKg * 35) / 250)));
}

/* ---------------- ayuno intermitente ---------------- */

/* Las ventanas que usa la gente. La primera es la habitual. */
const VENTANAS_AYUNO = [
  { id: '16:8', horas: 16, nombre: '16:8', detalle: '16 h de ayuno, 8 para comer. La más común.' },
  { id: '18:6', horas: 18, nombre: '18:6', detalle: 'Un poco más exigente.' },
  { id: '20:4', horas: 20, nombre: '20:4', detalle: 'Una sola comida grande.' },
  { id: '12:12', horas: 12, nombre: '12:12', detalle: 'Suave: básicamente no picar de noche.' }
];

/**
 * En qué anda un ayuno arrancado.
 *
 * No hay nada que medir automáticamente acá: es un cronómetro. Justamente por
 * eso funciona — no depende de sensores que la PWA no tiene.
 */
function estadoAyuno(inicio, ahora = Date.now(), horasObjetivo = 16) {
  if (!inicio) return { activo: false };

  const ms = Math.max(0, ahora - inicio);
  const horas = ms / 3600000;
  const objetivoMs = horasObjetivo * 3600000;

  const h = Math.floor(horas);
  const m = Math.floor((ms % 3600000) / 60000);

  return {
    activo: true,
    inicio,
    ms,
    horas: +horas.toFixed(2),
    texto: `${h}h ${String(m).padStart(2, '0')}m`,
    pct: Math.min(1, ms / objetivoMs),
    completo: ms >= objetivoMs,
    faltan: Math.max(0, objetivoMs - ms),
    horasObjetivo
  };
}

/** Un ayuno terminado, listo para guardar en el día. */
function cerrarAyuno(inicio, fin = Date.now(), horasObjetivo = 16) {
  const e = estadoAyuno(inicio, fin, horasObjetivo);
  return {
    inicio,
    fin,
    horas: e.horas,
    objetivo: horasObjetivo,
    cumplido: e.completo
  };
}


/* ---------------- reglas de cada patron alimentario ---------------- */

/**
 * Juzga el plato por lo que TIENE, no por sus numeros.
 *
 * Devuelve null cuando la regla no tiene nada que decir, y ahi sigue la logica
 * general de calorias. Es a proposito: una comida puede estar bien para el
 * patron y ser igual demasiado grande.
 */
function porPatron(regla, p, { kcal = 0, prot = 0, sodio = 0 } = {}) {
  if (regla === 'vegetariana') {
    if (p.vegetariano === false) {
      return { apta: false, nivel: 'no', motivo: 'Tiene carne, ave o pescado.' };
    }
    return null;
  }

  if (regla === 'singluten') {
    if (p.gluten) {
      return { apta: false, nivel: 'no', motivo: 'Tiene gluten: trigo, avena, cebada o centeno.' };
    }
    return null;
  }

  if (regla === 'mediterranea') {
    // lo que la saca de una: procesados y azucar agregada
    if (p.ultraprocesado) {
      return { apta: false, nivel: 'no', motivo: 'Es ultraprocesado, que es lo que esta dieta evita.' };
    }
    if (p.azucarAgregada) {
      return { apta: false, nivel: 'no', motivo: 'Tiene azúcar agregada.' };
    }
    if (p.frito) {
      return { apta: true, nivel: 'justo', motivo: 'Frito: entra, pero no es lo habitual en esta dieta.' };
    }
    if (p.carneRoja) {
      return { apta: true, nivel: 'justo', motivo: 'Carne roja: acá va poco y de vez en cuando.' };
    }
    // lo que la define
    if (p.pescado || p.legumbres || (p.vegetales && p.aceiteOliva)) {
      return { apta: true, nivel: 'si', motivo: 'Justo lo que busca esta dieta.' };
    }
    if (!p.vegetales) {
      return { apta: true, nivel: 'justo', motivo: 'Sin verduras a la vista.' };
    }
    return null;
  }

  if (regla === 'paleo') {
    if (p.cereales) return { apta: false, nivel: 'no', motivo: 'Tiene cereales, que acá no van.' };
    if (p.lacteos) return { apta: false, nivel: 'no', motivo: 'Tiene lácteos.' };
    if (p.ultraprocesado) return { apta: false, nivel: 'no', motivo: 'Es ultraprocesado.' };
    if (p.azucarAgregada) return { apta: false, nivel: 'no', motivo: 'Tiene azúcar agregada.' };
    if (p.legumbres) return { apta: true, nivel: 'justo', motivo: 'Las legumbres son discutidas en paleo.' };
    return null;
  }

  if (regla === 'dash') {
    // acá el enemigo es la sal, y eso se mide con el sodio del análisis
    if (sodio > 800) return { apta: false, nivel: 'no', motivo: `${Math.round(sodio)} mg de sodio en una comida es mucho para esta dieta.` };
    if (p.ultraprocesado) return { apta: false, nivel: 'no', motivo: 'Los ultraprocesados son la principal fuente de sal escondida.' };
    if (sodio > 500) return { apta: true, nivel: 'justo', motivo: `${Math.round(sodio)} mg de sodio: mirá el resto del día.` };
    if (p.vegetales || p.frutas) return { apta: true, nivel: 'si', motivo: 'Con verduras o fruta, como corresponde.' };
    return null;
  }

  if (regla === 'flexi') {
    // no prohíbe la carne: solo avisa, que es lo que la hace sostenible
    if (p.carneRoja) return { apta: true, nivel: 'justo', motivo: 'Carne roja: acá va de vez en cuando, no todos los días.' };
    if (p.vegetariano || p.legumbres) return { apta: true, nivel: 'si', motivo: 'Base vegetal, que es de lo que se trata.' };
    return null;
  }

  if (regla === 'sinlactosa') {
    if (p.lacteos) return { apta: false, nivel: 'no', motivo: 'Tiene lácteos.' };
    return null;
  }

  if (regla === 'antiinflamatoria') {
    if (p.azucarAgregada) return { apta: false, nivel: 'no', motivo: 'El azúcar agregada es justo lo que esta dieta saca.' };
    if (p.ultraprocesado) return { apta: false, nivel: 'no', motivo: 'Es ultraprocesado.' };
    if (p.frito) return { apta: false, nivel: 'no', motivo: 'Frito: las grasas oxidadas van en contra.' };
    if (p.pescado || p.frutosSecos || p.aceiteOliva) return { apta: true, nivel: 'si', motivo: 'Grasas buenas: justo lo que busca.' };
    if (p.vegetales) return { apta: true, nivel: 'si', motivo: 'Con verduras.' };
    return null;
  }

  if (regla === 'proteina') {
    // una comida de tamaño real tiene que aportar proteina
    if (kcal > 250) {
      const pctProt = (prot * 4) / kcal;
      if (pctProt < 0.15) {
        return { apta: false, nivel: 'no', motivo: `Solo ${Math.round(prot)} g de proteína para ${Math.round(kcal)} kcal.` };
      }
      if (pctProt < 0.25) {
        return { apta: true, nivel: 'justo', motivo: `${Math.round(prot)} g de proteína: podría tener más.` };
      }
      return { apta: true, nivel: 'si', motivo: `${Math.round(prot)} g de proteína.` };
    }
    return null;
  }

  return null;
}

/** El texto corto para el cartelito: "Apto keto", "No apto keto". */
function etiquetaApta(veredicto, idModo = MODO_DEFECTO) {
  const modo = modoDe(idModo);
  if (!veredicto) return '';

  if (veredicto.nivel === 'no') return 'No apto ' + modo.nombre.toLowerCase();
  if (veredicto.nivel === 'justo') return 'Justo para ' + modo.nombre.toLowerCase();
  return 'Apto ' + modo.nombre.toLowerCase();
}
