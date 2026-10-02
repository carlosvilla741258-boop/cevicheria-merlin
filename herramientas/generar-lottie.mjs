// Genera las animaciones Lottie de Merlin (archivos JSON) dibujadas con formas simples.
// Uso: node herramientas/generar-lottie.mjs   ->   lottie/pez.json, check.json, moto.json y escribiendo.json
// Los JSON se pueden revisar en https://lottiefiles.com/preview o reemplazar por los de un diseñador
// (si cambian, hay que conservar las clases lt-* del pez, que el CSS usa para pintarlo).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const carpeta = path.join(raiz, 'lottie');

// ---------- Colores de Merlin (Lottie usa RGB de 0 a 1) ----------
const rgb = (hex) => [1, 3, 5].map((i) => +(parseInt(hex.slice(i, i + 2), 16) / 255).toFixed(4)).concat(1);
const COLOR = {
  marino: rgb('#0A2A57'),
  marino900: rgb('#061935'),
  marino700: rgb('#12407F'),
  celeste: rgb('#6CC5F0'),
  celeste300: rgb('#A6DCF6'),
  celeste100: rgb('#E3F4FD'),
  blanco: rgb('#FFFFFF'),
  wa: rgb('#25D366'),
};

// ---------- Propiedades fijas y animadas ----------
const red = (n) => Math.round(n * 100) / 100;
const fijo = (k) => ({ a: 0, k });
const CURVAS = {
  suave: [0.45, 0, 0.55, 1],
  sale: [0.16, 1, 0.3, 1],
  rebote: [0.34, 1.56, 0.64, 1],
  entra: [0.55, 0, 1, 0.45],
  lineal: [0, 0, 1, 1],
};
// claves: [[fotograma, valor, curva], ...]. La curva va de ese fotograma al siguiente ('fija' = salto sin transición).
const animado = (claves, curvaBase = 'suave') => ({
  a: 1,
  // Si dos claves caen en el mismo fotograma, queda la última
  k: claves.filter((c, i) => i === claves.length - 1 || claves[i + 1][0] !== c[0]).map(([t, v, curva = curvaBase], i, lista) => {
    const s = Array.isArray(v) ? v : [v];
    if (i === lista.length - 1) return { t, s };
    if (curva === 'fija') return { t, s, h: 1 };
    const [x1, y1, x2, y2] = CURVAS[curva] || curva;
    return { t, s, o: { x: x1, y: y1 }, i: { x: x2, y: y2 } };
  }),
});
const esAnimado = (v) => v && typeof v === 'object' && v.a === 1;
const prop = (v) => (esAnimado(v) ? v : fijo(v));
// Las capas usan valores en 3D ([x, y, z])
const en3d = (v, z) => (esAnimado(v)
  ? { a: 1, k: v.k.map((c) => ({ ...c, s: [...c.s.slice(0, 2), z] })) }
  : fijo([...v.slice(0, 2), z]));

// ---------- Formas ----------
// Convierte un trazo SVG (M L H V C Q Z, absolutos o relativos, un solo subtrazo) al formato de Lottie.
// mapa(x, y) permite escalar o mover el dibujo.
function forma(d, mapa = (x, y) => [x, y]) {
  const t = d.match(/[a-zA-Z]|-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/g);
  const pts = []; // { v, ent, sal } con puntos de control absolutos
  let i = 0; let cmd = ''; let x = 0; let y = 0; let cerrada = false;
  const n = () => parseFloat(t[i++]);
  const punto = (px, py) => pts.push({ v: [px, py], ent: [px, py], sal: [px, py] });
  while (i < t.length) {
    if (/[a-zA-Z]/.test(t[i])) cmd = t[i++];
    const rel = cmd !== cmd.toUpperCase();
    const bx = rel ? x : 0; const by = rel ? y : 0;
    switch (cmd.toUpperCase()) {
      case 'M': x = bx + n(); y = by + n(); punto(x, y); cmd = rel ? 'l' : 'L'; break;
      case 'L': x = bx + n(); y = by + n(); punto(x, y); break;
      case 'H': x = bx + n(); punto(x, y); break;
      case 'V': y = by + n(); punto(x, y); break;
      case 'C': {
        const c1 = [bx + n(), by + n()]; const c2 = [bx + n(), by + n()];
        x = bx + n(); y = by + n();
        pts[pts.length - 1].sal = c1; punto(x, y); pts[pts.length - 1].ent = c2;
        break;
      }
      case 'Q': {
        const q = [bx + n(), by + n()]; const ini = [x, y];
        x = bx + n(); y = by + n();
        pts[pts.length - 1].sal = [ini[0] + (q[0] - ini[0]) * 2 / 3, ini[1] + (q[1] - ini[1]) * 2 / 3];
        punto(x, y); pts[pts.length - 1].ent = [x + (q[0] - x) * 2 / 3, y + (q[1] - y) * 2 / 3];
        break;
      }
      case 'Z':
        cerrada = true;
        if (i < t.length && !/[a-zA-Z]/.test(t[i])) throw new Error(`Números sueltos después de Z en: ${d}`);
        break;
      default: throw new Error(`Comando no soportado: ${cmd}`);
    }
  }
  if (cerrada && pts.length > 1) {
    const a = pts[0]; const z = pts[pts.length - 1];
    if (Math.hypot(a.v[0] - z.v[0], a.v[1] - z.v[1]) < 0.01) { a.ent = z.ent; pts.pop(); }
  }
  const rel = (c, v) => { const [cx, cy] = mapa(...c); return [red(cx - v[0]), red(cy - v[1])]; };
  const v = pts.map((p) => mapa(...p.v).map(red));
  return { c: cerrada, v, i: pts.map((p, k) => rel(p.ent, v[k])), o: pts.map((p, k) => rel(p.sal, v[k])) };
}

