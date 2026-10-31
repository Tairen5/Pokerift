/**
 * Genera el atlas de autotiles a partir de una hoja con el formato de
 * The Spriters Resource para mazmorras de PMD (columna "Legend" + secciones
 * Walls / Wall Alt.1 / Wall Alt.2 / Ground / Ground Alt. / Water).
 *
 * Uso: node tools/build-tileset.mjs <png> <salida.json> [originX originY]
 */
import { PNG } from 'pngjs';
import fs from 'fs';

const [, , input, output, ox = '9', oy = '163'] = process.argv;
const png = PNG.sync.read(fs.readFileSync(input));
const { width, data } = png;
const TILE = 24, STRIDE = 25, COLS = 21, ROWS = 24;
const originX = Number(ox), originY = Number(oy);
const BG = [0x00, 0x80, 0x80];

const px = (x, y) => { const i = (y * width + x) * 4; return [data[i], data[i + 1], data[i + 2]]; };
const cellX = (c) => originX + STRIDE * c;
const cellY = (r) => originY + STRIDE * r;
const isEmpty = (c, r) => {
  let n = 0;
  for (let y = 0; y < TILE; y += 2) for (let x = 0; x < TILE; x += 2) {
    const p = px(cellX(c) + x, cellY(r) + y);
    if (p[0] !== BG[0] || p[1] !== BG[1] || p[2] !== BG[2]) n++;
  }
  return n < 8;
};

// Orden de bits: N, NE, E, SE, S, SW, W, NW
const SUB = [[1, 0], [2, 0], [2, 1], [2, 2], [1, 2], [0, 2], [0, 1], [0, 0]];
const legendMask = (c, r) => {
  let mask = 0;
  SUB.forEach(([sx, sy], bit) => {
    const p = px(cellX(c) + sx * 8 + 4, cellY(r) + sy * 8 + 4);
    if (p[0] + p[1] + p[2] < 60) mask |= 1 << bit;
  });
  return normalize(mask);
};
// Las diagonales solo cuentan si ambos ortogonales adyacentes están presentes (blob de 47).
function normalize(m) {
  const has = (b) => (m >> b) & 1;
  if (!(has(0) && has(2))) m &= ~(1 << 1);
  if (!(has(2) && has(4))) m &= ~(1 << 3);
  if (!(has(4) && has(6))) m &= ~(1 << 5);
  if (!(has(6) && has(0))) m &= ~(1 << 7);
  return m;
}

const SECTIONS = { wall: [3, 6, 9], ground: [12, 15], water: [18] };
const out = { tileSize: TILE, layout: 'srpmd-v1', terrains: {} };
for (const [terrain, starts] of Object.entries(SECTIONS)) {
  const map = {};
  for (let r = 0; r < ROWS; r++) for (let lc = 0; lc < 3; lc++) {
    if (isEmpty(lc, r)) continue;
    const mask = legendMask(lc, r);
    for (const s of starts) {
      const c = s + lc;
      if (isEmpty(c, r)) continue;
      (map[mask] ??= []).push([cellX(c), cellY(r)]);
    }
  }
  out.terrains[terrain] = map;
}
fs.writeFileSync(output, JSON.stringify(out));
for (const [t, m] of Object.entries(out.terrains)) console.log(t, Object.keys(m).length, 'máscaras');
