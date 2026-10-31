/**
 * Importa las zonas exteriores de una ROM LEGÍTIMA de Exploradores del Cielo
 * (solo la lee; Pokerift no la incluye ni la distribuye). Sustituye a los mapas
 * ripeados de tools/build-town.mjs por los originales, con:
 *  - las dos capas del mapa por separado (la segunda se dibuja sobre la primera; en
 *    el juego contiene también suelo transitable, así que va detrás de los Pokémon);
 *  - teselas animadas (BPA) y animación de paleta (BPL) del juego: agua, banderas…;
 *  - la colisión original del mapa (rejilla de 8 px).
 *
 *   npm run import:town -- <rom.nds>
 *
 * Formatos (SkyTemple, skytemple-files/skytemple-rust): MAP_BG/<mapa>.bma (capas
 * en NRL de pares de 12 bits con XOR por filas, bloque opcional en NRL genérico,
 * colisión en RLE con XOR por filas), .bpc (teselas en la compresión de imagen
 * BPC, tilemaps de bloques 3×3 en la de tilemap BPC), .bpl (paletas de 15 colores
 * + animación de paleta), .bpa (teselas animadas) y bg_list.dat (qué BPA usa cada
 * mapa).
 *
 * Mapas (identificados comparando con los ripeos de Assets/Lobby/DS; `origin` es
 * dónde caía la esquina del ripeo dentro del mapa original, para trasladar las
 * llegadas y salidas de src/shared/town/zone.ts):
 *   home h02p99a · bluff h01p99a · crossroads p01p01a · beach d01p11a · guild t00p04a
 *   town = t01p02a (oeste, x 0) + t01p01a (este, x 480): en el juego son dos mapas
 *   unidos por el borde; aquí se juntan en uno (se solapan 72 px).
 *
 * Genera public/assets/town/rom/* y src/shared/town/zones/<zona>.generated.ts.
 * Opciones: --info (solo lista los mapas), --only <zona>.
 */
import { PNG } from 'pngjs';
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? (args.splice(i, 1), true) : false;
};
const opt = (name, def) => {
  const i = args.indexOf(name);
  return i >= 0 ? args.splice(i, 2)[1] : def;
};
const INFO = flag('--info');
const ONLY = opt('--only', null);
const input = args[0];
if (!input) {
  console.error('Uso: node tools/import-rom-town.mjs <rom.nds> [--info] [--only zona]');
  process.exit(1);
}

const ZONES = [
  { id: 'home', maps: [{ name: 'h02p99a', x: 0 }], origin: { x: 47, y: 48 } },
  { id: 'bluff', maps: [{ name: 'h01p99a', x: 0 }], origin: { x: 47, y: 16 } },
  { id: 'town', maps: [{ name: 't01p02a', x: 0 }, { name: 't01p01a', x: 480 }], origin: { x: 0, y: 16 } },
  { id: 'crossroads', maps: [{ name: 'p01p01a', x: 0 }], origin: { x: 0, y: 0 } },
  { id: 'beach', maps: [{ name: 'd01p11a', x: 0 }], origin: { x: 0, y: 56 } },
  { id: 'guild', maps: [{ name: 't00p04a', x: 0 }], origin: { x: 31, y: 54 } },
];
const TICK_MS = 1000 / 60; // las duraciones de BPA/BPL van en fotogramas de 60 Hz [INCIERTO]
const MAX_FRAMES = 120;

/* ───────────────────────── ROM ───────────────────────── */
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
const file = romFiles(fs.readFileSync(input));

