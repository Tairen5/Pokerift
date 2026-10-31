/**
 * Especies. El formato replica la información de monster.md + m_level.bin de
 * Exploradores del Cielo:
 *   - baseStats: estadísticas a nivel 1 (monster.md).
 *   - growth: ganancia por nivel. Puede ser una tabla explícita por nivel
 *     (formato m_level.bin: HP/Atk/AtkEsp/Def/DefEsp por nivel + exp total)
 *     o una tasa media provisional.
 *
 * Con la ROM importada (npm run import:species, tools/import-rom-species.mjs),
 * tipos, habilidades, estadísticas a nivel 1, crecimiento de los 100 niveles
 * (con la experiencia de cada uno), experiencia base y movimientos por nivel son
 * los REALES de EoS (species.rom.generated.ts) y se aplican sobre los de aquí.
 * Sin ROM, las cifras de este archivo son PROVISIONALES [INCIERTO].
 * Las especies jugables proceden de las listas de iniciales/compañeros de
 * Exploradores del Cielo; los enemigos, de las primeras mazmorras.
 */
import type { PokeType } from './types';
import { ROM_SPECIES } from './species.rom.generated';

export interface Stats {
  hp: number;
  atk: number;
  spAtk: number;
  def: number;
  spDef: number;
}

export interface LevelRow extends Stats {
  /** Experiencia TOTAL necesaria para alcanzar este nivel (como en m_level.bin). */
  exp: number;
}

export type Growth =
  | { kind: 'table'; rows: LevelRow[] } // rows[0] = nivel 1
  | { kind: 'rate'; perLevel: Stats; expCurve: 'provisional' };

export interface LearnsetEntry {
  level: number;
  move: string;
}

export interface SpeciesData {
  id: string;
  name: string;
  types: PokeType[];
  abilities: string[];
  baseStats: Stats;
  growth: Growth;
  /** Experiencia base que otorga al ser derrotado. */
  baseExp: number;
  learnset: LearnsetEntry[];
  /** Movimiento de huevo que el juego da a este inicial al empezar (STARTER_MOVES_ARRAY, AddStarterEggMove). */
  starterEggMove?: string;
  playable: boolean;
  /** Clave en el catálogo de recursos (sprites/retratos). */
  sprite: string;
  /** Color del placeholder mientras no haya sprite. */
  color: string;
  ai?: { /** Probabilidad (%) de usar un movimiento en vez del ataque normal. */ moveUseChance?: number };
}

const rate = (hp: number, atk: number, spAtk: number, def: number, spDef: number): Growth => ({
  kind: 'rate',
  perLevel: { hp, atk, spAtk, def, spDef },
  expCurve: 'provisional',
});

/**
 * Enemigo cuyos datos (tipos, habilidades, estadísticas, crecimiento, experiencia y movimientos) salen
 * de la ROM (species.rom.generated). Sin ROM importada, valores provisionales de un solo tipo.
 */
const enemy = (id: string, name: string, type: PokeType, color: string): SpeciesData => ({
  id, name, types: [type], abilities: [], baseStats: { hp: 12, atk: 5, spAtk: 5, def: 5, spDef: 5 }, growth: rate(2.6, 1.2, 1.2, 1.1, 1.1),
  baseExp: 10, playable: false, sprite: id, color, learnset: [{ level: 1, move: 'tackle' }], ai: { moveUseChance: 45 },
});

