/* ============================================================
   cara.js — los ojos, la boca y la cabeza.

   Salió de personaje.js, que se pasó de tamaño. El corte tiene sentido propio:
   el cuerpo lo manda la balanza y la cara la manda el día, así que se tocan por
   motivos distintos y casi nunca al mismo tiempo.
   ============================================================ */

/* ---------------- la cara ---------------- */

/** El ojo: almendra afilada, párpado superior grueso, iris y brillo. */
/*
 * El ojo.
 *
 * El iris ocupa poco menos de la mitad del blanco a propósito: cuando llenaba
 * casi todo, a tamaño chico el ojo se fundía con la ceja en una sola mancha
 * oscura y la cara parecía no tener ojos.
 */
function ojo(cx, cy, cara, r = 5.4) {
  if (cara.ojosFelices) {
    return `<path d="M${(cx - r * 1.2).toFixed(1)} ${(cy + 1).toFixed(1)}
      q${(r * 1.2).toFixed(1)} ${(-r * 1.5).toFixed(1)} ${(r * 2.4).toFixed(1)} 0"
      stroke="${PALETA.linea}" stroke-width="2.4" fill="none" stroke-linecap="round"/>`;
  }

  const [mx, my] = cara.mirada;
  const alto = cara.intenso ? r * 0.72 : r;
  const px = cx + mx * 1.1;
  const py = cy + my * 0.8;
  const ancho = r * 1.25;

  const parpado = cara.parpado > 0
    ? `<path d="M${(cx - ancho).toFixed(1)} ${cy} a${ancho.toFixed(1)} ${alto.toFixed(1)} 0 0 1 ${(ancho * 2).toFixed(1)} 0 z"
        fill="${PALETA.piel}" transform="translate(0 ${(-alto * 2 + cara.parpado * alto * 4).toFixed(1)})"/>`
    : '';

  return `
    <path d="M${(cx - ancho).toFixed(1)} ${cy}
             q${ancho.toFixed(1)} ${(-alto * 1.6).toFixed(1)} ${(ancho * 2).toFixed(1)} 0
             q${(-ancho).toFixed(1)} ${(alto * 1.4).toFixed(1)} ${(-ancho * 2).toFixed(1)} 0z"
      fill="${PALETA.ojo}" stroke="${PALETA.linea}" stroke-width="1.5" stroke-linejoin="round"/>
    <ellipse cx="${px.toFixed(1)}" cy="${(py - alto * 0.12).toFixed(1)}"
      rx="${(r * 0.42).toFixed(1)}" ry="${(alto * 0.78).toFixed(1)}" fill="${PALETA.iris}"/>
    <ellipse cx="${px.toFixed(1)}" cy="${(py - alto * 0.12).toFixed(1)}"
      rx="${(r * 0.21).toFixed(1)}" ry="${(alto * 0.46).toFixed(1)}" fill="${PALETA.pupila}"/>
    <circle cx="${(px - r * 0.3).toFixed(1)}" cy="${(py - alto * 0.55).toFixed(1)}" r="${(r * 0.2).toFixed(1)}" fill="#fff"/>
    <path d="M${(cx - ancho).toFixed(1)} ${cy} q${ancho.toFixed(1)} ${(-alto * 1.6).toFixed(1)} ${(ancho * 2).toFixed(1)} 0"
      stroke="${PALETA.linea}" stroke-width="1.9" fill="none" stroke-linecap="round"/>
    ${cara.ojeras ? `<path d="M${(cx - r).toFixed(1)} ${(cy + alto * 1.9).toFixed(1)} q${r.toFixed(1)} ${(alto * 0.6).toFixed(1)} ${(r * 2).toFixed(1)} 0"
      stroke="${PALETA.pielSombra}" stroke-width="1.3" fill="none" stroke-linecap="round"/>` : ''}
    ${parpado}`;
}

/*
 * La boca, a escala de la cara.
 *
 * Antes estaba en coordenadas fijas (de x=51 a x=69) y, al achicarse la cabeza,
 * un grito ocupaba casi la mitad del ancho de la cara. Ahora todo se mide sobre
 * `w`, que es medio ancho de boca.
 */