/* ───────────────────────── Compresiones ───────────────────────── */
/** NRL genérico: <0x80 escribe cmd+1 nulos; <0xC0 repite el siguiente valor cmd-0x7F veces; si no, copia cmd-0xBF valores. */
function nrl(d, pos, stopBytes, unit, outPerUnit, put) {
  let out = 0;
  while (out < stopBytes) {
    if (pos >= d.length) throw new Error('NRL: datos insuficientes');
    const cmd = d[pos++];
    if (cmd < 0x80) for (let i = 0; i <= cmd; i++) (put(null), (out += outPerUnit));
    else if (cmd < 0xc0) {
      const v = d.subarray(pos, pos + unit);
      pos += unit;
      for (let i = 0x7f; i < cmd; i++) (put(v), (out += outPerUnit));
    } else
      for (let i = 0xbf; i < cmd; i++) {
        put(d.subarray(pos, pos + unit));
        pos += unit;
        out += outPerUnit;
      }
  }
  return pos;
}
/** Capa de la BMA: índices de bloque en pares de 12 bits, cada fila XOR la anterior. */
function bmaLayer(d, pos, mw, mh) {
  let need = mw * mh * 2;
  if (mw % 2) need += mh * 2;
  const words = [];
  const end = nrl(d, pos, need, 3, 4, (v) => {
    if (!v) return void words.push(0, 0);
    const o = (v[0] << 16) | (v[1] << 8) | v[2];
    words.push(((o & 0xff0000) >> 16) + (o & 0x000f00), ((o & 0x0000ff) << 4) + ((o & 0x00f000) >> 12));
  });
  const prev = new Array(mw).fill(0), layer = [];
  let i = 0, skipped = true;
  for (const w of words) {
    if (i >= mw * mh) break;
    const col = i % mw;
    if (!skipped && col === 0 && mw % 2) {
      skipped = true;
      continue;
    }
    skipped = false;
    const cv = w ^ prev[col];
    prev[col] = cv;
    layer.push(cv);
    i++;
  }
  return { layer, end };
}
/** Imagen de la BPC (palabras de 16 bits con patrones y "sobrantes"). */
function bpcImage(d, pos, stop) {
  const out = [];
  let hasLeft = false, left = 0, pat = 0, buf = 0;
  const u8 = () => d[pos++];
  const u16 = () => ((pos += 2), d[pos - 2] | (d[pos - 1] << 8));
  const put16 = (v) => out.push(v & 255, v >> 8);
  while (out.length < stop) {
    if (pos >= d.length) {
      if (hasLeft) put16(left);
      break;
    }
    const cmd = u8();
    let nb;
    if (cmd === 0x7e || cmd === 0xff || cmd === 0xbf || cmd === 0xdf) nb = u8();
    else if (cmd === 0x7f) nb = u16();
    else nb = cmd >= 0xe0 ? cmd - 0xe0 : cmd >= 0xc0 ? cmd - 0xc0 : cmd >= 0x80 ? cmd - 0x80 : cmd;
    if (hasLeft) nb -= 1;
    const loadPat = cmd >= 0x80 && cmd < 0xc0, isPat = cmd >= 0x80;
    if (loadPat || cmd >= 0xe0) [pat, buf] = [buf, pat];
    if (loadPat) pat = u8();
    if (hasLeft) {
      put16(left | ((isPat ? pat : u8()) << 8));
      hasLeft = false;
    }
    if (nb >= 0) {
      if (isPat) for (let k = 0; k < nb; k += 2) put16(pat | (pat << 8));
      else for (let k = 0; k < nb; k += 2) put16(u16());
      if (nb % 2 === 0) {
        hasLeft = true;
        left = isPat ? pat : u8();
      }
    }
  }
  return { data: Buffer.from(out.slice(0, stop)), end: pos };
}
/** Tilemap de la BPC: primero los bytes altos (NRL), luego se completan los bajos. */
function bpcTilemap(d, pos, stop) {
  const out = Buffer.alloc(stop + 2);
  let o = 0;
  pos = nrl(d, pos, stop, 1, 2, (v) => {
    if (o + 1 < out.length) out[o + 1] = v ? v[0] : 0;
    o += 2;
  });
  let p2 = 0;
  while (p2 < stop) {
    const cmd = d[pos++];
    if (cmd < 0x80) p2 += (cmd + 1) * 2;
    else if (cmd < 0xc0) {
      const v = d[pos++];
      for (let i = 0x7f; i < cmd; i++) (out[p2] |= v), (p2 += 2);
    } else for (let i = 0xbf; i < cmd; i++) (out[p2] |= d[pos++]), (p2 += 2);
  }
  return out.subarray(0, stop);
}

