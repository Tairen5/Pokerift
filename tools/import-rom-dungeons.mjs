/**
 * Importa de una ROM LEGÍTIMA de Exploradores del Cielo (USA) la expedición de 25 pisos de
 * Pokerift: las 5 primeras mazmorras de la historia, 5 pisos de cada una. Solo lee la ROM.
 *
 *   npm run import:dungeons -- <rom.nds>
 *
 * Qué se lee (formatos según SkyTemple / pmdsky-debug, comprobados en la ROM USA):
 *  - arm9, DUNGEON_DATA_LIST (NA 0x209E3A0, 4 bytes por mazmorra: pisos, lista de mappa_s.bin,
 *    pisos previos del grupo, pisos del grupo): qué lista de pisos usa cada mazmorra.
 *  - BALANCE/mappa_s.bin (SIR0): listas de pisos (18 bytes por piso: índices de propiedades,
 *    Pokémon, trampas y objetos), propiedades del piso (32 bytes, struct floor_properties),
 *    Pokémon (8 bytes: nivel×512, peso acumulado, peso en Casa de Monstruos, nº de ficha),
 *    trampas (25 pesos) y objetos (categorías y objetos, pesos acumulados codificados con saltos).
 *  - DUNGEON/dungeon.bin: tileset de cada mazmorra. DMA 170+t (SIR0 + AT4PX: 3 variantes de
 *    bloque por tipo —pared, agua, suelo— y vecinos iguales S, SE, E, NE, N, NW, W, SW), DPC
 *    340+t (AT4PX: bloques de 3×3 teselas), DPCI 510+t (AT4PX: teselas 8×8 a 4 bpp) y DPL 680+t
 *    (12 paletas de 16 colores RGBX).
 *  - MESSAGE/text_e.str: nombres en inglés de los Pokémon (8734 + ficha) para la clave de especie.
 *
 * Elección de pisos: 5 pisos repartidos por igual entre el primero y el último normal de cada
 * mazmorra (sin las salas fijas de los jefes), para que el tramo recorra todos sus enemigos.
 *
 * Genera:
 *   public/assets/tilesets/eos-<t>.png/.json   atlas de autotiles (formato de render/tilemap.ts)
 *   src/shared/data/expedition.rom.generated.ts ROM_EXPEDITION (tramos con sus pisos)
 * Opciones (pruebas): --out <carpeta public> --ts <archivo>.
 */
import { PNG } from 'pngjs';
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const opt = (name, def) => {
  const i = args.indexOf(name);
  return i >= 0 ? args.splice(i, 2)[1] : def;
};
const PUBLIC = opt('--out', 'public');
const TS = opt('--ts', 'src/shared/data/expedition.rom.generated.ts');
const input = args[0];
if (!input) {
  console.error('Uso: node tools/import-rom-dungeons.mjs <rom.nds>');
  process.exit(1);
}

// Las 5 primeras mazmorras de la historia de EoS (id de DUNGEON_DATA_LIST) y su nombre en
// español (WikiDex, «Territorios de Pokémon Mundo misterioso: Exploradores del cielo»).
const SEGMENTS = [
  { id: 'beachCave', dungeon: 1, name: 'Cueva Bajamar' },
  { id: 'drenchedBluff', dungeon: 3, name: 'Risco Calado' },
  { id: 'mtBristle', dungeon: 4, name: 'Monte Árido' },
  { id: 'waterfallCave', dungeon: 6, name: 'Cueva Cascada' },
  { id: 'appleWoods', dungeon: 7, name: 'Manzanar' },
];
const FLOORS_PER_SEGMENT = 5;
const LAYOUTS = ['large', 'small', 'oneRoomMonsterHouse', 'outerRing', 'crossroads', 'twoRoomsMonsterHouse', 'line', 'cross', 'large0x8', 'beetle', 'outerRooms', 'medium'];
const TRAPS = ['null', 'mud', 'sticky', 'grimy', 'summon', 'pitfall', 'warp', 'gust', 'spin', 'slumber', 'slow', 'seal', 'poison', 'selfdestruct', 'explosion', 'ppZero', 'chestnut', 'wonderTile', 'pokemon', 'spiked', 'stealthRock', 'toxicSpikes', 'trip', 'random', 'grudge'];

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
    if (id === undefined) throw new Error(`La ROM no tiene ${name}`);
    return rom.subarray(rom.readUInt32LE(fat + id * 8), rom.readUInt32LE(fat + id * 8 + 4));
  };
}

