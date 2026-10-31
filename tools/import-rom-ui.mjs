/**
 * Importa de una ROM LEGÍTIMA de Exploradores del Cielo las cajas de texto, el
 * marco de retrato y la fuente de diálogo originales. Solo lee la ROM;
 * Pokerift no la incluye ni la distribuye.
 *
 *   npm run import:ui -- <rom.nds>
 *
 * Qué se lee (comprobado en la ROM USA):
 *  - FONT/frame_b0.chr + .pal: marco de ventana del juego, 18 teselas de 8×8 a
 *    8 bpp. 0 vacía, 1 relleno, 2–9 caja gruesa (esquinas, bordes) y 10–17 un
 *    marco fino con la misma disposición (lo usamos para el retrato [INCIERTO]).
 *    La paleta (BGR555) trae 4 filas: 0 azul, 1 rosa, 2 verde, 3 amarillo.
 *    frame_b1–b4 son los otros estilos de marco del juego (no se usan aún).
 *  - BACK/s09p04a…s09p10a.bgp: las 7 ilustraciones del menú principal (Top Menu). La overlay 0
 *    (menú principal) nombra exactamente estos 7 archivos y el juego elige uno al azar cada vez
 *    (Mystery Dungeon Wiki, «Explorers of Sky:Top Menu»). BGP comprimido con AT4PX: cabecera de
 *    paleta (16×16 colores RGBX), teselas 4 bpp y mapa de 32×32 entradas (se usan 32×24 = 256×192).
 *  - DUNGEON/dungeon.bin 1035 («minimap.zmappat» en SkyTemple): iconos del minimapa. SIR0 con una tabla
 *    de 768 teselas (3 estilos × 256) de 0x80 bytes (16 grupos de 4 bytes de máscara + 4 de color,
 *    8 bpp, 8×8) y una paleta de 16 colores RGBX. Cada icono ocupa 4 teselas (una por posición de la
 *    casilla dentro del bloque de 2×2); se guarda la esquina superior izquierda (4×4) de la primera,
 *    como hace el editor de SkyTemple. Estilos: 0 semitransparente, 1 solo contorno, 2 opaco.
 *  - FONT/kanji.dat: fuente de diálogo (SIR0; glifos de 12×12 a 4 bpp con su
 *    ancho de avance; tabla 0 = Latin-1, con ñ, tildes, ¿ y ¡).
 *
 * Genera (sin tocar lo de tools/build-ui.mjs, que queda como alternativa sin ROM):
 *   public/assets/ui/rom/{frame,plain}-{blue,green,pink}.png   caja nine-slice 24×24 (cortes de 8)
 *   public/assets/ui/rom/portrait-{blue,green,pink}.png        marco fino 24×24 (cortes de 8, centro hueco)
 *   public/assets/fonts/rom/pmd-sky.otf                        fuente web de píxeles
 *   public/assets/fonts/rom/pmd-sky.png/.xml                   fuente bitmap (Phaser), con sombra negra
 *   public/assets/ui/rom/minimap.png                           iconos del minimapa (64 × 4 px por fila, una fila por estilo)
 *   public/assets/ui/rom/menu-bg-{0..6}.png                    fondos del menú principal (256×192)
 *   public/assets/ui/rom/hud-glyphs.png                        glifos del HUD (dígitos y P · Nv. · PS · / · -) de dungeon.bin 1020
 *   src/client/assets/ui-rom.generated.ts                      ROM_UI (rutas y métricas) o null
 * Opciones (pruebas): --out <carpeta public> --ts <archivo>.
 */
import { PNG } from 'pngjs';
import fs from 'node:fs';
import path from 'node:path';
import opentype from 'opentype.js';

const args = process.argv.slice(2);
const opt = (name, def) => {
  const i = args.indexOf(name);
  return i >= 0 ? args.splice(i, 2)[1] : def;
};
const PUBLIC = opt('--out', 'public');
const TS = opt('--ts', 'src/client/assets/ui-rom.generated.ts');
const input = args[0];
if (!input) {
  console.error('Uso: node tools/import-rom-ui.mjs <rom.nds>');
  process.exit(1);
}

