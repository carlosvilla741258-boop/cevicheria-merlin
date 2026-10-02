// Fotos en grande con PhotoSwipe: la galería de platos y las fotos de los tríos.
(() => {
  'use strict';

  if (!window.PhotoSwipeLightbox || !window.PhotoSwipe) return;

  const galeriaSwiper = () => document.querySelector('.galeria-swiper')?.swiper;

  const opciones = {
    pswpModule: window.PhotoSwipe,
    bgOpacity: 1,
    showHideAnimationType: 'zoom',
    padding: { top: 30, bottom: 110, left: 16, right: 16 },
    closeTitle: 'Cerrar (Esc)',
    zoomTitle: 'Acercar o alejar',
    arrowPrevTitle: 'Foto anterior',
    arrowNextTitle: 'Foto siguiente',
    errorMsg: 'No se pudo cargar la foto',
    indexIndicatorSep: ' de ',
  };

  function crearVisor(galeria, hijos) {
    if (!document.querySelector(galeria)) return null;
    const visor = new PhotoSwipeLightbox({ ...opciones, gallery: galeria, children: hijos });

    visor.on('uiRegister', () => {
      const { ui } = visor.pswp;
      // Nombre del plato debajo de la foto
      ui.registerElement({
        name: 'leyenda',
        order: 9,
        isButton: false,
        appendTo: 'root',
        onInit: (el, pswp) => {
          pswp.on('change', () => {
            const enlace = pswp.currSlide.data.element;
            el.innerHTML = enlace ? `<strong>${enlace.dataset.leyenda || ''}</strong><small>Imagen referencial</small>` : '';
          });
        },
      });
      // En los tríos, botón para pedir directo por WhatsApp (o agregarlo al pedido armado, si está pedido.js)
      const conPedido = Boolean(window.merlinPedido);
      ui.registerElement({
        name: 'pedir',
        order: 10,
        isButton: true,
        tagName: 'button',
        appendTo: 'root',
        title: conPedido ? 'Agregar este trío a tu pedido' : 'Pedir este trío por WhatsApp',
        html: conPedido
          ? '<svg class="i" aria-hidden="true"><use href="#i-bag"/></svg>Agregar al pedido'
          : '<svg class="i" aria-hidden="true"><use href="#i-wa"/></svg>Pedir este trío',
        onInit: (el, pswp) => {
          pswp.on('change', () => {
            const enlace = pswp.currSlide.data.element;
            el.hidden = !(enlace && enlace.closest('.trio'));
          });
        },
        onClick: (e, el, pswp) => {
          const enlace = pswp.currSlide.data.element;
          const boton = enlace && enlace.closest('[data-item]')?.querySelector('[data-pedido]');
          if (boton) boton.click();
          if (conPedido) pswp.close(); // así se ve cómo el trío entra al pedido
        },
      });
    });

    // Mientras la foto está abierta, la página no se mueve y la galería no avanza sola
    visor.on('beforeOpen', () => {
      window.merlinLenis?.stop();
      galeriaSwiper()?.autoplay?.pause?.();
    });
    visor.on('destroy', () => {
      window.merlinLenis?.start();
      galeriaSwiper()?.autoplay?.resume?.();
    });

    visor.init();
    return visor;
  }

  // En la galería, tocar una foto de los costados primero la trae al centro; la del centro se abre en grande
  const carrusel = document.querySelector('.galeria-swiper');
  carrusel?.addEventListener('click', (e) => {
    const slide = e.target.closest('.galeria-slide');
    const swiper = galeriaSwiper();
    if (!slide || !swiper || slide.classList.contains('swiper-slide-active')) return;
    e.preventDefault();
    e.stopPropagation();
    swiper.slideTo(swiper.slides.indexOf(slide));
  }, true);

  crearVisor('.galeria-swiper', '.galeria-slide a');
  crearVisor('.trios-carril', '.trio-foto a');
})();
