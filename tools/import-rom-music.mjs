/**
 * Importa la música (BGM) de una ROM LEGÍTIMA de Exploradores del Cielo (solo la lee;
 * Pokerift no la incluye ni la distribuye) y la sintetiza a MP3 con su punto de bucle.
 *
 *   npm run import:music -- <rom.nds> [--only 9,21] [--wav] [--check]
 *   (--wav: copia WAV en smoke-output/; --check: compara la altura de cada instrumento con la nota pedida)
 *
 * El juego no guarda la música grabada: usa el driver DSE (Procyon Studios). Cada pista
 * es una secuencia SOUND/BGM/bgmNNNN.smd (como un MIDI) con su banco de instrumentos
 * bgmNNNN.swd (tabla de muestras «wavi» + programas «prgi»); los datos de audio están
 * en el banco principal SOUND/BGM/bgm.swd («pcmd»). Aquí se interpreta la secuencia y
 * se toca con esas muestras (IMA ADPCM y PCM de 16 bits), sus envolventes y volúmenes.
 *
 * Fuentes del formato: Project Pokémon (psy_commando), «DSE SWDL Format» y «DSE SMDL
 * Format»; ppmdu_2 (PsyCommando, src/dse: lectura de notas, pausas y duraciones);
 * pmdsky-debug (arm9: MUSIC_DURATION_LOOKUP_TABLE_1/2 en 0x20B0F50/0x20B1050 NA, las
 * duraciones de las envolventes, que se leen de la ROM).
 *
 * Afinación: la altura sale solo de la nota raíz de cada «split» (como ppmdu_2). ctune y ftune
 * (1/256 de semitono) no la cambian: codifican la frecuencia de la muestra respecto a 32 728 Hz
 * (muestra 121: 32728·2^((−7+87/256)/12) = 22 275 Hz; su campo de frecuencia dice 22 276) [VERIFICADO].
 * Con --check, cada instrumento suena a su nota o justo una octava por debajo (así están
 * etiquetadas las muestras en el juego: ningún campo de la muestra ni del split lo distingue).
 *
 * [INCIERTO] Lo que no está documentado y se aproxima:
 *  - Volumen: producto lineal de velocidad, volumen y expresión de pista, volumen del
 *    programa y del split (el driver usa una tabla de decibelios cuyo uso no se conoce).
 *  - Pitch bend (0xD7): 16 bits con signo; rango 0xDB o el byte 0x02 del split, o 2 semitonos.
 *  - Envolvente: lineal entre niveles (atkvol → 127 → sustain → 0); duraciones en ms.
 *  - Sin LFO (vibrato/trémolo), sin límite de voces ni grupos de teclas.
 *  - Mezcla a 32 000 Hz (la DS mezcla a ~32 728 Hz).
 *
 * Genera public/assets/music/bgmNNNN.mp3 y src/client/assets/music.generated.ts.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createMp3Encoder } from 'wasm-media-encoders';

const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? (args.splice(i, 1), true) : false;
};
const opt = (name, def) => {
  const i = args.indexOf(name);
  return i >= 0 ? args.splice(i, 2)[1] : def;
};
const WAV = flag('--wav');
const CHECK = flag('--check');
const ONLY = opt('--only', null);
const input = args[0];
if (!input) {
  console.error('Uso: node tools/import-rom-music.mjs <rom.nds> [--only 9,21] [--wav]');
  process.exit(1);
}

/**
 * Pistas que usa Pokerift (enum music_id de pmdsky-debug = número de archivo bgmNNNN;
 * coincide con el nombre interno de cada .smd). Las de los pisos se añaden desde
 * expedition.rom.generated.ts (byte 3 de floor_properties → MUSIC_ID_TABLE, overlay 10).
 */
const BASE_TRACKS = [
  1, // B_SYS_P3_OPENING: opening (intro y título)
  2, // B_SYS_MENU: «Top Menu Theme», menú principal
  9, // B_MAP_TOWN_01: «Treasure Town» (Aldea Tesoro y Encrucijada: bgm_PlayFadeIn en enter00.ssb)
];
const RATE = 32000;
const PUBLIC = 'public';
const OUT_DIR = path.join(PUBLIC, 'assets/music');
const TS = 'src/client/assets/music.generated.ts';