/** Archivo de la ROM de DS por ruta (tablas FNT/FAT de la cabecera). */
function romFiles(rom) {
  const fnt = rom.readUInt32LE(0x40), fat = rom.readUInt32LE(0x48);
  const files = new Map();
  (function dir(id, prefix) {
    const e = fnt + (id & 0xfff) * 8;
    let p = fnt + rom.readUInt32LE(e), fileId = rom.readUInt16LE(e + 4);
    for (;;) {
      const len = rom[p++];
      if (!len) break;
      const n = len & 0x7f, name = rom.toString('latin1', p, p + n);
      p += n;
      if (len & 0x80) {
        const sub = rom.readUInt16LE(p);
        p += 2;
        dir(sub, `${prefix}${name}/`);
      } else files.set(prefix + name, fileId++);
    }
  })(0xf000, '');
  return (name) => {
    const id = files.get(name);
    if (id === undefined) throw new Error(`La ROM no tiene ${name}: ¿es Exploradores del Cielo?`);
    return rom.subarray(rom.readUInt32LE(fat + id * 8), rom.readUInt32LE(fat + id * 8 + 4));
  };
}

// Para pruebas: una carpeta con los archivos sueltos (FONT/…) en lugar de una ROM.
const file = fs.statSync(input).isDirectory() ? (name) => fs.readFileSync(path.join(input, name)) : romFiles(fs.readFileSync(input));

const UI = path.join(PUBLIC, 'assets/ui/rom');
const FONTS = path.join(PUBLIC, 'assets/fonts/rom');
fs.mkdirSync(UI, { recursive: true });
fs.mkdirSync(FONTS, { recursive: true });

/* ───────────────────────── Marcos ───────────────────────── */
const chr = file('FONT/frame_b0.chr'), palData = file('FONT/frame_b0.pal');
if (chr.length !== 18 * 64) throw new Error(`FONT/frame_b0.chr: se esperaban 18 teselas de 8 bpp (${chr.length} bytes)`);
const pal = (row) =>
  Array.from({ length: 16 }, (_, i) => {
    const v = palData.readUInt16LE((row * 16 + i) * 2);
    return [(v & 31) << 3, ((v >> 5) & 31) << 3, ((v >> 10) & 31) << 3];
  });
const ROWS = { blue: 0, pink: 1, green: 2 };
const THICK = [[2, 3, 4], [5, 1, 6], [7, 8, 9]];
const THIN = [[10, 11, 12], [13, 0, 14], [15, 16, 17]];
const frame = (layout, colors) => {
  const out = new PNG({ width: 24, height: 24 });
  layout.forEach((row, ty) =>
    row.forEach((t, tx) => {
      for (let i = 0; i < 64; i++) {
        const v = chr[t * 64 + i];
        if (v) out.data.set([...colors[v], 255], ((ty * 8 + (i >> 3)) * 24 + tx * 8 + (i & 7)) * 4);
      }
    }),
  );
  return PNG.sync.write(out);
};
for (const [color, row] of Object.entries(ROWS)) {
  const colors = pal(row);
  const box = frame(THICK, colors);
  fs.writeFileSync(path.join(UI, `frame-${color}.png`), box);
  fs.writeFileSync(path.join(UI, `plain-${color}.png`), box);
  fs.writeFileSync(path.join(UI, `portrait-${color}.png`), frame(THIN, colors));
}

/* ───────────────────────── Fuente ───────────────────────── */
const dat = file('FONT/kanji.dat');
if (dat.toString('latin1', 0, 4) !== 'SIR0') throw new Error('FONT/kanji.dat: no es SIR0');
const head = dat.readUInt32LE(4), count = dat.readUInt32LE(head), table = dat.readUInt32LE(head + 4);
const CELL = 12;
const glyphs = new Map(); // carácter → { px: [[x,y]], adv }
for (let i = 0; i < count; i++) {
  const o = table + i * 12;
  if (dat[o + 5] !== 0) continue; // tabla 0 = Latin-1
  const code = dat[o + 4], p = dat.readUInt32LE(o), adv = dat[o + 6];
  const px = [];
  for (let k = 0; k < CELL * CELL; k++) {
    const b = dat[p + (k >> 1)];
    if ((k & 1 ? b >> 4 : b & 15) !== 0) px.push([k % CELL, Math.floor(k / CELL)]);
  }
  glyphs.set(String.fromCharCode(code), { px, adv });
}
if (!glyphs.has('A') || !glyphs.has('ñ')) throw new Error('FONT/kanji.dat: faltan glifos latinos');
// Línea base: la fila de debajo de las mayúsculas.
const BASE = Math.max(...[...'ABCDEFHIKLMNTXZ'].flatMap((c) => glyphs.get(c).px.map((p) => p[1]))) + 1;
const SPACE = glyphs.get(' ')?.adv || 4;
const U = 100;

