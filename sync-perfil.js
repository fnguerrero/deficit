/* ============================================================
   sync-perfil.js — el perfil, entre dispositivos.

   Los días y las comidas viajaban desde el principio; el perfil no. Quien abría
   la app en el celular se encontraba con la altura, la edad y el objetivo en
   blanco, y la app calculando sobre nada — mientras la pantalla decía que con
   una cuenta los datos quedaban a salvo.

   Va aparte de sync.js por tamaño, y la separación resultó ser la correcta: los
   días son MUCHOS y se fusionan uno por uno, y el perfil es UNO solo y se
   resuelve entero de una vez. Son dos problemas distintos.
   ============================================================ */

const TABLA_PERFIL = 'perfil';

/*
 * Qué campos del perfil viajan.
 *
 * La lista es explícita a propósito. El perfil acumula cosas que son de ESTE
 * dispositivo y no de la persona —lo que se dejó a medio escribir, banderas de
 * avisos ya vistos—, y un `...perfil` las mandaría todas. Lo que no está acá
 * se queda donde se cargó.
 */
const CAMPOS_QUE_VIAJAN = [
  'sexo', 'edad', 'altura', 'peso', 'pesoObj', 'cintura',
  'actividad', 'ritmo', 'plazo', 'manual', 'modo'
];

/* En la base van en snake_case, como el resto de las tablas: Postgres no tiene
   por qué saber cómo se llaman las cosas en el cliente. */
const COLUMNA = {
  sexo: 'sexo', edad: 'edad', altura: 'altura', peso: 'peso',
  pesoObj: 'peso_obj', cintura: 'cintura', actividad: 'actividad',
  ritmo: 'ritmo', plazo: 'plazo', manual: 'manual', modo: 'modo'
};

const NUMERICOS = ['edad', 'altura', 'peso', 'pesoObj', 'cintura', 'actividad', 'ritmo', 'manual'];

/*
 * Que parte de la configuracion viaja.
 *
 * Mismo criterio que arriba, y por el mismo motivo: `cfg` mezcla decisiones de
 * la PERSONA —cuantos vasos se propuso, cuanto le dura una salida a correr, a
 * quien le manda la comida— con cosas de ESTE aparato: la clave de la API, si
 * ya dio permiso de notificar, si vio el onboarding. Mandar el objeto entero
 * haria que aceptar las notificaciones en la compu las prendiera en el celular
 * sin que nadie se lo pida, y que un dispositivo sin permiso las apagara alla.
 */
const CFG_QUE_VIAJA = [
  'vasosMeta', 'pasosMeta', 'figura', 'actividades', 'horarios',
  'topeGasto', 'whatsapp', 'modelo', 'precision', 'tema'
];

/** Solo lo que viaja, y solo lo que esta cargado. */
function cfgQueViaja(cfg) {
  const salida = {};
  for (const c of CFG_QUE_VIAJA) {
    if (cfg?.[c] !== undefined) salida[c] = cfg[c];
  }
  salida.act = Number(cfg?.act) || 0;
  return salida;
}

/**
 * La configuracion se resuelve entera, no campo por campo.
 *
 * Es a proposito: los horarios y las actividades son listas, y fusionarlas
 * elemento por elemento daria mezclas que nadie configuro —un horario de un
 * aparato y dos del otro—. Gana la ultima que alguien toco, que es lo que
 * pasaria si los dos fueran la misma pantalla.
 */
function fusionarCfg(local, remota) {
  const actLocal = Number(local?.act) || 0;
  const actRemota = Number(remota?.act) || 0;
  if (!remota || actRemota <= actLocal) return { cfg: local, cambio: false };
  return { cfg: { ...local, ...cfgQueViaja(remota) }, cambio: true };
}

function perfilAFila(perfil, llave, subido = Date.now(), userId = null, cfg = null) {
  const fila = {
    llave,
    subido,
    ...(userId ? { user_id: userId } : {}),
    ...(cfg ? { cfg: cfgQueViaja(cfg) } : {}),
    act: Number(perfil?.act) || 0
  };

  for (const campo of CAMPOS_QUE_VIAJAN) {
    const v = perfil?.[campo];
    /* undefined y '' son lo mismo que "sin cargar", y hay que mandarlos como
       null: un string vacío en una columna numérica hace fallar el POST entero,
       y con él se cae la subida de todo lo demás. */
    fila[COLUMNA[campo]] = (v === undefined || v === '') ? null : v;
  }
  return fila;
}

function filaAPerfil(fila) {
  const perfil = { act: Number(fila?.act) || 0 };

  for (const campo of CAMPOS_QUE_VIAJAN) {
    const v = fila?.[COLUMNA[campo]];
    if (v === null || v === undefined) { perfil[campo] = null; continue; }
    perfil[campo] = NUMERICOS.includes(campo) ? Number(v) : v;
  }
  /* La cfg viaja aparte del perfil y con su propio reloj: una base sin migrar
     la trae en undefined, que es lo mismo que "este dispositivo manda". */
  if (fila?.cfg) perfil.cfg = fila.cfg;
  return perfil;
}