// ── Sistema de archivos de la ROM ──
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

/** arm9 descomprimido (BLZ), para las tablas de duración de las envolventes. */
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

const romBuf = fs.readFileSync(input);
const file = romFiles(romBuf);
if (romBuf.toString('latin1', 0x0c, 0x10) !== 'C2SE') console.warn(`Aviso: código de juego ${romBuf.toString('latin1', 0x0c, 0x10)} (las tablas de envolvente son las de la versión USA, C2SE).`);
const { a: A9, ram: A9RAM } = arm9(romBuf);
const DUR16 = [...Array(128)].map((_, i) => A9.readInt16LE(0x20b0f50 - A9RAM + i * 2));
const DUR32 = [...Array(128)].map((_, i) => A9.readInt32LE(0x20b1050 - A9RAM + i * 4));
/** Duración (s) de una fase de la envolvente; 0x7F = la fase no termina. */
const envTime = (v, mult) => (v >= 0x7f ? Infinity : (mult ? DUR16[v] * mult : DUR32[v]) / 1000);

// ── SWDL ──
function chunks(d) {
  const out = {};
  let p = 0x50;
  while (p + 16 <= d.length) {
    const label = d.toString('latin1', p, p + 4), len = d.readUInt32LE(p + 12);
    if (label === 'eod ') break;
    out[label] = d.subarray(p + 16, p + 16 + len);
    p = (p + 16 + len + 15) & ~15;
  }
  return out;
}
const env = (d, o) => ({ on: d[o], mult: d[o + 1], atkvol: d[o + 8], attack: d[o + 9], decay: d[o + 10], sustain: d[o + 11], hold: d[o + 12], decay2: d[o + 13], release: d[o + 14] });

function parseSwd(d) {
  const c = chunks(d);
  const wavi = new Map(), prgi = new Map();
  const nWav = d.readUInt16LE(0x46);
  if (c.wavi)
    for (let i = 0; i < nWav; i++) {
      const o = c.wavi.readUInt16LE(i * 2);
      if (!o) continue;
      const w = c.wavi;
      wavi.set(w.readUInt16LE(o + 2), {
        id: w.readUInt16LE(o + 2), ftune: w.readInt8(o + 4), ctune: w.readInt8(o + 5), rootkey: w.readInt8(o + 6), vol: w[o + 8], pan: w[o + 9], fmt: w.readUInt16LE(o + 0x12), loops: !!w[o + 0x15],
        rate: w.readUInt32LE(o + 0x20), pos: w.readUInt32LE(o + 0x24), loopBeg: w.readUInt32LE(o + 0x28), loopLen: w.readUInt32LE(o + 0x2c), env: env(w, o + 0x30),
      });
    }
  if (c.prgi)
    for (let i = 0; i < 128; i++) {
      const o = c.prgi.readUInt16LE(i * 2);
      if (!o) continue;
      const g = c.prgi;
      const nSplits = g.readUInt16LE(o + 2), nLfo = g[o + 0x0b];
      const s0 = o + 0x10 + nLfo * 16 + 16;
      const splits = [];
      for (let k = 0; k < nSplits; k++) {
        const s = s0 + k * 48;
        splits.push({
          bend: g[s + 2], lowKey: g.readInt8(s + 4), highKey: g.readInt8(s + 5), lowVel: g.readInt8(s + 8), highVel: g.readInt8(s + 9),
          sample: g.readUInt16LE(s + 0x12), rootkey: g.readInt8(s + 0x16), vol: g[s + 0x18], pan: g[s + 0x19], env: env(g, s + 0x20),
        });
      }
      prgi.set(g.readUInt16LE(o), { vol: g[o + 4], pan: g[o + 5], splits });
    }
  return { wavi, prgi, pcmd: c.pcmd };
}