function pixelPath(pixels) {
  const p = new opentype.Path();
  for (const [x, y] of pixels) {
    const top = (BASE - y) * U, bottom = (BASE - y - 1) * U;
    p.moveTo(x * U, bottom);
    p.lineTo((x + 1) * U, bottom);
    p.lineTo((x + 1) * U, top);
    p.lineTo(x * U, top);
    p.close();
  }
  return p;
}
const list = [
  new opentype.Glyph({ name: '.notdef', unicode: 0, advanceWidth: SPACE * U, path: new opentype.Path() }),
  new opentype.Glyph({ name: 'nbsp', unicode: 160, advanceWidth: SPACE * U, path: new opentype.Path() }),
];
for (const [ch, g] of glyphs) {
  if (ch === ' ') continue;
  list.push(new opentype.Glyph({ name: `u${ch.charCodeAt(0).toString(16)}`, unicode: ch.charCodeAt(0), advanceWidth: g.adv * U, path: pixelPath(g.px) }));
}
// Comillas tipográficas del texto del juego → las rectas de la fuente.
for (const [alias, base] of [['“', '"'], ['”', '"'], ['‘', "'"], ['’', "'"], ['—', '-'], ['–', '-'], ['…', '\x85']]) {
  const g = glyphs.get(base);
  if (g) list.push(new opentype.Glyph({ name: `u${alias.charCodeAt(0).toString(16)}`, unicode: alias.charCodeAt(0), advanceWidth: g.adv * U, path: pixelPath(g.px) }));
}
const font = new opentype.Font({ familyName: 'PMD Sky', styleName: 'Regular', unitsPerEm: CELL * U, ascender: BASE * U, descender: -(CELL - BASE) * U, glyphs: list });
fs.writeFileSync(path.join(FONTS, 'pmd-sky.otf'), Buffer.from(font.toArrayBuffer()));

// Bitmap para Phaser: glifo blanco con sombra negra a la derecha y abajo (como el texto DOM).
{
  const entries = [...glyphs.entries()].filter(([, g]) => g.px.length);
  const per = 16, cw = CELL + 1, chH = CELL + 1;
  const out = new PNG({ width: per * cw, height: Math.ceil(entries.length / per) * chH });
  const chars = [];
  entries.forEach(([c, g], i) => {
    const ox = (i % per) * cw, oy = Math.floor(i / per) * chH;
    const put = (x, y, v) => {
      const j = ((oy + y) * out.width + ox + x) * 4;
      out.data[j] = out.data[j + 1] = out.data[j + 2] = v;
      out.data[j + 3] = 255;
    };
    const set = new Set(g.px.map((p) => p.join(',')));
    for (const [x, y] of g.px) if (!set.has(`${x + 1},${y + 1}`)) put(x + 1, y + 1, 0);
    for (const [x, y] of g.px) put(x, y, 255);
    chars.push({ id: c.charCodeAt(0), x: ox, y: oy, width: cw, height: chH, xadvance: g.adv });
  });
  fs.writeFileSync(path.join(FONTS, 'pmd-sky.png'), PNG.sync.write(out));
  fs.writeFileSync(
    path.join(FONTS, 'pmd-sky.xml'),
    `<?xml version="1.0"?>\n<font>\n  <info face="pmd-sky" size="${CELL}" />\n  <common lineHeight="${CELL + 2}" base="${BASE}" scaleW="${out.width}" scaleH="${out.height}" pages="1" />\n  <pages><page id="0" file="pmd-sky.png" /></pages>\n  <chars count="${chars.length + 1}">\n    <char id="32" x="0" y="0" width="0" height="${chH}" xoffset="0" yoffset="0" xadvance="${SPACE}" page="0" />\n${chars.map((c) => `    <char id="${c.id}" x="${c.x}" y="${c.y}" width="${c.width}" height="${c.height}" xoffset="0" yoffset="0" xadvance="${c.xadvance}" page="0" />`).join('\n')}\n  </chars>\n</font>\n`,
  );
}

