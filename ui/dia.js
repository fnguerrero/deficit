/* ============================================================
   ui/dia.js — las comidas del día: los cinco momentos y su detalle.

   Salió de ui/hoy.js, que llegó a su límite. La división quedó natural:
   `hoy.js` arma los números del día —el anillo, los macros, los objetivos— y
   acá está lo que se comió, que es la parte que más cambió de forma y la que
   más va a seguir cambiando.
   ============================================================ */

/* ---------------- los cinco momentos del día ---------------- */

/*
 * Una fila de cinco, y siempre las mismas cinco.
 *
 * La tira que se deslizaba crecía con cada comida y había que arrastrarla para
 * saber qué habías comido. Los momentos, en cambio, son cinco y no cambian
 * nunca: con una tarjeta fija por momento la sección tiene la misma altura con
 * tres comidas que con doce, y de un vistazo se ve el día entero, incluido lo
 * que falta.
 *
 * Y no hace falta limitar a una comida por momento: un almuerzo puede ser plato,
 * postre y café. Cuando hay varias, la tarjeta muestra el total y se abren al
 * tocarla.
 */
let momentoAbierto = null;

function pintarComidasDelDia(comidas, cont) {
  const grupos = agruparPorMomento(comidas, { todos: true });

  const fila = document.createElement('li');
  fila.className = 'momentos';

  for (const g of grupos) {
    const card = document.createElement('button');
    card.className = 'momento' + (g.comidas.length ? '' : ' vacio') +
      (momentoAbierto === g.id ? ' abierto' : '');
    card.title = g.comidas.length
      ? `${g.nombre}: ${fmtKcal(g.kcal)}`
      : `Todavía no cargaste ${g.nombre.toLowerCase()}`;

    /* La última QUE TENGA foto, no la última a secas: si la más reciente se
       cargó a mano, la tarjeta quedaría gris habiendo una foto disponible. */
    const ultima = [...g.comidas].reverse().find(c => c.thumb);
    if (ultima?.thumb) {
      const img = document.createElement('img');
      img.src = ultima.thumb; img.alt = '';
      card.appendChild(img);
    }

    const cuerpo = document.createElement('span');
    cuerpo.className = 'momento-cuerpo';
    cuerpo.innerHTML = g.comidas.length
      ? `<b>${fmtNum(Math.round(g.kcal))}</b><small>${g.nombre}</small>`
      : `<i>${g.icono}</i><small>${g.nombre}</small>`;
    card.appendChild(cuerpo);

    // cuántas hay, solo cuando es más de una: un "1" en cada tarjeta es ruido
    if (g.comidas.length > 1) {
      const n = document.createElement('span');
      n.className = 'momento-n';
      n.textContent = g.comidas.length;
      card.appendChild(n);
    }

    card.onclick = () => abrirMomento(g);
    fila.appendChild(card);
  }

  cont.appendChild(fila);

  /* Lo de adentro del momento abierto, debajo de la fila. Solo si hay más de
     una: con una sola, tocar la tarjeta va derecho a editarla. */
  const abierto = grupos.find(g => g.id === momentoAbierto && g.comidas.length > 1);
  if (abierto) cont.appendChild(tiraDeComidas(abierto));
}

function abrirMomento(g) {
  if (!g.comidas.length) {
    /* Vacío: se saca la foto para ESE momento, aunque el reloj diga otra cosa.
       Cargar la cena a la mañana siguiente es de lo más común. */
    momentoPedido = g.id;
    $('btnFoto').click();
    return;
  }
  if (g.comidas.length === 1) { editarComida(g.comidas[0].id); return; }

  momentoAbierto = momentoAbierto === g.id ? null : g.id;
  renderHoy();
}

/**
 * Las comidas de un momento, como tarjetas con su foto.
 *
 * Se despliega al tocar un momento que tiene más de una. La foto es la tarjeta
 * entera: en filas de texto quedaba en una miniatura de 40 px que no se miraba.
 */
function tiraDeComidas(grupo) {
  const li = document.createElement('li');
  const tira = document.createElement('div');
  tira.className = 'recuerdos';
  tira.setAttribute('role', 'list');

  for (const c of grupo.comidas) {
    const hora = new Date(c.ts).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
    const veredicto = comidaApta(c, state.perfil.modo, calcular(), totalesDia());

    const card = document.createElement('div');
    card.className = 'recuerdo' + (veredicto.nivel !== 'si' ? ' ' + veredicto.nivel : '');
    card.setAttribute('role', 'listitem');

    const fondo = document.createElement('div');
    fondo.className = 'recuerdo-foto';
    if (c.thumb) {
      const img = document.createElement('img');
      img.src = c.thumb; img.alt = '';
      fondo.appendChild(img);
    } else {
      fondo.classList.add('sin-foto');
      fondo.textContent = grupo.icono || '🍽️';
    }

    const kcal = document.createElement('span');
    kcal.className = 'recuerdo-kcal';
    kcal.innerHTML = `${fmtNum(Math.round(c.kcal))}<small>kcal</small>`;

    const pie = document.createElement('div');
    pie.className = 'recuerdo-pie';
    const b = document.createElement('b'); b.textContent = c.titulo || 'Comida';
    const sm = document.createElement('small'); sm.textContent = hora;
    pie.append(b, sm);

    if (veredicto.nivel !== 'si') {
      const marca = document.createElement('span');
      marca.className = 'marca-apta ' + veredicto.nivel;
      marca.textContent = veredicto.nivel === 'no' ? 'no entra' : 'justo';
      marca.title = veredicto.motivo;
      card.appendChild(marca);
    }

    const del = document.createElement('button');
    del.className = 'recuerdo-del'; del.textContent = '×';
    del.title = 'Borrar';
    del.setAttribute('aria-label', 'Borrar ' + (c.titulo || 'comida'));
    del.onclick = (e) => { e.stopPropagation(); borrarComida(c.id); };

    /* La tarjeta entera edita; la lupa abre la foto grande. Con la foto
       ocupando toda la tarjeta, los dos gestos se pisarían. */
    const abrir = document.createElement('button');
    abrir.className = 'recuerdo-abrir';
    abrir.setAttribute('aria-label', 'Editar ' + (c.titulo || 'comida'));
    abrir.onclick = () => editarComida(c.id);

    card.append(fondo, kcal, pie, del, abrir);

    if (c.foto || c.thumb) {
      const lupa = document.createElement('button');
      lupa.className = 'recuerdo-lupa'; lupa.textContent = '🔍';
      lupa.title = 'Ver la foto';
      lupa.setAttribute('aria-label', 'Ver la foto de ' + (c.titulo || 'la comida'));
      lupa.onclick = (e) => { e.stopPropagation(); abrirVisor(c); };
      card.appendChild(lupa);
    }

    tira.appendChild(card);
  }

  li.appendChild(tira);
  return li;
}