// Ola senoidal de x0 a x1. fase en vueltas (0 a 1): al subir, la ola avanza hacia la derecha.
function ola({ x0, x1, y, A, L, fase = 0, puntos = 16 }) {
  const h = (x1 - x0) / puntos; const k = (2 * Math.PI) / L;
  const v = []; const ent = []; const sal = [];
  for (let j = 0; j <= puntos; j++) {
    const x = x0 + j * h; const ang = k * (x - x0) - fase * 2 * Math.PI;
    const pendiente = -A * k * Math.cos(ang);
    v.push([red(x), red(y - A * Math.sin(ang))]);
    ent.push(j === 0 ? [0, 0] : [red(-h / 3), red((-pendiente * h) / 3)]);
    sal.push(j === puntos ? [0, 0] : [red(h / 3), red((pendiente * h) / 3)]);
  }
  return { c: false, v, i: ent, o: sal };
}

const ruta = (d, mapa) => ({ ty: 'sh', ks: prop(typeof d === 'string' ? forma(d, mapa) : d) });
const rutaAnimada = (claves, curva) => ({ ty: 'sh', ks: animado(claves, curva) });
const elipse = (p, s) => ({ ty: 'el', p: prop(p), s: prop(s), d: 1 });
const rect = (p, s, r = 0) => ({ ty: 'rc', p: prop(p), s: prop(s), r: prop(r), d: 1 });
const relleno = (c, o = 100) => ({ ty: 'fl', c: prop(c), o: prop(o), r: 1 });
const trazo = (c, w, { o = 100, guiones } = {}) => ({
  ty: 'st', c: prop(c), o: prop(o), w: prop(w), lc: 2, lj: 2, ml: 4,
  ...(guiones ? { d: [{ n: 'd', nm: 'guion', v: prop(guiones[0]) }, { n: 'g', nm: 'espacio', v: prop(guiones[1]) }, { n: 'o', nm: 'desfase', v: prop(guiones[2]) }] } : {}),
});
const recorte = (s, e, o = 0) => ({ ty: 'tm', s: prop(s), e: prop(e), o: prop(o), m: 1 });
const tr = ({ p = [0, 0], a = [0, 0], s = [100, 100], r = 0, o = 100 } = {}) => ({
  ty: 'tr', p: prop(p), a: prop(a), s: prop(s), r: prop(r), o: prop(o), sk: fijo(0), sa: fijo(0),
});
// En Lottie lo que va primero se dibuja encima: grupos y capas se listan de arriba hacia abajo
const grupo = (nm, items, t) => ({ ty: 'gr', nm, it: [...items, tr(t)] });

const ksCapa = ({ p = [0, 0], a = [0, 0], s = [100, 100], r = 0, o = 100 } = {}) => ({
  o: prop(o), r: prop(r), p: en3d(p, 0), a: en3d(a, 0), s: en3d(s, 100),
});
const capa = (ind, nm, shapes, { ks, cl, padre } = {}) => ({
  ddd: 0, ind, ty: 4, nm, ...(cl ? { cl } : {}), ...(padre ? { parent: padre } : {}),
  sr: 1, ks: ksCapa(ks), ao: 0, shapes, st: 0, bm: 0,
});
const nulo = (ind, nm, ks) => ({ ddd: 0, ind, ty: 3, nm, sr: 1, ks: ksCapa(ks), ao: 0, st: 0, bm: 0 });
const composicion = ({ nm, w, h, op, fr = 60, capas }) => ({
  v: '5.12.2', fr, ip: 0, op, w, h, nm, ddd: 0, assets: [],
  layers: capas.map((c) => ({ ...c, ip: 0, op })),
});

