/**
 * Importa los números que salen sobre los Pokémon en la mazmorra (daño,
 * curación y fallo) de una ROM LEGÍTIMA de Exploradores del Cielo. Solo lee la
 * ROM; Pokerift no la incluye ni la distribuye.
 *
 *   npm run import:numbers -- <rom.nds>        (o un DUNGEON/dungeon.bin ya extraído)
 *
 * Dónde están (comprobado en la ROM USA):
 *  - DUNGEON/dungeon.bin 1007–1011: texturas WTE de 128×16, 4 bpp, sin paleta
 *    propia: «0»–«9», «+», «-» en celdas de 8×8 y la palabra de fallo
 *    (32×8, x = 96) en cada idioma: 1007 MISS, 1008 Ratê, 1009 FEHL,
 *    1010 NULLO, 1011 FALLO. Usamos la inglesa (MISS): el usuario recuerda «MISS»
 *    también en la versión española [INCIERTO].
 *  - DUNGEON/dungeon.bin 1024: WTE solo de paleta (16 filas de 16 colores).
 *    Los glifos usan el índice 1 (contorno) y 8/10/15 (degradado). La fila 3
 *    da el dorado (167,111,0 → 255,247,0 → blanco) de las capturas del juego y
 *    la fila 10, un verde. [INCIERTO] qué fila elige el juego para cada
 *    NUMBER_COLOR_* (pmdsky-debug: DisplayAnimatedNumbers); el dorado del daño
 *    coincide con las capturas, el verde de la curación no está comprobado.
 *
 * Genera:
 *   public/assets/ui/dmg-numbers.png              fila 0 = daño (dorado), fila 1 = curación (verde)
 *   src/client/assets/damage-numbers.generated.ts recorte de cada glifo
 * Opciones (pruebas): --png <archivo> --ts <archivo>.
 */
import { PNG } from 'pngjs';
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const opt = (name, def) => {
  const i = args.indexOf(name);
  return i >= 0 ? args.splice(i, 2)[1] : def;
};
const OUT_PNG = opt('--png', 'public/assets/ui/dmg-numbers.png');
const OUT_TS = opt('--ts', 'src/client/assets/damage-numbers.generated.ts');
const URL = opt('--url', 'assets/ui/dmg-numbers.png');
const input = args[0];
if (!input) {
  console.error('Uso: node tools/import-rom-numbers.mjs <rom.nds | dungeon.bin>');
  process.exit(1);
}

const TEXTURE = 1007;
const PALETTE = 1024;
const ROWS = { damage: 3, heal: 10 };
const CHARS = '0123456789+-';
const W = 128, H = 16, CELL = 8, MISS_X = 96, MISS_W = 32;

/** Archivo de la ROM de DS por ruta (tablas FNT/FAT de la cabecera). */
function romFile(rom, wanted) {
  const fnt = rom.readUInt32LE(0x40), fat = rom.readUInt32LE(0x48);
  let found = null;
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
      } else {
        if (prefix + name === wanted) found = fileId;
        fileId++;
      }
    }
  })(0xf000, '');
  if (found === null) throw new Error(`La ROM no tiene ${wanted}: ¿es Exploradores del Cielo?`);
  return rom.subarray(rom.readUInt32LE(fat + found * 8), rom.readUInt32LE(fat + found * 8 + 4));
}

/** Entrada de un pack (cabecera 0, número de archivos y tabla de desplazamiento/longitud). */
function packEntry(pack, i) {
  if (i >= pack.readUInt32LE(4)) throw new Error(`dungeon.bin no tiene la entrada ${i}`);
  const o = pack.readUInt32LE(8 + i * 8);
  return pack.subarray(o, o + pack.readUInt32LE(12 + i * 8));
}

