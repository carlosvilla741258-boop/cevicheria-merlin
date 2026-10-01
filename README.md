# Cevichería Merlin · Landing

Landing de Merlin Cevichería Peruana (San Juan de Lurigancho): carta con precios, pedidos y reservas por WhatsApp, y los dos locales con horario y mapa.

## Verla en tu computadora

- Abre `index.html` con doble clic, o
- ejecuta `node herramientas/servidor.mjs` y entra a http://localhost:5500

## Estructura

- `index.html`, `css/styles.css`, `js/main.js`: la página.
- `img/`: fotos optimizadas. Mientras no existan, la página muestra ilustraciones.
- `herramientas/`: servidor local, generador de fotos con Higgsfield y optimizador.

El número de WhatsApp y los horarios de cada local están al inicio de `js/main.js`.

## Generar las fotos con Higgsfield

```powershell
$env:HF_CREDENTIALS = "api_key_id:api_key_secret"
node herramientas/generar-imagenes.mjs
powershell -ExecutionPolicy Bypass -File herramientas/optimizar-imagenes.ps1
```

La clave se pasa por variable de entorno y nunca se guarda en el repositorio.
