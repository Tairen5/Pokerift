/**
 * Definiciones de mazmorras. Cada mazmorra describe sus pisos por tramos: propiedades del piso
 * (las mismas que lee el generador del juego), enemigos posibles (con nivel) y objetos.
 * El tileset es solo una clave visual.
 */
import { ITEMS } from './items';
import { TRAPS } from './traps';
import { ROM_EXPEDITION } from './expedition.rom.generated';

export interface SpawnEntry {
  species: string;
  level: number;
  weight: number;
}

export interface ItemSpawn {
  item: string;
  weight: number;
}

/**
 * Distribución del piso (enum floor_layout de los dos juegos, mismo orden: 0 large … 11 medium).
 * 'small' y 'medium' son la rejilla normal con solo la mitad / tres cuartos izquierdos utilizables.
 */
export type FloorLayout =
  | 'large' | 'small' | 'oneRoomMonsterHouse' | 'outerRing' | 'crossroads' | 'twoRoomsMonsterHouse'
  | 'line' | 'cross' | 'large0x8' | 'beetle' | 'outerRooms' | 'medium';

export const FLOOR_LAYOUTS: readonly FloorLayout[] = [
  'large', 'small', 'oneRoomMonsterHouse', 'outerRing', 'crossroads', 'twoRoomsMonsterHouse',
  'line', 'cross', 'large0x8', 'beetle', 'outerRooms', 'medium',
];

/**
 * Propiedades de un piso: subconjunto de struct floor_properties (pmd-red FloorProperties,
 * pmdsky-debug) con los campos que usa el generador. Los nombres siguen a los originales.
 */
export interface FloorProperties {
  layout: FloorLayout;
  /** Salas: n..n+2 si es positivo; exactamente |n| si es negativo. */
  roomDensity: number;
  /** Pasos del paseo aleatorio que conecta las celdas de la rejilla. */
  floorConnectivity: number;
  /** Enemigos iniciales: entre n/2 y n-1 (+1 en EoS); negativo = exactamente |n|. */
  enemyDensity: number;
  /** Si es false, las anclas de pasillo sin salida reciben otra conexión. */
  allowDeadEnds: boolean;
  /** room_flags bit 2: paredes irregulares en las salas. */
  roomImperfections: boolean;
  /** Objetos: n±2 (mínimo 1; +1 en EoS). */
  itemDensity: number;
  /** Trampas: entre n/2 y n-1. */
  trapDensity: number;
  /** Paseos de pasillos extra (callejones y bucles). */
  extraHallways: number;
  /** Probabilidad (%) de Casa de Monstruos. [Sin efecto en el juego todavía] */
  monsterHouseChance?: number;
}

export interface TrapSpawn {
  trap: string;
  weight: number;
}

export interface FloorBand {
  fromFloor: number;
  toFloor: number;
  floor: FloorProperties;
  enemies: SpawnEntry[];
  items: ItemSpawn[];
  /** Trampas posibles con su peso (sin lista: todas las de TRAPS con su peso por defecto). */
  traps?: TrapSpawn[];
  /** Nombre que se muestra en este tramo (cada tramo de la expedición es una mazmorra distinta). */
  name?: string;
  /** Tileset de este tramo (si no, el de la mazmorra). */
  tileset?: string;
  /** Cada cuántos turnos aparece un enemigo nuevo (0 = nunca). */
  spawnInterval: number;
  maxEnemies: number;
}

export interface DungeonData {
  id: string;
  name: string;
  floors: number;
  tileset: string;
  /** Sentido de la escalera (gráfico): las mazmorras "B1F, B2F…" bajan. */
  stairs: 'up' | 'down';
  bands: FloorBand[];
}

/** Trampas de la ROM (enum trap_id) → trampas de Pokerift. Las que no existen aún se descartan. */
const ROM_TRAPS: Record<string, string> = {
  mud: 'mudTrap', summon: 'summonTrap', pitfall: 'pitfallTrap', warp: 'warpTrap', spin: 'spinTrap',
  slumber: 'slumberTrap', poison: 'poisonTrap', chestnut: 'chestnutTrap', wonderTile: 'wonderTile',
};

