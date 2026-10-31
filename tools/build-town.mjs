/**
 * Genera las zonas explorables (exteriores de Exploradores del Cielo) a partir
 * de los mapas ripeados de Assets/Lobby/DS ("Ripped by redblueyellow. No credit needed."):
 *
 *   public/assets/town/<zona>.png                 mapa compuesto (los huecos del mar/río, transparentes)
 *   public/assets/town/<zona>-<anim>.png          tira de fotogramas de cada animación (mar, orilla, río)
 *   src/shared/town/zones/<zona>.generated.ts     tamaño, animaciones y rejilla de colisión (8×8 px)
 *
 * Cada hoja trae el mapa con huecos blancos y, aparte, los fotogramas del agua
 * animada. La posición de cada fotograma se ha medido ajustándolo píxel a píxel
 * contra los huecos del mapa (o contra los píxeles iguales, en el río).
 * La colisión se describe a mano con formas (rectángulos, polígonos, elipses)
 * en coordenadas del mapa compuesto: transitable = dentro de alguna forma "walk"
 * y fuera de todas las "block".
 *
 * Uso: node tools/build-town.mjs [--preview carpeta]   (la vista previa marca en
 * rojo lo bloqueado y dibuja una cuadrícula cada 16 px, rotulada cada 64)
 */
import { PNG } from 'pngjs';
import fs from 'node:fs';

const CELL = 8;
const DS = 'Assets/Lobby/DS';
const BLUFF = `${DS}/Sharpedo bluff.png`;

/**
 * layers: en orden de dibujo. base = el mapa (sus píxeles blancos conectados con
 * el borde o tapados por una animación quedan transparentes).
 * anims: fotogramas [x, y] (esquina en la hoja), tamaño y posición en la zona;
 * under = se dibuja bajo el mapa (asoma por sus huecos); ms = duración de cada
 * fotograma [INCIERTO]: no hay datos del ritmo original, se ha elegido a ojo.
 */
