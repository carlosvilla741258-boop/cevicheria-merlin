// Pedido armado: el cliente junta varios platos, ve el total y manda un solo mensaje por WhatsApp.
// Todo vive en este archivo y en css/pedido.css: si se quitan, los botones "Pedir" vuelven a pedir de a un plato.
(() => {
  'use strict';

  const wa = window.merlinWhatsApp; // lo deja main.js
  if (!wa) return;

  const CLAVE = 'merlin-pedido';
  const soles = (n) => `S/ ${Number.isInteger(n) ? n : n.toFixed(2)}`;
  const separar = (nombre) => {
    // "Trío 1 (ceviche de pescado, chicharrón y arroz con mariscos)" -> ["Trío 1", "ceviche de pescado, …"]
    const i = nombre.indexOf(' (');
    return i < 0 ? [nombre, ''] : [nombre.slice(0, i), nombre.slice(i + 2).replace(/\)$/, '')];
  };
  const escapar = (t) => t.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  // El pedido se guarda en este navegador para no perderlo si recargan la página
  let items = [];
  try { items = JSON.parse(localStorage.getItem(CLAVE)) || []; } catch (e) { items = []; }
  const guardar = () => { try { localStorage.setItem(CLAVE, JSON.stringify(items)); } catch (e) { /* modo privado */ } };

  // ---------- Barra flotante y panel ----------
  document.body.insertAdjacentHTML('beforeend', `
    <button class="pedido-barra" type="button" aria-haspopup="dialog" aria-controls="pedido" hidden>
      <span class="pedido-barra-ico" aria-hidden="true"><svg class="i"><use href="#i-bag"/></svg><b class="pedido-cuenta">0</b></span>
      <span class="pedido-barra-texto"><strong>Tu pedido</strong><small class="pedido-barra-total">S/ 0</small></span>
      <span class="pedido-barra-ver">Ver<span class="pedido-barra-extra"> pedido</span></span>
    </button>
    <dialog class="pedido" id="pedido" aria-labelledby="pedido-titulo">
      <div class="pedido-caja">
        <header class="pedido-cabeza">
          <div>
            <p class="script">para llevar o delivery</p>
            <h2 id="pedido-titulo">Tu pedido</h2>
          </div>
          <button class="pedido-cerrar" type="button" aria-label="Cerrar el pedido">×</button>
        </header>
        <ul class="pedido-lista" data-lenis-prevent></ul>
        <p class="pedido-vacio">Todavía no agregas platos. Toca <strong>Agregar</strong> en los tríos o en los combos.</p>
        <div class="pedido-pie">
          <fieldset class="pedido-entrega">
            <legend>¿Cómo lo quieres?</legend>
            <div class="pedido-opciones">
              <label><input type="radio" name="pedido-entrega" value="delivery" checked><span>Delivery</span></label>
              <label><input type="radio" name="pedido-entrega" value="jardines"><span>Recojo en Los Jardines</span></label>
              <label><input type="radio" name="pedido-entrega" value="enero"><span>Recojo en 13 de Enero</span></label>
            </div>
          </fieldset>
          <div class="campo-flotante pedido-direccion">
            <input id="pedido-direccion" type="text" placeholder=" " autocomplete="street-address" maxlength="140">
            <label for="pedido-direccion">Dirección y referencia (opcional)</label>
          </div>
          <div class="pedido-total"><span>Total</span><strong class="pedido-total-monto">S/ 0</strong></div>
          <p class="pedido-nota">El costo del delivery te lo confirmamos por WhatsApp.</p>
          <button class="btn btn-marino btn-block btn-enviar pedido-enviar" type="button"><svg class="i i-wa" aria-hidden="true"><use href="#i-wa"/></svg><span class="texto">Enviar pedido por WhatsApp</span><span class="texto-enviando" aria-hidden="true">¡Abriendo WhatsApp!</span></button>
          <button class="pedido-vaciar" type="button">Vaciar pedido</button>
        </div>
      </div>
    </dialog>`);

  const barra = document.querySelector('.pedido-barra');
  const panel = document.getElementById('pedido');
  const lista = panel.querySelector('.pedido-lista');
  const direccion = panel.querySelector('#pedido-direccion');

  const total = () => items.reduce((s, it) => s + it.precio * it.cantidad, 0);
  const cantidad = () => items.reduce((s, it) => s + it.cantidad, 0);

  const pintar = () => {
    const n = cantidad();
    barra.hidden = n === 0;
    barra.querySelector('.pedido-cuenta').textContent = n;
    barra.querySelector('.pedido-barra-total').textContent = `${n} ${n === 1 ? 'plato' : 'platos'} · ${soles(total())}`;
    panel.classList.toggle('is-vacio', n === 0);
    panel.querySelector('.pedido-total-monto').textContent = soles(total());
    lista.innerHTML = items.map((it, i) => {
      const [titulo, detalle] = separar(it.nombre);
      return `<li class="pedido-item">
        ${it.foto ? `<img src="${escapar(it.foto)}" alt="" width="56" height="56">` : ''}
        <div class="pedido-item-info"><strong>${escapar(titulo)}</strong><small>${escapar(detalle)}</small><span>${soles(it.precio)} c/u</span></div>
        <div class="pedido-cantidad">
          <button type="button" data-i="${i}" data-paso="-1" aria-label="Uno menos de ${escapar(titulo)}">−</button>
          <output aria-live="polite">${it.cantidad}</output>
          <button type="button" data-i="${i}" data-paso="1" aria-label="Uno más de ${escapar(titulo)}">+</button>
        </div>
        <strong class="pedido-item-total">${soles(it.precio * it.cantidad)}</strong>
      </li>`;
    }).join('');
    const delivery = panel.querySelector('input[name="pedido-entrega"]:checked').value === 'delivery';
    panel.querySelector('.pedido-direccion').hidden = !delivery;
  };

  // ---------- Abrir y cerrar el panel ----------
  const abrir = () => {
    if (panel.open) return;
    panel.showModal();
    document.documentElement.classList.add('pedido-abierto');
    if (window.merlinLenis) window.merlinLenis.stop();
  };
  const cerrar = () => { if (panel.open) panel.close(); };
  panel.addEventListener('close', () => {
    document.documentElement.classList.remove('pedido-abierto');
    if (window.merlinLenis) window.merlinLenis.start();
  });
  barra.addEventListener('click', abrir);
  panel.querySelector('.pedido-cerrar').addEventListener('click', cerrar);
  panel.addEventListener('click', (e) => { if (e.target === panel) cerrar(); }); // clic fuera de la caja

  // ---------- Cambiar cantidades, entrega y vaciar ----------
  lista.addEventListener('click', (e) => {
    const b = e.target.closest('[data-paso]');
    if (!b) return;
    const it = items[Number(b.dataset.i)];
    it.cantidad += Number(b.dataset.paso);
    if (it.cantidad <= 0) items.splice(Number(b.dataset.i), 1);
    guardar();
    pintar();
    if (!items.length) setTimeout(cerrar, 900);
  });
  panel.querySelectorAll('input[name="pedido-entrega"]').forEach((r) => r.addEventListener('change', pintar));
  panel.querySelector('.pedido-vaciar').addEventListener('click', () => {
    items = [];
    guardar();
    pintar();
    setTimeout(cerrar, 600);
  });

  // ---------- Enviar por WhatsApp ----------
  panel.querySelector('.pedido-enviar').addEventListener('click', (e) => {
    if (!items.length) return;
    const entrega = panel.querySelector('input[name="pedido-entrega"]:checked').value;
    const lineas = ['Hola Merlin, quiero hacer este pedido:', ''];
    items.forEach((it) => lineas.push(`• ${it.cantidad} × *${it.nombre}* – ${soles(it.precio * it.cantidad)}`));
    lineas.push('', `*Total:* ${soles(total())}`);
    if (entrega === 'delivery') {
      const dir = direccion.value.trim();
      lineas.push(dir ? `*Entrega:* delivery a ${dir}` : '*Entrega:* delivery (les paso mi dirección por aquí)');
    } else {
      const local = wa.locales[entrega];
      lineas.push(`*Entrega:* recojo en el ${local.nombre} (${local.direccion})`);
    }
    lineas.push('', '¿Me confirman el pedido, por favor?');
    // WhatsApp se abre en el mismo clic: si esperamos, el navegador bloquea la ventana
    wa.abrir(lineas.join('\n'));
    const boton = e.currentTarget;
    boton.classList.add('is-enviando');
    setTimeout(() => { boton.classList.remove('is-enviando'); cerrar(); }, 1600);
    wa.avisar('¡Pedido listo!', 'Abrimos WhatsApp con tu pedido completo. Solo dale enviar.');
  });

  // ---------- Los botones de la carta pasan a decir "Agregar" ----------
  const MAS = '<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></svg>';
  const LISTO = '<svg class="i" aria-hidden="true"><use href="#i-check"/></svg>';
  document.querySelectorAll('[data-pedido]').forEach((b) => {
    b.innerHTML = `${MAS}<span>Agregar</span>`;
    b.setAttribute('aria-label', `Agregar ${separar(b.dataset.pedido.replace(' {opcion}', ''))[0]} a tu pedido`);
  });

  // main.js llama a esto cuando tocan "Agregar"
  window.merlinPedido = {
    agregar({ nombre, precio, foto, boton }) {
      const existente = items.find((it) => it.nombre === nombre);
      if (existente) existente.cantidad += 1;
      else items.push({ nombre, precio, foto, cantidad: 1 });
      guardar();
      pintar();
      // La barra salta y el botón confirma por un momento
      barra.classList.remove('is-salto');
      void barra.offsetWidth;
      barra.classList.add('is-salto');
      if (boton) {
        boton.classList.add('is-agregado');
        boton.innerHTML = `${LISTO}<span>Agregado</span>`;
        clearTimeout(boton.volver);
        boton.volver = setTimeout(() => {
          boton.classList.remove('is-agregado');
          boton.innerHTML = `${MAS}<span>Agregar</span>`;
        }, 1400);
      }
    },
    abrir,
  };

  pintar();
})();
