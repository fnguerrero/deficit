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

function perfilAFila(perfil, llave, subido = Date.now(), userId = null) {
  const fila = {
    llave,
    subido,
    ...(userId ? { user_id: userId } : {}),
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
async function sincronizarPerfil({ cliente, perfil, llave, ultimoSync = 0, ahora = Date.now(), userId = null }) {
  let remotas = [];
  try {
    remotas = await cliente.traer(TABLA_PERFIL, llave, ultimoSync);
  } catch (e) {
    return { perfil, cambio: false, migrar: true, subido: false, error: mensajeDe(e) };
  }

  /* Puede volver más de una fila si dos dispositivos subieron entre dos
     bajadas: gana la de `act` más alto, que es la última que alguien guardó. */
  const masNueva = remotas
    .map(filaAPerfil)
    .sort((a, b) => (Number(b.act) || 0) - (Number(a.act) || 0))[0] || null;

  const { perfil: fusionado, cambio } = fusionarPerfil(perfil, masNueva);

  /* Solo se sube si acá hay algo más nuevo que lo que ya está arriba, y si hay
     algo que subir: un perfil en blanco pisando uno cargado sería la peor
     manera de estrenar un dispositivo. */
  const debeSubir = !perfilVacio(fusionado) &&
    (Number(fusionado.act) || 0) > (Number(masNueva?.act) || 0);

  if (debeSubir) {
    try {
      await cliente.guardar(TABLA_PERFIL, [perfilAFila(fusionado, llave, ahora, userId)]);
    } catch (e) {
      /* Lo que se bajó ya está fusionado y vale: se devuelve igual, aunque la
         subida no haya salido. */
      return { perfil: fusionado, cambio, migrar: true, subido: false, error: mensajeDe(e) };
    }
  }

  return { perfil: fusionado, cambio, migrar: false, subido: debeSubir, error: null };
}

function mensajeDe(e) {
  return String(e?.message || e || 'no se pudo sincronizar el perfil');
}
