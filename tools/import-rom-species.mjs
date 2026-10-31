/**
 * Importa de una ROM LEGÍTIMA de Exploradores del Cielo los datos reales de las
 * especies del juego (solo la lee; Pokerift no la incluye ni la distribuye):
 *
 *   npm run import:species -- <rom.nds>
 *
 *  - BALANCE/monster.md: una ficha de 0x44 bytes por especie y género (formato de
 *    SkyTemple, skytemple_files/data/md): nº de Pokédex (0x04), tipos (0x14, 0x15),
 *    habilidades (0x18, 0x19), experiencia que da (0x1C) y estadísticas a nivel 1
 *    (PS 0x20, Ataque 0x24, At. Esp. 0x25, Defensa 0x26, Def. Esp. 0x27).
 *  - BALANCE/m_level.bin: paquete con una entrada por ficha (índice = ficha − 1, como
 *    SkyTemple), SIR0 + PKDPX: 100 niveles × 12 bytes (exp TOTAL para el nivel, i32;
 *    subida de PS u16 y de Ataque, At. Esp., Defensa y Def. Esp. u8). Las líneas
 *    evolutivas comparten tabla.
 *  - BALANCE/waza_p.bin: movimientos por nivel de cada ficha (pares move_id, nivel en
 *    enteros de 7 bits, como los punteros SIR0). Solo se guardan los movimientos que
 *    existen en Pokerift; el resto queda en el informe.
 *
 *  - arm9, STARTER_MOVES_ARRAY (pmdsky-debug; NA 0x20A3258): movimiento de huevo que el
 *    juego da a algunos iniciales al empezar (AddStarterEggMove), p. ej. Hipnosis a Meowth.
 *    Solo ROM USA (la dirección cambia con la región).
 *
 * Genera src/shared/data/species.rom.generated.ts (se aplica sobre species.ts).
 * Opción --ts <archivo> (pruebas).
 */
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const opt = (name, def) => {
  const i = args.indexOf(name);
  return i >= 0 ? args.splice(i, 2)[1] : def;
};
const TS = opt('--ts', 'src/shared/data/species.rom.generated.ts');
const REGISTRY = opt('--registry', 'src/client/assets/moveFx.ts');
const input = args[0];
if (!input) {
  console.error('Uso: node tools/import-rom-species.mjs <rom.nds>');
  process.exit(1);
}

/** Especie de Pokerift → nº de Pokédex (se usa la ficha del primer género). */
const DEX = {
  bulbasaur: 1, charmander: 4, squirtle: 7, pikachu: 25, meowth: 52, chikorita: 152, cyndaquil: 155, totodile: 158,
  treecko: 252, torchic: 255, mudkip: 258, pidgey: 16, sunkern: 191, wurmple: 265, exeggcute: 102,
  // Enemigos de la expedición (Cueva Bajamar, Risco Calado, Monte Árido, Cueva Cascada, Manzanar).
  shellder: 90, kabuto: 140, corsola: 222, shellos: 422, lileep: 345, anorith: 347, chingling: 433,
  machop: 66, geodude: 74, doduo: 84, spinarak: 167, starly: 396, nidorina: 30, nidorino: 33,
  psyduck: 54, poliwag: 60, grimer: 88, tangela: 114, wooper: 194, lotad: 270, surskit: 283, barboach: 339, whiscash: 340,
  caterpie: 10, butterfree: 12, oddish: 43, paras: 46, hoppip: 187, budew: 406, burmy: 412, weedle: 13,
  exeggutor: 103, gloom: 44, combee: 415, kakuna: 14, beedrill: 15,
};
/** enum type_id de pmdsky-debug → tipo de Pokerift. */
const TYPES = [null, 'normal', 'fire', 'water', 'grass', 'electric', 'ice', 'fighting', 'poison', 'ground', 'flying', 'psychic', 'bug', 'rock', 'ghost', 'dragon', 'dark', 'steel'];
/** enum ability_id de pmdsky-debug (solo las de nuestras especies) → habilidad de Pokerift. */
const ABILITIES = {
  1: 'stench', 3: 'rainDish', 7: 'rockHead', 12: 'battleArmor', 13: 'sturdy', 14: 'suctionCups', 16: 'torrent', 17: 'guts', 19: 'shellArmor',
  20: 'naturalCure', 21: 'damp', 26: 'overgrow', 27: 'swiftSwim', 30: 'keenEye', 32: 'static', 33: 'shedSkin', 36: 'waterAbsorb', 39: 'poisonPoint',
  41: 'oblivious', 43: 'runAway', 44: 'stickyHold', 45: 'cloudNine', 47: 'earlyBird', 48: 'hustle', 51: 'compoundeyes', 54: 'insomnia', 55: 'levitate',
  61: 'effectSpore', 67: 'swarm', 70: 'blaze', 71: 'pickup', 74: 'chlorophyll', 76: 'shieldDust', 85: 'drySkin', 86: 'anticipation', 90: 'solarPower',
  91: 'skillLink', 98: 'tangledFeet', 100: 'technician', 104: 'rivalry', 106: 'noGuard', 117: 'honeyGather', 122: 'stormDrain', 123: 'leafGuard',
};

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