/* ───────────────────────── HUD de la mazmorra ───────────────────────── */
// DUNGEON/dungeon.bin 1012–1021: texturas WTE de 128×16 (4 bpp, 16 filas de paleta) con su
// tabla de recortes WTU, una por idioma: 1012 inglés (F Lv. HP/B), 1014 francés, 1016 alemán,
// 1018 italiano y 1020 ESPAÑOL (P Nv. PS/-), la que usamos. Dígitos blancos (índice 7) y
// verdes (4) con contorno (8); las etiquetas usan el índice 12, cuyo color depende de la fila
// de paleta: 1 naranja, 3 amarillo. Se añaden en dos franjas debajo de la hoja del HUD ripeada
// (que conserva letras y signos que esta textura no trae), con las claves que usa ui/hud.ts.
let hud = null;
if (!fs.statSync(input).isDirectory()) {
  const pack = file('DUNGEON/dungeon.bin');
  const entry = (i) => {
    const o = pack.readUInt32LE(8 + i * 8);
    return pack.subarray(o, o + pack.readUInt32LE(12 + i * 8));
  };
  const tex = entry(1020), wtu = entry(1021);
  const h = tex.readUInt32LE(4);
  if (tex.toString('latin1', h, h + 4) !== 'WTE\0' || wtu.toString('latin1', 0, 3) !== 'WTU') throw new Error('dungeon.bin 1020/1021: no es la textura del HUD');
  const pimg = tex.readUInt32LE(h + 4), ppal = tex.readUInt32LE(h + 0x18);
  if (tex.readUInt32LE(h + 0x1c) < 64) throw new Error('dungeon.bin 1020: paleta demasiado corta');
  const pal = (row, i) => [0, 1, 2].map((c) => tex[ppal + (row * 16 + i) * 4 + c]);
  const px = (x, y) => {
    const l = y * 128 + x, b = tex[pimg + (l >> 1)];
    return l & 1 ? b >> 4 : b & 15;
  };
  // Recortes de la WTU (el 0 es la cabecera): 0–9 dígitos blancos, 10–19 verdes,
  // 20 P, 21 Nv., 22 PS, 23 /, 24 -, 25–27 piezas de la barra.
  const rects = [];
  for (let k = 1; k < wtu.readUInt32LE(4); k++) rects.push([0, 2, 4, 6].map((o) => wtu.readUInt16LE(8 + k * 8 + o)));
  if (rects.length < 25) throw new Error('dungeon.bin 1021: tabla de recortes incompleta');
  const oldPng = path.join(PUBLIC, 'assets/ui/hud-glyphs.png');
  const old = fs.existsSync(oldPng) ? PNG.sync.read(fs.readFileSync(oldPng)) : null;
  const oldJson = 'src/client/assets/hud-glyphs.generated.json';
  const glyphs = fs.existsSync(oldJson) ? { ...JSON.parse(fs.readFileSync(oldJson, 'utf8')).glyphs } : {};
  const W = Math.max(old?.width ?? 0, 192), top = old ? old.height + 1 : 0;
  const sheet = new PNG({ width: W, height: top + 17 });
  if (old) PNG.bitblt(old, sheet, 0, 0, old.width, old.height, 0, 0);
  /** Copia el dibujo del recorte (sin columnas vacías) en la franja y avanza el cursor. */
  const cursor = [0, 0];
  const put = ([x0, y0, w, hh], row, band, key) => {
    let a = w, b = -1;
    for (let x = 0; x < w; x++) for (let y = 0; y < hh; y++) if (px(x0 + x, y0 + y)) (a = Math.min(a, x)), (b = Math.max(b, x));
    if (b < 0) return;
    const dx = cursor[band], dy = top + band * 9;
    for (let y = 0; y < hh; y++)
      for (let x = a; x <= b; x++) {
        const v = px(x0 + x, y0 + y);
        if (v) sheet.data.set([...pal(row, v), 255], ((dy + y) * W + dx + x - a) * 4);
      }
    glyphs[key] = { x: dx, y: dy, w: b - a + 1, h: hh };
    cursor[band] += b - a + 2;
  };
  for (let d = 0; d < 10; d++) put(rects[d], 1, 0, `w${d}`);
  for (let d = 0; d < 10; d++) put(rects[10 + d], 1, 1, `g${d}`);
  ['F', 'Lv', 'HP', '/', 'B'].forEach((name, i) => {
    put(rects[20 + i], 1, 0, `o${name}`); // naranja
    put(rects[20 + i], 3, 1, `y${name}`); // amarillo
  });
  fs.writeFileSync(path.join(UI, 'hud-glyphs.png'), PNG.sync.write(sheet));
  hud = { url: 'assets/ui/rom/hud-glyphs.png', sheet: { w: W, h: top + 17 }, glyphs };
}