const ZONES = {
  // Interior de la casa (cueva de Sharpedo Bluff). El mar asoma por la abertura de la izquierda.
  home: {
    w: 456, h: 272, fill: [24, 120, 216],
    base: { src: BLUFF, x: 470, y: 5, dx: 0, dy: 0, w: 456, h: 272 },
    anims: [{ key: 'sea', ms: 133, src: BLUFF, w: 195, h: 176, dx: 0, dy: 96, under: true,
      frames: [[964, 22], [1170, 22], [1379, 22], [1590, 22], [963, 208], [1173, 208], [1386, 207], [1594, 207], [965, 397]] },
      // Manantial: encima del mapa (su hueco blanco hace de brillo bajo el agua).
      { key: 'spring', ms: 100, src: BLUFF, w: 36, h: 37, dx: 355, dy: 117, under: false, frames: [[753, 295], [797, 295], [839, 295], [883, 295]] }],
  },
  // Lo alto del acantilado, al salir de casa.
  bluff: {
    w: 457, h: 304, fill: [24, 120, 216],
    base: { src: BLUFF, x: 3, y: 2, dx: 0, dy: 0, w: 457, h: 304 },
    anims: [{ key: 'sea', ms: 133, src: BLUFF, w: 203, h: 200, dx: 0, dy: 104, under: true,
      frames: [[24, 522], [246, 522], [470, 521], [695, 523], [26, 759], [250, 759], [482, 758], [712, 756], [967, 759]] }],
  },
  // Aldea Tesoro: la hoja ya trae las dos mitades unidas por el puente.
  town: {
    w: 1152, h: 464,
    base: { src: `${DS}/Treasure town.png`, x: 3, y: 2, dx: 0, dy: 0, w: 1152, h: 464 },
    erase: [[492, 360, 70, 90]], // flores y arbustos sueltos de la hoja
    anims: [{ key: 'river', ms: 133, src: `${DS}/Treasure town.png`, w: 228, h: 424, dx: 480, dy: 32, under: false,
      frames: [[175, 559], [408, 559], [642, 559], [866, 559]] }],
  },
  crossroads: {
    w: 432, h: 456,
    base: { src: `${DS}/Crossroads.png`, x: 1, y: 1, dx: 0, dy: 0, w: 432, h: 456 },
    erase: [[400, 368, 32, 40]], // trozo del texto de créditos de la hoja
    // Agua del pozo (sus 170 píxeles coinciden con el hueco blanco). El molino tiene 4 fotogramas
    // en la hoja, pero el mapa ya lo trae pintado sin suelo debajo: animarlo dejaría aspas dobles.
    anims: [{ key: 'well', ms: 133, src: `${DS}/Crossroads.png`, w: 21, h: 14, dx: 293, dy: 116, under: false, frames: [[555, 129], [582, 129], [610, 129]] }],
  },
  // Playa: el mar (tira de 792 px, con las rocas de los lados) va 17 px por encima del mapa y la orilla debajo.
  beach: {
    w: 792, h: 320, fill: [24, 184, 240],
    base: { src: `${DS}/Beach.png`, x: 14, y: 21, dx: 0, dy: 17, w: 792, h: 303 },
    anims: [
      { key: 'sea', ms: 133, src: `${DS}/Beach.png`, w: 792, h: 65, dx: 0, dy: 0, under: true,
        frames: [[7, 344], [7, 415], [7, 486], [8, 560], [7, 632], [7, 704], [7, 774], [7, 844], [7, 916]] },
      { key: 'shore', ms: 100, src: `${DS}/Beach.png`, w: 395, h: 47, dx: 224, dy: 65, under: true,
        frames: [[827, 8], [828, 63], [826, 117], [829, 171], [829, 225], [830, 279], [831, 334], [829, 390], [827, 444], [824, 500], [824, 558], [825, 612], [827, 665], [825, 719], [825, 772], [826, 823], [825, 877]] },
    ],
  },
  // Lo alto de la escalera del Gremio de Wigglytuff (el cielo es el fondo de la hoja).
  guild: {
    w: 416, h: 354,
    base: { src: `${DS}/Guild/5962.png`, x: 0, y: 0, dx: 0, dy: 0, w: 416, h: 354 },
    // Las esquinas inferiores de la hoja están vacías y la explanada es más estrecha que la
    // vista: se rellenan reflejando la pared del acantilado contigua (relleno, no original).
    mirror: [[0, 228, 56, 126, 'right'], [338, 312, 22, 42, 'left'], [360, 228, 56, 126, 'left']], // en orden: cada uno puede copiar del anterior
    anims: [],
  },
};

