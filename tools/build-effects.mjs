/**
 * Genera los recursos de efectos, estados y objetos de la mazmorra a partir de
 * los recursos originales del usuario:
 *
 *   public/assets/effects/<efecto>.png     tira de fotogramas de cada efecto de movimiento
 *                                          (una fila por dirección si el efecto la tiene)
 *   public/assets/effects/status-<id>.png  animación de estado sobre la cabeza
 *   public/assets/items/<objeto>.png       icono del objeto (16×16)
 *   src/client/assets/effects.generated.ts catálogo (tamaños, fotogramas, ritmo, rutas)
 *
 * Fuentes:
 *  - Efectos (con anchor: 'bottom', el efecto cae desde arriba y su parte de abajo se apoya en el objetivo): Assets/effects/Attack effects/…/move_VFX/<nº>/<anim>/<fotograma>.png
 *    (Exploradores del Cielo). No hay tabla de qué efecto usa cada movimiento: la
 *    asignación de EFFECTS está hecha a ojo con hojas de contacto [INCIERTO].
 *    Los efectos con 8 animaciones van una por dirección, en el orden de Dir
 *    (S, SE, E, NE, N, NW, W, SW), comprobado con el picotazo (0106) y la gota (0127).
 *  - Estados: Assets/effects/status effects.png (cuadrícula de 16 px desde x=104).
 *  - Objetos: Assets/items/items DS.png (preferente) e items gba.png (si falta en DS).
 *
 * Uso: node tools/build-effects.mjs
 */
import { PNG } from 'pngjs';
import fs from 'node:fs';
import path from 'node:path';

const VFX = 'Assets/effects/Attack effects/DS _ DSi - Pokemon Mystery Dungeon_ Explorers of Sky - Miscellaneous - Attack Effects/move_VFX';
const OUT_FX = 'public/assets/effects';
const OUT_ITEMS = 'public/assets/items';
const GEN = 'src/client/assets/effects.generated.ts';
/** Ritmo de los efectos [INCIERTO]: 2 ticks de 1/60 s por fotograma. */
const FX_FPS = 30;
const STATUS_FPS = 10;

/**
 * Efecto → carpeta de move_VFX y si va por direcciones. Los movimientos (data/moves.ts)
 * apuntan aquí con su campo fx. [INCIERTO] Asignación a ojo según su aspecto.
 */
const EFFECTS = {
  hit: { vfx: '0038' }, //           destello de golpe (Placaje, Destructor, Ataque Rápido, ataque normal)
  slash: { vfx: '0050' }, //         tres zarpazos (Arañazo)
  cutter: { vfx: '0245' }, //        media luna verde (Corte Furia)
  bite: { vfx: '0122', dirs: true }, // colmillos (Mordisco)
  fire: { vfx: '0070' }, //          llamitas (Ascuas; la 0008 es una llamarada grande)
  water: { vfx: '0021' }, //         salpicadura (Pistola Agua, al impactar)
  waterShot: { vfx: '0127', dirs: true }, // gota que vuela (Pistola Agua)
  vine: { vfx: '0131' }, //          látigo verde (Látigo Cepa)
  leaf: { vfx: '0129', dirs: true }, // hojas (Hoja Afilada)
  electric: { vfx: '0119', anchor: 'bottom' }, // rayo fino que cae desde arriba (Impactrueno)
  poison: { vfx: '0136', dirs: true }, // agujas (Picotazo Veneno) [VERIFICADO: mismos píxeles que "Poison Sting" en Time and dark/Poison attack effects]
  peck: { vfx: '0106', dirs: true }, // pico (Picotazo)
  wind: { vfx: '0135' }, //          remolino (Tornado)
  drainOrb: { vfx: '0145' }, //      orbe verde que vuelve del objetivo al usuario (Absorber)
  growl: { vfx: '0162' }, //         ondas con notas (Gruñido; la 0007 es una campana: Cascabel Cura)
  sing: { vfx: '0162' }, //          notas en anillo (Canto)
  leer: { vfx: '0064' }, //          ojos amenazantes (Malicioso)
  statDown: { vfx: '0081' }, //      anillos (Látigo)
  sand: { vfx: '0114' }, //          arena (Ataque Arena, Bofetón Lodo)
  string: { vfx: '0109' }, //        hilo (Disparo Demora)
  harden: { vfx: '0020' }, //        anillo que se expande (Fortaleza)
  psychic: { vfx: '0017' }, //       onda rosa (Confusión)
  smoke: { vfx: '0041' }, //         humo (Pantalla de Humo)
  egg: { vfx: '0116' }, //           huevo (Bombardeo)
  hypnosis: { vfx: '0058' }, //      espiral (Hipnosis)
  growth: { vfx: '0186' }, //        remolino verde (Desarrollo)
  explosion: { vfx: '0253' }, //     explosión (Semilla Explosiva)
};

