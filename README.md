# Cevichería Merlin · Landing

Landing de Merlin Cevichería Peruana (San Juan de Lurigancho): carta con precios, pedidos y reservas por WhatsApp, y los dos locales con horario y mapa.

## Verla en tu computadora

- Ejecuta `node herramientas/servidor.mjs` y entra a http://localhost:5500, o
- abre `index.html` con doble clic (así las animaciones Lottie no cargan y se ven los íconos fijos).

## Estructura

- `index.html`, `css/styles.css`: la página.
- `css/uiverse.css`: componentes de [Uiverse](https://github.com/uiverse-io/galaxy) (licencia MIT) adaptados a los colores de Merlin. Autores: 0x-Sarthak (botón con círculo), CaptainToy y ChanduOffl (botón de enviar), Alanav29 (etiqueta flotante), NlghtM4re (selector con brillo) y Gianluks90 (aviso de confirmación).
- `js/main.js`: WhatsApp, reservas, locales y menú.
- `js/pedido.js` y `css/pedido.css`: pedido armado. Los botones "Agregar" juntan varios platos; la barra "Tu pedido" abre un panel con cantidades, total y forma de entrega (delivery o recojo en un local), y se envía todo en un solo mensaje de WhatsApp. El pedido queda guardado en el navegador del cliente. Si se quitan estos dos archivos, los botones vuelven a pedir de a un plato.
- `js/animaciones.js`: animaciones con [GSAP](https://github.com/greensock/GSAP) (ScrollTrigger y SplitText), cargado desde jsDelivr.
- `js/carruseles.js`: carruseles con [Swiper](https://github.com/nolimits4web/swiper): la galería de platos y, en celular, los tríos como mazo de cartas.
- `js/fotos.js`: fotos en grande con [PhotoSwipe](https://github.com/dimsemenov/PhotoSwipe) (galería y tríos, con botón para pedir el trío).
- `js/lottie.js` y `lottie/`: animaciones con [Lottie](https://github.com/airbnb/lottie-web) (versión liviana, SVG): el pez del logo nadando, el check del aviso, la moto de delivery que cruza la pista con el scroll y la burbuja de "escribiendo…" junto a WhatsApp. Son dibujos originales hechos con `herramientas/generar-lottie.mjs`; un diseñador puede reemplazar los JSON por los suyos (After Effects o LottieFiles).
- `js/scroll-suave.js`: scroll suave con [Lenis](https://github.com/darkroomengineering/lenis), sincronizado con GSAP. Para comparar sin Lenis, abre la página con `?sin-lenis`.
- `img/fotos/`: fotos referenciales de Unsplash (créditos en `img/fotos/CREDITOS.md`). Hay que reemplazarlas por fotos reales de Merlin.
- `herramientas/`: servidor local, generador de fotos con Higgsfield, optimizador y generador de las animaciones Lottie (`node herramientas/generar-lottie.mjs`).

El número de WhatsApp y los horarios de cada local están al inicio de `js/main.js`.

## Generar las fotos con Higgsfield

```powershell
$env:HF_CREDENTIALS = "api_key_id:api_key_secret"
node herramientas/generar-imagenes.mjs
powershell -ExecutionPolicy Bypass -File herramientas/optimizar-imagenes.ps1
```

La clave se pasa por variable de entorno y nunca se guarda en el repositorio.