/* ───────────── Colisión: formas en coordenadas de la zona ───────────── */
// r: [x, y, w, h] · p: [x1, y1, x2, y2, ...] · e: [cx, cy, rx, ry]
// auto: la paleta exacta del suelo se aprende de rectángulos de muestra (camino,
// hierba); una celda es transitable si al menos "thr" de sus píxeles son suelo.
// Resultado: (auto ∩ walk) − block + force.
const COLLISION = {
  // Suelo de la cueva (las paredes comparten colores con el suelo: solo formas).
  home: {
    walk: [{ p: [130, 118, 160, 100, 205, 98, 212, 80, 246, 80, 252, 98, 300, 100, 322, 120, 334, 134, 352, 140, 400, 138, 420, 150, 414, 170, 370, 178, 330, 184, 300, 192, 220, 198, 150, 194, 126, 180, 118, 150] }],
    block: [{ e: [178, 106, 28, 14] }, { e: [372, 146, 32, 16] }], // barriles, manantial
  },
  bluff: {
    auto: {
      colors: [
        '208,216,80', '224,232,96', '232,232,112', '208,216,88', '184,200,64', '160,184,40', '200,216,80', '216,224,96',
        '248,216,152', '248,208,144', '240,200,128', '248,200,128', '240,192,112', '248,184,112', '232,176,112',
      ],
      thr: 0.6,
      fill: 4,
    },
    walk: [{ p: [176, 98, 457, 98, 457, 252, 322, 252, 262, 205, 225, 182, 195, 170, 180, 140, 172, 115] }],
    block: [],
    force: [{ r: [212, 124, 36, 32] }], // la entrada de la casa (el agujero) y su borde, hasta el camino
  },
  town: {
    auto: {
      colors: [
        // hierba
        '200,216,80', '216,224,80', '216,224,104', '200,208,80', '216,224,88', '184,208,64', '224,224,104', '208,216,72', '216,224,96', '184,192,80', '192,248,56', '152,176,40', '128,152,40',
        // camino
        '248,216,152', '248,200,128', '248,208,144', '232,200,136', '224,184,112', '240,192,120',
      ],
      thr: 0.7,
      fill: 4,
    },
    walk: [{ r: [0, 0, 1152, 464] }],
    // Ladera del acantilado (suroeste) y franjas decorativas del borde norte (rocas y árboles) y
    // sur (acantilado): ahí la cámara tendría que enseñar las esquinas sin mapa del ripeo.
    block: [{ r: [60, 380, 95, 84] }, { r: [0, 0, 1152, 80] }, { r: [0, 392, 1152, 72] }],
    force: [
      { r: [478, 166, 70, 48] }, //  puente
      { e: [832, 190, 38, 26] }, //  círculo de piedras del centro
      // alfombras de la entrada de las tiendas
      { r: [146, 160, 68, 22] }, { r: [292, 152, 92, 28] }, { r: [218, 328, 44, 24] }, { r: [626, 150, 68, 32] },
      { r: [970, 150, 60, 32] }, { r: [736, 330, 30, 20] }, { r: [962, 330, 28, 20] },
    ],
  },
  crossroads: {
    auto: {
      colors: [
        '200,216,80', '216,224,96', '232,232,112', '208,216,88', '184,192,80', '168,176,40', '216,224,80', '208,248,144',
        '248,216,152', '248,200,128', '248,208,144', '240,184,112', '240,208,128', '248,208,128', '232,192,120', '224,192,104', '232,176,104', '224,176,96',
      ],
      thr: 0.5,
      fill: 4,
    },
    walk: [{ r: [0, 0, 432, 456] }],
    block: [{ r: [0, 424, 432, 32] }],
    force: [{ r: [192, 0, 52, 92] }, { r: [192, 284, 52, 140] }], // escaleras norte y sur (la sur, hasta la mitad: más abajo se verían las esquinas sin mapa)
  },
  beach: {
    auto: {
      colors: ['240,232,144', '248,240,160', '248,240,144', '232,224,120', '216,200,104', '240,192,120', '248,200,128', '248,216,152', '248,208,144', '232,200,136'],
      thr: 0.6,
      fill: 4,
    },
    walk: [{ r: [0, 100, 792, 150] }],
    block: [],
    force: [{ r: [720, 130, 72, 64] }, { p: [70, 128, 130, 128, 140, 160, 96, 168, 70, 150] }], // camino del este, entrada de la cueva
  },
  guild: {
    auto: {
      colors: [
        '240,208,120', '240,192,120', '248,216,152', '240,184,104', '224,192,104', '248,200,120', '240,208,136', '240,184,112', '248,208,144',
        '216,240,104', '184,224,88', '152,208,72', '104,168,56', '96,136,56', '128,192,64',
        // tierra moteada de la explanada
        '192,152,104', '168,104,96', '240,176,112', '232,152,104', '224,152,96', '240,200,120', '168,104,88', '184,128,96', '240,168,104', '232,168,104', '224,168,104',
      ],
      thr: 0.6,
      fill: 4,
    },
    walk: [{ p: [60, 120, 120, 100, 165, 95, 250, 95, 300, 100, 360, 120, 378, 160, 370, 215, 330, 250, 245, 255, 245, 354, 178, 354, 178, 255, 95, 250, 60, 215, 50, 160] }],
    block: [],
    force: [{ r: [180, 250, 62, 60] }, { r: [190, 96, 42, 84] }, { r: [196, 84, 30, 22] }], // escalera, camino central hasta la rejilla del vigía, puerta
  },
};

