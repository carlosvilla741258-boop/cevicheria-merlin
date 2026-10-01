// Scroll suave con Lenis, sincronizado con GSAP ScrollTrigger.
// Para comparar sin Lenis, abre la página con ?sin-lenis al final de la dirección.
(() => {
  'use strict';

  if (!window.Lenis || new URLSearchParams(location.search).has('sin-lenis')) return;

  // Lenis respeta solo la preferencia de "menos movimiento" del visitante
  const lenis = new Lenis({ lerp: 0.09, stopInertiaOnNavigate: true });
  window.merlinLenis = lenis;

  if (window.gsap && window.ScrollTrigger) {
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((tiempo) => lenis.raf(tiempo * 1000));
    gsap.ticker.lagSmoothing(0);
  } else {
    const bucle = (tiempo) => { lenis.raf(tiempo); requestAnimationFrame(bucle); };
    requestAnimationFrame(bucle);
  }

  // Posición real del elemento sin contar transformaciones: si está a mitad de una animación
  // de entrada (por ejemplo, el formulario sube 90 px), igual llegamos al lugar correcto
  const posicion = (el) => {
    let y = 0;
    for (let n = el; n; n = n.offsetParent) y += n.offsetTop;
    return y - (parseFloat(getComputedStyle(el).scrollMarginTop) || 0);
  };
  window.merlinIrA = (el, desplazamiento = 0) => lenis.scrollTo(posicion(el) + desplazamiento, { duration: 1.4 });

  // Enlaces internos (#carta, #form-reserva…) con el mismo deslizamiento suave
  document.addEventListener('click', (e) => {
    const enlace = e.target.closest('a[href^="#"]');
    const id = enlace && enlace.getAttribute('href');
    if (!id || id.length < 2) return;
    const destino = document.querySelector(id);
    if (!destino) return;
    e.preventDefault();
    window.merlinIrA(destino);
  });

  // Barra de avance arriba de la página
  const barra = document.querySelector('.progreso-scroll span');
  if (barra) lenis.on('scroll', ({ progress }) => { barra.style.transform = `scaleX(${progress || 0})`; });
})();