// Repite un ciclo de claves a lo largo de la animación
const ciclo = (total, periodo, valores, curva) => {
  const claves = [];
  for (let t = 0, j = 0; t <= total + 0.001; t += periodo / valores.length, j++) claves.push([red(t), valores[j % valores.length], curva]);
  return claves;
};

// ======================================================================
// 1. Pez del logo: nada (cola y vaivén), parpadea y la ola avanza. 2 s en bucle.
//    Cada parte lleva una clase (lt-fondo, lt-pez, lt-ojo, lt-ola) para pintarla desde el CSS.
// ======================================================================
function pez() {
  const op = 120;
  const x10 = (x, y) => [x * 10, y * 10]; // el logo se dibujó en 44 x 44
  const cuerpo = 'M9 20C13.5 12.5 22.5 11.5 29 17L29.6 20 29 23C22.5 28.5 13.5 27.5 9 20Z';
  const cola = 'M28.2 17.2L35 12.5 33.6 20 35 27.5 28.2 22.8Z';
  const fasesOla = [];
  for (let j = 0; j <= 16; j++) fasesOla.push([red((j * op) / 16), ola({ x0: 110, x1: 330, y: 320, A: 11, L: 110, fase: j / 16 }), 'lineal']);

  return composicion({
    nm: 'Merlin · pez', w: 440, h: 440, op,
    capas: [
      capa(1, 'ojo', [grupo('ojo', [elipse([150, 186], [30, 30]), relleno(COLOR.blanco)], {
        p: [150, 186], a: [150, 186],
        s: animado([[0, [100, 100], 'fija'], [84, [100, 100]], [90, [100, 8]], [97, [100, 100], 'fija'], [120, [100, 100]]]),
      })], { cl: 'lt-ojo', padre: 3 }),
      capa(2, 'cola', [grupo('cola', [ruta(cola, x10), relleno(COLOR.marino)], {
        p: [288, 200], a: [288, 200],
        r: animado(ciclo(op, 30, [9, -9])),
        s: animado(ciclo(op, 15, [[100, 100], [84, 74]])),
      })], { cl: 'lt-pez', padre: 3 }),
      capa(3, 'cuerpo', [grupo('cuerpo', [ruta(cuerpo, x10), relleno(COLOR.marino)])], {
        cl: 'lt-pez',
        ks: {
          a: [220, 200], p: animado([[0, [220, 200]], [60, [220, 192]], [120, [220, 200]]]),
          r: animado([[0, -2.5], [60, 2.5], [120, -2.5]]),
        },
      }),
      capa(4, 'ola', [grupo('ola', [rutaAnimada(fasesOla), trazo(COLOR.celeste, 22)])], { cl: 'lt-ola' }),
      capa(5, 'fondo', [grupo('fondo', [elipse([220, 220], [440, 440]), relleno(COLOR.blanco)])], { cl: 'lt-fondo' }),
    ],
  });
}

// ======================================================================
// 2. Check de confirmación: círculo verde que rebota, check que se dibuja, onda y chispas. 1,2 s, una vez.
// ======================================================================
function check() {
  const op = 72;
  const chispas = Array.from({ length: 8 }, (_, k) => {
    const ang = (k / 8) * Math.PI * 2 - Math.PI / 2;
    const en = (r) => [red(100 + r * Math.cos(ang)), red(100 + r * Math.sin(ang))];
    return grupo(`chispa ${k + 1}`, [
      elipse(animado([[0, en(64), 'fija'], [12, en(64), 'sale'], [42, en(96)]]),
        animado([[0, [0, 0], 'fija'], [12, [15, 15], 'entra'], [42, [0, 0]]])),
      relleno(k % 2 ? COLOR.marino : COLOR.celeste),
    ]);
  });
  return composicion({
    nm: 'Merlin · check', w: 200, h: 200, op,
    capas: [
      capa(1, 'check', [grupo('check', [
        ruta('M68 101L89 122L134 78'),
        recorte(0, animado([[0, 0, 'fija'], [15, 0, 'sale'], [38, 100]])),
        trazo(COLOR.blanco, 14),
      ])]),
      capa(2, 'círculo', [grupo('círculo', [elipse([100, 100], [136, 136]), relleno(COLOR.wa)], {
        p: [100, 100], a: [100, 100], s: animado([[0, [0, 0], 'rebote'], [20, [100, 100]]]),
      })]),
      capa(3, 'chispas', chispas),
      capa(4, 'onda', [grupo('onda', [
        elipse([100, 100], animado([[0, [136, 136], 'fija'], [8, [136, 136], 'sale'], [44, [198, 198]]])),
        trazo(COLOR.wa, animado([[0, 10, 'fija'], [8, 10, 'sale'], [44, 0]]), { o: animado([[0, 0, 'fija'], [8, 70, 'entra'], [44, 0]]) }),
      ])]),
    ],
  });
}