const sheets = new Map();
const sheet = (f) => sheets.get(f) ?? (sheets.set(f, PNG.sync.read(fs.readFileSync(f))), sheets.get(f));
const isWhite = (p, x, y) => {
  const j = (y * p.width + x) * 4;
  return p.data[j + 3] === 0 || (p.data[j] >= 250 && p.data[j + 1] >= 250 && p.data[j + 2] >= 250);
};

function inShape(s, x, y) {
  if (s.r) return x >= s.r[0] && y >= s.r[1] && x < s.r[0] + s.r[2] && y < s.r[1] + s.r[3];
  if (s.e) return ((x - s.e[0]) / s.e[2]) ** 2 + ((y - s.e[1]) / s.e[3]) ** 2 <= 1;
  const p = s.p;
  let inside = false;
  for (let i = 0, j = p.length - 2; i < p.length; j = i, i += 2) {
    const [xi, yi, xj, yj] = [p[i], p[i + 1], p[j], p[j + 1]];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/**
 * Celdas de suelo según la paleta de las muestras. Después se cierran los
 * bloqueos diminutos rodeados de suelo (matas de hierba, piedrecitas) y se
 * descartan las islas transitables sueltas (huecos entre objetos).
 */
function autoGround(map, W, H, GW, GH, auto) {
  if (!auto) return null;
  const key = (i) => (map.data[i] << 16) | (map.data[i + 1] << 8) | map.data[i + 2];
  const pal = new Set();
  for (const c of auto.colors ?? []) pal.add(c.split(',').reduce((a, v) => (a << 8) | +v, 0));
  for (const [x0, y0, w, h] of auto.samples ?? [])
    for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) if (map.data[(y * W + x) * 4 + 3]) pal.add(key((y * W + x) * 4));
  const g = Array.from({ length: GH }, (_, gy) =>
    Array.from({ length: GW }, (_, gx) => {
      let n = 0, t = 0;
      for (let y = gy * CELL; y < Math.min(H, gy * CELL + CELL); y++)
        for (let x = gx * CELL; x < Math.min(W, gx * CELL + CELL); x++) {
          t++;
          const i = (y * W + x) * 4;
          if (map.data[i + 3] && pal.has(key(i))) n++;
        }
      return n / t >= (auto.thr ?? 0.75);
    }),
  );
  const comps = (want) => {
    const seen = g.map((r) => r.map(() => false)), out = [];
    for (let y = 0; y < GH; y++)
      for (let x = 0; x < GW; x++) {
        if (seen[y][x] || g[y][x] !== want) continue;
        const cells = [], st = [[x, y]];
        seen[y][x] = true;
        while (st.length) {
          const [cx, cy] = st.pop();
          cells.push([cx, cy]);
          for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const nx = cx + dx, ny = cy + dy;
            if (nx >= 0 && ny >= 0 && nx < GW && ny < GH && !seen[ny][nx] && g[ny][nx] === want) (seen[ny][nx] = true), st.push([nx, ny]);
          }
        }
        out.push(cells);
      }
    return out;
  };
  for (const cells of comps(false))
    if (cells.length <= (auto.fill ?? 2) && !cells.some(([x, y]) => !x || !y || x === GW - 1 || y === GH - 1)) for (const [x, y] of cells) g[y][x] = true;
  for (const cells of comps(true)) if (cells.length < (auto.island ?? 12)) for (const [x, y] of cells) g[y][x] = false;
  return g;
}

const OUT = 'public/assets/town';
fs.mkdirSync(OUT, { recursive: true });
fs.mkdirSync('src/shared/town/zones', { recursive: true });
const pi = process.argv.indexOf('--preview');
const previewDir = pi > 0 ? process.argv[pi + 1] : null;
if (previewDir) fs.mkdirSync(previewDir, { recursive: true });

