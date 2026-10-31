/**
 * Importa los efectos originales de movimientos a partir de la salida de
 * vinzmyko/pmd-scraper (https://github.com/vinzmyko/pmd-scraper) ejecutado sobre
 * una ROM LEGÍTIMA de Exploradores del Cielo (volcada de un cartucho propio).
 * Pokerift no incluye ni descarga ROMs ni el código de pmd-scraper (no publica
 * licencia): se ejecuta aparte.
 *
 *   1. cargo run --release -- <rom.nds> -o <salida>        (en el repositorio de pmd-scraper)
 *   2. node tools/import-pmd-scraper.mjs <salida>
 *
 * Lee <salida>/asset_index.json (moves: move_id → efectos por capa; effects:
 * hoja, tamaño, duración de cada fotograma, direcciones, bucle) y las hojas de
 * <salida>/EFFECT/. Solo importa los efectos de los movimientos del registro
 * (src/client/assets/moveFx.ts, por su eosMoveId) y genera:
 *
 *   public/assets/effects/eos/<ID>.png         una fila por dirección (orden de Dir)
 *   src/client/assets/move-fx.rom.generated.ts move_id → efecto por papel + catálogo
 *   src/shared/data/moves.rom.generated.ts     datos reales de cada movimiento (DATA/move_data.json,
 *                                              tabla waza_p.bin): potencia, tipo, categoría, PP,
 *                                              las dos precisiones, golpes, crítico, objetivo y alcance
 *
 * Con esos datos, el registro usa los efectos del juego en lugar de la
 * asignación a ojo. Opciones (pruebas): --assets <dir> --ts <archivo>.
 * Limitación conocida: pmd-scraper no guarda el origen del efecto dentro de su
 * lienzo; se centra en el Pokémon (revisar los efectos verticales en el visor).
 */
import { PNG } from 'pngjs';
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const opt = (name, def) => {
  const i = args.indexOf(name);
  return i >= 0 ? args.splice(i, 2)[1] : def;
};
const ASSETS = opt('--assets', 'public/assets/effects/eos');
const TS = opt('--ts', 'src/client/assets/move-fx.rom.generated.ts');
const URL_BASE = opt('--url', 'assets/effects/eos');
const REGISTRY = opt('--registry', 'src/client/assets/moveFx.ts');
const MOVES_TS = opt('--moves-ts', 'src/shared/data/moves.rom.generated.ts');
const ITEMS_TS = opt('--items-ts', 'src/shared/data/items.ts');
const dir = args[0];
if (!dir) {
  console.error('Uso: node tools/import-pmd-scraper.mjs <carpeta de salida de pmd-scraper>');
  process.exit(1);
}
const indexPath = path.join(dir, 'asset_index.json');
if (!fs.existsSync(indexPath)) throw new Error(`No existe ${indexPath}: ¿es la carpeta de salida de pmd-scraper?`);
const index = JSON.parse(fs.readFileSync(indexPath, 'utf8'));