/** arm9 descomprimido (BLZ con el final comprimido en los parámetros del módulo). */
function arm9(romBuf) {
  const off = romBuf.readUInt32LE(0x20), ram = romBuf.readUInt32LE(0x28), size = romBuf.readUInt32LE(0x2c);
  let a = romBuf.subarray(off, off + size);
  const magic = a.indexOf(Buffer.from([0xde, 0xc0, 0x06, 0x21]));
  const compEnd = magic > 0 ? a.readUInt32LE(magic - 0x1c + 0x14) : 0;
  if (compEnd) {
    const d = a.subarray(0, compEnd - ram);
    const tail = d.readUInt32LE(d.length - 8), extra = d.readUInt32LE(d.length - 4);
    const out = Buffer.alloc(d.length + extra);
    d.copy(out);
    let src = d.length - (tail >>> 24), dst = out.length;
    const end = d.length - (tail & 0xffffff);
    while (src > end) {
      let flags = d[--src];
      for (let i = 0; i < 8 && src > end; i++, flags <<= 1) {
        if (flags & 0x80) {
          const b1 = d[--src], b0 = d[--src], len = (b1 >> 4) + 3, disp = (((b1 & 15) << 8) | b0) + 3;
          for (let k = 0; k < len; k++) (out[dst - 1] = out[dst - 1 + disp]), dst--;
        } else out[--dst] = d[--src];
      }
    }
    a = Buffer.concat([out, a.subarray(compEnd - ram)]);
  }
  return { a, ram };
}

/** Descompresión PX (AT4PX/PKDPX). */
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
const sir0 = (d) => (d.toString('latin1', 0, 4) === 'SIR0' ? d.subarray(d.readUInt32LE(4)) : d);

const romBuf = fs.readFileSync(input);
if (romBuf.toString('latin1', 0x0c, 0x10) !== 'C2SE') throw new Error('Solo se conocen las direcciones de la ROM USA (C2SE).');
const file = romFiles(romBuf);

// ── Nombres ──
const text = file('MESSAGE/text_e.str');
const str = (i) => text.toString('latin1', text.readUInt32LE(i * 4), text.readUInt32LE(i * 4 + 4) - 1);
if (str(8735) !== 'Bulbasaur') throw new Error('text_e.str: la tabla de nombres de Pokémon no está donde se esperaba');
const speciesKey = (md) => {
  const name = str(8734 + (md % 600)).normalize('NFD').replace(/[^\w\s]/g, '').trim();
  return name.split(/\s+/).map((w, i) => (i ? w[0].toUpperCase() + w.slice(1).toLowerCase() : w.toLowerCase())).join('');
};
const itemsCatalog = JSON.parse(fs.readFileSync(path.join(PUBLIC, 'assets/items/eos/items.json'), 'utf8')).items;
const itemById = new Map(itemsCatalog.map((it) => [it.id, it]));
const camel = (snake) => snake.replace(/_(\w)/g, (_, c) => c.toUpperCase());