/** Compresión PX (PKDPX): bit de control a 1 = byte literal; si no, patrón de nibbles o copia hacia atrás. */
function pkdpx(d) {
  if (d.toString('latin1', 0, 5) !== 'PKDPX') throw new Error('no es PKDPX');
  const len = d.readUInt16LE(5), flags = [...d.subarray(7, 16)], size = d.readUInt32LE(16), c = d.subarray(0x14, len), o = [];
  let p = 0;
  while (p < c.length) {
    const ctrl = c[p++];
    for (let b = 0; b < 8 && p < c.length; b++) {
      if (ctrl & (0x80 >> b)) {
        o.push(c[p++]);
        continue;
      }
      const nb = c[p++], hi = nb >> 4, lo = nb & 15, fi = flags.indexOf(hi);
      if (fi === 0) o.push((lo << 4) | lo, (lo << 4) | lo);
      else if (fi > 0) {
        let base = lo;
        if (fi === 1) base = (base + 1) & 15;
        if (fi === 5) base = (base - 1) & 15;
        const n = [base, base, base, base];
        if (fi <= 4) n[fi - 1] = (n[fi - 1] - 1) & 15;
        else n[fi - 5] = (n[fi - 5] + 1) & 15;
        o.push((n[0] << 4) | n[1], (n[2] << 4) | n[3]);
      } else {
        const back = 4096 - (lo << 8) - c[p++], st = o.length - back;
        for (let i = 0; i < hi + 3; i++) o.push(o[st + (i % back)]);
      }
    }
  }
  if (o.length !== size) throw new Error(`PKDPX: ${o.length} bytes, se esperaban ${size}`);
  return Buffer.from(o);
}

const romBuf = fs.readFileSync(input);
const file = romFiles(romBuf);