// ── Muestras (pcmd del banco principal) ──
const MAIN = parseSwd(file('SOUND/BGM/bgm.swd'));
const IMA_STEP = [7, 8, 9, 10, 11, 12, 13, 14, 16, 17, 19, 21, 23, 25, 28, 31, 34, 37, 41, 45, 50, 55, 60, 66, 73, 80, 88, 97, 107, 118, 130, 143, 157, 173, 190, 209, 230, 253, 279, 307, 337, 371, 408, 449, 494, 544, 598, 658, 724, 796, 876, 963, 1060, 1166, 1282, 1411, 1552, 1707, 1878, 2066, 2272, 2499, 2749, 3024, 3327, 3660, 4026, 4428, 4871, 5358, 5894, 6484, 7132, 7845, 8630, 9493, 10442, 11487, 12635, 13899, 15289, 16818, 18500, 20350, 22385, 24623, 27086, 29794, 32767];
const IMA_INDEX = [-1, -1, -1, -1, 2, 4, 6, 8];
const sampleCache = new Map();
/** Muestra decodificada a Float32 con su bucle (en muestras). */
function decodeSample(trackWav) {
  // La posición en pcmd (y el formato y el bucle) son los del banco principal: en el .swd de
  // cada pista esa posición es otra (no apunta a bgm.swd).
  const w = MAIN.wavi.get(trackWav.id) ?? trackWav;
  const key = `${w.pos}:${w.fmt}:${w.loopBeg}:${w.loopLen}`;
  if (sampleCache.has(key)) return sampleCache.get(key);
  const bytes = (w.loopBeg + w.loopLen) * 4;
  const src = MAIN.pcmd.subarray(w.pos, w.pos + bytes);
  let data, loopStart;
  if (w.fmt === 0x200) {
    // IMA ADPCM: preámbulo de 4 bytes (predictor y paso), nibble bajo primero.
    let pred = src.readInt16LE(0), idx = Math.min(88, Math.max(0, src[2]));
    data = new Float32Array((bytes - 4) * 2);
    let n = 0;
    for (let i = 4; i < bytes; i++)
      for (const nib of [src[i] & 15, src[i] >> 4]) {
        const step = IMA_STEP[idx];
        let diff = step >> 3;
        if (nib & 1) diff += step >> 2;
        if (nib & 2) diff += step >> 1;
        if (nib & 4) diff += step;
        pred = Math.max(-32768, Math.min(32767, nib & 8 ? pred - diff : pred + diff));
        idx = Math.max(0, Math.min(88, idx + IMA_INDEX[nib & 7]));
        data[n++] = pred / 32768;
      }
    loopStart = Math.max(0, (w.loopBeg * 4 - 4) * 2);
  } else if (w.fmt === 0x100) {
    data = new Float32Array(bytes / 2);
    for (let i = 0; i < data.length; i++) data[i] = src.readInt16LE(i * 2) / 32768;
    loopStart = w.loopBeg * 2;
  } else {
    data = new Float32Array(bytes);
    for (let i = 0; i < data.length; i++) data[i] = src.readInt8(i) / 128;
    loopStart = w.loopBeg * 4;
  }
  const s = { data, loopStart, loops: w.loops };
  sampleCache.set(key, s);
  return s;
}

// ── SMDL ──
const FIXED_PAUSE = [96, 72, 64, 48, 36, 32, 24, 18, 16, 12, 9, 8, 6, 4, 3, 2];
/** Bytes de parámetros de cada evento 0x90–0xFF (ppmdu_2, dse_sequence.cpp; los no listados desactivan la pista). */
const NPARAMS = {
  0x90: 0, 0x91: 1, 0x92: 1, 0x93: 2, 0x94: 3, 0x95: 1, 0x98: 0, 0x99: 0, 0x9c: 1, 0x9d: 0, 0x9e: 0, 0xa0: 1, 0xa1: 1, 0xa4: 1, 0xa5: 1,
  0xa8: 2, 0xa9: 1, 0xaa: 1, 0xab: 1, 0xac: 1, 0xaf: 3, 0xb0: 0, 0xb1: 1, 0xb2: 1, 0xb3: 1, 0xb4: 2, 0xb5: 1, 0xb6: 1, 0xbc: 1, 0xbe: 1,
  0xbf: 1, 0xc0: 0, 0xc3: 1, 0xcb: 2, 0xd0: 1, 0xd1: 1, 0xd2: 1, 0xd3: 2, 0xd4: 3, 0xd5: 2, 0xd6: 2, 0xd7: 2, 0xd8: 2, 0xdb: 1, 0xdc: 5,
  0xdd: 4, 0xdf: 1, 0xe0: 1, 0xe1: 1, 0xe2: 3, 0xe3: 1, 0xe4: 5, 0xe5: 4, 0xe7: 1, 0xe8: 1, 0xe9: 1, 0xea: 3, 0xec: 5, 0xed: 4, 0xef: 1,
  0xf0: 5, 0xf1: 4, 0xf2: 2, 0xf3: 3, 0xf6: 1, 0xf8: 2,
};