// ── mappa_s.bin ──
const mappa = file('BALANCE/mappa_s.bin');
const sub = mappa.readUInt32LE(4);
const H = { list: mappa.readUInt32LE(sub), layout: mappa.readUInt32LE(sub + 4), items: mappa.readUInt32LE(sub + 8), mons: mappa.readUInt32LE(sub + 12), traps: mappa.readUInt32LE(sub + 16) };
const nLists = (H.layout - H.list) / 4;
const floorList = (i) => {
  const p = mappa.readUInt32LE(H.list + i * 4), end = i + 1 < nLists ? mappa.readUInt32LE(H.list + (i + 1) * 4) : H.list;
  const out = [];
  for (let q = p + 18; q + 18 <= end; q += 18) out.push([...Array(9)].map((_, k) => mappa.readUInt16LE(q + k * 2)));
  return out;
};
const layout = (i) => {
  const p = H.layout + 32 * i, m = mappa;
  return {
    layout: LAYOUTS[m[p]] ?? 'large', // 12–15 (sin uso) caen en la rama por defecto del juego: normal.
    roomDensity: m.readInt8(p + 1), tileset: m[p + 2], weather: m[p + 4], floorConnectivity: m[p + 5], enemyDensity: m.readInt8(p + 6),
    kecleonShopChance: m[p + 7], monsterHouseChance: m[p + 8], allowDeadEnds: !!m[p + 11], roomImperfections: !!(m[p + 13] & 4),
    secondaryTerrain: !!(m[p + 13] & 1), itemDensity: m[p + 15], trapDensity: m[p + 16], fixedRoom: m[p + 18], extraHallways: m[p + 19],
    buriedItemDensity: m[p + 20], waterDensity: m[p + 21], darkness: m[p + 22], maxCoin: m[p + 23] * 5,
    music: floorMusic(m[p + 3]),
  };
};
/** Pesos acumulados (hasta 10000) → pesos individuales. */
const fromCumulative = (list) => {
  let prev = 0;
  return list.map((e) => {
    const w = e.cum === 0xffff ? 0 : Math.max(0, e.cum - prev);
    if (e.cum && e.cum !== 0xffff) prev = e.cum;
    return { ...e, weight: w };
  });
};
const monsters = (i) => {
  const out = [];
  for (let p = mappa.readUInt32LE(H.mons + i * 4); mappa.readUInt16LE(p + 6); p += 8)
    out.push({ md: mappa.readUInt16LE(p + 6), level: mappa.readUInt16LE(p) / 512, cum: mappa.readUInt16LE(p + 2) });
  // Kecleon (tiendero) y «Decoy» tienen peso 0: no aparecen como enemigos normales.
  return fromCumulative(out).filter((m) => m.weight > 0).map((m) => ({ species: speciesKey(m.md), md: m.md, level: m.level, weight: m.weight }));
};
const traps = (i) => {
  const p = mappa.readUInt32LE(H.traps + i * 4);
  return TRAPS.map((t, k) => ({ trap: t, weight: mappa.readUInt16LE(p + k * 2) })).filter((t) => t.weight > 0);
};
const items = (i) => {
  let p = mappa.readUInt32LE(H.items + i * 4);
  const cats = [], its = [];
  for (let id = 0, inCats = true; id <= 363; ) {
    const v = mappa.readUInt16LE(p);
    p += 2;
    if (v > 0x7530 && v !== 0xffff) id += v - 0x7530;
    else {
      (inCats ? cats : its).push({ id, cum: v });
      id++;
    }
    if (inCats && id >= 0xf) (inCats = false), (id -= 0x10);
  }
  // Probabilidad de cada objeto = peso de su categoría × peso dentro de la categoría.
  const catW = new Map(fromCumulative(cats).map((c) => [c.id, c.weight]));
  const byCat = new Map();
  for (const it of its) {
    const cat = itemById.get(it.id)?.category;
    if (cat === undefined) continue;
    if (!byCat.has(cat)) byCat.set(cat, []);
    byCat.get(cat).push(it);
  }
  const out = [];
  for (const [cat, list] of byCat)
    for (const it of fromCumulative(list)) {
      const w = ((catW.get(cat) ?? 0) * it.weight) / 10000;
      if (w > 0) out.push({ item: camel(itemById.get(it.id).key), romId: it.id, weight: Math.round(w) });
    }
  return out.sort((a, b) => b.weight - a.weight);
};