fs.mkdirSync(path.dirname(TS), { recursive: true });
// ── Iconos del minimapa (dungeon.bin 1035) ──
let minimap = null;
{
  const pack = file('DUNGEON/dungeon.bin');
  const o = pack.readUInt32LE(8 + 1035 * 8), l = pack.readUInt32LE(12 + 1035 * 8);
  const d = pack.subarray(o, o + l);
  if (d.toString('latin1', 0, 4) !== 'SIR0') throw new Error('dungeon.bin 1035: no es SIR0 (minimapa)');
  const head = d.readUInt32LE(4), pTiles = d.readUInt32LE(head), pPal = d.readUInt32LE(head + 4);
  if ((pPal - pTiles) / 4 !== 768) throw new Error('dungeon.bin 1035: se esperaban 768 teselas');
  const pal = Array.from({ length: 16 }, (_, i) => [d[pPal + i * 4], d[pPal + i * 4 + 1], d[pPal + i * 4 + 2]]);
  const out = new PNG({ width: 64 * 4, height: 3 * 4 });
  for (let v = 0; v < 3; v++)
    for (let icon = 0; icon < 64; icon++) {
      const t = d.readUInt32LE(pTiles + (v * 256 + icon * 4) * 4);
      for (let y = 0; y < 4; y++)
        for (let x = 0; x < 4; x++) {
          const p = y * 8 + x, g = p >> 2, k = p & 3;
          const mask = d[t + g * 8 + k], c = d[t + g * 8 + 4 + k];
          const q = ((v * 4 + y) * out.width + icon * 4 + x) * 4;
          // Color 0 (verde) y máscara 0xFF: transparente.
          if (mask === 0xff || c === 0) continue;
          out.data[q] = pal[c][0]; out.data[q + 1] = pal[c][1]; out.data[q + 2] = pal[c][2]; out.data[q + 3] = 255;
        }
    }
  fs.writeFileSync(path.join(UI, 'minimap.png'), PNG.sync.write(out));
  minimap = { url: 'assets/ui/rom/minimap.png', cell: 4 };
  console.log('Iconos del minimapa: 3 estilos × 64 (dungeon.bin 1035)');
}