/** Pistas de la secuencia como listas de eventos con su byte de inicio. */
function parseSmd(d) {
  const nTracks = d[0x40 + 0x16];
  const tracks = [];
  let p = 0x80;
  for (let t = 0; t < nTracks; t++) {
    if (d.toString('latin1', p, p + 4) !== 'trk ') throw new Error(`smdl: se esperaba «trk » en 0x${p.toString(16)}`);
    const len = d.readUInt32LE(p + 12), start = p + 16 + 4, end = p + 16 + len;
    const evs = [];
    let loopIndex = -1;
    for (let q = start; q < end; ) {
      const c = d[q++];
      if (c < 0x80) {
        const b = d[q++], n = b >> 6;
        let hold = -1;
        if (n) {
          hold = 0;
          for (let k = 0; k < n; k++) hold = (hold << 8) | d[q++];
        }
        evs.push({ t: 'note', vel: c, key: b & 15, oct: ((b >> 4) & 3) - 2, hold });
        continue;
      }
      if (c < 0x90) {
        evs.push({ t: 'pause', ticks: FIXED_PAUSE[c - 0x80] });
        continue;
      }
      if (!(c in NPARAMS)) throw new Error(`smdl: evento 0x${c.toString(16)} no válido`);
      const prm = [...d.subarray(q, q + NPARAMS[c])];
      q += NPARAMS[c];
      if (c === 0x98) break;
      if (c === 0x99) loopIndex = evs.length;
      else evs.push({ t: 'ev', c, prm });
    }
    tracks.push({ evs, loopIndex });
    p = (end + 3) & ~3;
  }
  return tracks;
}

/** Recorre una pista hasta maxTick (repitiendo desde su punto de bucle; -1 = una sola vez) y devuelve sus cambios con su tick. */
function runTrack(track, maxTick) {
  const out = [];
  let tick = 0, octave = 4, lastPause = 0, lastHold = 0, i = 0, guard = 0;
  let loopTick = null, endTick = null;
  for (;;) {
    if (i >= track.evs.length) {
      if (endTick === null) endTick = tick;
      if (track.loopIndex < 0 || maxTick < 0 || tick >= maxTick || track.evs.length === track.loopIndex) break;
      i = track.loopIndex;
      if (++guard > 1000) break;
    }
    if (i === track.loopIndex && loopTick === null) loopTick = tick;
    if (maxTick >= 0 && tick >= maxTick) break;
    const e = track.evs[i++];
    if (e.t === 'note') {
      octave += e.oct;
      if (e.hold >= 0) lastHold = e.hold;
      if (e.key < 12) out.push({ tick, t: 'note', note: octave * 12 + e.key, vel: e.vel, hold: lastHold });
    } else if (e.t === 'pause') tick += lastPause = e.ticks;
    else {
      const [p0, p1, p2] = e.prm;
      switch (e.c) {
        case 0x90: tick += lastPause; break;
        case 0x91: tick += lastPause = Math.max(0, lastPause + ((p0 << 24) >> 24)); break;
        case 0x92: tick += lastPause = p0; break;
        case 0x93: tick += lastPause = p0 | (p1 << 8); break;
        case 0x94: tick += lastPause = p0 | (p1 << 8) | (p2 << 16); break;
        case 0xa0: octave = p0; break;
        case 0xa1: octave += (p0 << 24) >> 24; break;
        case 0xa4: case 0xa5: out.push({ tick, t: 'tempo', bpm: p0 }); break;
        case 0xac: out.push({ tick, t: 'program', prg: p0 }); break;
        case 0xd7: out.push({ tick, t: 'bend', value: ((p0 << 8) | p1) << 16 >> 16 }); break;
        case 0xdb: out.push({ tick, t: 'bendRange', semis: p0 }); break;
        case 0xe0: out.push({ tick, t: 'vol', v: p0 & 0x7f }); break;
        case 0xe3: out.push({ tick, t: 'expr', v: p0 & 0x7f }); break;
        case 0xe8: out.push({ tick, t: 'pan', v: p0 & 0x7f }); break;
        default: break; // [INCIERTO] eventos sin documentar (LFO, barridos…): se ignoran.
      }
    }
  }
  return { out, loopTick, endTick: endTick ?? tick };
}

