/**
 * Genera los recursos de interfaz al estilo de los juegos originales:
 *
 *   public/assets/fonts/pmd-message.otf     fuente de diálogo (Equipo de Rescate) como
 *                                            fuente web de píxeles cuadrados (DOM/CSS)
 *   public/assets/fonts/pmd-message.png/.xml la misma como fuente bitmap (Phaser), con
 *                                            su contorno negro original
 *   public/assets/fonts/pmd-title.otf       fuente de títulos (Exploradores del Cielo)
 *   public/assets/ui/frame-<color>.png      caja de ventana original (nine-slice, Assets/HUD/Text box.png)
 *   public/assets/ui/portrait-<color>.png   marco de retrato original (nine-slice, misma hoja)
 *   public/assets/ui/cursor.png             cursor de menú
 *
 * Las fuentes vienen de Assets/Font. Los signos que no existen en la fuente
 * de diálogo original (/ ( ) % · = < > × →) se dibujan aquí en el mismo estilo.
 *
 * Uso: node tools/build-ui.mjs
 */
import { PNG } from 'pngjs';
import fs from 'node:fs';
import opentype from 'opentype.js';

const FONTS = 'public/assets/fonts';
const UI = 'public/assets/ui';
fs.mkdirSync(FONTS, { recursive: true });
fs.mkdirSync(UI, { recursive: true });
const U = 100; // unidades de fuente por píxel

/* ───────────────────────── Fuente de diálogo ───────────────────────── */

const msg = PNG.sync.read(fs.readFileSync('Assets/Font/message font.png'));
const CELL_W = 15, CELL_H = 13, BASE = 9; // la línea base está 9 px bajo el borde superior de la celda
const latin = (s) => [...s];
// Celdas: [fila superior de la celda, caracteres de izquierda a derecha]
const MSG_ROWS = [
  [2, latin('abcdefghijklm')],
  [15, latin('nopqrstuvwxyz')],
  [28, latin('ABCDEFGHIJKLM')],
  [41, latin('NOPQRSTUVWXYZ')],
  [54, latin('1234567890:+-')],
  [67, [',', '.', '¡', '!', '¿', '?', '‘', '’', '“', '”', '♂', '♀', null]],
  // El bloque de acentos de la hoja original está 1 px más abajo que el resto:
  // estas filas empiezan 1 px después para que todas compartan la línea base.
  [86, latin('àáâãäåæçèéêëì')],
  [99, latin('íîïðñòóôõöøœš')],
  [112, [...latin('þùúûüýÿž'), null, null, null, null, null]],
  [125, latin('ÀÁÂÃÄÅÆÇÈÉÊËÌ')],
  [138, latin('ÍÎÏÐÑÒÓÔÕÖØŒŠ')],
  [151, [...latin('ÞÙÚÛÜÝŸŽß'), '…']],
];

/** Signos que faltan en la fuente original, dibujados en su estilo (8 filas sobre la base). */
const EXTRA = {
  '/': ['....#', '....#', '...#.', '..#..', '..#..', '.#...', '#....', '#....'],
  '(': ['.#', '#.', '#.', '#.', '#.', '#.', '#.', '.#'],
  ')': ['#.', '.#', '.#', '.#', '.#', '.#', '.#', '#.'],
  '%': ['##..#', '##..#', '...#.', '..#..', '..#..', '.#...', '#..##', '#..##'],
  '·': ['.', '.', '.', '.', '#', '.', '.', '.'],
  '=': ['....', '....', '....', '####', '....', '####', '....', '....'],
  '<': ['...#', '..#.', '.#..', '#...', '.#..', '..#.', '...#', '....'],
  '>': ['#...', '.#..', '..#.', '...#', '..#.', '.#..', '#...', '....'],
  '×': ['.....', '.....', '#...#', '.#.#.', '..#..', '.#.#.', '#...#', '.....'],
  '→': ['......', '...#..', '....#.', '######', '....#.', '...#..', '......', '......'],
  '★': ['..#..', '..#..', '#####', '.###.', '.###.', '.#.#.', '#...#', '.....'],
};
/** Equivalencias para caracteres ASCII que el original representa con otro glifo. */
const ALIAS = { '"': '“', "'": '’', '—': '-', '–': '-', ';': ',' };

const px = (x, y) => {
  const i = (y * msg.width + x) * 4;
  return [msg.data[i], msg.data[i + 1], msg.data[i + 2], msg.data[i + 3]];
};
const isWhite = ([r, g, b, a]) => a > 0 && r > 200 && g > 200 && b > 200;
const isBlack = ([r, g, b, a]) => a > 0 && r < 60 && g < 60 && b < 60;