/** Estados: fila de la hoja (y de la celda de 16 px); los fotogramas se cuentan solos. */
const STATUS_SHEET = 'Assets/effects/status effects.png';
// [VERIFICADO] Según la tabla de iconos del juego documentada en vinzmyko/pmd-eos-battle-visuals
// (status_icon_system.md): quemadura = llama roja, veneno = calavera blanca, confusión =
// pajaritos amarillos, sueño = Z, característica bajada = flechas hacia abajo. La parálisis
// no tiene icono.
const STATUS_ROWS = {
  confusion: 128, // pajaritos amarillos dando vueltas
  burn: 112, //      llama
  sleep: 232, //     Z (esta fila va desplazada 8 px)
  poison: 248, //    calavera
  lowered: 192, //   flechas hacia abajo (alguna característica bajada)
};

/** Objetos: hoja y un punto dentro del icono (se recorta su silueta). */
const DS = 'Assets/items/items DS.png', GBA = 'Assets/items/items gba.png';
const ITEMS = {
  apple: [DS, 107, 69],
  bigApple: [DS, 107, 69], //   en Exploradores la Manzana Grande usa el mismo icono que la Manzana
  oranBerry: [DS, 206, 68], //  azul
  pechaBerry: [DS, 223, 68], // rosa
  cheriBerry: [DS, 172, 68], // roja
  rawstBerry: [DS, 242, 68], // celeste [INCIERTO]
  reviverSeed: [DS, 250, 29], // semilla de la hoja de DS
  healSeed: [GBA, 47, 47], //  verde: la hoja de DS solo trae semillas doradas [INCIERTO]
  blastSeed: [GBA, 9, 47], //  roja [INCIERTO]
  maxElixir: [DS, 199, 29], // botella (Medicine)
  poke: [DS, 191, 178], //     moneda con la P
};

const read = (f) => PNG.sync.read(fs.readFileSync(f));
fs.mkdirSync(OUT_FX, { recursive: true });
fs.mkdirSync(OUT_ITEMS, { recursive: true });
const catalog = { effects: {}, status: {}, items: {} };

/* ───────────── Efectos de movimiento ───────────── */
for (const [key, def] of Object.entries(EFFECTS)) {
  const dir = path.join(VFX, def.vfx);
  const anims = fs.readdirSync(dir).filter((a) => a !== 'pieces').sort();
  const use = def.dirs ? anims.slice(0, 8) : [anims[0]];
  if (def.dirs && use.length < 8) throw new Error(`${key}: ${def.vfx} no tiene 8 direcciones`);
  const rows = use.map((a) => fs.readdirSync(path.join(dir, a)).sort().map((f) => read(path.join(dir, a, f))));
  // Cada fotograma se centra en un lienzo común (el centro del lienzo original es su
  // origen) y luego todo se recorta a la zona que ocupa el dibujo en el conjunto de
  // fotogramas y direcciones: su centro es el punto que se coloca sobre el Pokémon.
  const cw = Math.max(...rows.flat().map((p) => p.width)), chh = Math.max(...rows.flat().map((p) => p.height));
  let bx0 = cw, by0 = chh, bx1 = -1, by1 = -1;
  for (const p of rows.flat()) {
    const ox = Math.floor((cw - p.width) / 2), oy = Math.floor((chh - p.height) / 2);
    for (let y = 0; y < p.height; y++)
      for (let x = 0; x < p.width; x++)
        if (p.data[(y * p.width + x) * 4 + 3]) (bx0 = Math.min(bx0, ox + x)), (by0 = Math.min(by0, oy + y)), (bx1 = Math.max(bx1, ox + x)), (by1 = Math.max(by1, oy + y));
  }
  // Simétrico respecto al centro horizontal (las variantes por dirección no se descuadran).
  const half = Math.max(cw / 2 - bx0, bx1 + 1 - cw / 2);
  bx0 = Math.max(0, Math.floor(cw / 2 - half)); bx1 = Math.min(cw - 1, Math.ceil(cw / 2 + half) - 1);
  const fw = bx1 - bx0 + 1, fh = by1 - by0 + 1;
  const frames = Math.max(...rows.map((r) => r.length));
  const sheet = new PNG({ width: fw * frames, height: fh * rows.length });
  rows.forEach((r, ri) =>
    r.forEach((p, fi) => {
      const ox = Math.floor((cw - p.width) / 2) - bx0, oy = Math.floor((chh - p.height) / 2) - by0;
      for (let y = 0; y < p.height; y++)
        for (let x = 0; x < p.width; x++) {
          const X = ox + x, Y = oy + y;
          if (X < 0 || Y < 0 || X >= fw || Y >= fh) continue;
          p.data.copy(sheet.data, ((ri * fh + Y) * sheet.width + fi * fw + X) * 4, (y * p.width + x) * 4, (y * p.width + x) * 4 + 4);
        }
    }),
  );
  fs.writeFileSync(`${OUT_FX}/${key}.png`, PNG.sync.write(sheet));
  catalog.effects[key] = { url: `assets/effects/${key}.png`, frameWidth: fw, frameHeight: fh, frames, frameRate: FX_FPS, dirs: rows.length, anchor: def.anchor ?? 'center', source: def.vfx };
}

