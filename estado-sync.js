/* ============================================================
   estado-sync.js — las preguntas sobre la sincronización, separadas del
   protocolo.

   `sync.js` responde "cómo": qué fila va, en qué orden, cómo se fusiona. Acá
   viven las otras tres, que son las que se leen en pantalla y no tienen nada
   que ver con REST:

     · ¿conviene sincronizar ahora?
     · ¿se puede?
     · ¿está a salvo lo que hay, o hay que avisar?

   Salieron a un archivo propio porque sync.js llegó al límite y porque son la
   parte que cambia cuando cambia el producto, no cuando cambia el servidor.
   ============================================================ */

/**
 * Si vale la pena sincronizar sola en este momento.
 *
 * El piso de tiempo existe para que abrir y cerrar la app cinco veces seguidas
 * no dispare cinco rondas: sincronizar de más no rompe nada, pero gasta batería
 * y datos del celular sin traer nada nuevo.
 */
function convieneSincronizar({ configurada = false, ultimoSync = 0, ahora = Date.now(), minimoMs = 120000 } = {}) {
  if (!configurada) return false;
  return (ahora - (ultimoSync || 0)) >= minimoMs;
}

/* ---------------- ¿está a salvo lo que hay? ---------------- */

/*
 * Tres días sin una copia en la cuenta ya es una semana de trabajo en riesgo si
 * el navegador decide limpiar el sitio. Menos que eso avisaría todos los días
 * por nada.
 */
const DIAS_SIN_SYNC_AVISO = 3;

/**
 * Qué decir en la barra al pie sobre el estado de los datos.
 *
 * Antes la barra solo miraba una cosa: si había sesión o no. Eso deja afuera el
 * caso peor de todos, que es tener cuenta y **creer** que está todo a salvo
 * mientras el sync automático viene fallando hace una semana. Falla en
 * silencio a propósito —no vale interrumpir a alguien que está cargando el
 * almuerzo— y el aviso vive en Ajustes, una pantalla donde nadie entra si no
 * tiene un problema. O sea que el problema se conoce recién cuando ya pasó.
 *
 * `estadoRespaldo()`, que ya existía, responde otra pregunta: hace cuánto que
 * no se exporta un archivo. Son dos redes distintas y las dos hacen falta.
 */
function estadoDeLaCuenta({ haySesion = false, ultimoSync = 0, ultimoError = '',
  dias = 0, comidas = 0, ahora = Date.now() } = {}) {

  if (!haySesion) {
    /* El aviso dice CUÁNTO hay en juego. "Guardá tus datos" no mueve a nadie;
       "31 días y 94 comidas viven solo en este navegador", sí. */
    return {
      avisar: true,
      motivo: 'sin-cuenta',
      accion: 'entrar',
      dias: null,
      texto: comidas
        ? `${plural(dias, 'día')} y ${plural(comidas, 'comida')} viven solo en este navegador. Con una cuenta quedan a salvo.`
        : 'Sin cuenta, lo que cargues va a vivir solo en este navegador.'
    };
  }

  if (!ultimoSync) {
    return {
      avisar: true,
      motivo: 'nunca',
      accion: 'sincronizar',
      dias: null,
      texto: 'Entraste con tu cuenta pero todavía no se guardó nada en ella.'
    };
  }

  const pasados = diasSinRespaldo(ultimoSync, ahora);
  if (pasados >= DIAS_SIN_SYNC_AVISO) {
    return {
      avisar: true,
      motivo: 'atrasado',
      accion: 'sincronizar',
      dias: pasados,
      texto: `Hace ${plural(pasados, 'día')} que no se sincroniza` +
        (ultimoError ? `. ${ultimoError}` : '.')
    };
  }

  return { avisar: false, motivo: 'al día', accion: null, dias: pasados, texto: '' };
}

/* ---------------- ¿se puede sincronizar ahora? ---------------- */

/**
 * Todas las razones por las que una ronda no arranca, en un solo lugar.
 *
 * El caso que faltaba es el tercero, y era el peor de los tres porque mentía:
 * con la sesión rechazada por el servidor, `token()` devuelve null y el cliente
 * caía en la anon key. Con RLS activo eso es un 401 seguro, y el mensaje que
 * salía era **"Supabase rechazó la clave. Revisá la anon key y las políticas de
 * la tabla"**: mandaba a revisar una configuración que estaba perfecta, cuando
 * lo único que pasaba era que había que volver a entrar.
 *
 * Peor todavía: subir con la anon key y sin user_id habría dejado filas
 * huérfanas, de esas que después hay que reclamar a mano.
 */
function decisionDeSync({ hayCredenciales = false, haySesion = false, token = null } = {}) {
  if (!hayCredenciales) {
    return { ok: false, motivo: 'sin credenciales', mensaje: 'Faltan la URL y la clave' };
  }
  if (!haySesion) {
    return { ok: false, motivo: 'sin sesión', mensaje: 'Entrá con tu cuenta para sincronizar' };
  }
  if (!token) {
    return {
      ok: false,
      motivo: 'sesión vencida',
      mensaje: 'Se cerró tu sesión. Entrá de nuevo para volver a sincronizar.'
    };
  }
  return { ok: true, motivo: '', mensaje: '' };
}