/** Extrae los píxeles blancos (relleno) y negros (contorno) de una celda, relativos a su esquina. */
function readCell(top, col) {
  const x0 = 2 + col * CELL_W;
  const white = [], black = [];
  for (let y = 0; y < CELL_H; y++)
    for (let x = 0; x < CELL_W; x++) {
      const c = px(x0 + x, top + y);
      if (isWhite(c)) white.push([x, y]);
      else if (isBlack(c)) black.push([x, y]);
    }
  return { white, black };
}

const glyphs = new Map(); // char → { white: [[x,y]], black: [[x,y]] } con x desde 0 y y relativa a la celda
for (const [top, chars] of MSG_ROWS) {
  chars.forEach((ch, col) => {
    if (!ch) return;
    const { white, black } = readCell(top, col);
    if (!white.length) return;
    const minX = Math.min(...white.map((p) => p[0]), ...black.map((p) => p[0]));
    glyphs.set(ch, {
      white: white.map(([x, y]) => [x - minX, y]),
      black: black.map(([x, y]) => [x - minX, y]),
    });
  });
}
for (const [ch, rows] of Object.entries(EXTRA)) {
  const white = [], black = [];
  rows.forEach((row, r) => [...row].forEach((c, x) => c === '#' && white.push([x, BASE - 8 + r])));
  // Contorno al estilo original: sombra a la derecha y abajo.
  const set = new Set(white.map((p) => p.join(',')));
  for (const [x, y] of white) for (const [dx, dy] of [[1, 0], [0, 1], [1, 1]]) if (!set.has(`${x + dx},${y + dy}`)) black.push([x + dx, y + dy]);
  glyphs.set(ch, { white, black: [...new Map(black.map((p) => [p.join(','), p])).values()] });
}

/** Contornos de una lista de píxeles (rectángulos por tramos horizontales). */
function pixelPath(pixels, baseline) {
  const path = new opentype.Path();
  const rows = new Map();
  for (const [x, y] of pixels) (rows.get(y) ?? rows.set(y, []).get(y)).push(x);
  for (const [y, xs] of rows) {
    xs.sort((a, b) => a - b);
    let start = xs[0], prev = xs[0];
    const flush = (a, b) => {
      const top = (baseline - y) * U, bottom = (baseline - y - 1) * U;
      path.moveTo(a * U, bottom);
      path.lineTo((b + 1) * U, bottom);
      path.lineTo((b + 1) * U, top);
      path.lineTo(a * U, top);
      path.close();
    };
    for (let i = 1; i <= xs.length; i++) {
      if (i < xs.length && xs[i] === prev + 1) prev = xs[i];
      else {
        flush(start, prev);
        start = xs[i];
        prev = xs[i];
      }
    }
  }
  return path;
}

function buildFont(family, map, { baseline, cellH, space, fill }) {
  const list = [new opentype.Glyph({ name: '.notdef', unicode: 0, advanceWidth: space * U, path: new opentype.Path() })];
  list.push(new opentype.Glyph({ name: 'space', unicode: 32, advanceWidth: space * U, path: new opentype.Path() }));
  list.push(new opentype.Glyph({ name: 'nbsp', unicode: 160, advanceWidth: space * U, path: new opentype.Path() }));
  for (const [ch, g] of map) {
    const pts = fill(g);
    const w = Math.max(...pts.map((p) => p[0])) + 1;
    list.push(new opentype.Glyph({ name: `u${ch.codePointAt(0).toString(16)}`, unicode: ch.codePointAt(0), advanceWidth: (w + 1) * U, path: pixelPath(pts, baseline) }));
  }
  return new opentype.Font({ familyName: family, styleName: 'Regular', unitsPerEm: cellH * U, ascender: baseline * U, descender: -(cellH - baseline) * U, glyphs: list });
}

// Fuente web de diálogo: solo el relleno blanco; el contorno se pone con text-shadow en CSS.
const msgGlyphs = new Map(glyphs);
for (const [a, b] of Object.entries(ALIAS)) if (glyphs.has(b)) msgGlyphs.set(a, glyphs.get(b));
const msgFont = buildFont('PMD Message', msgGlyphs, { baseline: BASE, cellH: CELL_H, space: 4, fill: (g) => g.white });
fs.writeFileSync(`${FONTS}/pmd-message.otf`, Buffer.from(msgFont.toArrayBuffer()));

