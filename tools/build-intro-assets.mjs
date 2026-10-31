/**
 * Extrae las capas y sprites de las hojas de la intro (Assets/Intro, ripeadas
 * del opening de Exploradores del Cielo) y genera recursos listos para Phaser:
 *
 *   public/assets/intro/<nombre>.png          capas de fondo (recortadas)
 *   public/assets/intro/<hoja>-atlas.png/.json  sprites sobre fondo transparente
 *                                              (atlas formato JSON-hash de Phaser)
 *
 * Los sprites se detectan automáticamente como componentes conexas sobre el
 * color clave de cada hoja; luego se nombran por orden (fila, columna).
 *
 * Uso: node tools/build-intro-assets.mjs
 */
import { PNG } from 'pngjs';
import fs from 'node:fs';
import path from 'node:path';

const SRC = 'Assets/Intro';
const OUT = 'public/assets/intro';
fs.mkdirSync(OUT, { recursive: true });

const load = (f) => PNG.sync.read(fs.readFileSync(path.join(SRC, f)));

function crop(png, x, y, w, h, key) {
  const out = new PNG({ width: w, height: h });
  for (let j = 0; j < h; j++)
    for (let i = 0; i < w; i++) {
      const si = ((y + j) * png.width + (x + i)) * 4;
      const di = (j * w + i) * 4;
      const r = png.data[si], g = png.data[si + 1], b = png.data[si + 2];
      const keyed = key && Math.abs(r - key[0]) < 8 && Math.abs(g - key[1]) < 8 && Math.abs(b - key[2]) < 8;
      out.data[di] = r;
      out.data[di + 1] = g;
      out.data[di + 2] = b;
      out.data[di + 3] = keyed ? 0 : 255;
    }
  return out;
}

const save = (png, name) => fs.writeFileSync(path.join(OUT, name), PNG.sync.write(png));

/** Componentes conexas (8-vecindad) sobre píxeles opacos, fusionando huecos ≤ gap. */
function components(png, gap = 2, minArea = 6) {
  const { width: w, height: h, data } = png;
  const opaque = (x, y) => data[(y * w + x) * 4 + 3] > 0;
  const seen = new Uint8Array(w * h);
  const boxes = [];
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      if (seen[y * w + x] || !opaque(x, y)) continue;
      let x0 = x, x1 = x, y0 = y, y1 = y, n = 0;
      const stack = [[x, y]];
      seen[y * w + x] = 1;
      while (stack.length) {
        const [cx, cy] = stack.pop();
        n++;
        x0 = Math.min(x0, cx); x1 = Math.max(x1, cx); y0 = Math.min(y0, cy); y1 = Math.max(y1, cy);
        for (let dy = -gap; dy <= gap; dy++)
          for (let dx = -gap; dx <= gap; dx++) {
            const nx = cx + dx, ny = cy + dy;
            if (nx < 0 || ny < 0 || nx >= w || ny >= h || seen[ny * w + nx] || !opaque(nx, ny)) continue;
            seen[ny * w + nx] = 1;
            stack.push([nx, ny]);
          }
      }
      if (n >= minArea) boxes.push({ x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1, area: n });
    }
  // Orden de lectura: por filas (centros con tolerancia) y luego por columnas.
  boxes.sort((a, b) => (Math.abs(a.y + a.h / 2 - (b.y + b.h / 2)) < Math.min(a.h, b.h) / 2 ? a.x - b.x : a.y - b.y));
  return boxes;
}

function atlas(png, name, boxes, namer) {
  save(png, `${name}-atlas.png`);
  const frames = {};
  boxes.forEach((b, i) => {
    frames[namer(b, i)] = { frame: { x: b.x, y: b.y, w: b.w, h: b.h }, rotated: false, trimmed: false,
      spriteSourceSize: { x: 0, y: 0, w: b.w, h: b.h }, sourceSize: { w: b.w, h: b.h } };
  });
  fs.writeFileSync(path.join(OUT, `${name}-atlas.json`), JSON.stringify({ frames, meta: { image: `${name}-atlas.png`, size: { w: png.width, h: png.height }, scale: '1' } }, null, 1));
  console.log(`✔ ${name}: ${boxes.length} sprites → ${Object.keys(frames).join(', ')}`);
}

// ── Mar con Lapras ──
const lapras = load('Lapras (intro).png');
save(crop(lapras, 0, 0, 288, 264), 'sea-sky.png');
save(crop(lapras, 0, 266, 288, 192), 'sea-water.png');
{
  const sheet = crop(lapras, 290, 0, 210, 264, [0x4c, 0xff, 0x00]);
  const boxes = components(sheet, 3, 40).filter((b) => b.w > 40);
  atlas(sheet, 'lapras', boxes, (_, i) => `lapras-${i}`);
}

// ── Llanura (parallax) ──
const plains = load('Plains (intro).png');
save(crop(plains, 386, 0, 384, 216), 'plains-back.png');
save(crop(plains, 0, 0, 384, 216, [0xff, 0x00, 0x00]), 'plains-front.png');