/* ───────────────────────── Mapa ───────────────────────── */
const bgList = (() => {
  const d = file('MAP_BG/bg_list.dat');
  const str = (o) => d.toString('latin1', o, o + 8).replace(/\0.*$/, '').toLowerCase();
  const list = new Map();
  for (let o = 0; o + 88 <= d.length; o += 88) list.set(str(o + 0x10), Array.from({ length: 8 }, (_, k) => str(o + 0x18 + k * 8) || null));
  return list;
})();

function loadMap(name) {
  const bma = file(`MAP_BG/${name}.bma`), bpc = file(`MAP_BG/${name}.bpc`), bpl = file(`MAP_BG/${name}.bpl`);
  const [cw, ch, tw, th, mw, mh] = [0, 1, 2, 3, 4, 5].map((i) => bma[i]);
  const nLayers = bma.readUInt16LE(6), unk6 = bma.readUInt16LE(8), nCol = bma.readUInt16LE(0xa);
  const l0 = bmaLayer(bma, 0xc, mw, mh);
  const l1 = nLayers > 1 ? bmaLayer(bma, l0.end, mw, mh) : null;
  let pos = l1 ? l1.end : l0.end;
  if (unk6) pos = nrl(bma, pos, cw * ch, 1, 1, () => {});
  let collision = null;
  if (nCol > 0) {
    const raw = [];
    while (raw.length < cw * ch) {
      const cmd = bma[pos++];
      for (let i = 0; i <= (cmd & 0x7f); i++) raw.push(cmd >> 7);
    }
    collision = [];
    for (let y = 0; y < ch; y++)
      for (let x = 0; x < cw; x++) collision.push(raw[y * cw + x] ^ (y ? collision[(y - 1) * cw + x] : 0));
  }
  // BPC: una o dos capas (si hay dos, la 0 es la superior).
  const up = bpc.readUInt16LE(0), low = bpc.readUInt16LE(2);
  const layers = [];
  for (let k = 0; k < (low > 0 ? 2 : 1); k++) {
    const s = 4 + k * 12;
    const L = { nTiles: bpc.readUInt16LE(s), bpaTiles: [1, 2, 3, 4].map((j) => bpc.readUInt16LE(s + j * 2)), tmLen: bpc.readUInt16LE(s + 10) };
    const seg = bpc.subarray(k === 0 ? up : low, k === 0 && low > 0 ? low : bpc.length);
    const img = bpcImage(seg, 0, (L.nTiles - 1) * 32);
    L.tiles = Buffer.concat([Buffer.alloc(32), img.data]);
    let tm = img.end;
    if (tm % 2) tm++;
    const map = bpcTilemap(seg, tm, (L.tmLen - 1) * tw * th * 2);
    L.tilemap = new Array(tw * th).fill(0);
    for (let i = 0; i < map.length; i += 2) L.tilemap.push(map.readUInt16LE(i));
    layers.push(L);
  }
  // BPA de cada capa de la BPC (bg_list: 4 huecos por capa).
  const bpaNames = bgList.get(name) ?? new Array(8).fill(null);
  layers.forEach((L, k) => {
    L.bpas = [];
    bpaNames.slice(k * 4, k * 4 + 4).forEach((bn, j) => {
      if (!bn) return;
      const d = file(`MAP_BG/${bn}.bpa`);
      const nt = d.readUInt16LE(0), nf = d.readUInt16LE(2);
      if (nt !== L.bpaTiles[j]) throw new Error(`${name}: ${bn}.bpa tiene ${nt} teselas, la BPC espera ${L.bpaTiles[j]}`);
      const durs = Array.from({ length: nf }, (_, f) => Math.max(1, d.readUInt16LE(4 + f * 4)));
      const start = 4 + nf * 4;
      L.bpas.push({ id: `${name}:bpa:${bn}`, name: bn, nt, nf, durs, tiles: d.subarray(start, start + nt * nf * 32) });
    });
  });
  // BPL: paletas de 15 colores (+ transparente) y animación de paleta.
  const np = bpl.readUInt16LE(0), hasAnim = bpl.readUInt16LE(2) > 0;
  const pals = [];
  for (let p = 0; p < np; p++) {
    const row = [null];
    for (let c = 0; c < 15; c++) {
      const o = 4 + (p * 15 + c) * 4;
      row.push([bpl[o], bpl[o + 1], bpl[o + 2]]);
    }
    pals.push(row);
  }
  const palAnims = [];
  if (hasAnim) {
    const specEnd = 4 + np * 60 + np * 4;
    let used = 0;
    for (let p = 0; p < np; p++) {
      const o = 4 + np * 60 + p * 4;
      const dur = bpl.readUInt16LE(o), nf = bpl.readUInt16LE(o + 2);
      if (!nf) continue;
      const frames = [];
      for (let f = 0; f < nf; f++) {
        const row = [null];
        for (let c = 0; c < 15; c++) {
          const q = specEnd + ((used + f) * 15 + c) * 4;
          row.push(q + 3 <= bpl.length ? [bpl[q], bpl[q + 1], bpl[q + 2]] : [0, 0, 0]);
        }
        frames.push(row);
      }
      used += nf;
      palAnims.push({ id: `${name}:pal:${p}`, pal: p, dur: Math.max(1, dur), durs: new Array(nf).fill(Math.max(1, dur)), frames });
    }
  }
  return { name, w: mw * tw * 8, h: mh * th * 8, cw, ch, mw, tw, th, lower: l0.layer, upper: l1?.layer ?? null, layers, pals, palAnims, collision };
}