const BASE_SPECIES: Record<string, SpeciesData> = {
  // ── Jugables (iniciales / compañeros de EoS) ──────────────────────────────
  pikachu: {
    id: 'pikachu', name: 'Pikachu', types: ['electric'], abilities: ['static'],
    baseStats: { hp: 13, atk: 7, spAtk: 7, def: 5, spDef: 5 }, growth: rate(3, 1.6, 1.6, 1.2, 1.2),
    baseExp: 10, playable: true, sprite: 'pikachu', color: '#f8d030',
    learnset: [{ level: 1, move: 'thunderShock' }, { level: 1, move: 'growl' }, { level: 1, move: 'tailWhip' }, { level: 5, move: 'quickAttack' }],
  },
  charmander: {
    id: 'charmander', name: 'Charmander', types: ['fire'], abilities: ['blaze'],
    baseStats: { hp: 13, atk: 6, spAtk: 7, def: 5, spDef: 5 }, growth: rate(3, 1.5, 1.7, 1.2, 1.3),
    baseExp: 10, playable: true, sprite: 'charmander', color: '#f08030',
    learnset: [{ level: 1, move: 'scratch' }, { level: 1, move: 'growl' }, { level: 1, move: 'ember' }, { level: 6, move: 'smokescreen' }],
  },
  squirtle: {
    id: 'squirtle', name: 'Squirtle', types: ['water'], abilities: ['torrent'],
    baseStats: { hp: 14, atk: 5, spAtk: 6, def: 7, spDef: 6 }, growth: rate(3, 1.3, 1.4, 1.6, 1.5),
    baseExp: 10, playable: true, sprite: 'squirtle', color: '#6890f0',
    learnset: [{ level: 1, move: 'tackle' }, { level: 1, move: 'tailWhip' }, { level: 1, move: 'waterGun' }, { level: 7, move: 'bite' }],
  },
  bulbasaur: {
    id: 'bulbasaur', name: 'Bulbasaur', types: ['grass', 'poison'], abilities: ['overgrow'],
    baseStats: { hp: 14, atk: 6, spAtk: 7, def: 6, spDef: 7 }, growth: rate(3, 1.4, 1.6, 1.4, 1.6),
    baseExp: 10, playable: true, sprite: 'bulbasaur', color: '#78c850',
    learnset: [{ level: 1, move: 'tackle' }, { level: 1, move: 'growl' }, { level: 1, move: 'vineWhip' }, { level: 7, move: 'razorLeaf' }],
  },
  cyndaquil: {
    id: 'cyndaquil', name: 'Cyndaquil', types: ['fire'], abilities: ['blaze'],
    baseStats: { hp: 13, atk: 6, spAtk: 7, def: 5, spDef: 6 }, growth: rate(3, 1.5, 1.7, 1.2, 1.4),
    baseExp: 10, playable: true, sprite: 'cyndaquil', color: '#e8a040',
    learnset: [{ level: 1, move: 'tackle' }, { level: 1, move: 'leer' }, { level: 1, move: 'ember' }, { level: 6, move: 'smokescreen' }],
  },
  totodile: {
    id: 'totodile', name: 'Totodile', types: ['water'], abilities: ['torrent'],
    baseStats: { hp: 14, atk: 7, spAtk: 5, def: 6, spDef: 5 }, growth: rate(3, 1.7, 1.2, 1.5, 1.2),
    baseExp: 10, playable: true, sprite: 'totodile', color: '#4878c0',
    learnset: [{ level: 1, move: 'scratch' }, { level: 1, move: 'leer' }, { level: 1, move: 'waterGun' }, { level: 6, move: 'bite' }],
  },
  chikorita: {
    id: 'chikorita', name: 'Chikorita', types: ['grass'], abilities: ['overgrow'],
    baseStats: { hp: 14, atk: 5, spAtk: 6, def: 7, spDef: 7 }, growth: rate(3, 1.3, 1.4, 1.6, 1.6),
    baseExp: 10, playable: true, sprite: 'chikorita', color: '#a0d060',
    learnset: [{ level: 1, move: 'tackle' }, { level: 1, move: 'growl' }, { level: 1, move: 'razorLeaf' }, { level: 6, move: 'absorb' }],
  },
  // Iniciales de Hoenn (también elegibles en Exploradores del Cielo). Como en el resto, el
  // movimiento de su tipo se adelanta a nivel 1. [INCIERTO] Niveles de aprendizaje y cifras.
  treecko: {
    id: 'treecko', name: 'Treecko', types: ['grass'], abilities: ['overgrow'],
    baseStats: { hp: 13, atk: 6, spAtk: 7, def: 5, spDef: 6 }, growth: rate(3, 1.5, 1.6, 1.2, 1.4),
    baseExp: 10, playable: true, sprite: 'treecko', color: '#58b058',
    learnset: [{ level: 1, move: 'pound' }, { level: 1, move: 'leer' }, { level: 1, move: 'absorb' }, { level: 6, move: 'quickAttack' }],
  },
  torchic: {
    id: 'torchic', name: 'Torchic', types: ['fire'], abilities: ['blaze'],
    baseStats: { hp: 13, atk: 7, spAtk: 7, def: 5, spDef: 5 }, growth: rate(3, 1.6, 1.6, 1.2, 1.2),
    baseExp: 10, playable: true, sprite: 'torchic', color: '#f09040',
    learnset: [{ level: 1, move: 'scratch' }, { level: 1, move: 'growl' }, { level: 1, move: 'ember' }, { level: 6, move: 'sandAttack' }],
  },
  mudkip: {
    id: 'mudkip', name: 'Mudkip', types: ['water'], abilities: ['torrent'],
    baseStats: { hp: 14, atk: 7, spAtk: 6, def: 6, spDef: 6 }, growth: rate(3, 1.6, 1.3, 1.4, 1.4),
    baseExp: 10, playable: true, sprite: 'mudkip', color: '#58a8e0',
    learnset: [{ level: 1, move: 'tackle' }, { level: 1, move: 'growl' }, { level: 1, move: 'waterGun' }, { level: 6, move: 'mudSlap' }],
  },
  meowth: {
    id: 'meowth', name: 'Meowth', types: ['normal'], abilities: ['pickup'],
    baseStats: { hp: 13, atk: 7, spAtk: 5, def: 5, spDef: 5 }, growth: rate(3, 1.6, 1.2, 1.2, 1.2),
    baseExp: 10, playable: true, sprite: 'meowth', color: '#e8d8a0',
    learnset: [{ level: 1, move: 'scratch' }, { level: 1, move: 'growl' }, { level: 1, move: 'bite' }, { level: 6, move: 'furyCutter' }],
  },

  // ── Enemigos: Bosque Diminuto (Tiny Woods) de Equipo de Rescate Rojo/Azul ──
  // [VERIFICADO] Mystery Dungeon Wiki y WikiDex: Pidgey, Sunkern y Wurmple (P1-P3),
  // Exeggcute (P3). Movimientos: los que aprenden a nivel bajo en la 3.ª generación.
  pidgey: {
    id: 'pidgey', name: 'Pidgey', types: ['normal', 'flying'], abilities: ['keenEye'],
    baseStats: { hp: 11, atk: 5, spAtk: 4, def: 4, spDef: 4 }, growth: rate(2.5, 1.2, 1, 1, 1),
    baseExp: 9, playable: false, sprite: 'pidgey', color: '#c0a070',
    learnset: [{ level: 1, move: 'tackle' }, { level: 5, move: 'sandAttack' }, { level: 9, move: 'gust' }],
    ai: { moveUseChance: 40 },
  },
  sunkern: {
    id: 'sunkern', name: 'Sunkern', types: ['grass'], abilities: ['chlorophyll'],
    baseStats: { hp: 10, atk: 4, spAtk: 5, def: 4, spDef: 4 }, growth: rate(2.5, 0.9, 1.1, 0.9, 0.9),
    baseExp: 8, playable: false, sprite: 'sunkern', color: '#e8d040',
    learnset: [{ level: 1, move: 'absorb' }, { level: 1, move: 'growth' }],
    ai: { moveUseChance: 50 },
  },
  wurmple: {
    id: 'wurmple', name: 'Wurmple', types: ['bug'], abilities: ['shieldDust'],
    baseStats: { hp: 12, atk: 5, spAtk: 3, def: 5, spDef: 3 }, growth: rate(2.6, 1.1, 0.7, 1, 0.8),
    baseExp: 10, playable: false, sprite: 'wurmple', color: '#d05050',
    learnset: [{ level: 1, move: 'tackle' }, { level: 1, move: 'stringShot' }, { level: 5, move: 'poisonSting' }],
    ai: { moveUseChance: 40 },
  },
  exeggcute: {
    id: 'exeggcute', name: 'Exeggcute', types: ['grass', 'psychic'], abilities: ['chlorophyll'],
    baseStats: { hp: 13, atk: 5, spAtk: 6, def: 6, spDef: 4 }, growth: rate(2.8, 1, 1.3, 1.3, 0.8),
    baseExp: 12, playable: false, sprite: 'exeggcute', color: '#f0c0c0',
    learnset: [{ level: 1, move: 'barrage' }, { level: 1, move: 'hypnosis' }],
    ai: { moveUseChance: 45 },
  },

  // ── Enemigos de la expedición de 25 pisos (mappa_s.bin de EoS; ver data/dungeons.ts) ──
  shellder: enemy('shellder', 'Shellder', 'water', '#9078c0'),
  kabuto: enemy('kabuto', 'Kabuto', 'rock', '#b08850'),
  corsola: enemy('corsola', 'Corsola', 'water', '#f08890'),
  shellos: enemy('shellos', 'Shellos', 'water', '#e080b0'),
  lileep: enemy('lileep', 'Lileep', 'rock', '#c070c0'),
  anorith: enemy('anorith', 'Anorith', 'rock', '#90a0a8'),
  chingling: enemy('chingling', 'Chingling', 'psychic', '#f0d070'),
  machop: enemy('machop', 'Machop', 'fighting', '#90a0c0'),
  geodude: enemy('geodude', 'Geodude', 'rock', '#a09070'),
  doduo: enemy('doduo', 'Doduo', 'normal', '#b08060'),
  spinarak: enemy('spinarak', 'Spinarak', 'bug', '#70b060'),
  starly: enemy('starly', 'Starly', 'normal', '#806050'),
  nidorina: enemy('nidorina', 'Nidorina', 'poison', '#80a8d0'),
  nidorino: enemy('nidorino', 'Nidorino', 'poison', '#c080c0'),
  psyduck: enemy('psyduck', 'Psyduck', 'water', '#f0d060'),
  poliwag: enemy('poliwag', 'Poliwag', 'water', '#6080c0'),
  grimer: enemy('grimer', 'Grimer', 'poison', '#a070b0'),
  tangela: enemy('tangela', 'Tangela', 'grass', '#4070b0'),
  wooper: enemy('wooper', 'Wooper', 'water', '#70b0e0'),
  lotad: enemy('lotad', 'Lotad', 'water', '#60b060'),
  surskit: enemy('surskit', 'Surskit', 'bug', '#80a0e0'),
  barboach: enemy('barboach', 'Barboach', 'water', '#7090a0'),
  whiscash: enemy('whiscash', 'Whiscash', 'water', '#5080b0'),
  caterpie: enemy('caterpie', 'Caterpie', 'bug', '#80c050'),
  butterfree: enemy('butterfree', 'Butterfree', 'bug', '#a090d0'),
  oddish: enemy('oddish', 'Oddish', 'grass', '#5070b0'),
  paras: enemy('paras', 'Paras', 'bug', '#e08040'),
  hoppip: enemy('hoppip', 'Hoppip', 'grass', '#f0a0c0'),
  budew: enemy('budew', 'Budew', 'grass', '#80c060'),
  burmy: enemy('burmy', 'Burmy', 'bug', '#60a050'),
  weedle: enemy('weedle', 'Weedle', 'bug', '#d0a050'),
  exeggutor: enemy('exeggutor', 'Exeggutor', 'grass', '#c0b060'),
  gloom: enemy('gloom', 'Gloom', 'grass', '#7070b0'),
  combee: enemy('combee', 'Combee', 'bug', '#f0c040'),
  kakuna: enemy('kakuna', 'Kakuna', 'bug', '#e0c040'),
  beedrill: enemy('beedrill', 'Beedrill', 'bug', '#e0c040'),
};

/** Catálogo final: los datos reales de la ROM (si se ha importado) sobre los provisionales. */
export const SPECIES: Record<string, SpeciesData> = Object.fromEntries(
  Object.entries(BASE_SPECIES).map(([id, s]) => {
    const rom = ROM_SPECIES[id];
    if (!rom) return [id, s];
    const { mdIndex: _md, dex: _dex, ...data } = rom;
    return [id, { ...s, ...data }];
  }),
);

/** ¿Vienen los datos de las especies de la ROM? */
export const HAS_ROM_SPECIES = Object.keys(ROM_SPECIES).length > 0;

export function getSpecies(id: string): SpeciesData {
  const s = SPECIES[id];
  if (!s) throw new Error(`Especie desconocida: ${id}`);
  return s;
}

export const PLAYABLE_SPECIES = Object.values(SPECIES).filter((s) => s.playable).map((s) => s.id);