/** Tick → segundos con los cambios de tempo de todas las pistas (48 ticks por negra). */
function tempoMap(changes, tpqn) {
  const pts = changes.sort((a, b) => a.tick - b.tick);
  const segs = [{ tick: 0, sec: 0, spt: 60 / (120 * tpqn) }];
  for (const c of pts) {
    const last = segs[segs.length - 1];
    const sec = last.sec + (c.tick - last.tick) * last.spt;
    segs.push({ tick: c.tick, sec, spt: 60 / (Math.max(1, c.bpm) * tpqn) });
  }
  return (tick) => {
    let s = segs[0];
    for (const x of segs) if (x.tick <= tick) s = x;
    return s.sec + (tick - s.tick) * s.spt;
  };
}

/** Línea de tiempo de un valor (volumen, pan, bend…) consultable de forma creciente. */
function timeline(points, initial) {
  const ts = points.map((p) => p[0]), vs = points.map((p) => p[1]);
  return (t) => {
    let lo = 0, hi = ts.length - 1, v = initial;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (ts[mid] <= t) (v = vs[mid]), (lo = mid + 1);
      else hi = mid - 1;
    }
    return v;
  };
}

/** Nivel de la envolvente (0–1) a los t segundos de empezar la nota (sin la liberación). */
function envLevel(e, t) {
  if (!e.on) return 1;
  const atk = envTime(e.attack, e.mult), hold = envTime(e.hold, e.mult), dec = envTime(e.decay, e.mult), dec2 = envTime(e.decay2, e.mult);
  const a0 = e.atkvol / 127, sus = e.sustain / 127;
  if (t < atk) return a0 + (1 - a0) * (t / atk);
  t -= atk;
  if (t < hold) return 1;
  t -= hold;
  if (dec === Infinity) return 1;
  if (t < dec) return 1 + (sus - 1) * (t / dec);
  t -= dec;
  if (dec2 === Infinity) return sus;
  return t < dec2 ? sus * (1 - t / dec2) : 0;
}