/** Fotograma (índice) de cada fuente animada en el tic t. */
const frameAt = (durs, t) => {
  const total = durs.reduce((a, b) => a + b, 0);
  let r = t % total;
  for (let f = 0; f < durs.length; f++) {
    if (r < durs[f]) return f;
    r -= durs[f];
  }
  return 0;
};

/** Pinta una capa de la BMA en `img` (desplazada ox); tick(fuente) = tic de cada animación. */
function drawLayer(m, img, bmaLayer, bpcIdx, ox, tick) {
  const L = m.layers[bpcIdx];
  // Teselas: las de la BPC y, detrás, las de cada BPA en su fotograma actual.
  const extra = L.bpas.map((b) => {
    const f = frameAt(b.durs, tick(b.id));
    return b.tiles.subarray(f * b.nt * 32, (f + 1) * b.nt * 32);
  });
  const tiles = Buffer.concat([L.tiles, ...extra]);
  const pals = m.pals.map((p, i) => {
    const a = m.palAnims.find((x) => x.pal === i);
    return a ? a.frames[frameAt(a.durs, tick(a.id))] : p;
  });
  const per = m.tw * m.th;
  bmaLayer.forEach((chunk, i) => {
    const cx = ox + (i % m.mw) * m.tw * 8, cy = Math.floor(i / m.mw) * m.th * 8;
    for (let k = 0; k < per; k++) {
      const e = L.tilemap[chunk * per + k] ?? 0;
      const tile = e & 0x3ff, hf = e & 0x400, vf = e & 0x800, pal = pals[e >> 12];
      if (!pal) continue;
      const tx = cx + (k % m.tw) * 8, ty = cy + Math.floor(k / m.tw) * 8;
      for (let y = 0; y < 8; y++)
        for (let x = 0; x < 8; x++) {
          const sx = hf ? 7 - x : x, sy = vf ? 7 - y : y;
          const b = tiles[tile * 32 + sy * 4 + (sx >> 1)];
          const ci = sx & 1 ? b >> 4 : b & 15;
          if (!ci || b === undefined) continue;
          const X = tx + x, Y = ty + y;
          if (X >= img.width || Y >= img.height) continue;
          img.data.set([...pal[ci], 255], (Y * img.width + X) * 4);
        }
    }
  });
}


/* ───────────────────────── Escena de entrada: objetos y NPC ───────────────────────── */
// SCRIPT/<MAPA>/enter.sse (formato SSA/SSE de SkyTemple: capas con actores, objetos…; posiciones en
// casillas de 8 px, +4 si el desplazamiento es ≥ 2). Se toman la capa 0 (objetos siempre presentes) y
// la 99 (NPC del pueblo en el día a día). Las demás capas dependen de la historia y no se usan.
// Tablas de SkyTemple (pmd2scriptdata.xml, EoS NA) para los ids que usan estas escenas:
const SCENE_OBJECTS = { 112: 'h02p99a1', 175: 't01p01a2', 176: 't01p01a3', 177: 't01p01a4' }; // id → GROUND/<nombre>.wan
const SCENE_ACTORS = { 90: 'chansey', 91: 'kangaskhan', 97: 'xatu', 116: 'kecleon', 117: 'kecleonPurple', 118: 'duskull', 135: 'electivire' }; // entidad → especie (decorado)
const SCENE_IGNORED_OBJECTS = new Set([6, 8]); // NULL: zonas de interacción invisibles