/** WTE envuelto en SIR0: los punteros son desplazamientos dentro del archivo. */
function wte(d, what) {
  if (d.toString('latin1', 0, 4) !== 'SIR0') throw new Error(`${what}: no es SIR0`);
  const h = d.readUInt32LE(4);
  if (d.toString('latin1', h, h + 4) !== 'WTE\0') throw new Error(`${what}: no es WTE`);
  return {
    image: d.subarray(d.readUInt32LE(h + 4), d.readUInt32LE(h + 4) + d.readUInt32LE(h + 8)),
    dim: d[h + 0x0c],
    type: d[h + 0x0d],
    palette: [...Array(d.readUInt32LE(h + 0x1c)).keys()].map((k) => {
      const p = d.readUInt32LE(h + 0x18) + k * 4;
      return [d[p], d[p + 1], d[p + 2]];
    }),
  };
}

const file = fs.readFileSync(input);
const dungeonBin = file.toString('latin1', 0, 4) === '\0\0\0\0' ? file : romFile(file, 'DUNGEON/dungeon.bin');
const tex = wte(packEntry(dungeonBin, TEXTURE), `dungeon.bin ${TEXTURE}`);
const pal = wte(packEntry(dungeonBin, PALETTE), `dungeon.bin ${PALETTE}`).palette;
// 4 bpp (tipo 3) y 128×16 (dim: ancho 8<<3, alto 8<<1).
if (tex.type !== 3 || 8 << (tex.dim & 7) !== W || 8 << ((tex.dim >> 3) & 7) !== H || tex.image.length < (W * H) / 2)
  throw new Error(`dungeon.bin ${TEXTURE}: se esperaba una textura 4 bpp de ${W}×${H}`);
if (pal.length < 16 * (Math.max(...Object.values(ROWS)) + 1)) throw new Error(`dungeon.bin ${PALETTE}: paleta demasiado corta`);
const px = (x, y) => {
  const b = tex.image[(y * W + x) >> 1];
  return x & 1 ? b >> 4 : b & 15;
};

// Hoja: una franja de 128×8 por color.
const out = new PNG({ width: W, height: CELL * 2 });
Object.values(ROWS).forEach((row, r) => {
  for (let y = 0; y < CELL; y++)
    for (let x = 0; x < W; x++) {
      const v = px(x, y);
      if (!v) continue;
      out.data.set([...pal[row * 16 + v], 255], ((r * CELL + y) * W + x) * 4);
    }
});

// Recorte horizontal de cada glifo (columnas con algún píxel).
const trim = (x0, w) => {
  let a = Infinity, b = -1;
  for (let x = x0; x < x0 + w; x++) for (let y = 0; y < CELL; y++) if (px(x, y)) (a = Math.min(a, x)), (b = Math.max(b, x));
  if (b < 0) throw new Error(`glifo vacío en x=${x0}`);
  return { x: a, w: b - a + 1 };
};
const glyphs = Object.fromEntries([...CHARS].map((c, i) => [c, trim(i * CELL, CELL)]));
const miss = trim(MISS_X, MISS_W);

fs.mkdirSync(path.dirname(OUT_PNG), { recursive: true });
fs.writeFileSync(OUT_PNG, PNG.sync.write(out));
fs.mkdirSync(path.dirname(OUT_TS), { recursive: true });
fs.writeFileSync(
  OUT_TS,
  `// ARCHIVO GENERADO por tools/import-rom-numbers.mjs — no editar a mano.
// Fuente: DUNGEON/dungeon.bin ${TEXTURE} (glifos, «MISS») y ${PALETTE} (paleta) de una ROM propia.

export interface RomNumbers {
  url: string;
  /** Alto de cada franja; fila 0 = daño, fila 1 = curación. */
  height: number;
  rows: { damage: number; heal: number };
  /** Recorte horizontal de cada glifo dentro de su franja. */
  glyphs: Record<string, { x: number; w: number }>;
  /** Palabra de fallo («MISS»). */
  miss: { x: number; w: number };
}

export const ROM_NUMBERS: RomNumbers | null = ${JSON.stringify({ url: URL, height: CELL, rows: { damage: 0, heal: 1 }, glyphs, miss }, null, 1)};
`,
);
console.log(`Números importados: ${OUT_PNG}, ${OUT_TS}`);