function boca(tipo, cy, rx = 19) {
  const w = rx * 0.3;
  const i = 60 - w;
  const l = `stroke="${PALETA.linea}" stroke-width="2.1" fill="none" stroke-linecap="round"`;

  const abierta = (alto) => `<path d="M${i.toFixed(1)} ${(cy - 1).toFixed(1)}
      q${w.toFixed(1)} ${(-alto * 0.28).toFixed(1)} ${(w * 2).toFixed(1)} 0
      q${(-w * 0.18).toFixed(1)} ${alto.toFixed(1)} ${(-w).toFixed(1)} ${alto.toFixed(1)}
      q${(-w * 0.82).toFixed(1)} 0 ${(-w).toFixed(1)} ${(-alto).toFixed(1)}z"
      fill="${PALETA.bocaOsc}" stroke="${PALETA.linea}" stroke-width="1.7" stroke-linejoin="round"/>
    <path d="M${(i + w * 0.18).toFixed(1)} ${(cy - 0.6).toFixed(1)}
      q${(w * 0.82).toFixed(1)} ${(-alto * 0.2).toFixed(1)} ${(w * 1.64).toFixed(1)} 0
      l${(-w * 0.12).toFixed(1)} ${(alto * 0.26).toFixed(1)}
      q${(-w * 0.7).toFixed(1)} ${(-alto * 0.16).toFixed(1)} ${(-w * 1.4).toFixed(1)} 0z" fill="#fff"/>`;

  if (tipo === 'risa') return abierta(w * 1.15);
  if (tipo === 'grito') return abierta(w * 1.5);
  if (tipo === 'sonrisa') return `<path d="M${i.toFixed(1)} ${cy} q${w.toFixed(1)} ${(w * 0.75).toFixed(1)} ${(w * 2).toFixed(1)} 0" ${l}/>`;
  if (tipo === 'triste') return `<path d="M${i.toFixed(1)} ${cy + 3} q${w.toFixed(1)} ${(-w * 0.85).toFixed(1)} ${(w * 2).toFixed(1)} 0" ${l}/>`;
  if (tipo === 'seca') {
    return `<path d="M${i.toFixed(1)} ${cy + 1} q${w.toFixed(1)} ${(w * 0.4).toFixed(1)} ${(w * 2).toFixed(1)} 0" ${l}/>
            <path d="M${(i + w * 0.4).toFixed(1)} ${cy + 4} h${(w * 1.2).toFixed(1)}" stroke="${PALETA.linea}"
              stroke-width="1.3" opacity=".6" stroke-linecap="round"/>`;
  }
  if (tipo === 'chica') {
    return `<ellipse cx="60" cy="${cy + 1}" rx="${(w * 0.5).toFixed(1)}" ry="${(w * 0.45).toFixed(1)}"
              fill="${PALETA.bocaOsc}" stroke="${PALETA.linea}" stroke-width="1.5"/>`;
  }
  return `<path d="M${(i + w * 0.15).toFixed(1)} ${cy + 1} h${(w * 1.7).toFixed(1)}" ${l}/>`;
}

function cabeza(med, cara, col, fase) {
  const cy = 34;
  const rx = med.caraRx;
  const ry = med.caraRy;
  const ojoY = cy + 2;
  const sep = rx * 0.42;

  /* La cara NO es una elipse: es un cráneo redondo que baja por pómulos y se
     cierra en un mentón. Un óvalo perfecto se lee infantil siempre, por más
     ceja enojada que tenga encima. */
  const perfil = `M${(60 - rx).toFixed(1)} ${(cy - 2).toFixed(1)}
    C${(60 - rx).toFixed(1)} ${(cy - ry * 1.25).toFixed(1)} ${(60 + rx).toFixed(1)} ${(cy - ry * 1.25).toFixed(1)} ${(60 + rx).toFixed(1)} ${(cy - 2).toFixed(1)}
    C${(60 + rx).toFixed(1)} ${(cy + ry * 0.42).toFixed(1)} ${(60 + rx * 0.58).toFixed(1)} ${(cy + ry * 0.82).toFixed(1)} 60 ${(cy + ry).toFixed(1)}
    C${(60 - rx * 0.58).toFixed(1)} ${(cy + ry * 0.82).toFixed(1)} ${(60 - rx).toFixed(1)} ${(cy + ry * 0.42).toFixed(1)} ${(60 - rx).toFixed(1)} ${(cy - 2).toFixed(1)} Z`;

  const sombraCara = `M${(60 + rx * 0.24).toFixed(1)} ${(cy - ry * 0.92).toFixed(1)}
    C${(60 + rx * 0.95).toFixed(1)} ${(cy - ry * 0.68).toFixed(1)} ${(60 + rx).toFixed(1)} ${(cy + ry * 0.42).toFixed(1)} 60 ${(cy + ry).toFixed(1)}
    C${(60 + rx * 0.3).toFixed(1)} ${(cy + ry * 0.5).toFixed(1)} ${(60 + rx * 0.36).toFixed(1)} ${(cy - ry * 0.4).toFixed(1)} ${(60 + rx * 0.24).toFixed(1)} ${(cy - ry * 0.92).toFixed(1)} Z`;

  const papada = med.c > 0.72
    ? `<path d="M${(60 - rx * 0.42).toFixed(1)} ${(cy + ry * 0.72).toFixed(1)} q${(rx * 0.42).toFixed(1)} ${((med.c - 0.5) * 8).toFixed(1)} ${(rx * 0.84).toFixed(1)} 0"
        stroke="${PALETA.pielSombra}" stroke-width="1.5" fill="none" opacity=".7"/>`
    : '';

  return `
    <path d="M${(60 - rx * 0.96).toFixed(1)} ${cy - 2} a4.4 4.4 0 0 0 0 9z" fill="${col.piel}"
      stroke="${PALETA.linea}" stroke-width="1.8"/>
    <path d="M${(60 + rx * 0.96).toFixed(1)} ${cy - 2} a4.4 4.4 0 0 1 0 9z" fill="${col.piel}"
      stroke="${PALETA.linea}" stroke-width="1.8"/>

    <path d="${perfil}" fill="${col.piel}" stroke="${PALETA.linea}" stroke-width="${LINEA}" stroke-linejoin="round"/>
    <path d="${sombraCara}" fill="${col.pielSombra}" opacity=".7"/>
    ${papada}

    ${pelo(cy, rx, ry, fase)}

    ${ojo(60 - sep, ojoY, cara)}
    ${ojo(60 + sep, ojoY, cara)}

    <g fill="${PALETA.ceja}">
      <path d="M${(60 - sep - 6.5).toFixed(1)} ${(cy - 8).toFixed(1)} l11 -2.2 l.6 3.2 l-11.2 2z"
        transform="rotate(${cara.ceja} ${(60 - sep).toFixed(1)} ${cy - 8}) translate(0 ${(cara.cejaY * 1.4).toFixed(1)})"/>
      <path d="M${(60 + sep + 6.5).toFixed(1)} ${(cy - 8).toFixed(1)} l-11 -2.2 l-.6 3.2 l11.2 2z"
        transform="rotate(${-cara.ceja} ${(60 + sep).toFixed(1)} ${cy - 8}) translate(0 ${(cara.cejaY * 1.4).toFixed(1)})"/>
    </g>

    ${anteojos(sep, ojoY, rx)}

    <path d="M${(60 - rx * 0.1).toFixed(1)} ${cy + 7} l2.2 3 l-3 .6z" fill="${PALETA.pielSombra}"/>
    ${boca(cara.boca, cy + 13, rx)}
    ${cara.lagrima ? `<path d="M${(60 - sep + 4).toFixed(1)} ${ojoY + 7} q2 5 0 7 q-2 -2 0 -7z" fill="#7ec8f0"
      stroke="${PALETA.linea}" stroke-width="1.2"/>` : ''}`;
}