function readScene(name) {
  let d;
  try {
    d = file(`SCRIPT/${name.toUpperCase()}/enter.sse`);
  } catch {
    return { objects: [], actors: [] };
  }
  const u16 = (o) => d.readUInt16LE(o), i16 = (o) => d.readInt16LE(o);
  const at = (x, xo) => x * 8 + (xo >= 2 ? 4 : 0);
  const layers = [];
  for (let i = 0; i < u16(0); i++) {
    const o = u16(2) * 2 + i * 20;
    const L = { objects: [], actors: [] };
    for (let k = 0, p = u16(o + 2) * 2; k < u16(o); k++, p += 16) L.actors.push({ id: u16(p), dir: u16(p + 2), x: at(u16(p + 4), u16(p + 8)), y: at(u16(p + 6), u16(p + 10)) });
    for (let k = 0, p = u16(o + 6) * 2; k < u16(o + 4); k++, p += 20) L.objects.push({ id: u16(p), dir: u16(p + 2), w: i16(p + 4), h: i16(p + 6), x: at(u16(p + 8), u16(p + 12)), y: at(u16(p + 10), u16(p + 14)) });
    layers.push(L);
  }
  return { objects: layers[0]?.objects ?? [], actors: layers[99]?.actors ?? [] };
}

/** WAN de objeto (GROUND/*.wan): primer fotograma de la animación 0 → { png, ox, oy } (origen dentro de la imagen). */
const OBJ_DIM = [[1, 1], [2, 2], [4, 4], [8, 8], [2, 1], [4, 1], [4, 2], [8, 4], [1, 2], [1, 4], [2, 4], [4, 8]];
function renderObject(name) {
  const d = file(`GROUND/${name}.wan`);
  if (d.toString('latin1', 0, 4) !== 'SIR0') throw new Error(`GROUND/${name}.wan: no es SIR0`);
  const dp = d.readUInt32LE(4), pAnim = d.readUInt32LE(dp), pImg = d.readUInt32LE(dp + 4);
  const pTable = d.readUInt32LE(pImg), pPal = d.readUInt32LE(pImg + 4), nImgs = d.readUInt16LE(pImg + 14);
  const pals = [];
  for (let p = d.readUInt32LE(pPal); p + 64 <= pTable; p += 64) pals.push([...Array(16).keys()].map((i) => [d[p + i * 4], d[p + i * 4 + 1], d[p + i * 4 + 2]]));
  const imgs = [];
  for (let i = 0; i < nImgs; i++) {
    const parts = [];
    for (let q = d.readUInt32LE(pTable + i * 4); ; q += 12) {
      const src = d.readUInt32LE(q), n = d.readUInt16LE(q + 4);
      if (!src && !n) break;
      parts.push(src ? d.subarray(src, src + n) : Buffer.alloc(n));
    }
    imgs.push(Buffer.concat(parts));
  }
  const pMeta = d.readUInt32LE(pAnim), pOffs = d.readUInt32LE(pAnim + 4), pGroups = d.readUInt32LE(pAnim + 8);
  const metaEnd = pOffs > pMeta ? pOffs : pGroups > pMeta ? pGroups : pImg;
  const seq = d.readUInt32LE(d.readUInt32LE(pGroups));
  const frame = { meta: d.readUInt16LE(seq + 2), ox: d.readInt16LE(seq + 4), oy: d.readInt16LE(seq + 6) };
  if (pMeta + frame.meta * 4 >= metaEnd) throw new Error(`GROUND/${name}.wan: fotograma fuera de la tabla`);
  const pixels = [];
  let last = 0;
  for (let r = d.readUInt32LE(pMeta + frame.meta * 4); ; r += 10) {
    let img = d.readInt16LE(r);
    const a0 = d.readUInt16LE(r + 4), a1 = d.readUInt16LE(r + 6), a2 = d.readUInt16LE(r + 8);
    if (img < 0) img = last;
    last = img;
    const [tw, th] = OBJ_DIM[((a0 >> 14) & 3) * 4 + ((a1 >> 14) & 3)] ?? [1, 1];
    const px0 = (a1 & 0x1ff) - 256 + frame.ox, py0 = (((a0 & 0xff) << 24) >> 24) + frame.oy;
    const src = imgs[img] ?? Buffer.alloc(0), pal = pals[a2 >> 12] ?? pals[0];
    for (let t = 0; t < tw * th; t++)
      for (let i = 0; i < 64; i++) {
        const b = src[t * 32 + (i >> 1)];
        const v = b === undefined ? 0 : i & 1 ? b >> 4 : b & 15;
        if (!v) continue;
        let x = (t % tw) * 8 + (i % 8), y = Math.floor(t / tw) * 8 + Math.floor(i / 8);
        if (a1 & 0x1000) x = tw * 8 - 1 - x;
        if (a1 & 0x2000) y = th * 8 - 1 - y;
        pixels.push([px0 + x, py0 + y, pal[v]]);
      }
    if (a1 & 0x800) break;
  }
  const x0 = Math.min(...pixels.map((p) => p[0])), y0 = Math.min(...pixels.map((p) => p[1]));
  const W = Math.max(...pixels.map((p) => p[0])) - x0 + 1, H = Math.max(...pixels.map((p) => p[1])) - y0 + 1;
  const png = new PNG({ width: W, height: H });
  for (const [x, y, c] of pixels) png.data.set([...c, 255], ((y - y0) * W + x - x0) * 4);
  return { png, ox: -x0, oy: -y0 };
}