/** Sintetiza una pista completa: intro + una vuelta del bucle (o la pieza entera si no repite). */
function renderSong(id) {
  const name = `bgm${String(id).padStart(4, '0')}`;
  const smd = file(`SOUND/BGM/${name}.smd`), bank = parseSwd(file(`SOUND/BGM/${name}.swd`));
  const tpqn = smd.readUInt16LE(0x40 + 0x12) || 48;
  const tracks = parseSmd(smd);
  // Primera pasada: dónde empieza el bucle y cuánto dura.
  const first = tracks.map((t) => runTrack(t, -1));
  const ends = first.map((r) => r.endTick), loops = first.map((r) => r.loopTick).filter((x) => x !== null);
  const songEnd = Math.max(...ends);
  const loopTick = loops.length ? Math.min(...loops) : null;
  if (loops.some((x) => x !== loopTick)) console.warn(`  ${name}: las pistas no comparten punto de bucle (${[...new Set(loops)].join(', ')})`);
  const loopLen = loopTick === null ? 0 : songEnd - loopTick;
  const renderTicks = loopTick === null ? songEnd : songEnd + loopLen;
  const runs = tracks.map((t) => runTrack(t, renderTicks));
  const sec = tempoMap(runs.flatMap((r) => r.out.filter((e) => e.t === 'tempo')), tpqn);
  const tailSec = 3;
  const totalSec = sec(renderTicks) + tailSec;
  const N = Math.ceil(totalSec * RATE);
  const L = new Float32Array(N), R = new Float32Array(N);
  let voices = 0, missing = new Set();

  runs.forEach((run) => {
    const at = (type, init) => timeline(run.out.filter((e) => e.t === type).map((e) => [sec(e.tick), e.v ?? e.value ?? e.semis]), init);
    const vol = at('vol', 127), expr = at('expr', 127), pan = at('pan', 64), bend = at('bend', 0), bendRange = at('bendRange', 0);
    let prg = 0;
    for (const e of run.out) {
      if (e.t === 'program') prg = e.prg;
      if (e.t !== 'note') continue;
      const program = bank.prgi.get(prg);
      if (!program) {
        missing.add(`programa ${prg} (no está en el banco: silencio, como ppmdu_2) [INCIERTO]`);
        continue;
      }
      const split = program.splits.find((s) => e.note >= s.lowKey && e.note <= s.highKey && e.vel >= s.lowVel && e.vel <= s.highVel);
      if (!split) continue;
      const w = bank.wavi.get(split.sample);
      if (!w) {
        missing.add(`sample ${split.sample}`);
        continue;
      }
      const smp = decodeSample(w);
      const envp = split.env.on ? split.env : w.env;
      const t0 = sec(e.tick), tOff = sec(e.tick + Math.max(1, e.hold));
      const rel = envp.on ? Math.min(envTime(envp.release, envp.mult), 8) : 0.01;
      const levelOff = envLevel(envp, tOff - t0);
      const tEnd = Math.min(tOff + rel, totalSec);
      const baseInc = (w.rate / RATE) * 2 ** ((e.note - split.rootkey) / 12);
      const gain = (e.vel / 127) * (program.vol / 127) * (split.vol / 127);
      const panBase = program.pan - 64 + (split.pan - 64);
      let pos = 0;
      const s0 = Math.floor(t0 * RATE), s1 = Math.min(N, Math.ceil(tEnd * RATE));
      const BLOCK = 64;
      voices++;
      for (let s = s0; s < s1; s += BLOCK) {
        const t = s / RATE;
        const range = bendRange(t) || split.bend || 2;
        const inc = baseInc * 2 ** (((bend(t) / 8192) * range) / 12);
        const lvl = t < tOff ? envLevel(envp, t - t0) : levelOff * Math.max(0, 1 - (t - tOff) / rel);
        const g = gain * lvl * (vol(t) / 127) * (expr(t) / 127);
        const p = Math.min(127, Math.max(0, pan(t) + panBase)) / 127;
        const gl = g * Math.cos((p * Math.PI) / 2), gr = g * Math.sin((p * Math.PI) / 2);
        const n = Math.min(BLOCK, s1 - s);
        for (let k = 0; k < n; k++) {
          const ip = pos | 0;
          if (ip + 1 >= smp.data.length) {
            if (!smp.loops || smp.loopStart >= smp.data.length - 1) {
              pos = Infinity;
              break;
            }
            pos -= smp.data.length - smp.loopStart;
            continue;
          }
          const fr = pos - ip;
          const v = smp.data[ip] + (smp.data[ip + 1] - smp.data[ip]) * fr;
          L[s + k] += v * gl;
          R[s + k] += v * gr;
          pos += inc;
        }
        if (pos === Infinity) break;
      }
    }
  });

  // Corte: intro + segunda vuelta del bucle (que ya contiene las colas de la primera), para que el salto no se note.
  let left, right, loopStart = null;
  if (loopTick !== null) {
    const a = Math.round(sec(loopTick) * RATE), b = Math.round(sec(songEnd) * RATE), c = Math.round(sec(songEnd + loopLen) * RATE);
    left = new Float32Array(a + (c - b));
    right = new Float32Array(a + (c - b));
    left.set(L.subarray(0, a));
    right.set(R.subarray(0, a));
    left.set(L.subarray(b, c), a);
    right.set(R.subarray(b, c), a);
    loopStart = a;
  } else {
    left = L;
    right = R;
  }
  // Normalización de pico (-1 dBFS).
  let peak = 0;
  for (let i = 0; i < left.length; i++) peak = Math.max(peak, Math.abs(left[i]), Math.abs(right[i]));
  const k = peak ? 0.89 / peak : 1;
  for (let i = 0; i < left.length; i++) (left[i] *= k), (right[i] *= k);
  return { name, smdName: smd.toString('latin1', 0x20, 0x30).replace(/\0.*/, ''), left, right, loopStart, voices, missing: [...missing] };
}