/*
 * Los anteojos.
 *
 * No son un accesorio: son EL rasgo. El muneco es Nico, y sin ellos cualquier
 * parecido depende de detalles que a este tamano no se ven. Van despues de los
 * ojos para que el marco pase por encima, y el cristal lleva un blanco muy
 * bajo —un relleno opaco taparia la mirada, que es de donde sale el animo.
 */
function anteojos(sep, ojoY, rx) {
  const r = 6.4;
  const marco = `stroke="${PALETA.linea}" stroke-width="1.7" fill="#ffffff" fill-opacity=".16"`;
  const varilla = `stroke="${PALETA.linea}" stroke-width="1.5" fill="none" stroke-linecap="round"`;

  return `
    <circle cx="${(60 - sep).toFixed(1)}" cy="${ojoY}" r="${r}" ${marco}/>
    <circle cx="${(60 + sep).toFixed(1)}" cy="${ojoY}" r="${r}" ${marco}/>
    <path d="M${(60 - sep + r).toFixed(1)} ${(ojoY - 1).toFixed(1)}
      q${sep.toFixed(1)} ${(-2.2).toFixed(1)} ${((sep - r) * 2).toFixed(1)} 0" ${varilla}/>
    <path d="M${(60 - sep - r).toFixed(1)} ${(ojoY - 0.6).toFixed(1)} L${(60 - rx * 0.96).toFixed(1)} ${(ojoY - 2.4).toFixed(1)}" ${varilla}/>
    <path d="M${(60 + sep + r).toFixed(1)} ${(ojoY - 0.6).toFixed(1)} L${(60 + rx * 0.96).toFixed(1)} ${(ojoY - 2.4).toFixed(1)}" ${varilla}/>
    <path d="M${(60 - sep - r * 0.55).toFixed(1)} ${(ojoY - r * 0.55).toFixed(1)} l${(r * 0.7).toFixed(1)} ${(-r * 0.3).toFixed(1)}"
      stroke="#ffffff" stroke-width="1.8" opacity=".5" stroke-linecap="round"/>
    <path d="M${(60 + sep - r * 0.55).toFixed(1)} ${(ojoY - r * 0.55).toFixed(1)} l${(r * 0.7).toFixed(1)} ${(-r * 0.3).toFixed(1)}"
      stroke="#ffffff" stroke-width="1.8" opacity=".5" stroke-linecap="round"/>`;
}

function adornos(cara) {
  let out = '';
  if (cara.zzz) {
    out += `<g fill="${PALETA.linea}" opacity=".55" font-family="system-ui" font-weight="800">
      <text x="90" y="30" font-size="13">z</text><text x="101" y="18" font-size="9">z</text></g>`;
  }
  if (cara.gota) {
    out += `<path d="M88 30 q4.5 8 0 11.5 q-4.5 -3.5 0 -11.5z" fill="#7ec8f0" stroke="${PALETA.linea}" stroke-width="1.2"/>`;
  }
  return out;
}