// Fuente bitmap para Phaser: blanco + contorno negro original, en una hoja nueva.
{
  const list = [...msgGlyphs.entries()];
  const perRow = 16, cw = 16, ch = CELL_H + 1;
  const out = new PNG({ width: perRow * cw, height: Math.ceil(list.length / perRow) * ch });
  const chars = [];
  list.forEach(([c, g], i) => {
    const ox = (i % perRow) * cw, oy = Math.floor(i / perRow) * ch;
    const put = ([x, y], v) => {
      if (x >= cw || y >= ch) return;
      const j = ((oy + y) * out.width + ox + x) * 4;
      out.data[j] = out.data[j + 1] = out.data[j + 2] = v;
      out.data[j + 3] = 255;
    };
    g.black.forEach((p) => put(p, 0));
    g.white.forEach((p) => put(p, 255));
    const w = Math.max(...g.white.map((p) => p[0]), ...g.black.map((p) => p[0])) + 1;
    chars.push({ id: c.codePointAt(0), x: ox, y: oy, width: w, height: ch, xadvance: w });
  });
  chars.push({ id: 32, x: 0, y: 0, width: 0, height: ch, xadvance: 4 });
  fs.writeFileSync(`${FONTS}/pmd-message.png`, PNG.sync.write(out));
  fs.writeFileSync(
    `${FONTS}/pmd-message.xml`,
    `<?xml version="1.0"?>\n<font>\n  <info face="pmd-message" size="${CELL_H}" />\n  <common lineHeight="${CELL_H + 2}" base="${BASE}" scaleW="${out.width}" scaleH="${out.height}" pages="1" />\n  <pages><page id="0" file="pmd-message.png" /></pages>\n  <chars count="${chars.length}">\n${chars.map((c) => `    <char id="${c.id}" x="${c.x}" y="${c.y}" width="${c.width}" height="${c.height}" xoffset="0" yoffset="0" xadvance="${c.xadvance}" page="0" />`).join('\n')}\n  </chars>\n</font>\n`,
  );
}

/* ───────────────────────── Fuente de títulos ───────────────────────── */
// Reutiliza la hoja ya procesada por tools/build-font.mjs (glifos blancos con alfa).
{
  const t = PNG.sync.read(fs.readFileSync(`${FONTS}/pmd-title.png`));
  const xml = fs.readFileSync(`${FONTS}/pmd-title.xml`, 'utf8');
  const map = new Map();
  for (const m of xml.matchAll(/<char id="(\d+)" x="(\d+)" y="(\d+)" width="(\d+)" height="(\d+)"/g)) {
    const [id, x, y, w, h] = m.slice(1).map(Number);
    if (id === 32 || !w) continue;
    const white = [];
    for (let yy = 0; yy < h; yy++)
      for (let xx = 0; xx < w; xx++) if (t.data[((y + yy) * t.width + x + xx) * 4 + 3] > 110) white.push([xx, yy]);
    if (white.length) map.set(String.fromCharCode(id), { white });
  }
  const titleFont = buildFont('PMD Title', map, { baseline: 21, cellH: 25, space: 7, fill: (g) => g.white });
  fs.writeFileSync(`${FONTS}/pmd-title.otf`, Buffer.from(titleFont.toArrayBuffer()));
}