// ======================================================================
// 3. Moto de delivery con la caja de Merlin: ruedas que giran, rebote, líneas de velocidad y humo. 1 s en bucle.
//    La pista (la línea del piso) la dibuja el CSS, porque la moto se desplaza con el scroll.
// ======================================================================
function moto() {
  const op = 60;
  const C = COLOR;
  const conChasis = { padre: 1 };
  const rueda = (ind, nm, cx) => capa(ind, nm, [
    grupo('rayos', [ruta(`M${cx - 22} 252L${cx + 22} 252`), ruta(`M${cx} 230L${cx} 274`), trazo(C.marino700, 5)], {
      p: [cx, 252], a: [cx, 252], r: animado([[0, 0, 'lineal'], [op, 720]]),
    }),
    grupo('centro', [elipse([cx, 252], [18, 18]), relleno(C.celeste)]),
    grupo('aro', [elipse([cx, 252], [54, 54]), relleno(C.blanco)]),
    grupo('llanta', [elipse([cx, 252], [66, 66]), trazo(C.marino900, 14)]),
  ]);
  // Logo del pez sobre la caja
  const enCaja = (x, y) => [126 + (x - 22) * 2.3, 128 + (y - 20) * 2.3];
  const lineas = [[112, 0], [150, 8], [196, 16]].map(([y, d], k) => grupo(`línea ${k + 1}`, [
    ruta(`M74 ${y}L8 ${y}`),
    recorte(animado([[0, 0, 'fija'], [d + 8, 0, 'entra'], [d + 30, 100]]), animado([[0, 0, 'fija'], [d, 0, 'sale'], [d + 22, 100]])),
    trazo(C.blanco, 6, { o: 85 }),
  ]));
  const humo = [0, 30].map((d, k) => grupo(`humo ${k + 1}`, [
    elipse(animado([[0, [70, 252], 'fija'], [d, [70, 252], 'sale'], [d + 30, [26, 240]]]),
      animado([[0, [0, 0], 'fija'], [d, [10, 10], 'sale'], [d + 30, [30, 30]]])),
    relleno(C.blanco, animado([[0, 0, 'fija'], [d, 80, 'entra'], [d + 30, 0]])),
  ]));

  return composicion({
    nm: 'Merlin · moto', w: 480, h: 300, op,
    capas: [
      nulo(1, 'chasis (rebote)', { p: animado([[0, [0, 0]], [15, [0, -4]], [30, [0, 0]], [45, [0, -2.5]], [60, [0, 0]]]) }),
      capa(2, 'brazo', [
        grupo('guante', [elipse([342, 102], [20, 20]), relleno(C.marino900)]),
        grupo('manga', [ruta('M238 110L288 130L338 104'), trazo(C.marino, 17)]),
      ], conChasis),
      capa(3, 'casco', [
        grupo('visera', [ruta('M240 50L262 50C268 50 270 55 270 60L270 66C270 73 264 78 257 78L244 78Z'), relleno(C.marino900)]),
        grupo('casco', [elipse([238, 62], [60, 60]), relleno(C.blanco)]),
      ], conChasis),
      capa(4, 'torso', [grupo('casaca', [ruta('M192 166C186 128 198 96 230 90C248 86 264 96 263 114L252 166Z'), relleno(C.marino)])], conChasis),
      capa(5, 'pierna', [
        grupo('zapato', [rect([306, 236], [36, 14], 7), relleno(C.marino900)]),
        grupo('pierna', [ruta('M212 160L282 176L296 232'), trazo(C.marino900, 25)]),
      ], conChasis),
      capa(6, 'escudo y manubrio', [
        grupo('manubrio', [ruta('M334 104L384 95'), trazo(C.marino900, 10)]),
        grupo('faro', [elipse([367, 124], [22, 22]), relleno(C.celeste100), trazo(C.marino900, 4)]),
        grupo('escudo', [ruta('M316 248L334 120C335 112 341 106 349 106L360 106C366 106 370 112 369 118L353 212C351 226 342 238 330 248Z'), relleno(C.blanco)]),
      ], conChasis),
      capa(7, 'caja Merlin', [
        grupo('ojo', [elipse(enCaja(15, 18.6), [7, 7]), relleno(C.marino)]),
        grupo('pez', [ruta('M9 20C13.5 12.5 22.5 11.5 29 17L35 12.5 33.6 20 35 27.5 29 23C22.5 28.5 13.5 27.5 9 20Z', enCaja), relleno(C.blanco)]),
        grupo('tapa', [rect([126, 82], [106, 18], 9), relleno(C.marino900)]),
        grupo('caja', [rect([126, 126], [96, 80], 12), relleno(C.marino)]),
        grupo('parrilla', [ruta('M80 170L174 170'), trazo(C.marino900, 6)]),
      ], conChasis),
      capa(8, 'asiento', [grupo('asiento', [rect([214, 168], [108, 20], 10), relleno(C.marino900)])], conChasis),
      capa(9, 'carrocería', [grupo('carrocería', [
        ruta('M70 236C70 196 104 176 150 174L262 174C278 174 288 186 286 202L282 236C281 244 275 248 267 248L200 248C197 216 173 196 142 196C111 196 89 216 86 246C76 246 70 242 70 236Z'),
        relleno(C.blanco),
      ])], conChasis),
      capa(10, 'piso', [grupo('piso', [rect([302, 242], [76, 16], 8), relleno(C.marino900)])], conChasis),
      capa(11, 'guardabarro', [grupo('guardabarro', [ruta('M326 250C326 224 346 204 372 204C398 204 418 222 418 242'), trazo(C.blanco, 13)])], conChasis),
      capa(12, 'horquilla', [grupo('horquilla', [ruta('M372 252L354 150'), trazo(C.marino900, 10)])], conChasis),
      rueda(13, 'rueda delantera', 372),
      rueda(14, 'rueda trasera', 140),
      capa(15, 'escape', [grupo('escape', [rect([92, 252], [40, 12], 6), relleno(C.marino900)])], conChasis),
      capa(16, 'humo', humo),
      capa(17, 'velocidad', lineas),
    ],
  });
}