// ── Muro antiguo con tesoros ──
const antic = load('Antic wall (intro).png');
save(crop(antic, 0, 0, 360, 384), 'ruins-back.png');
{
  const sheet = crop(antic, 362, 0, 360, 384, [0x00, 0x26, 0xff]);
  const boxes = components(sheet, 1, 10);
  const big = boxes.filter((b) => b.area > 400);
  const coins = boxes.filter((b) => b.area <= 400);
  const names = ['chest', 'letter', 'map', 'orb', 'bag', 'stone'];
  // Los objetos grandes se nombran por posición aproximada en la composición original.
  const byName = {};
  for (const b of big) {
    const cx = b.x + b.w / 2, cy = b.y + b.h / 2;
    const n = cy < 150 && cx < 160 ? 'chest' : cy < 200 && cx > 200 ? 'letter' : cy < 260 && cx > 120 && cx < 240 ? 'map' : cx < 130 ? 'orb' : cx > 230 ? 'bag' : 'stone';
    byName[n] = b;
  }
  const ordered = [...names.filter((n) => byName[n]).map((n) => [n, byName[n]]), ...coins.map((b, i) => [`coin-${i}`, b])];
  atlas(sheet, 'treasure', ordered.map(([, b]) => b), (_, i) => ordered[i][0]);
}

// ── Treasure Town con Shaymin ──
const town = load('Treasure town (intro).png');
save(crop(town, 0, 0, 256, 576), 'town-pano.png');
{
  const sheet = crop(town, 259, 0, 349, 576, [0x00, 0x00, 0xff]);
  const boxes = components(sheet, 1, 4);
  // Pompas: filas superiores (borde inferior por encima de y=240); Shaymin: zona central.
  const bubbles = boxes.filter((b) => b.y + b.h <= 240);
  const shaymin = boxes.filter((b) => b.y + b.h > 240 && b.y < 460);
  const petals = boxes.filter((b) => b.y >= 460);
  shaymin.sort((a, b) => a.w * a.h - b.w * b.h);
  const all = [...bubbles.map((b, i) => [`bubble-${i}`, b]), ...shaymin.map((b, i) => [`shaymin-${i}`, b]), ...petals.map((b, i) => [`petal-${i}`, b])];
  atlas(sheet, 'town', all.map(([, b]) => b), (_, i) => all[i][0]);
}

// ── Logo y fondo del título ──
{
  const logo = load('logo.png');
  const keyed = crop(logo, 0, 0, 256, 192, [0x00, 0x26, 0xff]);
  // Recorta al contorno del logo.
  let x0 = 256, y0 = 192, x1 = 0, y1 = 0;
  for (let y = 0; y < 192; y++)
    for (let x = 0; x < 256; x++)
      if (keyed.data[(y * 256 + x) * 4 + 3]) {
        x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
      }
  // Se recorta de la hoja original aplicando de nuevo el color clave (conserva la transparencia).
  save(crop(logo, x0, y0, x1 - x0 + 1, y1 - y0 + 1, [0x00, 0x26, 0xff]), 'logo.png');
  save(crop(logo, 0, 194, 256, 192), 'title-back.png');
  console.log(`✔ logo: ${x1 - x0 + 1}×${y1 - y0 + 1} px · title-back: 256×192`);
}

// ── Pokémon de decorado de la intro, desde SpriteCollab (no son especies del juego) ──
//   Vulpix: camina con Pikachu por el camino de tierra.
//   Pelipper: vuela en grupo sobre Lapras.
for (const [name, dex] of [['vulpix', 37], ['pelipper', 279]]) {
  const RAW = `https://raw.githubusercontent.com/PMDCollab/SpriteCollab/master/sprite/${String(dex).padStart(4, '0')}`;
  try {
    const xml = await (await fetch(`${RAW}/AnimData.xml`)).text();
    const walk = xml.match(/<Anim>\s*<Name>Walk<\/Name>([\s\S]*?)<\/Anim>/)[1];
    const tag = (t) => Number(walk.match(new RegExp(`<${t}>([0-9]+)</${t}>`))[1]);
    const durations = [...walk.matchAll(/<Duration>([0-9]+)<\/Duration>/g)].map((d) => Number(d[1]));
    const png = Buffer.from(await (await fetch(`${RAW}/Walk-Anim.png`)).arrayBuffer());
    fs.writeFileSync(path.join(OUT, `${name}-walk.png`), png);
    fs.writeFileSync(path.join(OUT, `${name}-walk.json`), JSON.stringify({ frameWidth: tag('FrameWidth'), frameHeight: tag('FrameHeight'), durations, source: `SpriteCollab ${dex} (CC BY-NC 4.0)` }));
    console.log(`✔ ${name}-walk: ${tag('FrameWidth')}×${tag('FrameHeight')}, ${durations.length} frames`);
  } catch (e) {
    console.warn(`⚠ No se pudo descargar ${name}; la intro seguirá sin él:`, e.message);
  }
}