/**
 * Cuál de los dos perfiles queda.
 *
 * Se resuelve ENTERO y no campo por campo, y es a propósito: el perfil se edita
 * en un formulario que se guarda de una vez, así que sus campos son coherentes
 * entre sí. Mezclar la altura de un lado con el objetivo del otro puede armar
 * un perfil que nadie cargó nunca — por ejemplo el peso viejo de la compu con
 * el objetivo nuevo del celular, que es justo la combinación que da vuelta la
 * lectura de si vas bien o mal.
 *
 * Empate: gana el local. Sin `act` en ninguno de los dos no hay forma de saber
 * cuál es más nuevo, y pisar lo que la persona tiene delante es lo peor que se
 * puede hacer con una duda.
 */
function fusionarPerfil(local, remoto) {
  if (!remoto) return { perfil: local, cambio: false };

  const aLocal = Number(local?.act) || 0;
  const aRemoto = Number(remoto?.act) || 0;
  if (aRemoto <= aLocal) return { perfil: local, cambio: false };

  /* Lo que no viaja se conserva: el remoto trae solo los campos de la lista, y
     asignarlo tal cual borraría lo que este dispositivo tenga aparte. */
  const salida = { ...local };
  for (const campo of CAMPOS_QUE_VIAJAN) salida[campo] = remoto[campo];
  salida.act = aRemoto;

  return { perfil: salida, cambio: true };
}

/** Si el perfil local tiene algo que valga la pena subir. */
function perfilVacio(perfil) {
  return !CAMPOS_QUE_VIAJAN.some(c => {
    const v = perfil?.[c];
    return v !== null && v !== undefined && v !== '';
  });
}

/**
 * La ida y vuelta del perfil, aguantando una base sin la tabla.
 *
 * NINGÚN error de acá tumba el sync, y es deliberado: los días y las comidas
 * son el dato que no se puede perder, y el perfil son once números que se
 * vuelven a cargar en un minuto. Una base sin migrar dejaría de sincronizar
 * meses de comidas por una tabla que todavía no existe.
 *
 * Lo que no se hace es fallar en silencio: el error sale en el resultado, para
 * que la pantalla pueda decir que el perfil no está viajando en vez de dejar a
 * alguien esperando un dato que no va a llegar nunca.
 */
async function sincronizarPerfil({ cliente, perfil, cfg = null, llave, ultimoSync = 0, ahora = Date.now(), userId = null }) {
  let remotas = [];
  try {
    remotas = await cliente.traer(TABLA_PERFIL, llave, ultimoSync);
  } catch (e) {
    return { perfil, cfg, cambio: false, cambioCfg: false, migrar: true, subido: false, error: mensajeDe(e) };
  }

  /* Puede volver más de una fila si dos dispositivos subieron entre dos
     bajadas: gana la de `act` más alto, que es la última que alguien guardó. */
  const masNueva = remotas
    .map(filaAPerfil)
    .sort((a, b) => (Number(b.act) || 0) - (Number(a.act) || 0))[0] || null;

  const { perfil: fusionado, cambio } = fusionarPerfil(perfil, masNueva);
  const { cfg: cfgFusionada, cambio: cambioCfg } = fusionarCfg(cfg, masNueva?.cfg);

  /* Solo se sube si acá hay algo más nuevo que lo que ya está arriba, y si hay
     algo que subir: un perfil en blanco pisando uno cargado sería la peor
     manera de estrenar un dispositivo.

     La cfg tiene su propio reloj y se mira aparte: cambiar los vasos del día no
     toca el perfil, y si dependiera de él la configuración no subiría nunca. */
  const perfilMasNuevo = !perfilVacio(fusionado) &&
    (Number(fusionado.act) || 0) > (Number(masNueva?.act) || 0);
  const cfgMasNueva = !!cfg && (Number(cfgFusionada?.act) || 0) > (Number(masNueva?.cfg?.act) || 0);
  const debeSubir = perfilMasNuevo || cfgMasNueva;

  if (debeSubir) {
    const fila = perfilAFila(fusionado, llave, ahora, userId, cfgFusionada);
    try {
      await cliente.guardar(TABLA_PERFIL, [fila]);
    } catch (e) {
      /* Una base sin la columna `cfg` hace fallar el POST entero, y con él se
         cae también el perfil, que sí tiene dónde guardarse. Se reintenta sin
         ella: lo viejo sigue viajando y lo nuevo espera a que se corra el SQL. */
      if (fila.cfg && faltaColumnaCfg(e?.message)) {
        const { cfg: _fuera, ...sinCfg } = fila;
        try {
          await cliente.guardar(TABLA_PERFIL, [sinCfg]);
          return { perfil: fusionado, cfg: cfgFusionada, cambio, cambioCfg, migrar: true, subido: true, error: null };
        } catch (e2) {
          return { perfil: fusionado, cfg: cfgFusionada, cambio, cambioCfg, migrar: true, subido: false, error: mensajeDe(e2) };
        }
      }
      /* Lo que se bajó ya está fusionado y vale: se devuelve igual, aunque la
         subida no haya salido. */
      return { perfil: fusionado, cfg: cfgFusionada, cambio, cambioCfg, migrar: true, subido: false, error: mensajeDe(e) };
    }
  }

  return { perfil: fusionado, cfg: cfgFusionada, cambio, cambioCfg, migrar: false, subido: debeSubir, error: null };
}

/** Si el 400 se queja justo de `cfg`, falta correr supabase-cfg.sql. */
function faltaColumnaCfg(mensaje) {
  const m = String(mensaje || '');
  return /cfg/.test(m) && /column|columna|schema cache/i.test(m);
}

function mensajeDe(e) {
  return String(e?.message || e || 'no se pudo sincronizar el perfil');
}
