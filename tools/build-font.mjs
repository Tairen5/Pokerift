/**
 * Convierte "Assets/Font/dungeon title font.png" (fuente de títulos de
 * Exploradores del Cielo, rejilla de 25×25 px, 20 glifos por fila) en una
 * fuente bitmap BMFont para Phaser:
 *   public/assets/fonts/pmd-title.png  (glifos blancos sobre transparente)
 *   public/assets/fonts/pmd-title.xml
 *
 * Mapa de caracteres (filas 0-7 de la hoja); las filas 4-7 siguen el orden
 * Latin-1 desde À (0xC0) hasta ÿ (0xFF), lo que incluye á é í ó ú ñ.
 */
import { PNG } from 'pngjs';
import fs from 'node:fs';

const SRC = 'Assets/Font/dungeon title font.png';
const OUT = 'public/assets/fonts';
const CELL = 25, OX = 1, ROWS = 8, COLS = 20;

const latin = (from, n) => Array.from({ length: n }, (_, i) => String.fromCharCode(from + i));
const MAP = [
  [' ', '!', '"', '&', "'", '+', ',', '-', '.', '/', ...'0123456789'],
  [':', ';', '?', ...'ABCDEFGHIJKLMNOPQ'],
  [...'RSTUVWXYZabcdefghijk'],
  [...'lmnopqrstuvwxyz'],
  [null, null, null, ...latin(0xc0, 17)],
  latin(0xd1, 20),
  latin(0xe5, 20),
  latin(0xf9, 7),
];

const src = PNG.sync.read(fs.readFileSync(SRC));
const W = OX + CELL * COLS, H = CELL * ROWS;
const out = new PNG({ width: W, height: H });
for (let y = 0; y < H; y++)
  for (let x = 0; x < W; x++) {
    const si = (y * src.width + x) * 4, di = (y * W + x) * 4;
    const lum = Math.max(src.data[si], src.data[si + 1], src.data[si + 2]);
    out.data[di] = out.data[di + 1] = out.data[di + 2] = 255;
    out.data[di + 3] = lum;
  }

const lit = (x, y) => out.data[(y * W + x) * 4 + 3] > 40;
const chars = [];
MAP.forEach((row, r) =>
  row.forEach((ch, c) => {
    if (ch === null) return;
    const x0 = OX + c * CELL, y0 = r * CELL;
    let minX = CELL, maxX = -1;
    for (let x = 0; x < CELL; x++) for (let y = 0; y < CELL; y++) if (lit(x0 + x, y0 + y)) { minX = Math.min(minX, x); maxX = Math.max(maxX, x); }
    const width = maxX < 0 ? 0 : maxX - minX + 1;
    chars.push({ id: ch.charCodeAt(0), x: x0 + (maxX < 0 ? 0 : minX), y: y0, width, height: CELL, xadvance: ch === ' ' ? 7 : width + 2 });
  }),
);

fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(`${OUT}/pmd-title.png`, PNG.sync.write(out));
const xml = `<?xml version="1.0"?>
<font>
  <info face="pmd-title" size="${CELL}" />
  <common lineHeight="${CELL}" base="21" scaleW="${W}" scaleH="${H}" pages="1" />
  <pages><page id="0" file="pmd-title.png" /></pages>
  <chars count="${chars.length}">
${chars.map((c) => `    <char id="${c.id}" x="${c.x}" y="${c.y}" width="${c.width}" height="${c.height}" xoffset="0" yoffset="0" xadvance="${c.xadvance}" page="0" />`).join('\n')}
  </chars>
</font>
`;
fs.writeFileSync(`${OUT}/pmd-title.xml`, xml);

// Mapa para el DOM (src/client/ui/kit.ts → titleText): cada glifo es un recorte de
// pmd-title.png, que conserva el sombreado gris del original como alfa. t/b son la
// primera y la última fila con tinta dentro de la celda: un texto ocupa solo la
// franja vertical de sus glifos (sin hueco de acentos si no los lleva).
const glyphs = {};
for (const c of chars) {
  let t = CELL, b = -1;
  for (let y = 0; y < CELL; y++) for (let x = 0; x < c.width; x++) if (lit(c.x + x, c.y + y)) { t = Math.min(t, y); b = Math.max(b, y); }
  glyphs[String.fromCharCode(c.id)] = { x: c.x, y: c.y, w: c.width, a: c.xadvance, t: b < 0 ? 21 : t, b: b < 0 ? 0 : b };
}
fs.writeFileSync('src/client/assets/title-glyphs.generated.json', JSON.stringify({ sheet: { w: W, h: H }, base: 21, glyphs }));
console.log(`✔ pmd-title: ${chars.length} glifos`);