function wav(left, right) {
  const n = left.length, buf = Buffer.alloc(44 + n * 4);
  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + n * 4, 4);
  buf.write('WAVEfmt ', 8);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(2, 22);
  buf.writeUInt32LE(RATE, 24);
  buf.writeUInt32LE(RATE * 4, 28);
  buf.writeUInt16LE(4, 32);
  buf.writeUInt16LE(16, 34);
  buf.write('data', 36);
  buf.writeUInt32LE(n * 4, 40);
  for (let i = 0; i < n; i++) {
    buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, left[i])) * 32767), 44 + i * 4);
    buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, right[i])) * 32767), 46 + i * 4);
  }
  return buf;
}

async function mp3(left, right) {
  const enc = await createMp3Encoder();
  enc.configure({ channels: 2, sampleRate: RATE, bitrate: 96 });
  const parts = [];
  const CH = 1152 * 64;
  for (let i = 0; i < left.length; i += CH) parts.push(Buffer.from(enc.encode([left.subarray(i, i + CH), right.subarray(i, i + CH)])));
  parts.push(Buffer.from(enc.finalize()));
  return Buffer.concat(parts);
}

/**
 * Comprobación de afinación: toca cada (programa, nota) usada sin mezcla, estima su altura
 * por autocorrelación y la compara con la nota pedida. Desviaciones distintas de 0 (o de
 * octavas, que pueden ser armónicos) indican una afinación mal aplicada.
 */
function checkTuning(id) {
  const name = `bgm${String(id).padStart(4, '0')}`;
  const smd = file(`SOUND/BGM/${name}.smd`), bank = parseSwd(file(`SOUND/BGM/${name}.swd`));
  const byKey = new Map();
  for (const t of parseSmd(smd)) {
    let prg = 0;
    for (const e of runTrack(t, -1).out) {
      if (e.t === 'program') prg = e.prg;
      if (e.t === 'note') byKey.set(`${prg}:${e.note}`, { prg, note: e.note, vel: e.vel });
    }
  }
  const rows = new Map();
  for (const { prg, note, vel } of byKey.values()) {
    const program = bank.prgi.get(prg);
    const split = program?.splits.find((s) => note >= s.lowKey && note <= s.highKey && vel >= s.lowVel && vel <= s.highVel);
    const w = split && bank.wavi.get(split.sample);
    if (!w) continue;
    const smp = decodeSample(w), inc = (w.rate / RATE) * 2 ** ((note - split.rootkey) / 12);
    const n = 4096, buf = new Float32Array(n);
    let pos = 0.03 * w.rate;
    for (let i = 0; i < n; i++) {
      let ip = pos | 0;
      if (ip + 1 >= smp.data.length) {
        if (!smp.loops) break;
        pos -= smp.data.length - smp.loopStart;
        ip = pos | 0;
      }
      buf[i] = smp.data[ip] + (smp.data[ip + 1] - smp.data[ip]) * (pos - ip);
      pos += inc;
    }
    // Autocorrelación normalizada (YIN simplificado) entre 30 Hz y 4 kHz.
    const minLag = Math.floor(RATE / 4000), maxLag = Math.floor(RATE / 30), W = n - maxLag;
    const d = new Float32Array(maxLag + 1);
    for (let lag = 1; lag <= maxLag; lag++) {
      let acc = 0;
      for (let i = 0; i < W; i++) acc += (buf[i] - buf[i + lag]) ** 2;
      d[lag] = acc;
    }
    let run = 0, lag = -1;
    const cmnd = new Float32Array(maxLag + 1);
    for (let l = 1; l <= maxLag; l++) (run += d[l]), (cmnd[l] = run ? (d[l] * l) / run : 1);
    for (let l = minLag; l <= maxLag; l++) if (cmnd[l] < 0.15) {
      while (l + 1 <= maxLag && cmnd[l + 1] < cmnd[l]) l++;
      lag = l;
      break;
    }
    if (lag < 0) continue; // sin altura clara (percusión, ruido)
    const midi = 69 + 12 * Math.log2(RATE / lag / 440);
    const dev = midi - note;
    const key = `prg ${prg} split→muestra ${split.sample} (raíz ${split.rootkey}, muestra raíz ${w.rootkey})`;
    if (!rows.has(key)) rows.set(key, []);
    rows.get(key).push(dev);
  }
  console.log(`${name}: desviación (semitonos) entre la altura que suena y la nota pedida`);
  for (const [k, devs] of rows) {
    devs.sort((a, b) => a - b);
    const med = devs[devs.length >> 1];
    console.log(`  ${k}: mediana ${med.toFixed(2)} (${devs.length} notas)`);
  }
}