const gcd = (a, b) => (b ? gcd(b, a % b) : a);
const lcm = (a, b) => (a / gcd(a, b)) * b;

function importZone(z) {
  const maps = z.maps.map((m) => ({ ...loadMap(m.name), ox: m.x }));
  const W = Math.max(...maps.map((m) => m.ox + m.w)), H = Math.max(...maps.map((m) => m.h));
  const sources = maps.flatMap((m) => [...m.layers.flatMap((L) => L.bpas), ...m.palAnims]);
  const cycleOf = (src) => src.durs.reduce((x, y) => x + y, 0);
  if (INFO) {
    console.log(z.id, maps.map((m) => `${m.name} ${m.w}×${m.h} capas:${m.upper ? 2 : 1} BPA:${m.layers.flatMap((L) => L.bpas.map((b) => `${b.name}(${b.nf}f ${b.durs.join('/')})`)).join(',') || '-'} pal:${m.palAnims.map((x) => `${x.pal}(${x.frames.length}f×${x.dur})`).join(',') || '-'} col:${m.collision ? `${m.cw}×${m.ch}` : 'no'}`).join(' + '), `→ ${W}×${H}`);
    return;
  }
  /** Capa completa con cada fuente en su tic (las que no se nombran, en 0). */
  const render = (which, ticks = {}) => {
    const img = new PNG({ width: W, height: H });
    const tick = (id) => ticks[id] ?? 0;
    for (const m of maps) {
      const lowerBpc = m.layers.length === 1 ? 0 : 1;
      if (which === 'lower') drawLayer(m, img, m.lower, lowerBpc, m.ox, tick);
      else if (m.upper) drawLayer(m, img, m.upper, 0, m.ox, tick);
    }
    return img;
  };
  const tw = Math.ceil(W / 8), th = Math.ceil(H / 8);
  /** Bloques de 8×8 en los que `img` difiere de `base`. */
  const diffBlocks = (base, img, into) => {
    for (let i = 0; i < W * H; i++) {
      const p = i * 4;
      if (img.data[p] !== base.data[p] || img.data[p + 1] !== base.data[p + 1] || img.data[p + 2] !== base.data[p + 2] || img.data[p + 3] !== base.data[p + 3])
        into[Math.floor(i / W / 8) * tw + Math.floor((i % W) / 8)] = 1;
    }
  };
  const OUT = 'public/assets/town/rom';
  fs.mkdirSync(OUT, { recursive: true });
  const result = { image: `assets/town/rom/${z.id}.png`, upper: null, anims: [] };
  let longest = 0;
  for (const which of ['lower', 'upper']) {
    const base = render(which);
    if (which === 'upper' && !base.data.some((v, i) => i % 4 === 3 && v)) continue;
    fs.writeFileSync(path.join(OUT, `${z.id}${which === 'upper' ? '-upper' : ''}.png`), PNG.sync.write(base));
    if (which === 'upper') result.upper = `assets/town/rom/${z.id}-upper.png`;
    // Qué bloques mueve cada fuente (moviendo solo esa).
    const masks = sources.map((src) => {
      const mask = new Uint8Array(tw * th);
      let t = 0;
      for (const d of src.durs.slice(0, -1)) (t += d), diffBlocks(base, render(which, { [src.id]: t }), mask);
      return mask;
    });
    // Firma de cada bloque: qué fuentes lo mueven (las regiones no mezclan firmas,
    // así cada una anima a su ritmo y solo se combinan las que se pisan de verdad).
    const sig = new Array(tw * th).fill('');
    masks.forEach((m, k) => m.forEach((v, i) => v && (sig[i] += `${k},`)));
    const changed = sig.map((x) => (x ? 1 : 0));
    // Componentes conexas (8 vecinos) → rectángulos animados con las fuentes que los tocan.
    const seen = new Uint8Array(tw * th);
    let n = 0;
    for (let s0 = 0; s0 < tw * th; s0++) {
      if (!changed[s0] || seen[s0]) continue;
      let x0 = tw, y0 = th, x1 = -1, y1 = -1;
      const cells = [], stack = [s0];
      seen[s0] = 1;
      while (stack.length) {
        const c = stack.pop(), cx = c % tw, cy = Math.floor(c / tw);
        cells.push(c);
        x0 = Math.min(x0, cx); y0 = Math.min(y0, cy); x1 = Math.max(x1, cx); y1 = Math.max(y1, cy);
        for (let dy = -1; dy <= 1; dy++)
          for (let dx = -1; dx <= 1; dx++) {
            const nx = cx + dx, ny = cy + dy, k = ny * tw + nx;
            if (nx >= 0 && ny >= 0 && nx < tw && ny < th && changed[k] && !seen[k] && sig[k] === sig[s0]) (seen[k] = 1), stack.push(k);
          }
      }
      const srcs = sources.filter((_, i) => cells.some((c) => masks[i][c]));
      // Ciclo propio de la región: paso = mcd de sus duraciones; si no cabe, se recorta [INCIERTO].
      let step = 0, cycle = 1;
      for (const src of srcs) {
        for (const d of src.durs) step = gcd(step, d);
        cycle = lcm(cycle, cycleOf(src));
      }
      let frames = cycle / step;
      if (frames > MAX_FRAMES) {
        step = Math.ceil(cycle / MAX_FRAMES);
        frames = Math.ceil(cycle / step);
        console.warn(`  ${z.id}: región ${x0 * 8},${y0 * 8} con ${srcs.map((x) => x.id).join(' + ')}: ciclo de ${cycle} tics, a pasos de ${step} (aproximado)`);
      }
      longest = Math.max(longest, frames);
      const rx = x0 * 8, ry = y0 * 8, rw = Math.min(W, (x1 + 1) * 8) - rx, rh = Math.min(H, (y1 + 1) * 8) - ry;
      const strip = new PNG({ width: rw * frames, height: rh });
      for (let f = 0; f < frames; f++) {
        const img = render(which, Object.fromEntries(srcs.map((x) => [x.id, f * step])));
        PNG.bitblt(img, strip, rx, ry, rw, rh, f * rw, 0);
      }
      const key = `${which}${n++}`;
      fs.writeFileSync(path.join(OUT, `${z.id}-${key}.png`), PNG.sync.write(strip));
      result.anims.push({ key, image: `assets/town/rom/${z.id}-${key}.png`, frames, w: rw, h: rh, x: rx, y: ry, under: false, upper: which === 'upper', ms: Math.round(step * TICK_MS) });
    }
  }
  const nFrames = longest;
  // Colisión (celdas de 8 px; fuera de cualquier mapa, bloqueado).
  const cols = Math.ceil(W / 8), rows = Math.ceil(H / 8);
  const grid = Array.from({ length: rows }, () => new Array(cols).fill('#'));
  for (const m of maps) {
    if (!m.collision) throw new Error(`${m.name}: el mapa no tiene colisión`);
    for (let y = 0; y < m.ch; y++)
      for (let x = 0; x < m.cw; x++) {
        const gx = m.ox / 8 + x;
        // En el solape de dos mapas manda el que se dibuja encima (el último).
        if (gx < cols && y < rows) grid[y][gx] = m.collision[y * m.cw + x] ? '#' : '.';
      }
  }
  // Objetos y NPC de la escena de entrada de cada mapa (desplazados como el mapa); sus casillas bloquean el paso.
  const props = [], npcs = [], warn = [];
  const block = (x, y, w, h) => {
    for (let gy = Math.floor(y / 8); gy < Math.ceil((y + h) / 8); gy++)
      for (let gx = Math.floor(x / 8); gx < Math.ceil((x + w) / 8); gx++) if (grid[gy]?.[gx] !== undefined) grid[gy][gx] = '#';
  };
  for (const m of maps) {
    const scene = readScene(m.name);
    for (const o of scene.objects) {
      if (SCENE_IGNORED_OBJECTS.has(o.id)) continue;
      const name = SCENE_OBJECTS[o.id];
      if (!name) {
        warn.push(`objeto ${o.id} sin nombre en la tabla`);
        continue;
      }
      const r = renderObject(name);
      const file = `${z.id}-obj-${name}.png`;
      fs.writeFileSync(path.join(OUT, file), PNG.sync.write(r.png));
      const x = m.ox + o.x, y = o.y;
      props.push({ key: name, image: `assets/town/rom/${file}`, x: x - r.ox, y: y - r.oy, w: r.png.width, h: r.png.height, baseY: y });
      // Caja de choque del objeto (w×h casillas) centrada en x y apoyada en y.
      block(x - (o.w * 8) / 2, y - (o.h * 8) / 2, o.w * 8, o.h * 8);
    }
    for (const a of scene.actors) {
      const species = SCENE_ACTORS[a.id];
      if (!species) {
        warn.push(`actor ${a.id} sin especie en la tabla`);
        continue;
      }
      npcs.push({ species, x: m.ox + a.x, y: a.y, dir: Math.max(0, a.dir - 1) });
      block(m.ox + a.x - 8, a.y - 4, 16, 8); // caja de los actores de SkyTemple: 2×1 casillas
    }
  }
  if (warn.length) console.warn(`  ${z.id}: ${warn.join('; ')}`);
  const NAME = { home: 'HOME', bluff: 'BLUFF', town: 'TOWN', crossroads: 'CROSSROADS', beach: 'BEACH', guild: 'GUILD' }[z.id];
  const data = { image: result.image, upper: result.upper, width: W, height: H, fill: null, origin: z.origin, anims: result.anims, props, npcs, cellSize: 8, collision: grid.map((r) => r.join('')) };
  fs.writeFileSync(
    `src/shared/town/zones/${z.id}.generated.ts`,
    `// ARCHIVO GENERADO por tools/import-rom-town.mjs — no editar a mano.\n// Fuente: MAP_BG/${maps.map((m) => m.name).join(' + ')} de una ROM propia (capas, animaciones y colisión originales).\n// Colisión: rejilla de ${cols}×${rows} celdas de 8 px, '.' transitable y '#' bloqueado.\nimport type { ZoneMap } from '../zone';\n\nexport const ${NAME}_MAP: ZoneMap = ${JSON.stringify(data, null, 1)};\n`,
  );
  console.log(`✔ ${z.id}: ${maps.map((m) => m.name).join(' + ')} → ${W}×${H}, capa superior: ${result.upper ? 'sí' : 'no'}, ${result.anims.length} animaciones de ${nFrames} fotogramas, ${props.length} objetos, ${npcs.length} NPC (${npcs.map((n) => n.species).join(', ') || '-'})`);
}

for (const z of ZONES) if (!ONLY || ONLY === z.id) importZone(z);