/** arm9 descomprimido (BLZ, final comprimido en los parámetros del módulo, nitrocode 0x2106C0DE). */
function arm9() {
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
/** Movimiento de huevo de los iniciales: nº de ficha → move_id. */
const eggMoves = new Map();
if (romBuf.toString('latin1', 0x0c, 0x10) === 'C2SE') {
  const { a, ram } = arm9();
  for (let p = 0x20a3258 - ram; ; p += 4) {
    const mon = a.readUInt16LE(p), mv = a.readUInt16LE(p + 2);
    if (!mon) break;
    eggMoves.set(mon, mv);
  }
} else console.warn('Movimientos de huevo de los iniciales: solo se conoce la dirección de la ROM USA (C2SE).');
const md = file('BALANCE/monster.md');
if (md.toString('latin1', 0, 2) !== 'MD') throw new Error('BALANCE/monster.md: no es MD');
const mdCount = md.readUInt32LE(4);
const lvBin = file('BALANCE/m_level.bin');
const waza = file('BALANCE/waza_p.bin');
const wDp = waza.readUInt32LE(4), wLearn = waza.readUInt32LE(wDp + 4);
const ints = (p) => {
  const out = [];
  for (let buf = 0; ; p++) {
    const b = waza[p];
    if (b === 0 && buf === 0) break;
    buf |= b & 0x7f;
    if (b & 0x80) buf <<= 7;
    else (out.push(buf), (buf = 0));
  }
  return out;
};

// move_id del juego → id de Pokerift (registro de efectos, que lleva el eosMoveId de cada movimiento).
const reg = fs.readFileSync(REGISTRY, 'utf8');
const ourMoves = new Map();
for (const m of reg.matchAll(/^\s+(\w+): (?:visual\((\d+),|\{\n\s+eosMoveId: (\d+),)/gm)) ourMoves.set(Number(m[2] ?? m[3]), m[1]);

const out = {};
const report = [];
for (const [species, dex] of Object.entries(DEX)) {
  let idx = -1;
  for (let i = 0; i < mdCount; i++) if (md.readUInt16LE(8 + i * 0x44 + 4) === dex) { idx = i; break; }
  if (idx < 0) throw new Error(`monster.md: no hay ficha del nº ${dex} (${species})`);
  const s = 8 + idx * 0x44;
  const types = [TYPES[md[s + 0x14]], TYPES[md[s + 0x15]]].filter(Boolean);
  const abilities = [md[s + 0x18], md[s + 0x19]].filter((a) => a).map((a) => ABILITIES[a] ?? `ability${a}`);
  const baseStats = { hp: md.readUInt16LE(s + 0x20), atk: md[s + 0x24], spAtk: md[s + 0x25], def: md[s + 0x26], spDef: md[s + 0x27] };
  // Crecimiento por nivel.
  const ei = idx - 1, eo = lvBin.readUInt32LE(8 + ei * 8), el = lvBin.readUInt32LE(12 + ei * 8);
  const entry = lvBin.subarray(eo, eo + el);
  if (entry.toString('latin1', 0, 4) !== 'SIR0') throw new Error(`m_level.bin ${ei}: no es SIR0`);
  const lv = pkdpx(entry.subarray(entry.readUInt32LE(4)));
  if (lv.length < 100 * 12) throw new Error(`m_level.bin ${ei}: ${lv.length} bytes`);
  const rows = Array.from({ length: 100 }, (_, l) => {
    const o = l * 12;
    return { exp: lv.readInt32LE(o), hp: lv.readUInt16LE(o + 4), atk: lv[o + 6], spAtk: lv[o + 7], def: lv[o + 8], spDef: lv[o + 9] };
  });
  // Movimientos por nivel.
  const pLu = waza.readUInt32LE(wLearn + idx * 12);
  const raw = pLu ? ints(pLu) : [];
  const learnset = [], missing = [];
  for (let k = 0; k + 1 < raw.length; k += 2) {
    const id = ourMoves.get(raw[k]);
    if (id) learnset.push({ level: raw[k + 1], move: id });
    else missing.push(`${raw[k]}@${raw[k + 1]}`);
  }
  const egg = eggMoves.has(idx) ? ourMoves.get(eggMoves.get(idx)) : undefined;
  if (eggMoves.has(idx) && !egg) missing.push(`huevo ${eggMoves.get(idx)}`);
  out[species] = { mdIndex: idx, dex, types, abilities, baseStats, baseExp: md.readUInt16LE(s + 0x1c), growth: { kind: 'table', rows }, learnset, ...(egg ? { starterEggMove: egg } : {}) };
  report.push(`  ${species.padEnd(11)} ficha ${idx}: ${types.join('/')} · ${abilities.join('/')} · PS ${baseStats.hp} A ${baseStats.atk} AE ${baseStats.spAtk} D ${baseStats.def} DE ${baseStats.spDef} · exp ${md.readUInt16LE(s + 0x1c)} · aprende ${learnset.map((l) => `${l.move}@${l.level}`).join(', ')}${egg ? ` + huevo ${egg}` : ''}${missing.length ? ` (+${missing.length} movimientos que no están en Pokerift)` : ''}`);
}

fs.mkdirSync(path.dirname(TS), { recursive: true });
fs.writeFileSync(
  TS,
  `// ARCHIVO GENERADO por tools/import-rom-species.mjs — no editar a mano.\n` +
    `// Fuente: BALANCE/monster.md, m_level.bin y waza_p.bin de una ROM propia de Exploradores del Cielo.\n` +
    `import type { SpeciesData } from './species';\n\n` +
    `/** Datos reales por especie de Pokerift (se aplican sobre los provisionales de species.ts). */\n` +
    `export const ROM_SPECIES: Record<string, Pick<SpeciesData, 'types' | 'abilities' | 'baseStats' | 'baseExp' | 'growth' | 'learnset' | 'starterEggMove'> & { mdIndex: number; dex: number }> = ${JSON.stringify(out)};\n`,
);
console.log(`Especies importadas (${Object.keys(out).length}):\n${report.join('\n')}\n→ ${TS}`);