if (CHECK) {
  for (const id of (ONLY ?? '21').split(',').map(Number)) checkTuning(id);
  process.exit(0);
}

// ── Pistas a importar ──
const expedition = fs.existsSync('src/shared/data/expedition.rom.generated.ts') ? fs.readFileSync('src/shared/data/expedition.rom.generated.ts', 'utf8') : '';
const floorTracks = [...expedition.matchAll(/"music": (\d+)/g)].map((m) => Number(m[1]));
if (!floorTracks.length) console.warn('Aviso: expedition.rom.generated.ts no tiene la música de los pisos: ejecuta antes npm run import:dungeons.');
const ids = ONLY ? ONLY.split(',').map(Number) : [...new Set([...BASE_TRACKS, ...floorTracks])].sort((a, b) => a - b);

fs.mkdirSync(OUT_DIR, { recursive: true });
const manifest = {};
for (const id of ids) {
  const t0 = Date.now();
  const song = renderSong(id);
  const outFile = `${song.name}.mp3`;
  fs.writeFileSync(path.join(OUT_DIR, outFile), await mp3(song.left, song.right));
  if (WAV) fs.writeFileSync(path.join('smoke-output', `${song.name}.wav`), wav(song.left, song.right));
  manifest[id] = { url: `assets/music/${outFile}`, name: song.smdName, samples: song.left.length, loopStart: song.loopStart };
  console.log(`${song.name} ${song.smdName}: ${(song.left.length / RATE).toFixed(1)} s${song.loopStart !== null ? `, bucle desde ${(song.loopStart / RATE).toFixed(2)} s` : ''}, ${song.voices} notas${song.missing.length ? `, sin datos: ${song.missing.join(', ')}` : ''} (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
}

// Las pistas ya importadas que no se han vuelto a generar se conservan.
let previous = {};
if (fs.existsSync(TS) && ONLY) {
  const m = fs.readFileSync(TS, 'utf8').match(/= (\{[\s\S]*\});/);
  if (m) previous = JSON.parse(m[1]);
}
fs.writeFileSync(
  TS,
  `// ARCHIVO GENERADO por tools/import-rom-music.mjs — no editar a mano.
// Música sintetizada de SOUND/BGM (smdl/swdl, driver DSE) de una ROM propia (USA).

export interface MusicTrack {
  url: string;
  /** Nombre interno del .smd. */
  name: string;
  /** Muestras (a ${RATE} Hz) del audio original, sin el retardo del codificador. */
  samples: number;
  /** Muestra donde empieza el bucle (hasta el final); null = no se repite. */
  loopStart: number | null;
}

export const MUSIC_RATE = ${RATE};

/** Pistas por número de BGM (enum music_id). */
export const MUSIC: Record<number, MusicTrack> = ${JSON.stringify({ ...previous, ...manifest }, null, 1)};
`,
);
console.log(`Escrito ${TS}`);