/* ───────────── Estados ───────────── */
const st = read(STATUS_SHEET);
const stBg = [st.data[(5 * st.width + 340) * 4], st.data[(5 * st.width + 340) * 4 + 1], st.data[(5 * st.width + 340) * 4 + 2]];
const stEmpty = (x, y) => {
  const i = (y * st.width + x) * 4;
  return st.data[i + 3] === 0 || (st.data[i] === stBg[0] && st.data[i + 1] === stBg[1] && st.data[i + 2] === stBg[2]);
};
for (const [id, y0] of Object.entries(STATUS_ROWS)) {
  const cells = [];
  for (let x0 = 104; x0 + 16 <= st.width; x0 += 16) {
    let n = 0;
    for (let y = y0; y < y0 + 16; y++) for (let x = x0; x < x0 + 16; x++) if (!stEmpty(x, y)) n++;
    if (!n) break;
    cells.push(x0);
  }
  const sheet = new PNG({ width: 16 * cells.length, height: 16 });
  cells.forEach((x0, f) => {
    for (let y = 0; y < 16; y++)
      for (let x = 0; x < 16; x++) {
        if (stEmpty(x0 + x, y0 + y)) continue;
        st.data.copy(sheet.data, (y * sheet.width + f * 16 + x) * 4, ((y0 + y) * st.width + x0 + x) * 4, ((y0 + y) * st.width + x0 + x) * 4 + 4);
      }
  });
  fs.writeFileSync(`${OUT_FX}/status-${id}.png`, PNG.sync.write(sheet));
  catalog.status[id] = { url: `assets/effects/status-${id}.png`, frameWidth: 16, frameHeight: 16, frames: cells.length, frameRate: STATUS_FPS };
}

/* ───────────── Objetos ───────────── */
const sheets = new Map();
for (const [id, [file, sx, sy]] of Object.entries(ITEMS)) {
  const p = sheets.get(file) ?? (sheets.set(file, read(file)), sheets.get(file));
  const bg = [p.data[0], p.data[1], p.data[2]];
  const empty = (x, y) => {
    const i = (y * p.width + x) * 4;
    return p.data[i + 3] === 0 || (Math.abs(p.data[i] - bg[0]) < 8 && Math.abs(p.data[i + 1] - bg[1]) < 8 && Math.abs(p.data[i + 2] - bg[2]) < 8);
  };
  if (empty(sx, sy)) throw new Error(`${id}: el punto (${sx},${sy}) de ${file} es fondo`);
  // Silueta conectada (8 vecinos) desde el punto.
  const seen = new Set([sy * p.width + sx]), stack = [[sx, sy]];
  let x0 = sx, y0 = sy, x1 = sx, y1 = sy;
  while (stack.length) {
    const [x, y] = stack.pop();
    x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
    for (let dy = -1; dy <= 1; dy++)
      for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx, ny = y + dy, k = ny * p.width + nx;
        if (nx < 0 || ny < 0 || nx >= p.width || ny >= p.height || seen.has(k) || empty(nx, ny)) continue;
        seen.add(k);
        stack.push([nx, ny]);
      }
  }
  const w = x1 - x0 + 1, h = y1 - y0 + 1;
  if (w > 16 || h > 16) throw new Error(`${id}: el icono mide ${w}×${h} (¿se ha unido a otro?)`);
  const icon = new PNG({ width: 16, height: 16 });
  const ox = Math.floor((16 - w) / 2), oy = Math.floor((16 - h) / 2);
  for (const k of seen) {
    const x = k % p.width, y = Math.floor(k / p.width);
    p.data.copy(icon.data, ((oy + y - y0) * 16 + ox + x - x0) * 4, k * 4, k * 4 + 4);
  }
  fs.writeFileSync(`${OUT_ITEMS}/${id}.png`, PNG.sync.write(icon));
  catalog.items[id] = `assets/items/${id}.png`;
  console.log(`  objeto ${id}: ${path.basename(file)} (${x0},${y0}) ${w}×${h}`);
}

fs.writeFileSync(
  GEN,
  `// ARCHIVO GENERADO por tools/build-effects.mjs — no editar a mano.\n` +
    `import type { EffectAsset } from './catalog';\n\n` +
    `/** Efectos de movimiento (dirs = 8: una fila por dirección, en el orden de Dir). */\n` +
    `export const MOVE_EFFECTS: Record<string, EffectAsset & { dirs: number; source: string }> = ${JSON.stringify(catalog.effects, null, 1)};\n\n` +
    `/** Animaciones de estado sobre la cabeza (status effects.png). */\n` +
    `export const STATUS_EFFECTS: Record<string, EffectAsset> = ${JSON.stringify(catalog.status, null, 1)};\n\n` +
    `/** Iconos de los objetos (items DS.png; items gba.png si falta en DS). */\n` +
    `export const ITEM_ICONS: Record<string, string> = ${JSON.stringify(catalog.items, null, 1)};\n`,
);
console.log(`✔ ${Object.keys(catalog.effects).length} efectos, ${Object.keys(catalog.status).length} estados, ${Object.keys(catalog.items).length} objetos`);