// ── Música del piso ──
// floor_properties 0x3 indexa MUSIC_ID_TABLE (overlay 10, NA 0x22C555C: 170 music_id de 16 bits);
// con el bit 0x8000 es una fila de RANDOM_MUSIC_ID_TABLE (NA 0x22C51FC: 30×4), de la que el juego
// elige al azar (pmdsky-debug, symbols/overlay10.yml). music_id = número de SOUND/BGM/bgmNNNN.smd.
function overlay(romBuf, n) {
  const e = romBuf.readUInt32LE(0x50) + n * 32, fatOff = romBuf.readUInt32LE(0x48), id = romBuf.readUInt32LE(e + 24);
  if (romBuf.readUInt32LE(e + 28) & 0x01000000) throw new Error(`overlay ${n} comprimida: no soportado`);
  return { ram: romBuf.readUInt32LE(e + 4), data: romBuf.subarray(romBuf.readUInt32LE(fatOff + id * 8), romBuf.readUInt32LE(fatOff + id * 8 + 4)) };
}
const ov10 = overlay(romBuf, 10);
function floorMusic(idx) {
  const id = ov10.data.readUInt16LE(0x22c555c - ov10.ram + idx * 2);
  // [INCIERTO] Pisos con música al azar: se toma la primera de su fila (no los hay en la expedición).
  return id & 0x8000 ? ov10.data.readUInt16LE(0x22c51fc - ov10.ram + (id & 0x7fff) * 8) : id;
}

// ── DUNGEON_DATA_LIST ──
const { a: arm, ram } = arm9(romBuf);
const dungeonEntry = (id) => {
  const p = 0x209e3a0 - ram + id * 4;
  return { floors: arm[p], mappaList: arm[p + 1], preceding: arm[p + 2] };
};

// ── Tilesets ──
const pack = file('DUNGEON/dungeon.bin');
const packEntry = (i) => {
  const o = pack.readUInt32LE(8 + i * 8), l = pack.readUInt32LE(12 + i * 8);
  return pack.subarray(o, o + l);
};
// Bits de render/tilemap.ts (N, NE, E, SE, S, SW, W, NW) → bits del DMA (S=1, SE=2, E=4, NE=8, N=16, NW=32, W=64, SW=128).
const DMA_BIT = [0x10, 0x08, 0x04, 0x02, 0x01, 0x80, 0x40, 0x20];
const normalizeMask = (m) => {
  const has = (b) => (m >> b) & 1;
  if (!(has(0) && has(2))) m &= ~(1 << 1);
  if (!(has(2) && has(4))) m &= ~(1 << 3);
  if (!(has(4) && has(6))) m &= ~(1 << 5);
  if (!(has(6) && has(0))) m &= ~(1 << 7);
  return m;
};
function buildTileset(t) {
  const dma = unpx(Buffer.from(sir0(packEntry(170 + t))));
  const dpc = unpx(packEntry(340 + t)), dpci = unpx(packEntry(510 + t)), dpl = packEntry(680 + t);
  const pal = (i) => [dpl[i * 4], dpl[i * 4 + 1], dpl[i * 4 + 2]];
  const masks = [...new Set([...Array(256).keys()].map(normalizeMask))];
  const used = new Map(); // bloque → posición en el atlas
  const terrains = { wall: {}, ground: {}, water: {} };
  const TYPE = { wall: 0, water: 0x100, ground: 0x200 };
  for (const [terrain, base] of Object.entries(TYPE))
    for (const m of masks) {
      let dm = 0;
      for (let b = 0; b < 8; b++) if (m & (1 << b)) dm |= DMA_BIT[b];
      const idx = (base + dm) * 3;
      terrains[terrain][m] = [...new Set([dma[idx], dma[idx + 1], dma[idx + 2]])].map((c) => {
        if (!used.has(c)) used.set(c, used.size);
        return used.get(c);
      });
    }
  const COLS = 16, TS = 24;
  const png = new PNG({ width: COLS * TS, height: Math.ceil(used.size / COLS) * TS });
  for (const [chunk, n] of used) {
    const ox = (n % COLS) * TS, oy = Math.floor(n / COLS) * TS;
    for (let i = 0; i < 9; i++) {
      const e = dpc.readUInt16LE((chunk * 9 + i) * 2);
      const tile = e & 0x3ff, hf = e & 0x400, vf = e & 0x800, row = e >> 12;
      for (let y = 0; y < 8; y++)
        for (let x = 0; x < 8; x++) {
          const sx = hf ? 7 - x : x, sy = vf ? 7 - y : y;
          const byte = dpci[tile * 32 + sy * 4 + (sx >> 1)] ?? 0, v = sx & 1 ? byte >> 4 : byte & 15;
          const [r, g, b] = pal(row * 16 + v);
          const k = ((oy + Math.floor(i / 3) * 8 + y) * png.width + ox + (i % 3) * 8 + x) * 4;
          png.data[k] = r; png.data[k + 1] = g; png.data[k + 2] = b; png.data[k + 3] = 255;
        }
    }
  }
  const at = (n) => [(n % COLS) * TS, Math.floor(n / COLS) * TS];
  const atlas = { tileSize: TS, source: `dungeon.bin tileset ${t}`, terrains: {} };
  for (const [terrain, table] of Object.entries(terrains)) atlas.terrains[terrain] = Object.fromEntries(Object.entries(table).map(([m, list]) => [m, list.map(at)]));
  const dir = path.join(PUBLIC, 'assets/tilesets');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, `eos-${t}.png`), PNG.sync.write(png));
  fs.writeFileSync(path.join(dir, `eos-${t}.json`), JSON.stringify(atlas));
  return { key: `eos-${t}`, chunks: used.size };
}

