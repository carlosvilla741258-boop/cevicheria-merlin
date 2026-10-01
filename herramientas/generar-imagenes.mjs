// Genera las fotos de la landing con la API de Higgsfield.
// Uso (PowerShell):  $env:HF_CREDENTIALS = "api_key_id:api_key_secret"; node herramientas/generar-imagenes.mjs [nombre ...]
// Sin nombres genera todas las imágenes de imagenes.json. La clave nunca se guarda en el proyecto.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const aqui = path.dirname(fileURLToPath(import.meta.url));
const salida = path.resolve(aqui, '..', 'higgsfield-originales');
const credenciales = process.env.HF_CREDENTIALS;
if (!credenciales) {
  console.error('Falta la variable HF_CREDENTIALS con el formato "api_key_id:api_key_secret".');
  process.exit(1);
}

const API = 'https://api.higgsfield.ai';
const MODELO = 'higgsfield-ai/soul/standard';
const headers = { Authorization: `Key ${credenciales}`, 'Content-Type': 'application/json', Accept: 'application/json' };
// Estilo común para que todas las fotos de platos se vean como una sola sesión
const ESTILO_PLATO = 'served on a round white ceramic plate centered in the frame, seen from directly above, the plate fills most of the image, plain pale sky-blue background, soft natural daylight, professional food photography, appetizing, sharp detail. No text, no logos, no hands, no cutlery.';
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

const todos = JSON.parse(await fs.readFile(path.join(aqui, 'imagenes.json'), 'utf8'));
const pedidos = process.argv.slice(2);
const trabajos = pedidos.length ? todos.filter((t) => pedidos.includes(t.name)) : todos;

async function generar(t) {
  const prompt = t.prompt || `Overhead food photograph of ${t.dish}, ${ESTILO_PLATO}`;
  const envio = await fetch(`${API}/${MODELO}`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ prompt, aspect_ratio: t.aspect_ratio || '1:1', resolution: '1080p', num_images: 1 }),
  });
  const texto = await envio.text();
  if (!envio.ok) throw new Error(`HTTP ${envio.status} ${texto.slice(0, 300)}`);
  const { status_url: urlEstado } = JSON.parse(texto);

  for (let intento = 0; intento < 90; intento++) {
    const estado = await (await fetch(urlEstado, { headers })).json();
    if (estado.status === 'completed') {
      const respuesta = await fetch(estado.images[0].url);
      const tipo = respuesta.headers.get('content-type') || '';
      const ext = tipo.includes('png') ? 'png' : tipo.includes('webp') ? 'webp' : 'jpg';
      const archivo = path.join(salida, `${t.name}.${ext}`);
      await fs.mkdir(path.dirname(archivo), { recursive: true });
      await fs.writeFile(archivo, Buffer.from(await respuesta.arrayBuffer()));
      return archivo;
    }
    if (['failed', 'nsfw', 'canceled'].includes(estado.status)) throw new Error(`estado ${estado.status} ${estado.error || ''}`);
    await esperar(5000);
  }
  throw new Error('se agotó el tiempo de espera');
}

// Hasta 3 solicitudes simultáneas
const cola = [...trabajos];
let errores = 0;
await Promise.all(Array.from({ length: Math.min(3, cola.length) }, async () => {
  while (cola.length) {
    const t = cola.shift();
    try {
      console.log(`✔ ${t.name} -> ${path.relative(process.cwd(), await generar(t))}`);
    } catch (e) {
      errores++;
      console.log(`✘ ${t.name}: ${e.message}`);
    }
  }
}));
console.log(errores ? `Terminado con ${errores} error(es).` : 'Listo. Ahora ejecuta herramientas/optimizar-imagenes.ps1');
process.exitCode = errores ? 1 : 0;