// ── Fondos del menú principal (BACK/*.bgp, AT4PX) ──
/** Descompresión PX (AT4PX/PKDPX): bloques de 8 con bit de control, patrones de nibbles y copias hacia atrás. */
function unpx(d) {
  const magic = d.toString('latin1', 0, 5);
  const [start, size] = magic === 'AT4PX' ? [0x12, d.readUInt16LE(0x10)] : magic === 'PKDPX' ? [0x14, d.readUInt32LE(0x10)] : [0, 0];
  if (!start) return d;
  const flags = [...d.subarray(7, 16)], c = d.subarray(start, d.readUInt16LE(5)), o = [];
  let p = 0;
  while (p < c.length && o.length < size) {
    const ctrl = c[p++];
    for (let b = 0; b < 8 && p < c.length; b++) {
      if (ctrl & (0x80 >> b)) { o.push(c[p++]); continue; }
      const nb = c[p++], hi = nb >> 4, lo = nb & 15, fi = flags.indexOf(hi);
      if (fi >= 0) {
        if (fi === 0) { const v = (lo << 4) | lo; o.push(v, v); continue; }
        let base = lo;
        if (fi === 1) base = (base + 1) & 15;
        if (fi === 5) base = (base - 1) & 15;
        const n = [base, base, base, base];
        if (fi <= 4) n[fi - 1] = (n[fi - 1] - 1) & 15; else n[fi - 5] = (n[fi - 5] + 1) & 15;
        o.push((n[0] << 4) | n[1], (n[2] << 4) | n[3]);
      } else {
        const nx = c[p++], len = hi + 3, back = 4096 - (lo << 8) - nx, st = o.length - back;
        for (let i = 0; i < len; i++) o.push(o[st + (i % back)]);
      }
    }
  }
  if (o.length !== size) throw new Error(`PX: ${o.length} bytes en vez de ${size}`);
  return Buffer.from(o);
}
function bgp(name) {
  const d = unpx(file(name));
  const palB = d.readUInt32LE(0), palL = d.readUInt32LE(4), tB = d.readUInt32LE(8), mB = d.readUInt32LE(16);
  const out = new PNG({ width: 256, height: 192 });
  for (let ty = 0; ty < 24; ty++)
    for (let tx = 0; tx < 32; tx++) {
      const e = d.readUInt16LE(mB + (ty * 32 + tx) * 2);
      const idx = e & 0x3ff, hf = e & 0x400, vf = e & 0x800, row = e >> 12;
      for (let y = 0; y < 8; y++)
        for (let x = 0; x < 8; x++) {
          const sx = hf ? 7 - x : x, sy = vf ? 7 - y : y;
          const byte = d[tB + idx * 32 + sy * 4 + (sx >> 1)], v = sx & 1 ? byte >> 4 : byte & 15;
          const ci = row * 16 + v;
          if (ci * 4 >= palL) throw new Error(`${name}: color fuera de la paleta`);
          const k = ((ty * 8 + y) * 256 + tx * 8 + x) * 4;
          out.data[k] = d[palB + ci * 4]; out.data[k + 1] = d[palB + ci * 4 + 1]; out.data[k + 2] = d[palB + ci * 4 + 2]; out.data[k + 3] = 255;
        }
    }
  return PNG.sync.write(out);
}
const MENU_BACKGROUNDS = ['s09p04a', 's09p05a', 's09p06a', 's09p07a', 's09p08a', 's09p09a', 's09p10a'];
const menuBackgrounds = MENU_BACKGROUNDS.map((n, i) => {
  fs.writeFileSync(path.join(UI, `menu-bg-${i}.png`), bgp(`BACK/${n}.bgp`));
  return `assets/ui/rom/menu-bg-${i}.png`;
});
console.log(`Fondos del menú principal: ${menuBackgrounds.length} (BACK/s09p04a–s09p10a.bgp)`);

fs.writeFileSync(
  TS,
  `// ARCHIVO GENERADO por tools/import-rom-ui.mjs — no editar a mano.
// Fuente: FONT/frame_b0.chr/.pal (cajas) y FONT/kanji.dat (fuente) de una ROM propia.

export interface RomUi {
  /** Carpeta de las cajas y marcos (frame/plain/portrait-<color>.png, 24×24, cortes de 8). */
  ui: string;
  /** Fuente bitmap para Phaser. */
  bitmapFont: { png: string; xml: string };
  /** Alto de la celda de la fuente en píxeles del juego. */
  cell: number;
  /** Glifos del HUD de la mazmorra (dígitos y etiquetas en español de dungeon.bin 1020) sobre la hoja ripeada. */
  hud: { url: string; sheet: { w: number; h: number }; glyphs: Record<string, { x: number; y: number; w: number; h: number }> } | null;
  /** Ilustraciones del menú principal (256×192); el juego elige una al azar. */
  menuBackgrounds: string[];
  /**
   * Iconos del minimapa: una fila de 64 iconos de cell×cell por estilo (0 semitransparente, 1 contorno,
   * 2 opaco). Índices según DrawMinimapTile (overlay29): 2 enemigo, 3 objeto, 4 trampa, 6 escalera,
   * 7 Casilla Maravilla, 8 líder (parpadea), 10 compañero, 12 forajido, 13 escalera oculta,
   * 16 + bordes suelo visitado, 32 + bordes suelo conocido sin visitar (bordes: 1 abajo, 2 derecha,
   * 4 arriba, 8 izquierda = lado con pared).
   */
  minimap: { url: string; cell: number } | null;
}

export const ROM_UI: RomUi | null = ${JSON.stringify({ ui: 'assets/ui/rom', bitmapFont: { png: 'assets/fonts/rom/pmd-sky.png', xml: 'assets/fonts/rom/pmd-sky.xml' }, cell: CELL, hud, menuBackgrounds, minimap }, null, 1)};
`,
);
console.log(`Interfaz importada: cajas y marcos en ${UI}, fuente (${glyphs.size} glifos, base ${BASE}) en ${FONTS}`);