// move_id de los movimientos del juego (registro central).
const reg = fs.readFileSync(REGISTRY, 'utf8');
const wanted = new Map(); // eosMoveId → id de Pokerift
for (const m of reg.matchAll(/^\s+(\w+): (?:visual\((\d+),|\{\n\s+eosMoveId: (\d+),)/gm)) wanted.set(m[2] ?? m[3], m[1]);
if (!wanted.size) throw new Error(`No se han encontrado eosMoveId en ${REGISTRY}`);

// Nombres (si pmd-scraper los ha extraído), solo para el informe; y los datos de cada movimiento.
const names = new Map();
const romData = new Map(); // eosMoveId → entrada de move_data.json
const dataPath = path.join(dir, 'DATA', 'move_data.json');
if (fs.existsSync(dataPath)) {
  const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  for (const mv of Array.isArray(data) ? data : Object.values(data)) if (mv && mv.move_id !== undefined) (names.set(String(mv.move_id), mv.name), romData.set(String(mv.move_id), mv));
}

const ROLE = { Charge: 'charge', Secondary: 'secondary', Primary: 'primary', Projectile: 'projectile' };
/** "res://effect_sprites/113.png" o "res://effect_sprites/113" (direccional) → archivo(s) en <salida>/EFFECT. */
const sheetFiles = (ref, dirs) => {
  const stem = ref.replace(/^res:\/\/effect_sprites\//, '').replace(/\.png$/, '');
  return dirs > 1 ? [...Array(8).keys()].map((d) => path.join(dir, 'EFFECT', `${stem}_dir${d}.png`)) : [path.join(dir, 'EFFECT', `${stem}.png`)];
};

const out = { moves: {}, effects: {}, hitReactions: {}, shadows: {}, userAnims: {} };
/** Ancho máximo de una hoja (límite habitual de textura en GPU). */
const MAX_SHEET_W = 4096;
/** Coloca los fotogramas (mismo tamaño) en una rejilla, en orden, sin pasar de MAX_SHEET_W de ancho. */
function packGrid(frames, fw, fh) {
  const cols = Math.max(1, Math.min(frames.length, Math.floor(MAX_SHEET_W / fw)));
  const sheet = new PNG({ width: fw * cols, height: fh * Math.ceil(frames.length / cols) });
  frames.forEach((f, k) => PNG.bitblt(f.png, sheet, f.x, f.y, fw, fh, (k % cols) * fw, Math.floor(k / cols) * fh));
  return sheet;
}
/**
 * Fotogramas de una tira horizontal (fw×fh cada uno). La tabla da el número de
 * fotogramas de la primera dirección; si otra tiene alguno menos, se repite su
 * último fotograma (y si tiene más, se recortan) para que todas duren igual.
 */
const uneven = [];
function stripFrames(file, n, fw, fh) {
  if (!fs.existsSync(file)) throw new Error(`Falta la hoja ${file}`);
  const p = PNG.sync.read(fs.readFileSync(file));
  if (p.height !== fh || p.width % fw) throw new Error(`${file}: mide ${p.width}×${p.height}, no son fotogramas de ${fw}×${fh}`);
  const have = p.width / fw;
  if (have !== n) uneven.push(`${path.basename(file)}: ${have} fotogramas (se esperaban ${n})`);
  return Array.from({ length: n }, (_, i) => ({ png: p, x: Math.min(i, have - 1) * fw, y: 0 }));
}
/**
 * Importa un efecto y devuelve su clave. Sprite: 1 u 8 direcciones (fotogramas de
 * la dirección d en d·n … d·n+n−1). Screen: efecto a pantalla completa (256×160)
 * con la opacidad de cada fotograma.
 */
function importEffect(id, def) {
  const key = `eos-${id}`;
  if (out.effects[key]) return key;
  const fw = def.frame_width, fh = def.frame_height;
  if (def.type === 'Screen') {
    if (!def.sprite_sheet || !def.frames?.length) return null; // sin hoja exportada
    const n = def.frame_count ?? def.frames.length;
    const sheet = packGrid(stripFrames(sheetFiles(def.sprite_sheet, 1)[0], n, fw, fh), fw, fh);
    fs.writeFileSync(path.join(ASSETS, `${id}.png`), PNG.sync.write(sheet));
    out.effects[key] = {
      url: `${URL_BASE}/${id}.png`, frameWidth: fw, frameHeight: fh, frames: n, frameRate: 60, dirs: 1,
      durations: def.frames.map((f) => Math.round(f.duration * 1000)), loop: !!def.loop, anchor: 'screen',
      // Opacidad de cada fotograma (alpha/65536 en la tabla del juego).
      alphas: def.frames.map((f) => Math.min(1, Math.round((f.alpha / 65536) * 1000) / 1000)),
    };
    return key;
  }
  const dirs = def.is_directional ? 8 : 1;
  const anim = def.animations?.play ?? Object.values(def.animations ?? {})[0];
  if (!anim) throw new Error(`Efecto ${id}: sin animación`);
  const durations = anim.frames ? anim.frames.map((f) => Math.round(f[0] * 1000)) : Array(anim.frame_count).fill(Math.round(anim.duration * 1000));
  const n = durations.length;
  const frames = sheetFiles(def.sprite_sheet, dirs).flatMap((file) => stripFrames(file, n, fw, fh));
  fs.writeFileSync(path.join(ASSETS, `${id}.png`), PNG.sync.write(packGrid(frames, fw, fh)));
  out.effects[key] = { url: `${URL_BASE}/${id}.png`, frameWidth: fw, frameHeight: fh, frames: n, frameRate: 60, dirs, durations, loop: !!anim.loop, anchor: 'center' };
  return key;
}

const report = [];
fs.mkdirSync(ASSETS, { recursive: true });
// TODOS los movimientos con animación (no solo los del registro): así el juego no
// depende de la ROM para ningún ataque. Se informa solo de los del registro.
const notes = new Map(); // move_id → texto del informe
for (const [moveId, mv] of Object.entries(index.moves ?? {})) {
  const roles = {};
  const parts = [];
  for (const t of mv.effects ?? []) {
    const def = index.effects?.[t.id];
    if (!def || (def.type !== 'Sprite' && def.type !== 'Screen')) {
      parts.push(`${ROLE[t.layer] ?? t.layer}=${t.id} (${def ? def.type : 'sin definición'}: no importado)`);
      continue;
    }
    const role = def.type === 'Screen' ? 'screen' : (ROLE[t.layer] ?? 'primary');
    const key = importEffect(t.id, def);
    if (!key) {
      parts.push(`${role}=${t.id} (${def.type} sin hoja: no importado)`);
      continue;
    }
    if (roles[role]) {
      parts.push(`${role}=${t.id} (repetido: se queda ${roles[role]})`);
      continue;
    }
    roles[role] = key;
    parts.push(`${role}=${t.id}`);
  }
  if (Object.keys(roles).length) out.moves[moveId] = roles;
  notes.set(moveId, parts.join(', ') || 'ninguno');
}
for (const [moveId, ourId] of wanted)
  report.push(`  ${ourId} (move_id ${moveId}${names.has(moveId) ? `, ${names.get(moveId)}` : ''}): ${notes.get(moveId) ?? 'sin efectos en asset_index.json'}`);

// Reacción al golpe según la eficacia (la reproduce el juego en cada golpe con daño):
// MATCHUP_IMMUNE (0,5×) = 8, NOT_VERY_EFFECTIVE = 9, NEUTRAL = 10, SUPER_EFFECTIVE = 11.
for (const [matchup, id] of Object.entries({ immune: '8', notVeryEffective: '9', neutral: '10', superEffective: '11' })) {
  const def = index.effects?.[id];
  if (def?.type === 'Sprite') out.hitReactions[matchup] = importEffect(id, def);
}
if (uneven.length) report.push(`  direcciones con otro número de fotogramas (ajustadas): ${uneven.join(', ')}`);
report.push(`  reacciones al golpe: ${Object.entries(out.hitReactions).map(([m, k]) => `${m}=${k}`).join(', ') || 'ninguna'}`);

// Sombras originales (dungeon.bin 995 + paleta 997, extraídas por pmd-scraper en DUNGEON/shadows):
// negras para enemigos y amarillas para los Pokémon del jugador, en 3 tallas (0 pequeña, 1 mediana,
// 2 grande, como el ShadowSize de PMDCollab). El origen es el centro de su dibujo.
const shadowDir = path.join(dir, 'DUNGEON', 'shadows');
const SHADOW_OUT = opt('--shadows', 'public/assets/shadows');
if (fs.existsSync(shadowDir)) {
  fs.mkdirSync(SHADOW_OUT, { recursive: true });
  for (const [kind, k] of [['enemy', 'k'], ['ally', 'y']])
    ['small', 'medium', 'large'].forEach((sz, size) => {
      const file = path.join(shadowDir, `${kind}_${sz}.png`);
      if (!fs.existsSync(file)) return;
      const p = PNG.sync.read(fs.readFileSync(file));
      let x0 = p.width, y0 = p.height, x1 = -1, y1 = -1;
      for (let y = 0; y < p.height; y++)
        for (let x = 0; x < p.width; x++)
          if (p.data[(y * p.width + x) * 4 + 3]) (x0 = Math.min(x0, x)), (y0 = Math.min(y0, y)), (x1 = Math.max(x1, x)), (y1 = Math.max(y1, y));
      fs.copyFileSync(file, path.join(SHADOW_OUT, `${kind}_${sz}.png`));
      out.shadows[`${size}-${k}`] = { url: `assets/shadows/${kind}_${sz}.png`, ox: (x0 + x1 + 1) / 2 / p.width, oy: (y0 + y1 + 1) / 2 / p.height };
    });
}

/*
 * Objetos y casillas del suelo (ITEMS/ y DUNGEON/traps/ de pmd-scraper):
 *  - Objetos: atlas de 16×16 con una fila por dibujo y una columna por paleta; cada
 *    objeto dice su dibujo y su paleta (items.json). Se copia el atlas con la
 *    información de los 1311 objetos y se recorta el icono de los del juego.
 *  - Casillas: dungeon.bin 1033 (traps.trp.img), 35 dibujos de 24×24 en 2 paletas.
 *    El dibujo n es la trampa n de enum trap_id (pmdsky-debug); 27 y 28 son las
 *    escaleras de bajada y subida (coinciden píxel a píxel con las de la hoja de DS).
 */
const ITEMS_OUT = opt('--items', 'public/assets/items/eos');
const TILES_OUT = opt('--tiles', 'public/assets/dungeon/eos');
out.items = {};
out.traps = {};
out.stairs = {};
const itemsDir = path.join(dir, 'ITEMS');
if (fs.existsSync(path.join(itemsDir, 'items.json'))) {
  const info = JSON.parse(fs.readFileSync(path.join(itemsDir, 'items.json'), 'utf8'));
  const atlas = PNG.sync.read(fs.readFileSync(path.join(itemsDir, info.atlas)));
  const C = info.cell;
  fs.mkdirSync(ITEMS_OUT, { recursive: true });
  fs.copyFileSync(path.join(itemsDir, info.atlas), path.join(ITEMS_OUT, 'items_atlas.png'));
  // Celda del atlas: fila = dibujo, columna = paleta.
  const items = Object.entries(info.entries).map(([key, e]) => ({ key, ...e, cell: { x: e.palette * C, y: e.sprite * C } }));
  fs.writeFileSync(path.join(ITEMS_OUT, 'items.json'), JSON.stringify({ source: 'pmd-scraper (ROM propia de Exploradores del Cielo)', atlas: 'items_atlas.png', cell: C, items }));
  // Iconos de los objetos de Pokerift (id en camelCase ↔ clave en snake_case).
  const ourItems = [...fs.readFileSync(ITEMS_TS, 'utf8').matchAll(/^  (\w+): \{$/gm)].map((m) => m[1]);
  const missingItems = [];
  for (const id of ourItems) {
    const e = info.entries[id.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`)];
    if (!e) {
      missingItems.push(id);
      continue;
    }
    const icon = new PNG({ width: C, height: C });
    PNG.bitblt(atlas, icon, e.palette * C, e.sprite * C, C, C, 0, 0);
    fs.writeFileSync(path.join(ITEMS_OUT, `${id}.png`), PNG.sync.write(icon));
    out.items[id] = `assets/items/eos/${id}.png`;
  }
  report.push(`  objetos: ${items.length} en items.json; iconos de ${Object.keys(out.items).length}/${ourItems.length} del juego${missingItems.length ? ` (sin equivalente: ${missingItems.join(', ')})` : ''}`);
}
const trapsDir = path.join(dir, 'DUNGEON', 'traps');
if (fs.existsSync(path.join(trapsDir, 'traps.json'))) {
  const info = JSON.parse(fs.readFileSync(path.join(trapsDir, 'traps.json'), 'utf8'));
  const atlas = PNG.sync.read(fs.readFileSync(path.join(trapsDir, info.atlas)));
  const C = info.cell;
  // enum trap_id de pmdsky-debug (headers/types/dungeon_mode/enums.h); 25–31 no son trampas.
  const NAMES = ['null', 'mud', 'sticky', 'grimy', 'summon', 'pitfall', 'warp', 'gust', 'spin', 'slumber', 'slow', 'seal', 'poison', 'selfdestruct', 'explosion', 'ppZero', 'chestnut', 'wonderTile', 'pokemon', 'spikedTile', 'stealthRock', 'toxicSpikes', 'trip', 'random', 'grudge', null, null, 'stairsDown', 'stairsUp', null, null, null, 'brokenPitfall', null, null];
  fs.mkdirSync(TILES_OUT, { recursive: true });
  const tiles = [];
  for (let n = 0; n < info.rows; n++)
    for (let p = 0; p < info.cols; p++) {
      const img = new PNG({ width: C, height: C });
      PNG.bitblt(atlas, img, p * C, n * C, C, C, 0, 0);
      if (!img.data.some((v, i) => i % 4 === 3 && v)) continue;
      fs.writeFileSync(path.join(TILES_OUT, `tile-${n}-p${p}.png`), PNG.sync.write(img));
      tiles.push({ sprite: n, palette: p, name: NAMES[n] ?? null, file: `tile-${n}-p${p}.png` });
    }
  fs.writeFileSync(path.join(TILES_OUT, 'tiles.json'), JSON.stringify({ source: 'pmd-scraper (dungeon.bin 1033 de una ROM propia)', cell: C, tiles }));
  // Trampas de Pokerift → dibujo. Paleta 0 por defecto [INCIERTO: no se sabe cuándo usa el juego la 1].
  const OURS = { mudTrap: 1, summonTrap: 4, pitfallTrap: 5, warpTrap: 6, spinTrap: 8, slumberTrap: 9, poisonTrap: 12, chestnutTrap: 16, wonderTile: 17 };
  for (const [id, n] of Object.entries(OURS)) if (tiles.some((t) => t.sprite === n && t.palette === 0)) out.traps[id] = `assets/dungeon/eos/tile-${n}-p0.png`;
  if (tiles.some((t) => t.sprite === 27)) out.stairs.down = 'assets/dungeon/eos/tile-27-p0.png';
  if (tiles.some((t) => t.sprite === 28)) out.stairs.up = 'assets/dungeon/eos/tile-28-p0.png';
  report.push(`  casillas del suelo: ${tiles.length} (${info.rows} dibujos × ${info.cols} paletas); trampas del juego: ${Object.keys(out.traps).join(', ')}; escaleras: ${Object.keys(out.stairs).join(', ')}`);
}

// Iconos de estado de la ROM (STATUS_ICONS de pmd-scraper, SYSTEM/manpu_su.sma) para los estados de
// Pokerift que no tienen icono en la hoja de Assets: Despiste (whiffer). [INCIERTO] Ritmo de 10 fps.
out.statusIcons = {};
const iconsDir = path.join(dir, 'STATUS_ICONS');
if (fs.existsSync(path.join(iconsDir, 'status_icons.json'))) {
  const info = JSON.parse(fs.readFileSync(path.join(iconsDir, 'status_icons.json'), 'utf8'));
  for (const [ours, rom] of Object.entries({ whiffer: 'whiffer' })) {
    const meta = info[rom];
    if (!meta || !fs.existsSync(path.join(iconsDir, `${rom}.png`))) continue;
    fs.copyFileSync(path.join(iconsDir, `${rom}.png`), path.join(ASSETS, `status-${ours}.png`));
    out.statusIcons[ours] = { url: `${URL_BASE}/status-${ours}.png`, frameWidth: meta.frame_width, frameHeight: meta.frame_height, frames: meta.frames, frameRate: 10 };
  }
  report.push(`  iconos de estado: ${Object.keys(out.statusIcons).join(', ') || 'ninguno'}`);
}
report.push(`  sombras: ${Object.keys(out.shadows).join(', ') || 'ninguna'}`);


/*
 * Información completa de cada movimiento, para consultarla sin la ROM:
 * <assets>/moves.json con los datos de la tabla (move_data.json), la animación
 * (move_animation_info.json: capas, animación del atacante, proyectil, sonido y
 * excepciones por especie) y, por capa, el efecto (effect_animation_info.json) y
 * su clave importada.
 */
{
  const animDir = path.join(dir, 'DATA', 'animation_data');
  const readJson = (p) => (fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : {});
  const moveAnim = readJson(path.join(animDir, 'move_animation_info.json'));
  const effectInfo = readJson(path.join(animDir, 'effect_animation_info.json'));
  const ids = [...new Set([...romData.keys(), ...Object.keys(moveAnim), ...Object.keys(index.moves ?? {})])].sort((x, y) => x - y);
  const list = ids.map((id) => {
    const { move_id: _id, name, ...data } = romData.get(id) ?? {};
    return {
      id: Number(id),
      name: name ?? null,
      pokerift: [...wanted].find(([e]) => e === id)?.[1] ?? null,
      data: romData.has(id) ? data : null,
      animation: moveAnim[id] ?? null,
      layers: (index.moves?.[id]?.effects ?? []).map((t) => ({
        layer: t.layer,
        trigger: t.trigger,
        effect: Number(t.id),
        type: index.effects?.[t.id]?.type ?? null,
        key: out.effects[`eos-${t.id}`] ? `eos-${t.id}` : null,
        info: effectInfo[t.id] ?? null,
      })),
      fx: out.moves[id] ?? null,
    };
  });
  // Animación del atacante de los movimientos del registro (pokemon_anim_id) y sus
  // excepciones por especie (special_animations: nº de Pokédex → índice de animación).
  for (const [eosId] of wanted) {
    const a = moveAnim[eosId];
    if (!a) continue;
    const bySpecies = {};
    for (const sp of a.special_animations ?? []) if (sp.dex_id && sp.user_animation_index !== undefined) bySpecies[sp.dex_id] ??= sp.user_animation_index;
    out.userAnims[eosId] = { anim: a.pokemon_anim_id, ...(Object.keys(bySpecies).length ? { bySpecies } : {}) };
  }
  fs.writeFileSync(path.join(ASSETS, 'moves.json'), JSON.stringify({ source: 'pmd-scraper (ROM propia de Exploradores del Cielo)', moves: list }));
  report.push(`  moves.json: ${list.length} movimientos (${list.filter((m) => m.fx).length} con animación importada)`);
}

fs.writeFileSync(
  TS,
  `// ARCHIVO GENERADO por tools/import-pmd-scraper.mjs — no editar a mano.\n` +
    `// Fuente: ${path.basename(path.resolve(dir))}/asset_index.json (pmd-scraper, extraído de una ROM).\n` +
    `import type { EffectAsset } from './catalog';\nimport type { FxRole } from './moveFx';\n\n` +
    `export const ROM_MOVE_FX: {\n  moves: Record<string, Partial<Record<FxRole, string>>>;\n  effects: Record<string, EffectAsset>;\n  /** Reacción al golpe por eficacia (clave = Matchup). */\n  hitReactions: Record<string, string>;\n  /** Sombras originales: "<talla>-<k|y>" (k = negra, y = amarilla del jugador); origen = centro del dibujo. */\n  shadows: Record<string, { url: string; ox: number; oy: number }>;\n  /** Animación del atacante por move_id (índice del WAN = <Index> de PMDCollab) y excepciones por nº de Pokédex. */\n  userAnims: Record<string, { anim: number; bySpecies?: Record<string, number> }>;\n  /** Iconos originales de los objetos del juego (id de Pokerift → png). */\n  items: Record<string, string>;\n  /** Casillas originales de las trampas del juego y de las escaleras. */\n  traps: Record<string, string>;\n  stairs: Partial<Record<'up' | 'down', string>>;\n  /** Iconos de estado de la ROM para los estados sin icono en la hoja. */\n  statusIcons: Record<string, EffectAsset>;\n} = ${JSON.stringify(out)};\n`,
);
/*
 * Datos de los movimientos (waza_p.bin). Objetivo y alcance según las enumeraciones
 * move_target / move_range de pmdsky-debug (pmd-scraper ya las traduce a texto).
 */
const TYPES = { None: null, Normal: 'normal', Fire: 'fire', Water: 'water', Grass: 'grass', Electric: 'electric', Ice: 'ice', Fighting: 'fighting', Poison: 'poison', Ground: 'ground', Flying: 'flying', Psychic: 'psychic', Bug: 'bug', Rock: 'rock', Ghost: 'ghost', Dragon: 'dragon', Dark: 'dark', Steel: 'steel' };
const TARGETS = { Enemies: 'enemies', 'Party (including user)': 'party', 'All (including user)': 'all', User: 'self', 'All (except user)': 'all', 'Teammates (excluding user)': 'allies' };
const RANGES = {
  'Front (1 tile)': { kind: 'front' },
  'Front (cuts corners)': { kind: 'frontCutsCorners' },
  'Nearby (8 surrounding tiles)': { kind: 'adjacent' },
  Room: { kind: 'room' },
  'Front_2 (2 tiles, cuts corners, AI unaware)': { kind: 'line', distance: 2 },
  'Front_2 (2 tiles, cuts corners, AI aware)': { kind: 'line', distance: 2 },
  'Front_10 (10 tiles)': { kind: 'line', distance: 10 },
  'User (self-target or front after charging)': { kind: 'self' },
};
const moveData = {};
const skipped = [];
for (const [eosId, ourId] of romData.size ? wanted : []) {
  const d = romData.get(eosId);
  if (!d) {
    skipped.push(`${ourId} (${eosId}): no está en move_data.json`);
    continue;
  }
  const type = TYPES[d.move_type], targets = TARGETS[d.target], range = RANGES[d.range];
  if (type === undefined || !targets || !range) {
    skipped.push(`${ourId} (${eosId}): tipo/objetivo/alcance sin equivalente (${d.move_type} · ${d.target} · ${d.range})`);
    continue;
  }
  moveData[ourId] = {
    eosMoveId: Number(eosId),
    power: d.base_power,
    type,
    category: d.category.toLowerCase(),
    pp: d.pp,
    accuracy: d.accuracy1,
    accuracy2: d.accuracy2,
    critChance: d.crit_chance,
    // 0 golpes = número variable (lo decide el código del movimiento): se deja el de moves.ts.
    ...(d.strikes > 0 ? { hits: d.strikes } : {}),
    targets,
    range,
  };
}
if (romData.size) {
  fs.writeFileSync(
    MOVES_TS,
    '// ARCHIVO GENERADO por tools/import-pmd-scraper.mjs — no editar a mano.\n' +
      `// Fuente: ${path.basename(path.resolve(dir))}/DATA/move_data.json (pmd-scraper: waza_p.bin de una ROM propia).\n` +
      "import type { MoveData } from './moves';\n\n" +
      '/** Datos reales por id de Pokerift (se aplican sobre los provisionales de moves.ts). */\n' +
      `export const ROM_MOVE_DATA: Record<string, Partial<MoveData> & { eosMoveId: number }> = ${JSON.stringify(moveData, null, 1)};\n`,
  );
  console.log(`✔ datos de ${Object.keys(moveData).length} movimientos → ${MOVES_TS}`);
  if (skipped.length) console.log(`  sin importar:\n    ${skipped.join('\n    ')}`);
}

console.log(`Movimientos del registro (${wanted.size}):\n${report.join('\n')}`);
console.log(`✔ ${Object.keys(out.moves).length} movimientos y ${Object.keys(out.effects).length} efectos importados → ${TS}`);
