// Carruseles con Swiper: la galería de platos (siempre) y los tríos como mazo de cartas (en celular y tablet).
(() => {
  'use strict';

  if (!window.Swiper) return;
  const menosMovimiento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------- Galería: fotos que pasan en profundidad ----------
  const galeria = new Swiper('.galeria-swiper', {
    effect: 'coverflow',
    centeredSlides: true,
    slidesPerView: 'auto',
    spaceBetween: 30,
    initialSlide: 1,
    speed: 700,
    rewind: true,
    grabCursor: true,
    coverflowEffect: { rotate: 8, stretch: 0, depth: 160, modifier: 1, scale: 0.9, slideShadows: false },
    autoplay: menosMovimiento ? false : { delay: 3500, disableOnInteraction: false, pauseOnMouseEnter: true },
    keyboard: { enabled: true, onlyInViewport: true },
    navigation: { prevEl: '.galeria-ant', nextEl: '.galeria-sig' },
    pagination: { el: '.galeria-paginacion', clickable: true },
    a11y: {
      prevSlideMessage: 'Foto anterior',
      nextSlideMessage: 'Foto siguiente',
      firstSlideMessage: 'Primera foto',
      lastSlideMessage: 'Última foto',
      paginationBulletMessage: 'Ir a la foto {{index}}',
    },
  });

  // La galería solo avanza sola mientras está a la vista
  if (galeria.autoplay && !menosMovimiento && 'IntersectionObserver' in window) {
    galeria.autoplay.stop();
    new IntersectionObserver(([entrada]) => {
      if (entrada.isIntersecting) galeria.autoplay.start(); else galeria.autoplay.stop();
    }, { threshold: 0.35 }).observe(galeria.el);
  }

  // ---------- Tríos en celular y tablet: mazo de cartas ----------
  const contenedor = document.querySelector('.trios-tarjetas');
  const carril = contenedor.querySelector('.trios-carril');
  const tarjetas = [...carril.querySelectorAll('.trio')];
  const contador = contenedor.querySelector('.trios-contador');
  const puntos = contenedor.querySelector('.trios-paginacion');
  const pantallaChica = window.matchMedia('(max-width: 1023px)');
  let mazo = null;

  const actualizarContador = (s) => { contador.textContent = `${s.activeIndex + 1} / ${tarjetas.length}`; };

  function armarMazo() {
    contenedor.classList.add('swiper');
    carril.classList.add('swiper-wrapper');
    tarjetas.forEach((t) => t.classList.add('swiper-slide'));
    mazo = new Swiper(contenedor, {
      effect: 'cards',
      grabCursor: true,
      speed: 450,
      cardsEffect: { perSlideOffset: 9, perSlideRotate: 3, rotate: true, slideShadows: false },
      pagination: { el: puntos, clickable: true },
      a11y: {
        prevSlideMessage: 'Trío anterior',
        nextSlideMessage: 'Trío siguiente',
        paginationBulletMessage: 'Ir al trío {{index}}',
      },
      on: { init: actualizarContador, slideChange: actualizarContador },
    });
  }

  function desarmarMazo() {
    if (!mazo) return;
    mazo.destroy(true, true);
    mazo = null;
    contenedor.classList.remove('swiper');
    carril.classList.remove('swiper-wrapper');
    tarjetas.forEach((t) => t.classList.remove('swiper-slide'));
    contador.textContent = '';
    puntos.innerHTML = '';
  }

  // En computadora los tríos usan el desplazamiento lateral de GSAP; en pantallas chicas, el mazo
  const decidir = () => { if (pantallaChica.matches) { if (!mazo) armarMazo(); } else desarmarMazo(); };
  decidir();
  pantallaChica.addEventListener('change', decidir);
})();