// ======================================================================
// 4. Burbuja de "escribiendo…" junto al botón de WhatsApp: aparece, los puntos saltan y se va. 4 s en bucle.
// ======================================================================
function escribiendo() {
  const op = 240;
  const entra = 18; const sale = 150;
  const puntos = [34, 56, 78].map((x, k) => {
    const claves = [[0, [x, 38], 'fija']];
    for (let t = 24 + k * 7; t + 20 < sale - 6; t += 34) claves.push([t, [x, 38], 'suave'], [t + 9, [x, 29], 'suave'], [t + 18, [x, 38], 'fija']);
    claves.push([op, [x, 38]]);
    return grupo(`punto ${k + 1}`, [elipse(animado(claves), [13, 13]), relleno(COLOR.marino, 70)]);
  });
  return composicion({
    nm: 'Merlin · escribiendo', w: 120, h: 84, op,
    capas: [
      capa(1, 'puntos', puntos, { padre: 2 }),
      capa(2, 'burbuja', [grupo('burbuja', [
        ruta('M84 56C92 64 102 70 114 76C104 66 100 58 99 48Z'),
        rect([56, 38], [100, 60], 30),
        relleno(COLOR.blanco),
      ])], {
        ks: {
          a: [104, 70], p: [104, 70],
          s: animado([[0, [0, 0], 'rebote'], [entra, [100, 100], 'fija'], [sale, [100, 100], 'entra'], [sale + 14, [0, 0], 'fija'], [op, [0, 0]]]),
        },
      }),
    ],
  });
}

fs.mkdirSync(carpeta, { recursive: true });
for (const [nombre, crear] of Object.entries({ pez, check, moto, escribiendo })) {
  const texto = JSON.stringify(crear());
  fs.writeFileSync(path.join(carpeta, `${nombre}.json`), texto);
  console.log(`lottie/${nombre}.json  ${(texto.length / 1024).toFixed(1)} KB`);
}