// ── Expedición ──
const segments = [];
const tilesets = new Set();
for (const seg of SEGMENTS) {
  const de = dungeonEntry(seg.dungeon);
  const fl = floorList(de.mappaList).slice(de.preceding, de.preceding + de.floors);
  // Pisos normales (sin sala fija de jefe).
  const normal = fl.map((f, i) => ({ f, i })).filter(({ f }) => !layout(f[0]).fixedRoom);
  const picks = [...Array(FLOORS_PER_SEGMENT).keys()].map((k) => normal[Math.round((k * (normal.length - 1)) / (FLOORS_PER_SEGMENT - 1))]);
  const floors = picks.map(({ f, i }) => {
    const props = layout(f[0]);
    tilesets.add(props.tileset);
    return { sourceFloor: i + 1, ...props, enemies: monsters(f[1]), traps: traps(f[2]), items: items(f[3]) };
  });
  segments.push({ id: seg.id, name: seg.name, tileset: `eos-${floors[0].tileset}`, sourceFloors: de.floors, floors });
  console.log(`${seg.name}: pisos ${floors.map((f) => f.sourceFloor).join(', ')} de ${de.floors}; enemigos ${[...new Set(floors.flatMap((f) => f.enemies.map((e) => e.species)))].join(', ')}`);
}
for (const t of tilesets) {
  const r = buildTileset(t);
  console.log(`Tileset ${r.key}: ${r.chunks} bloques`);
}

fs.writeFileSync(
  TS,
  `// ARCHIVO GENERADO por tools/import-rom-dungeons.mjs — no editar a mano.
// Fuente: BALANCE/mappa_s.bin, DUNGEON_DATA_LIST (arm9) y MESSAGE/text_e.str de una ROM propia (USA).

export interface RomExpeditionFloor {
  /** Piso de la mazmorra original del que salen los datos. */
  sourceFloor: number;
  layout: string;
  roomDensity: number;
  tileset: number;
  weather: number;
  floorConnectivity: number;
  enemyDensity: number;
  kecleonShopChance: number;
  monsterHouseChance: number;
  allowDeadEnds: boolean;
  roomImperfections: boolean;
  secondaryTerrain: boolean;
  itemDensity: number;
  trapDensity: number;
  fixedRoom: number;
  extraHallways: number;
  buriedItemDensity: number;
  waterDensity: number;
  darkness: number;
  maxCoin: number;
  /** Música del piso (music_id = SOUND/BGM/bgmNNNN.smd). */
  music: number;
  enemies: { species: string; md: number; level: number; weight: number }[];
  traps: { trap: string; weight: number }[];
  items: { item: string; romId: number; weight: number }[];
}

export interface RomExpeditionSegment {
  id: string;
  name: string;
  tileset: string;
  /** Pisos normales de la mazmorra original. */
  sourceFloors: number;
  floors: RomExpeditionFloor[];
}

export const ROM_EXPEDITION: RomExpeditionSegment[] | null = ${JSON.stringify(segments, null, 1)};
`,
);
console.log(`Escrito ${TS}`);
