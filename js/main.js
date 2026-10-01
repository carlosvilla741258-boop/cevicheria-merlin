// Lógica de la landing: WhatsApp, reservas, locales y menú. Las animaciones están en animaciones.js.
(() => {
  'use strict';

  // Número de WhatsApp de Merlin (código de país + número, sin espacios)
  const WA_NUMERO = '51934088928';

  // Horarios por día de la semana (0 = domingo … 6 = sábado): [hora de apertura, hora de cierre]
  const LOCALES = {
    jardines: {
      nombre: 'Local Los Jardines',
      direccion: 'Av. Los Jardines Oeste 280',
      horario: { 0: [9, 19], 1: [9, 19], 2: [9, 19], 3: [9, 19], 4: [9, 19], 5: [9, 19], 6: [9, 19] },
      mapa: 'https://maps.google.com/maps?q=Cebicheria%20Merlin%2C%20Av.%20Los%20Jardines%20Oeste%20280%2C%20San%20Juan%20de%20Lurigancho&z=16&hl=es&output=embed',
    },
    enero: {
      nombre: 'Local 13 de Enero',
      direccion: 'Av. 13 de Enero 1614',
      horario: { 0: [8, 18], 1: [9, 18], 2: [9, 18], 3: [9, 18], 4: [9, 18], 5: [9, 18], 6: [9, 18] },
      mapa: 'https://maps.google.com/maps?q=El%20Merlin%2C%20Av.%2013%20de%20Enero%201614%2C%20San%20Juan%20de%20Lurigancho&z=16&hl=es&output=embed',
    },
  };

  const enlaceWhatsApp = (mensaje) => `https://wa.me/${WA_NUMERO}?text=${encodeURIComponent(mensaje)}`;
  const abrirWhatsApp = (mensaje) => window.open(enlaceWhatsApp(mensaje), '_blank', 'noopener');

  // Desplaza hasta un elemento: con Lenis si está activo (scroll-suave.js), si no con el scroll nativo
  const desplazarA = (el, bloque = 'start') => {
    if (window.merlinIrA) {
      // El espacio para el encabezado lo da scroll-margin-top en el CSS
      window.merlinIrA(el, bloque === 'center' ? -(window.innerHeight - el.offsetHeight) / 2 : 0);
    } else {
      el.scrollIntoView({ behavior: 'smooth', block: bloque });
    }
  };

  // 13:30 -> "1:30 p. m."
  const formatoHora = (minutos) => {
    const h = Math.floor(minutos / 60);
    const m = minutos % 60;
    return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'a. m.' : 'p. m.'}`;
  };

  // ---------- Menú móvil ----------
  const menuBtn = document.querySelector('.menu-btn');
  const navMovil = document.getElementById('nav-movil');
  const cerrarMenu = () => {
    navMovil.hidden = true;
    menuBtn.setAttribute('aria-expanded', 'false');
    menuBtn.setAttribute('aria-label', 'Abrir menú');
  };
  menuBtn.addEventListener('click', () => {
    const abrir = navMovil.hidden;
    navMovil.hidden = !abrir;
    menuBtn.setAttribute('aria-expanded', String(abrir));
    menuBtn.setAttribute('aria-label', abrir ? 'Cerrar menú' : 'Abrir menú');
  });
  navMovil.addEventListener('click', (e) => { if (e.target.closest('a')) cerrarMenu(); });

  // ---------- Enlaces de WhatsApp con mensaje prellenado ----------
  document.querySelectorAll('a[data-wa]').forEach((a) => { a.href = enlaceWhatsApp(a.dataset.wa); });

  // ---------- Botones "Pedir" de la carta ----------
  document.querySelectorAll('[data-pedido]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const opcion = btn.closest('[data-item]').querySelector('.opciones input:checked');
      const pedido = btn.dataset.pedido.replace('{opcion}', opcion ? opcion.value : '');
      abrirWhatsApp(`Hola Merlin, quiero pedir:\n*${pedido}* – S/ ${btn.dataset.precio}\n\n¿Me ayudan con mi pedido?`);
    });
  });

  // Combo 2: la foto cambia según el acompañamiento elegido
  document.querySelectorAll('.opciones input').forEach((input) => {
    input.addEventListener('change', () => {
      const fila = input.closest('[data-item]');
      fila.dataset.foto = input.dataset.foto;
      const mini = fila.querySelector('.combo-mini');
      if (mini) mini.src = `img/fotos/${input.dataset.foto}.jpg`;
      fila.dispatchEvent(new CustomEvent('cambio-foto', { bubbles: true }));
    });
  });

  // ---------- Formulario de reserva ----------
  const form = document.getElementById('form-reserva');
  const campoFecha = form.elements.fecha;
  const campoHora = form.elements.hora;
  const campoPersonas = form.elements.personas;

  const aISO = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  // "2026-10-01" -> fecha local (evita el desfase de zona horaria de new Date("2026-10-01"))
  const leerFecha = (valor) => { const [y, m, d] = valor.split('-').map(Number); return new Date(y, m - 1, d); };

  const hoy = new Date();
  const limite = new Date(hoy);
  limite.setDate(limite.getDate() + 60);
  campoFecha.min = aISO(hoy);
  campoFecha.max = aISO(limite);

  function actualizarHoras() {
    const anterior = campoHora.value;
    campoHora.innerHTML = '';
    if (!campoFecha.value) {
      campoHora.add(new Option('Primero elige la fecha', ''));
      campoHora.disabled = true;
      return;
    }
    const local = LOCALES[form.elements.local.value];
    const dia = leerFecha(campoFecha.value);
    const [abre, cierra] = local.horario[dia.getDay()];
    let desde = abre * 60;
    const hasta = (cierra - 1) * 60; // última reserva una hora antes del cierre
    if (aISO(dia) === aISO(new Date())) {
      const ahora = new Date();
      const minimo = ahora.getHours() * 60 + ahora.getMinutes() + 30;
      desde = Math.max(desde, Math.ceil(minimo / 30) * 30);
    }
    campoHora.add(new Option('Elige una hora', ''));
    for (let t = desde; t <= hasta; t += 30) campoHora.add(new Option(formatoHora(t), formatoHora(t)));
    campoHora.disabled = campoHora.options.length === 1;
    if (campoHora.disabled) campoHora.options[0].text = 'Ya no hay horarios hoy';
    if ([...campoHora.options].some((o) => o.value === anterior)) campoHora.value = anterior;
  }

  campoFecha.addEventListener('change', actualizarHoras);
  form.querySelectorAll('input[name="local"]').forEach((r) => r.addEventListener('change', actualizarHoras));

  form.querySelectorAll('[data-paso]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const valor = (parseInt(campoPersonas.value, 10) || 0) + Number(btn.dataset.paso);
      campoPersonas.value = Math.min(Number(campoPersonas.max), Math.max(Number(campoPersonas.min), valor));
    });
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const datos = form.elements;
    const local = LOCALES[datos.local.value];
    const fecha = leerFecha(datos.fecha.value).toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long' });
    const lineas = [
      'Hola Merlin, quiero reservar una mesa:',
      `*Nombre:* ${datos.nombre.value.trim()}`,
      `*Local:* ${local.nombre} (${local.direccion})`,
      `*Fecha:* ${fecha}`,
      `*Hora:* ${datos.hora.value}`,
      `*Personas:* ${datos.personas.value}`,
    ];
    const comentario = datos.comentario.value.trim();
    if (comentario) lineas.push(`*Comentario:* ${comentario}`);
    abrirWhatsApp(lineas.join('\n'));
  });

  function irAReserva(idLocal) {
    if (idLocal) {
      form.querySelector(`input[name="local"][value="${idLocal}"]`).checked = true;
      actualizarHoras();
    }
    desplazarA(form);
    // En computadora dejamos el cursor en "Nombre"; en celular no, para no abrir el teclado de golpe
    if (window.matchMedia('(pointer: fine)').matches) {
      setTimeout(() => form.elements.nombre.focus({ preventScroll: true }), 700);
    }
  }

  // ---------- Locales: mapa, reservar aquí y estado abierto/cerrado ----------
  const mapa = document.getElementById('mapa');
  const tarjetasLocal = document.querySelectorAll('.local-card');

  function mostrarEnMapa(id) {
    tarjetasLocal.forEach((t) => t.classList.toggle('is-active', t.dataset.local === id));
    if (mapa.dataset.local !== id) {
      mapa.src = LOCALES[id].mapa;
      mapa.dataset.local = id;
      mapa.title = `Mapa del ${LOCALES[id].nombre}`;
    }
  }
  mapa.dataset.local = 'jardines';
  document.querySelectorAll('[data-ver-mapa]').forEach((b) => b.addEventListener('click', () => {
    mostrarEnMapa(b.dataset.verMapa);
    // En celular el mapa queda debajo de las tarjetas: lo traemos a la vista
    const r = mapa.getBoundingClientRect();
    if (r.top < 0 || r.bottom > window.innerHeight) desplazarA(mapa, 'center');
  }));
  document.querySelectorAll('[data-reservar]').forEach((b) => b.addEventListener('click', () => irAReserva(b.dataset.reservar)));

  // Día y minutos actuales en Lima, sin importar la zona horaria del dispositivo
  function ahoraEnLima() {
    const partes = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Lima', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    }).formatToParts(new Date());
    const valor = (tipo) => partes.find((p) => p.type === tipo).value;
    const dias = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
    return { dia: dias[valor('weekday')], minutos: (Number(valor('hour')) % 24) * 60 + Number(valor('minute')) };
  }

  function actualizarEstados() {
    const { dia, minutos } = ahoraEnLima();
    document.querySelectorAll('[data-estado]').forEach((el) => {
      const { horario } = LOCALES[el.dataset.estado];
      const [abre, cierra] = horario[dia];
      const abierto = minutos >= abre * 60 && minutos < cierra * 60;
      el.classList.toggle('is-abierto', abierto);
      if (abierto) {
        el.textContent = `Abierto ahora · hasta las ${formatoHora(cierra * 60)}`;
      } else if (minutos < abre * 60) {
        el.textContent = `Cerrado · abre hoy a las ${formatoHora(abre * 60)}`;
      } else {
        el.textContent = `Cerrado · abre mañana a las ${formatoHora(horario[(dia + 1) % 7][0] * 60)}`;
      }
    });
  }
  actualizarEstados();
  setInterval(actualizarEstados, 60 * 1000);

  // ---------- Botón flotante de WhatsApp ----------
  const waFlotante = document.querySelector('.wa-float');
  const waBtn = waFlotante.querySelector('.wa-btn');
  const cerrarPanel = () => {
    waFlotante.classList.remove('is-open');
    waBtn.setAttribute('aria-expanded', 'false');
  };
  waBtn.addEventListener('click', () => {
    const abierto = waFlotante.classList.toggle('is-open');
    waBtn.setAttribute('aria-expanded', String(abierto));
  });
  waFlotante.querySelector('[data-ir-reserva]').addEventListener('click', () => { cerrarPanel(); irAReserva(); });
  waFlotante.querySelectorAll('a.wa-op').forEach((a) => a.addEventListener('click', cerrarPanel));
  document.addEventListener('click', (e) => { if (!waFlotante.contains(e.target)) cerrarPanel(); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { cerrarPanel(); cerrarMenu(); }
  });

  document.querySelectorAll('[data-anio]').forEach((el) => { el.textContent = new Date().getFullYear(); });
})();
