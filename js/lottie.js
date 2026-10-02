// Animaciones Lottie (lottie-web, versión liviana con SVG).
// Las animaciones están en lottie/*.json y se generan con herramientas/generar-lottie.mjs.
// Cada contenedor [data-lottie] dice qué animación carga y cómo se reproduce (data-modo):
//   bucle  -> se repite mientras está en pantalla (data-retraso: segundos antes de empezar)
//   pasar  -> nada una vez al cargar y otra vez cada vez que pasas el mouse (logos)
//   manual -> la dispara la página (el check del aviso, con el evento merlin:aviso de main.js)
// Si Lottie no carga, se quedan los íconos estáticos.
(() => {
  'use strict';

  if (!window.lottie) return;

  const quieto = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const manuales = {};

  const enPantalla = (el, anim) => {
    let visible = false;
    let esperando = Boolean(el.dataset.retraso);
    const actualizar = () => {
      if (visible && !esperando && !el.classList.contains('is-oculto')) anim.play(); else anim.pause();
    };
    if (esperando) setTimeout(() => { esperando = false; actualizar(); }, Number(el.dataset.retraso) * 1000);
    new IntersectionObserver(([entrada]) => { visible = entrada.isIntersecting; actualizar(); }).observe(el);
    return actualizar;
  };

  const alPasar = (el, anim) => {
    const disparador = el.closest('a, button') || el;
    // Al salir no se corta: termina la vuelta y queda quieto (el último cuadro es igual al primero)
    const nadar = () => { anim.loop = true; anim.play(); };
    const parar = () => { anim.loop = false; };
    disparador.addEventListener('pointerenter', nadar);
    disparador.addEventListener('pointerleave', parar);
    disparador.addEventListener('focus', nadar);
    disparador.addEventListener('blur', parar);
    setTimeout(() => { anim.loop = false; anim.play(); }, 1400);
  };

  document.querySelectorAll('[data-lottie]').forEach((el) => {
    const modo = el.dataset.modo || 'bucle';
    const anim = lottie.loadAnimation({
      container: el,
      renderer: 'svg',
      loop: modo === 'bucle',
      autoplay: false,
      path: `lottie/${el.dataset.lottie}.json`,
      rendererSettings: { preserveAspectRatio: 'xMidYMid meet' },
    });
    anim.addEventListener('DOMLoaded', () => {
      el.classList.add('is-listo');
      if (quieto) {
        // Sin movimiento: un cuadro fijo (el check ya dibujado)
        anim.goToAndStop(modo === 'manual' ? anim.totalFrames - 1 : 0, true);
        return;
      }
      if (modo === 'pasar') alPasar(el, anim);
      else if (modo === 'manual') manuales[el.dataset.lottie] = anim;
      else el.lottieActualizar = enPantalla(el, anim);
    });
  });

  // El check del aviso se dibuja cada vez que abrimos WhatsApp
  document.addEventListener('merlin:aviso', () => {
    if (manuales.check) manuales.check.goToAndPlay(0, true);
  });

  // La burbuja de "escribiendo…" se va cuando abren el panel de WhatsApp: ya cumplió su función
  const burbuja = document.querySelector('.wa-escribiendo');
  const botonWa = document.querySelector('.wa-btn');
  if (burbuja && botonWa) {
    botonWa.addEventListener('click', () => {
      burbuja.classList.add('is-oculto');
      if (burbuja.lottieActualizar) burbuja.lottieActualizar();
    }, { once: true });
  }
})();
