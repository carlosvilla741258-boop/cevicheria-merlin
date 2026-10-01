// Animaciones de la landing con GSAP (ScrollTrigger + SplitText).
// Si GSAP no carga o el visitante prefiere menos movimiento, la página se ve completa y quieta.
(() => {
  'use strict';

  const mostrarPortada = () => {
    document.querySelectorAll('.hero-escena, .hero-pie').forEach((el) => { el.style.visibility = 'visible'; });
  };

  if (!window.gsap || !window.ScrollTrigger || !window.SplitText) {
    document.documentElement.classList.add('sin-gsap');
    mostrarPortada();
    return;
  }

  gsap.registerPlugin(ScrollTrigger, SplitText);

  // Esperamos a las fuentes para cortar los textos con las medidas correctas
  document.fonts.ready.then(() => {
    const mm = gsap.matchMedia();

    mm.add('(prefers-reduced-motion: reduce)', mostrarPortada);

    mm.add({
      escritorio: '(min-width: 1024px) and (prefers-reduced-motion: no-preference)',
      movil: '(max-width: 1023px) and (prefers-reduced-motion: no-preference)',
      visor: '(hover: hover) and (pointer: fine) and (min-width: 761px) and (prefers-reduced-motion: no-preference)',
    }, (ctx) => {
      const { escritorio, movil, visor } = ctx.conditions;
      if (!escritorio && !movil) return undefined;
      const limpiezas = [];

      // ---------- Portada: entrada ----------
      const letras = SplitText.create('.hero-letras', { type: 'chars', mask: 'chars' });
      gsap.set(['.hero-escena', '.hero-pie'], { visibility: 'visible' });
      gsap.timeline({ defaults: { ease: 'expo.out' } })
        .from(letras.chars, { yPercent: 110, duration: 1.2, stagger: 0.07 })
        .from('.hero-plato', { scale: 0.3, rotation: -160, opacity: 0, duration: 1.6 }, 0.25)
        .from('.hero-script span', { opacity: 0, yPercent: 60, rotation: -10, duration: 0.9, ease: 'back.out(2)' }, 0.8)
        .from('.hero-sello', { scale: 0, rotation: -120, duration: 1, ease: 'back.out(1.6)' }, 1)
        .from('.hero-pie > *', { opacity: 0, y: 30, duration: 0.9, stagger: 0.1, ease: 'power3.out' }, 0.9);

      // El sello con los precios gira sin parar
      gsap.to('.sello-giro', { rotation: 360, duration: 16, repeat: -1, ease: 'none', transformOrigin: '50% 50%' });

      // ---------- Portada: al bajar, el plato gira y las letras se separan ----------
      gsap.timeline({ scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: 0.6 } })
        .to('.hero-plato-wrap', { rotation: 70, scale: 1.25, yPercent: 22, ease: 'none' }, 0)
        .to(letras.chars, { xPercent: (i, el, todas) => (i - (todas.length - 1) / 2) * (escritorio ? 30 : 18), ease: 'none' }, 0)
        .to('.hero-marca', { yPercent: -30, opacity: 0.2, ease: 'none' }, 0)
        .to('.hero-pie', { y: -60, opacity: 0, ease: 'none' }, 0);

      // ---------- Encabezado: se esconde al bajar y vuelve al subir ----------
      const navMovil = document.getElementById('nav-movil');
      const esconderHeader = gsap.to('#header', { yPercent: -100, duration: 0.35, ease: 'power2.inOut', paused: true });
      ScrollTrigger.create({
        start: 'top top-=160',
        end: 'max',
        onUpdate: (self) => {
          if (!navMovil.hidden) return;
          if (self.direction === 1) esconderHeader.play(); else esconderHeader.reverse();
        },
        onLeaveBack: () => esconderHeader.reverse(),
      });

      // ---------- Cintas: avanzan solas y se aceleran con la velocidad del scroll ----------
      const cintas = gsap.utils.toArray('.cinta-track').map((track, i) => gsap.fromTo(track,
        { xPercent: i ? -50 : 0 },
        { xPercent: i ? 0 : -50, duration: i ? 34 : 28, ease: 'none', repeat: -1 }));
      let regreso;
      ScrollTrigger.create({
        start: 0,
        end: 'max',
        onUpdate: (self) => {
          const sentido = self.direction;
          const extra = Math.min(Math.abs(self.getVelocity()) / 350, 6);
          cintas.forEach((c) => gsap.to(c, { timeScale: sentido * (1 + extra), duration: 0.2, overwrite: true }));
          if (regreso) regreso.kill();
          regreso = gsap.delayedCall(0.25, () => cintas.forEach((c) => gsap.to(c, { timeScale: sentido, duration: 1, overwrite: true })));
        },
      });

      // ---------- Títulos: las letras suben una por una ----------
      gsap.utils.toArray('[data-titulo]').forEach((el) => {
        const corte = SplitText.create(el, { type: 'words,chars', mask: 'chars' });
        gsap.from(corte.chars, { yPercent: 110, duration: 1, stagger: 0.025, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 86%' } });
      });
      gsap.utils.toArray('.script').forEach((el) => {
        gsap.from(el, { opacity: 0, x: -24, rotation: -12, duration: 0.9, ease: 'back.out(2)', scrollTrigger: { trigger: el, start: 'top 88%' } });
      });

      // ---------- Manifiesto: las palabras se encienden al leer ----------
      const palabras = SplitText.create('.manifiesto-texto', { type: 'words' });
      gsap.fromTo(palabras.words, { opacity: 0.12 }, {
        opacity: 1, stagger: 0.06, ease: 'none',
        scrollTrigger: { trigger: '.manifiesto-texto', start: 'top 78%', end: 'bottom 50%', scrub: true },
      });
      gsap.from('.manifiesto-datos li', { y: 40, opacity: 0, stagger: 0.12, duration: 0.8, ease: 'power3.out', scrollTrigger: { trigger: '.manifiesto-datos', start: 'top 90%' } });

      // ---------- Fotos con profundidad (parallax) ----------
      const amplitud = escritorio ? 12 : 6;
      gsap.utils.toArray('[data-velocidad]').forEach((el) => {
        const v = parseFloat(el.dataset.velocidad) || 1;
        const disparador = { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true };
        gsap.fromTo(el, { yPercent: v * amplitud }, { yPercent: -v * amplitud, ease: 'none', scrollTrigger: disparador });
        const img = el.querySelector('img');
        if (img) gsap.fromTo(img, { scale: 1.18 }, { scale: 1, ease: 'none', scrollTrigger: { ...disparador } });
      });

      // ---------- Tríos: en computadora la fila avanza de lado mientras bajas ----------
      if (escritorio) {
        const seccion = document.querySelector('.trios');
        const pista = seccion.querySelector('.trios-pista');
        const recorrido = () => Math.max(0, pista.scrollWidth - window.innerWidth);
        const deslizar = gsap.to(pista, {
          x: () => -recorrido(),
          ease: 'none',
          scrollTrigger: { trigger: seccion, start: 'top top', end: () => `+=${recorrido()}`, pin: true, scrub: 0.8, invalidateOnRefresh: true, anticipatePin: 1 },
        });
        gsap.to('.trios-progreso span', { scaleX: 1, ease: 'none', scrollTrigger: { trigger: seccion, start: 'top top', end: () => `+=${recorrido()}`, scrub: true } });
        gsap.utils.toArray('.trio').forEach((tarjeta) => {
          gsap.from(tarjeta, { y: 90, rotation: 5, ease: 'none', scrollTrigger: { trigger: tarjeta, containerAnimation: deslizar, start: 'left 100%', end: 'left 62%', scrub: true } });
          gsap.fromTo(tarjeta.querySelector('.trio-foto img'), { scale: 1.3 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: tarjeta, containerAnimation: deslizar, start: 'left right', end: 'right left', scrub: true } });
        });
      } else {
        // En celular las tarjetas las mueve Swiper (carruseles.js): animamos el mazo completo, no cada tarjeta
        gsap.from('.trios-tarjetas', { y: 60, opacity: 0, duration: 0.9, ease: 'power3.out', scrollTrigger: { trigger: '.trios-tarjetas', start: 'top 88%' } });
      }

      // ---------- Combos ----------
      gsap.from('.combo', { y: 50, opacity: 0, stagger: 0.1, duration: 0.9, ease: 'power3.out', scrollTrigger: { trigger: '.combos-lista', start: 'top 82%' } });
      if (visor) {
        // La foto del combo sigue al cursor
        const caja = document.querySelector('.combo-visor');
        const fotos = [...caja.querySelectorAll('img')];
        const filas = document.querySelectorAll('.combo');
        // La foto va a la derecha del cursor para no tapar el nombre del combo
        gsap.set(caja, { xPercent: 22, yPercent: -50, scale: 0.6, rotation: -6 });
        const xA = gsap.quickTo(caja, 'x', { duration: 0.55, ease: 'power3' });
        const yA = gsap.quickTo(caja, 'y', { duration: 0.55, ease: 'power3' });
        let visible = false;
        const activar = (fila) => fotos.forEach((f) => f.classList.toggle('is-activa', f.dataset.foto === fila.dataset.foto));
        const mover = (e) => { xA(e.clientX); yA(e.clientY); };
        const entrar = (e) => {
          activar(e.currentTarget);
          if (!visible) { xA(e.clientX, e.clientX); yA(e.clientY, e.clientY); }
          visible = true;
          gsap.to(caja, { autoAlpha: 1, scale: 1, rotation: gsap.utils.random(-7, 7), duration: 0.45, ease: 'power3.out', overwrite: 'auto' });
        };
        const salir = () => {
          visible = false;
          gsap.to(caja, { autoAlpha: 0, scale: 0.6, duration: 0.3, ease: 'power2.in', overwrite: 'auto' });
        };
        const cambio = (e) => activar(e.currentTarget);
        window.addEventListener('pointermove', mover);
        filas.forEach((f) => {
          f.addEventListener('pointerenter', entrar);
          f.addEventListener('pointerleave', salir);
          f.addEventListener('cambio-foto', cambio);
        });
        limpiezas.push(() => {
          window.removeEventListener('pointermove', mover);
          filas.forEach((f) => {
            f.removeEventListener('pointerenter', entrar);
            f.removeEventListener('pointerleave', salir);
            f.removeEventListener('cambio-foto', cambio);
          });
        });
      }

      // ---------- Galería: el carrusel (Swiper) sube al aparecer ----------
      gsap.from('.galeria-swiper', { y: 80, opacity: 0, duration: 1.2, ease: 'expo.out', scrollTrigger: { trigger: '.galeria-swiper', start: 'top 85%' } });

      // ---------- Banda de azulejos que corre con el scroll ----------
      gsap.fromTo('.azulejos', { backgroundPosition: '0px 0px' }, {
        backgroundPosition: '-384px 0px', ease: 'none',
        scrollTrigger: { trigger: '.azulejos', start: 'top bottom', end: 'bottom top', scrub: true },
      });

      // ---------- Stickers de precio ----------
      gsap.utils.toArray('.sticker').forEach((s) => {
        gsap.from(s, { scale: 0, rotation: -90, duration: 1, ease: 'back.out(1.7)', scrollTrigger: { trigger: s, start: 'top 90%' } });
      });

      // ---------- Reservas y locales ----------
      gsap.from('.form-card', { y: 90, rotation: 3, opacity: 0, duration: 1.1, ease: 'power3.out', scrollTrigger: { trigger: '.reservas-grid', start: 'top 75%' } });
      gsap.from('.beneficios li', { x: -30, opacity: 0, stagger: 0.12, duration: 0.7, ease: 'power3.out', scrollTrigger: { trigger: '.beneficios', start: 'top 90%' } });
      gsap.from('.local-card', { y: 60, opacity: 0, stagger: 0.15, duration: 0.9, ease: 'power3.out', scrollTrigger: { trigger: '.locales-grid', start: 'top 80%' } });
      gsap.fromTo('.mapa', { clipPath: 'inset(0% 0% 100% 0% round 28px)' }, {
        clipPath: 'inset(0% 0% 0% 0% round 28px)', duration: 1.3, ease: 'expo.out',
        scrollTrigger: { trigger: '.mapa', start: 'top 80%' },
      });

      // ---------- Delivery y pie de página ----------
      gsap.fromTo('.delivery-track', { xPercent: 0 }, { xPercent: -35, ease: 'none', scrollTrigger: { trigger: '.delivery', start: 'top bottom', end: 'bottom top', scrub: true } });
      // La palabra gigante del pie se junta desde letras separadas (sin cortarla: el contorno se dañaría)
      gsap.from('.footer-gigante', { letterSpacing: '0.22em', opacity: 0, duration: 1.6, ease: 'expo.out', scrollTrigger: { trigger: '.footer', start: 'top 85%' } });

      // ---------- Botones magnéticos (solo con mouse) ----------
      if (visor) {
        gsap.utils.toArray('.btn-magnetico').forEach((btn) => {
          const xA = gsap.quickTo(btn, 'x', { duration: 0.4, ease: 'power3' });
          const yA = gsap.quickTo(btn, 'y', { duration: 0.4, ease: 'power3' });
          const atraer = (e) => {
            const r = btn.getBoundingClientRect();
            xA((e.clientX - r.left - r.width / 2) * 0.3);
            yA((e.clientY - r.top - r.height / 2) * 0.35);
          };
          const soltar = () => gsap.to(btn, { x: 0, y: 0, duration: 0.8, ease: 'elastic.out(1, 0.4)' });
          btn.addEventListener('pointermove', atraer);
          btn.addEventListener('pointerleave', soltar);
          limpiezas.push(() => {
            btn.removeEventListener('pointermove', atraer);
            btn.removeEventListener('pointerleave', soltar);
          });
        });
      }

      // ---------- Con Lenis: las fotos se inclinan según la velocidad del scroll ----------
      const lenis = window.merlinLenis;
      if (lenis && escritorio) {
        const inclinar = gsap.utils.toArray('.manifiesto-foto, .trio-foto')
          .map((el) => gsap.quickTo(el, 'skewY', { duration: 0.6, ease: 'power3' }));
        const alMover = ({ velocity }) => {
          const angulo = gsap.utils.clamp(-6, 6, (velocity || 0) * 0.2);
          inclinar.forEach((fn) => fn(angulo));
        };
        const quitar = lenis.on('scroll', alMover);
        limpiezas.push(() => { if (typeof quitar === 'function') quitar(); });
      }

      return () => limpiezas.forEach((fn) => fn());
    });
  });
})();