/**
 * Expedición de 25 pisos: las 5 primeras mazmorras de Exploradores del Cielo (Cueva Bajamar,
 * Risco Calado, Monte Árido, Cueva Cascada y Manzanar), 5 pisos de cada una, con sus datos reales
 * de mappa_s.bin (tools/import-rom-dungeons.mjs): propiedades del piso, Pokémon con su nivel y peso,
 * objetos y trampas, y su tileset. Los objetos y trampas que Pokerift no tiene se descartan
 * (los pesos de los demás se mantienen).
 * [INCIERTO] Ritmo de aparición de enemigos nuevos y máximo por piso (no se han localizado).
 */
function expeditionBands(): FloorBand[] {
  if (!ROM_EXPEDITION) return [];
  const bands: FloorBand[] = [];
  for (const seg of ROM_EXPEDITION)
    for (const f of seg.floors) {
      const n = bands.length + 1;
      bands.push({
        fromFloor: n, toFloor: n, name: seg.name, tileset: seg.tileset,
        floor: {
          layout: (FLOOR_LAYOUTS as readonly string[]).includes(f.layout) ? (f.layout as FloorLayout) : 'large',
          roomDensity: f.roomDensity, floorConnectivity: f.floorConnectivity, enemyDensity: f.enemyDensity,
          allowDeadEnds: f.allowDeadEnds, roomImperfections: f.roomImperfections, itemDensity: f.itemDensity,
          trapDensity: f.trapDensity, extraHallways: f.extraHallways, monsterHouseChance: f.monsterHouseChance,
        },
        enemies: f.enemies.map((e) => ({ species: e.species, level: e.level, weight: e.weight })),
        items: f.items.filter((i) => ITEMS[i.item]).map((i) => ({ item: i.item, weight: i.weight })),
        traps: f.traps.filter((t) => ROM_TRAPS[t.trap] && TRAPS[ROM_TRAPS[t.trap]]).map((t) => ({ trap: ROM_TRAPS[t.trap], weight: t.weight })),
        spawnInterval: 36, maxEnemies: 8,
      });
    }
  return bands;
}

/**
 * Bosque Diminuto (Equipo de Rescate), de reserva si no se ha importado la expedición de la ROM.
 * Propiedades reales de pret/pmd-red, data/dungeon/TinyWoods/main_data.inc [VERIFICADO].
 */
const TINY_WOODS_FLOOR: FloorProperties = {
  layout: 'small', roomDensity: 5, floorConnectivity: 15, enemyDensity: 4, allowDeadEnds: false,
  roomImperfections: false, itemDensity: 2, trapDensity: 0, extraHallways: 5,
};
const TINY_WOODS_BANDS: FloorBand[] = [
  {
    fromFloor: 1, toFloor: 3, name: 'Bosque Diminuto', tileset: 'tinywoods', floor: TINY_WOODS_FLOOR,
    enemies: [{ species: 'pidgey', level: 1, weight: 3 }, { species: 'sunkern', level: 1, weight: 3 }, { species: 'wurmple', level: 1, weight: 3 }],
    items: [{ item: 'poke', weight: 4 }, { item: 'oranBerry', weight: 3 }], spawnInterval: 36, maxEnemies: 8,
  },
];

const BANDS = expeditionBands();

export const DUNGEONS: Record<string, DungeonData> = {
  expedition: {
    id: 'expedition',
    name: 'Expedición',
    floors: BANDS.length ? BANDS.length : 3,
    tileset: BANDS[0]?.tileset ?? 'tinywoods',
    // [INCIERTO] Todas bajan (B1F…) en el juego salvo Monte Árido, que sube; aquí todo baja.
    stairs: 'down',
    bands: BANDS.length ? BANDS : TINY_WOODS_BANDS,
  },
};

/** Mazmorra por defecto (la salida de la Encrucijada). */
export const DEFAULT_DUNGEON = 'expedition';

export function getDungeon(id: string): DungeonData {
  const d = DUNGEONS[id];
  if (!d) throw new Error(`Mazmorra desconocida: ${id}`);
  return d;
}

export function bandForFloor(d: DungeonData, floor: number): FloorBand {
  return d.bands.find((b) => floor >= b.fromFloor && floor <= b.toFloor) ?? d.bands[d.bands.length - 1];
}

/** Nombre que se muestra en un piso: el de su tramo (la mazmorra de EoS) o el de la mazmorra. */
export function floorName(d: DungeonData, floor: number): string {
  return bandForFloor(d, floor).name ?? d.name;
}

/** Tileset de un piso. */
export function floorTileset(d: DungeonData, floor: number): string {
  return bandForFloor(d, floor).tileset ?? d.tileset;
}