/* ───────────────────── Cajas y marcos (Assets/HUD/Text box.png) ───────────────────── */
// Hoja del test de personalidad de Exploradores del Cielo (ripeada por
// redblueyellow). Todas las cajas comparten el mismo estilo: relleno #202020,
// borde de 7 px a los lados y 4 px arriba/abajo con una trama de 4 px de periodo,
// y esquinas redondeadas. Se extraen como fuentes nine-slice con los píxeles
// originales: esquinas intactas y tramos de borde de 8 px (dos periodos) que se
// REPITEN, nunca se estiran.
//
//   ui/frame-<color>.png      caja de ventana, 24×24, cortes de 8 px (centro = relleno)
//   ui/plain-<color>.png      la misma en su variante lisa (sin trama)
//   ui/portrait-<color>.png   marco de retrato, 16×17, cortes 4/4/5/4 (centro hueco)
//
// Colores: blue (original de la hoja), green (sacado de las cajas verdes reales de
// la hoja) y pink (derivado con la muestra "Border palette" de la propia hoja).
{
  const sheet = PNG.sync.read(fs.readFileSync('Assets/HUD/Text box.png'));
  const at = (x, y) => {
    const i = (y * sheet.width + x) * 4;
    return [sheet.data[i], sheet.data[i + 1], sheet.data[i + 2]];
  };
  const key = (c) => c.join(',');
  // Rectángulos de la hoja (comprobados con un detector de cajas).
  // Dos estilos en la hoja: la caja de diálogo, con trama de 4 px en el borde (sus
  // esquinas las comparten 128 cajas: diálogo, preguntas, Sí/No), y una variante
  // lisa sin trama (panel "Controls" y las cajas de y≈1868).
  const BLUE_DIALOG = { x: 1, y: 2281, w: 240, h: 52 }; // caja de diálogo azul
  const PANEL = { x: 674, y: 2148, w: 240, h: 172 }; // panel azul liso "Controls"
  const CHOICE = { x: 549, y: 2233, w: 48, h: 44 }; // caja azul Sí/No
  const GREEN_DIALOG = { x: 16, y: 672, w: 240, h: 52 }; // caja de diálogo verde (pregunta)
  const PORTRAIT = { x: 117, y: 2186, w: 48, h: 49 }; // marco de retrato vacío (hueco de 40×40)
  const SWATCH = { x: 998, y: 2417, cell: 5 }; // "Border palette": 3 bloques de 4×3 colores (verde, rosa, azul)
  const FILL = '32,32,32';

  // Comprobaciones: si cambia la hoja, mejor fallar que extraer basura.
  const assert = (cond, msg) => { if (!cond) throw new Error(`Text box.png: ${msg}`); };
  for (const r of [BLUE_DIALOG, PANEL, CHOICE, GREEN_DIALOG]) assert(key(at(r.x + r.w - 12, r.y + r.h - 8)) === FILL, `sin relleno en ${JSON.stringify(r)}`);
  // Las esquinas de cajas de distinto tamaño son idénticas.
  for (let y = 0; y < 8; y++)
    for (let x = 0; x < 8; x++)
      for (const [cx, cy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) {
        const p = (r) => key(at(cx ? r.x + r.w - 1 - x : r.x + x, cy ? r.y + r.h - 1 - y : r.y + y));
        assert(p(CHOICE) === p(BLUE_DIALOG), 'las esquinas de las cajas no coinciden');
      }

  // Paleta de borde: azul → verde por correspondencia de píxeles (esquinas y bordes
  // de una caja azul y otra verde); en caso de duda gana el color más frecuente.
  const votes = new Map();
  for (let y = 0; y < 12; y++)
    for (let x = 0; x < 12; x++)
      for (const [cx, cy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) {
        const b = key(at(cx ? BLUE_DIALOG.x + BLUE_DIALOG.w - 1 - x : BLUE_DIALOG.x + x, cy ? BLUE_DIALOG.y + BLUE_DIALOG.h - 1 - y : BLUE_DIALOG.y + y));
        const g = key(at(cx ? GREEN_DIALOG.x + GREEN_DIALOG.w - 1 - x : GREEN_DIALOG.x + x, cy ? GREEN_DIALOG.y + GREEN_DIALOG.h - 1 - y : GREEN_DIALOG.y + y));
        if (b === '255,255,255' || b === FILL) continue;
        const v = votes.get(b) ?? new Map();
        v.set(g, (v.get(g) ?? 0) + 1);
        votes.set(b, v);
      }
  const toGreen = new Map([...votes].map(([b, v]) => [b, [...v].sort((p, q) => q[1] - p[1])[0][0]]));
  // Muestra de la hoja: índice i del bloque verde/rosa/azul = mismo papel en el borde.
  const swatch = (block) => Array.from({ length: 12 }, (_, i) => at(SWATCH.x + (i % 4) * SWATCH.cell, SWATCH.y + block * 4 * SWATCH.cell + Math.floor(i / 4) * SWATCH.cell));
  const [swGreen, swPink, swBlue] = [swatch(0), swatch(1), swatch(2)];
  assert(key(swBlue[1]) === '40,40,192' && key(swGreen[1]) === '24,120,24', 'la muestra de paletas no está donde se esperaba');
  const nearest = (c, list) => list.reduce((best, d, i) => {
    const e = (d[0] - c[0]) ** 2 + (d[1] - c[1]) ** 2 + (d[2] - c[2]) ** 2;
    return e < best.e ? { i, e } : best;
  }, { i: 0, e: Infinity }).i;
  // Rosa: el color verde equivalente → su índice en la muestra verde → el rosa de ese índice.
  const toPink = (b) => {
    const g = toGreen.get(b);
    return g ? swPink[nearest(g.split(',').map(Number), swGreen)] : swPink[nearest(b.split(',').map(Number), swBlue)];
  };
  const recolor = {
    blue: (c) => c,
    green: (c) => (toGreen.has(key(c)) ? toGreen.get(key(c)).split(',').map(Number) : swGreen[nearest(c, swBlue)]),
    pink: (c) => toPink(key(c)),
  };

  /**
   * Fuente nine-slice compacta: esquinas de la caja original y, entre ellas, un
   * tramo de `tile` px tomado justo al lado de cada esquina (así la trama sigue
   * en fase). El blanco de la hoja (fondo/hueco) pasa a transparente.
   */
  const nineSource = (r, { l, t, rr, b, tile }, color, hollow) => {
    const W = l + tile + rr, H = t + tile + b;
    const out = new PNG({ width: W, height: H });
    const srcX = (x) => (x < l + tile ? r.x + x : r.x + r.w - (W - x));
    const srcY = (y) => (y < t + tile ? r.y + y : r.y + r.h - (H - y));
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        const c = at(srcX(x), srcY(y));
        const center = x >= l && x < l + tile && y >= t && y < t + tile;
        if (key(c) === '255,255,255' || (center && hollow)) continue;
        const k = key(c) === FILL || center ? [32, 32, 32] : recolor[color](c);
        out.data.set([...k, 255], (y * W + x) * 4);
      }
    return out;
  };
  // El tramo repetido debe ser periódico en la caja original (trama de 4 px).
  for (const B of [BLUE_DIALOG, PANEL]) {
    for (let x = 8; x < B.w - 12; x++) for (const y of [0, 1, 2, 3]) assert(key(at(B.x + x, B.y + y)) === key(at(B.x + x + 4, B.y + y)), 'el borde superior no es periódico');
    for (let y = 8; y < B.h - 12; y++) for (const x of [0, 1, 2, 3, 4, 5, 6]) assert(key(at(B.x + x, B.y + y)) === key(at(B.x + x, B.y + y + 4)), 'el borde izquierdo no es periódico');
  }

  for (const color of ['blue', 'green', 'pink']) {
    fs.writeFileSync(`${UI}/frame-${color}.png`, PNG.sync.write(nineSource(BLUE_DIALOG, { l: 8, t: 8, rr: 8, b: 8, tile: 8 }, color, false)));
    fs.writeFileSync(`${UI}/plain-${color}.png`, PNG.sync.write(nineSource(PANEL, { l: 8, t: 8, rr: 8, b: 8, tile: 8 }, color, false)));
    fs.writeFileSync(`${UI}/portrait-${color}.png`, PNG.sync.write(nineSource(PORTRAIT, { l: 4, t: 4, rr: 4, b: 5, tile: 8 }, color, true)));
  }
  console.log(`✔ cajas: ui/frame-{blue,green,pink}.png · ui/plain-*.png · ui/portrait-{blue,green,pink}.png (${toGreen.size} colores de borde)`);
}

/* ───────────────────────── Cursor ───────────────────────── */
{
  // Cursor de menú: triángulo blanco con contorno negro (8×9).
  const cur = new PNG({ width: 8, height: 9 });
  const rows = ['#.......', '##......', '#.#.....', '#..#....', '#...#...', '#..#....', '#.#.....', '##......', '#.......'];
  const fill = ['........', '........', '.#......', '.##.....', '.###....', '.##.....', '.#......', '........', '........'];
  rows.forEach((r, y) => [...r].forEach((c, x) => {
    const i = (y * 8 + x) * 4;
    if (c === '#') cur.data.set([16, 16, 32, 255], i);
    if (fill[y][x] === '#') cur.data.set([255, 240, 120, 255], i);
  }));
  fs.writeFileSync(`${UI}/cursor.png`, PNG.sync.write(cur));
}

console.log(`✔ pmd-message: ${msgGlyphs.size} glifos (otf + bitmap) · pmd-title.otf · ui/cursor.png`);

/* ───────────────────────── HUD superior (Assets/HUD/Hud.png) ───────────────────────── */
// Tipografía del HUD de mazmorra de DS: números blancos/verdes, etiquetas
// F · Lv · HP · / · B (naranja/amarillo), mayúsculas, signos y las barras de HP.
{
  const src = PNG.sync.read(fs.readFileSync('Assets/HUD/Hud.png'));
  const W = src.width, H = src.height;
  const isBg = (x, y) => {
    const i = (y * W + x) * 4;
    return src.data[i] === 48 && src.data[i + 1] === 136 && src.data[i + 2] === 0;
  };
  const isFill = (x, y) => {
    const i = (y * W + x) * 4;
    return !isBg(x, y) && src.data[i] + src.data[i + 1] + src.data[i + 2] > 330;
  };
  // Hoja con el fondo transparente (solo la zona de glifos, filas 0-44).
  const sheet = new PNG({ width: W, height: 46 });
  for (let y = 0; y < 46; y++)
    for (let x = 0; x < W; x++) {
      const si = (y * W + x) * 4, di = (y * W + x) * 4;
      if (isBg(x, y)) continue;
      sheet.data[di] = src.data[si]; sheet.data[di + 1] = src.data[si + 1]; sheet.data[di + 2] = src.data[si + 2]; sheet.data[di + 3] = 255;
    }
  fs.writeFileSync(`${UI}/hud-glyphs.png`, PNG.sync.write(sheet));

  /** Tramos horizontales de relleno (sin contorno) de una fila. */
  const spans = (y0, y1) => {
    const out = [];
    let s = -1;
    for (let x = 0; x <= W; x++) {
      let any = false;
      if (x < W) for (let y = y0; y <= y1; y++) if (isFill(x, y)) { any = true; break; }
      if (any && s < 0) s = x;
      if (!any && s >= 0) { out.push([s, x - 1]); s = -1; }
    }
    return out;
  };
  const glyphs = {};
  // Rectángulo del glifo: relleno + 1 px de contorno a cada lado.
  const put = (key, [a, b], y, h) => (glyphs[key] = { x: a - 1, y, w: b - a + 3, h });
  const join = (p, q) => [p[0], q[1]];

  const r0 = spans(0, 7), r1 = spans(9, 16);
  for (let d = 0; d < 10; d++) {
    put(`w${d}`, r0[d], 0, 8); //   números blancos
    put(`g${d}`, r1[d], 9, 8); //   números verdes
  }
  put('w100', join(r0[10], r0[11]), 0, 8);
  const labels = (row, off, y, prefix) => {
    put(`${prefix}F`, row[off], y, 8);
    put(`${prefix}Lv`, join(row[off + 1], row[off + 2]), y, 8);
    put(`${prefix}HP`, join(row[off + 3], row[off + 4]), y, 8);
    put(`${prefix}/`, row[off + 5], y, 8);
    put(`${prefix}B`, row[off + 6], y, 8);
  };
  labels(r0, 12, 0, 'o'); // etiquetas naranjas
  labels(r1, 10, 9, 'y'); // etiquetas amarillas
  [...'ABCDEFGHIJKLM'].forEach((c, i) => put(c, spans(18, 25)[i], 18, 8));
  [...'NOPQRSTUVWXYZ'].forEach((c, i) => put(c, spans(27, 34)[i], 27, 8));
  ['(', ')', '*', '+', ',', '-', '.', '/', '!', '≈', '~', '#', '$', '%', '&', "'", '@', '_'].forEach((c, i) => put(c, spans(36, 44)[i], 36, 9));

  // Barras de HP (verde = vida restante, naranja = vida perdida), 6 px de alto.
  const bar = (y, name) => {
    const [a, b] = r0[19];
    const out = new PNG({ width: b - a + 1, height: 6 });
    for (let yy = 0; yy < 6; yy++)
      for (let xx = 0; xx <= b - a; xx++) {
        const si = ((y + yy) * W + a + xx) * 4, di = (yy * (b - a + 1) + xx) * 4;
        out.data[di] = src.data[si]; out.data[di + 1] = src.data[si + 1]; out.data[di + 2] = src.data[si + 2]; out.data[di + 3] = 255;
      }
    fs.writeFileSync(`${UI}/${name}.png`, PNG.sync.write(out));
  };
  bar(1, 'hud-bar-green');
  bar(10, 'hud-bar-red');
  fs.writeFileSync('src/client/assets/hud-glyphs.generated.json', JSON.stringify({ sheet: { w: W, h: 46 }, glyphs }, null, 1));
  console.log(`✔ HUD: ${Object.keys(glyphs).length} glifos · ui/hud-glyphs.png · ui/hud-bar-green.png · ui/hud-bar-red.png`);
}