for (const [id, z] of Object.entries(ZONES)) {
  const { w: W, h: H } = z;
  // Mapa: copia de la hoja; blanco = hueco si toca el borde o lo tapa una animación de debajo.
  const b = z.base, src = sheet(b.src);
  const covered = new Uint8Array(W * H);
  for (const a of z.anims.filter((a) => a.under)) {
    const s = sheet(a.src), [fx, fy] = a.frames[0];
    for (let y = 0; y < a.h; y++)
      for (let x = 0; x < a.w; x++) {
        const X = a.dx + x, Y = a.dy + y;
        if (X >= 0 && Y >= 0 && X < W && Y < H && !isWhite(s, fx + x, fy + y)) covered[Y * W + X] = 1;
      }
  }
  const white = new Uint8Array(W * H); // 1 = blanco de la hoja, 2 = hueco (transparente)
  const outside = (X, Y) => X < b.dx || Y < b.dy || X >= b.dx + b.w || Y >= b.dy + b.h;
  for (let Y = 0; Y < H; Y++)
    for (let X = 0; X < W; X++) if (outside(X, Y) || isWhite(src, b.x + X - b.dx, b.y + Y - b.dy)) white[Y * W + X] = 1;
  const stack = [];
  for (let Y = 0; Y < H; Y++)
    for (let X = 0; X < W; X++)
      if (white[Y * W + X] === 1 && (X === 0 || Y === 0 || X === W - 1 || Y === H - 1 || covered[Y * W + X])) (white[Y * W + X] = 2), stack.push(Y * W + X);
  while (stack.length) {
    const i = stack.pop(), X = i % W, Y = (i / W) | 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = X + dx, ny = Y + dy, k = ny * W + nx;
      if (nx >= 0 && ny >= 0 && nx < W && ny < H && white[k] === 1) (white[k] = 2), stack.push(k);
    }
  }
  const map = new PNG({ width: W, height: H });
  for (let Y = 0; Y < H; Y++)
    for (let X = 0; X < W; X++) {
      if (white[Y * W + X] === 2) continue;
      const s = ((b.y + Y - b.dy) * src.width + b.x + X - b.dx) * 4;
      src.data.copy(map.data, (Y * W + X) * 4, s, s + 4);
      map.data[(Y * W + X) * 4 + 3] = 255;
    }
  // Restos de la hoja que no son del mapa (sprites sueltos fuera del borde).
  for (const [ex, ey, ew, eh] of z.erase ?? [])
    for (let Y = ey; Y < ey + eh; Y++) for (let X = ex; X < ex + ew; X++) map.data[(Y * W + X) * 4 + 3] = 0;
  // Huecos rellenados en espejo con los píxeles del lado indicado (solo los transparentes).
  for (const [mx, my, mw, mh, side] of z.mirror ?? [])
    for (let Y = my; Y < my + mh; Y++)
      for (let X = mx; X < mx + mw; X++) {
        const d = (Y * W + X) * 4;
        if (map.data[d + 3]) continue;
        const sx = side === 'right' ? 2 * (mx + mw) - 1 - X : 2 * mx - 1 - X;
        map.data.copy(map.data, d, (Y * W + sx) * 4, (Y * W + sx) * 4 + 4);
      }
  fs.writeFileSync(`${OUT}/${id}.png`, PNG.sync.write(map));

  // Animaciones: tira horizontal de fotogramas (blanco = transparente).
  const strips = {};
  for (const a of z.anims) {
    const s = sheet(a.src), strip = new PNG({ width: a.w * a.frames.length, height: a.h });
    a.frames.forEach(([fx, fy], f) => {
      for (let y = 0; y < a.h; y++)
        for (let x = 0; x < a.w; x++) {
          if (isWhite(s, fx + x, fy + y)) continue;
          const si = ((fy + y) * s.width + fx + x) * 4, d = (y * strip.width + f * a.w + x) * 4;
          s.data.copy(strip.data, d, si, si + 4);
          strip.data[d + 3] = 255;
        }
    });
    fs.writeFileSync(`${OUT}/${id}-${a.key}.png`, PNG.sync.write(strip));
    strips[a.key] = strip;
  }

  // Colisión.
  const col = COLLISION[id], GW = Math.ceil(W / CELL), GH = Math.ceil(H / CELL);
  const ground = autoGround(map, W, H, GW, GH, col.auto);
  const rows = [];
  for (let gy = 0; gy < GH; gy++) {
    let row = '';
    for (let gx = 0; gx < GW; gx++) {
      const cx = gx * CELL + CELL / 2, cy = gy * CELL + CELL / 2;
      const ok =
        (col.force ?? []).some((s) => inShape(s, cx, cy)) ||
        ((!ground || ground[gy][gx]) && col.walk.some((s) => inShape(s, cx, cy)) && !col.block.some((s) => inShape(s, cx, cy)));
      row += ok ? '.' : '#';
    }
    rows.push(row);
  }
  const info = {
    image: `assets/town/${id}.png`,
    width: W,
    height: H,
    fill: z.fill ? '#' + z.fill.map((v) => v.toString(16).padStart(2, '0')).join('') : null,
    anims: z.anims.map((a) => ({ key: a.key, image: `assets/town/${id}-${a.key}.png`, frames: a.frames.length, w: a.w, h: a.h, x: a.dx, y: a.dy, under: a.under, ms: a.ms })),
    cellSize: CELL,
  };
  fs.writeFileSync(
    `src/shared/town/zones/${id}.generated.ts`,
    `// ARCHIVO GENERADO por tools/build-town.mjs — no editar a mano.\n` +
      `// Colisión: rejilla de ${GW}×${GH} celdas de ${CELL} px, '.' transitable y '#' bloqueado.\n` +
      `import type { ZoneMap } from '../zone';\n\n` +
      `export const ${id.toUpperCase()}_MAP: ZoneMap = ${JSON.stringify({ ...info, collision: rows }, null, 1)};\n`,
  );

  if (previewDir) {
    // Composición completa (fondo, animaciones al primer fotograma, mapa), colisión y cuadrícula.
    const pv = new PNG({ width: W, height: H });
    const put = (X, Y, r, g, bl) => { const i = (Y * W + X) * 4; pv.data[i] = r; pv.data[i + 1] = g; pv.data[i + 2] = bl; pv.data[i + 3] = 255; };
    const fill = z.fill ?? [0, 0, 0];
    for (let Y = 0; Y < H; Y++) for (let X = 0; X < W; X++) put(X, Y, ...fill);
    const blit = (img, sx, sw, dx, dy, h) => {
      for (let y = 0; y < h; y++)
        for (let x = 0; x < sw; x++) {
          const s = (y * img.width + sx + x) * 4, X = dx + x, Y = dy + y;
          if (img.data[s + 3] && X >= 0 && Y >= 0 && X < W && Y < H) put(X, Y, img.data[s], img.data[s + 1], img.data[s + 2]);
        }
    };
    for (const a of z.anims.filter((a) => a.under)) blit(strips[a.key], 0, a.w, a.dx, a.dy, a.h);
    blit(map, 0, W, 0, 0, H);
    for (const a of z.anims.filter((a) => !a.under)) blit(strips[a.key], 0, a.w, a.dx, a.dy, a.h);
    for (let Y = 0; Y < H; Y++)
      for (let X = 0; X < W; X++) {
        const i = (Y * W + X) * 4;
        if (col.walk.length && rows[(Y / CELL) | 0][(X / CELL) | 0] === '#') { pv.data[i] = pv.data[i] * 0.55 + 110; pv.data[i + 1] *= 0.55; pv.data[i + 2] *= 0.55; }
        if (X % 64 === 0 || Y % 64 === 0) { pv.data[i] = 255; pv.data[i + 1] = 255; pv.data[i + 2] = 0; }
        else if (X % 16 === 0 || Y % 16 === 0) { pv.data[i] = (pv.data[i] + 255) / 2; pv.data[i + 1] = (pv.data[i + 1] + 255) / 2; pv.data[i + 2] = (pv.data[i + 2] + 255) / 2; }
      }
    fs.writeFileSync(`${previewDir}/${id}.png`, PNG.sync.write(pv));
  }
  const free = rows.join('').split('.').length - 1;
  console.log(`✔ ${id}: ${W}×${H} px, ${z.anims.length} animación(es), colisión ${GW}×${GH} (${free} celdas transitables)`);
}
