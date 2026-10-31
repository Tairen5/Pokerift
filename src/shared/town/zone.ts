/**
 * Zonas explorables fuera de las mazmorras: los exteriores de Exploradores del
 * Cielo (Risco Sharpedo, Aldea Tesoro, Encrucijada, playa y gremio). Todo es
 * declarativo: el mapa (imagen, animaciones y rejilla de colisión, generados por
 * tools/build-town.mjs), puntos de llegada, salidas y edificios. El movimiento
 * es libre (en píxeles, 8 direcciones) y sin turnos, como en las ciudades de PMD.
 *
 * Este módulo es lógica pura: lo usan el cliente (movimiento/predicción) y el
 * servidor (validación de posiciones y cambios de zona en cooperativo).
 */
import { Dir, type Point } from '../core/geometry';
import { BEACH_MAP } from './zones/beach.generated';
import { BLUFF_MAP } from './zones/bluff.generated';
import { CROSSROADS_MAP } from './zones/crossroads.generated';
import { GUILD_MAP } from './zones/guild.generated';
import { HOME_MAP } from './zones/home.generated';
import { TOWN_MAP } from './zones/town.generated';

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Agua animada: tira de fotogramas dibujada en (x, y), bajo el mapa (asoma por sus huecos) o encima. */
export interface ZoneAnim {
  key: string;
  image: string;
  frames: number;
  w: number;
  h: number;
  x: number;
  y: number;
  under: boolean;
  /** De la segunda capa del mapa (se dibuja sobre la primera, detrás de los Pokémon). */
  upper?: boolean;
  /** Duración de cada fotograma [INCIERTO]. */
  ms: number;
}

/** Objeto colocado por la escena del juego (GROUND/*.wan): imagen en (x, y); baseY = su punto de apoyo (orden de dibujo). */
export interface ZoneProp {
  key: string;
  image: string;
  x: number;
  y: number;
  w: number;
  h: number;
  baseY: number;
}

/** NPC de decorado (escena de entrada del juego): especie del catálogo, posición del apoyo y dirección (Dir). */
export interface ZoneNpc {
  species: string;
  x: number;
  y: number;
  dir: number;
}

/** Parte generada de una zona (tools/build-town.mjs). */
export interface ZoneMap {
  /** Ruta de la imagen (relativa a /public). */
  image: string;
  /** Segunda capa del mapa (sobre la primera, detrás de los Pokémon); solo en los mapas de la ROM. */
  upper?: string | null;
  /**
   * Dónde cae, en este mapa, la esquina del ripeo para el que están escritas
   * las llegadas y salidas de ZONE_LIST (mapas de la ROM, tools/import-rom-town.mjs).
   */
  origin?: Point;
  /** Objetos y NPC de la escena de entrada del juego (tools/import-rom-town.mjs). */
  props?: ZoneProp[];
  npcs?: ZoneNpc[];
  width: number;
  height: number;
  /** Color bajo el agua animada (null = negro). */
  fill: string | null;
  anims: ZoneAnim[];
  cellSize: number;
  /** Filas de la rejilla: '.' transitable, '#' bloqueado. */
  collision: readonly string[];
}

/** Destino de una salida. */
export type ExitTarget =
  | { kind: 'dungeon'; dungeonId: string } //      comienza una expedición (va todo el grupo)
  | { kind: 'zone'; zoneId: string; entry: string }; // pasa a otra zona (cada jugador por su cuenta)

export interface ZoneExit {
  id: string;
  label: string;
  /** Área (px) que activa la salida al pisarla. */
  rect: Rect;
  /** Sin destino o deshabilitada = "próximamente". */
  target?: ExitTarget;
  enabled: boolean;
}

/** Punto de llegada a una zona, mirando en una dirección. */
export interface ZoneEntry extends Point {
  dir: Dir;
}

/**
 * Edificio o punto de interés, preparado para el futuro (tiendas, banco...):
 * de momento ninguno tiene servicio, así que la lista puede estar vacía.
 */
export interface ZoneBuilding {
  id: string;
  name: string;
  /** Área frente a la puerta donde se puede interactuar. */
  door: Rect;
  service?: string;
}

export interface ZoneDef extends ZoneMap {
  id: string;
  name: string;
  entries: Record<string, ZoneEntry>;
  exits: ZoneExit[];
  buildings: ZoneBuilding[];
}

const zoneExit = (id: string, label: string, rect: Rect, zoneId: string, entry: string): ZoneExit => ({
  id, label, rect, target: { kind: 'zone', zoneId, entry }, enabled: true,
});

/** Traslada llegadas, salidas y edificios (escritos sobre el ripeo) al mapa importado de la ROM. */
function placed(z: ZoneDef): ZoneDef {
  const o = z.origin;
  if (!o || (!o.x && !o.y)) return z;
  const r = (q: Rect): Rect => ({ ...q, x: q.x + o.x, y: q.y + o.y });
  return {
    ...z,
    entries: Object.fromEntries(Object.entries(z.entries).map(([k, e]) => [k, { ...e, x: e.x + o.x, y: e.y + o.y }])),
    exits: z.exits.map((e) => ({ ...e, rect: r(e.rect) })),
    buildings: z.buildings.map((b) => ({ ...b, door: r(b.door) })),
  };
}

/*
 * Conexiones según Bulbapedia: el Risco Sharpedo queda al oeste de la Aldea
 * Tesoro y la Encrucijada al este; desde la Encrucijada se va al gremio (norte),
 * a la playa (sur) y a las mazmorras (este). Los nombres en español de la
 * Encrucijada, la playa y el gremio son [INCIERTO].
 */
const ZONE_LIST: ZoneDef[] = [
  {
    ...HOME_MAP,
    id: 'home',
    name: 'Casa (Risco Sharpedo)',
    entries: {
      start: { x: 228, y: 150, dir: Dir.S },
      fromBluff: { x: 229, y: 104, dir: Dir.S },
    },
    exits: [zoneExit('up', 'Salir', { x: 212, y: 80, w: 34, h: 8 }, 'bluff', 'fromHome')],
    buildings: [],
  },
  {
    ...BLUFF_MAP,
    id: 'bluff',
    name: 'Risco Sharpedo',
    entries: {
      fromHome: { x: 230, y: 166, dir: Dir.S },
      fromTown: { x: 436, y: 172, dir: Dir.W },
    },
    exits: [
      zoneExit('home', 'Casa', { x: 214, y: 126, w: 32, h: 14 }, 'home', 'fromBluff'),
      zoneExit('east', 'Aldea Tesoro', { x: 447, y: 140, w: 10, h: 60 }, 'town', 'fromBluff'),
    ],
    buildings: [],
  },
  {
    ...TOWN_MAP,
    id: 'town',
    name: 'Aldea Tesoro',
    entries: {
      fromBluff: { x: 16, y: 190, dir: Dir.E },
      fromCrossroads: { x: 1124, y: 186, dir: Dir.W },
    },
    exits: [
      zoneExit('west', 'Risco Sharpedo', { x: 0, y: 160, w: 10, h: 60 }, 'bluff', 'fromTown'),
      zoneExit('east', 'Encrucijada', { x: 1142, y: 160, w: 10, h: 60 }, 'crossroads', 'fromTown'),
    ],
    buildings: [],
  },
  {
    ...CROSSROADS_MAP,
    id: 'crossroads',
    name: 'Encrucijada',
    entries: {
      fromTown: { x: 16, y: 190, dir: Dir.E },
      fromGuild: { x: 218, y: 24, dir: Dir.S },
      fromBeach: { x: 218, y: 384, dir: Dir.N },
      fromDungeon: { x: 412, y: 190, dir: Dir.W },
    },
    exits: [
      zoneExit('west', 'Aldea Tesoro', { x: 0, y: 160, w: 10, h: 60 }, 'town', 'fromCrossroads'),
      zoneExit('north', 'Gremio de Wigglytuff', { x: 192, y: 0, w: 52, h: 10 }, 'guild', 'fromCrossroads'),
      zoneExit('south', 'Playa', { x: 192, y: 412, w: 52, h: 10 }, 'beach', 'fromCrossroads'),
      { id: 'east', label: 'Mazmorras', rect: { x: 422, y: 160, w: 10, h: 60 }, target: { kind: 'dungeon', dungeonId: 'expedition' }, enabled: true },
    ],
    buildings: [],
  },
  {
    ...BEACH_MAP,
    id: 'beach',
    name: 'Playa',
    entries: { fromCrossroads: { x: 772, y: 160, dir: Dir.W } },
    exits: [
      zoneExit('east', 'Encrucijada', { x: 782, y: 130, w: 10, h: 64 }, 'crossroads', 'fromBeach'),
      { id: 'cave', label: 'Cueva de la Playa', rect: { x: 72, y: 132, w: 14, h: 28 }, enabled: false },
    ],
    buildings: [],
  },
  {
    ...GUILD_MAP,
    id: 'guild',
    name: 'Gremio de Wigglytuff',
    entries: { fromCrossroads: { x: 211, y: 280, dir: Dir.N } },
    exits: [
      zoneExit('south', 'Encrucijada', { x: 180, y: 298, w: 62, h: 10 }, 'crossroads', 'fromGuild'),
      { id: 'door', label: 'Gremio de Wigglytuff', rect: { x: 198, y: 84, w: 26, h: 10 }, enabled: false },
    ],
    buildings: [],
  },
];

export const ZONES: Record<string, ZoneDef> = Object.fromEntries(ZONE_LIST.map((z) => [z.id, placed(z)]));

/** Dónde aparece el grupo al empezar (dentro de casa) y al volver de una expedición. */
export const START_PLACE = { zoneId: 'home', entry: 'start' } as const;
export const RETURN_PLACE = { zoneId: 'crossroads', entry: 'fromDungeon' } as const;

export function getZone(id: string): ZoneDef {
  const z = ZONES[id];
  if (!z) throw new Error(`Zona desconocida: ${id}`);
  return z;
}

/** Medio ancho de la "huella" de un personaje (px) para las colisiones. */
export const FOOT_RADIUS = 5;
/** Velocidades en px/s (caminar y correr). */
export const WALK_SPEED = 80;
export const RUN_SPEED = 150;

export function isWalkablePx(zone: ZoneMap, x: number, y: number): boolean {
  if (x < 0 || y < 0 || x >= zone.width || y >= zone.height) return false;
  const row = zone.collision[Math.floor(y / zone.cellSize)];
  return !!row && row[Math.floor(x / zone.cellSize)] === '.';
}

/** ¿Cabe la huella de un personaje en (x, y)? */
export function canStand(zone: ZoneMap, x: number, y: number, r = FOOT_RADIUS): boolean {
  return (
    isWalkablePx(zone, x - r, y - r) &&
    isWalkablePx(zone, x + r, y - r) &&
    isWalkablePx(zone, x - r, y + r) &&
    isWalkablePx(zone, x + r, y + r) &&
    isWalkablePx(zone, x, y)
  );
}

/**
 * Desplaza un personaje con colisión y "deslizamiento": si el movimiento
 * diagonal choca, se intenta cada eje por separado.
 */
export function moveActor(zone: ZoneMap, pos: Point, dx: number, dy: number): Point {
  const nx = pos.x + dx, ny = pos.y + dy;
  if (canStand(zone, nx, ny)) return { x: nx, y: ny };
  if (dx && canStand(zone, nx, pos.y)) return { x: nx, y: pos.y };
  if (dy && canStand(zone, pos.x, ny)) return { x: pos.x, y: ny };
  return { ...pos };
}

/** ¿Se puede ir en línea recta de a a b sin atravesar obstáculos? (muestreo cada 3 px) */
export function canTraverse(zone: ZoneMap, a: Point, b: Point): boolean {
  const dist = Math.hypot(b.x - a.x, b.y - a.y);
  const n = Math.max(1, Math.ceil(dist / 3));
  for (let i = 1; i <= n; i++) {
    const t = i / n;
    if (!canStand(zone, a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t)) return false;
  }
  return true;
}

export function inRect(r: Rect, x: number, y: number, margin = 0): boolean {
  return x >= r.x - margin && y >= r.y - margin && x < r.x + r.w + margin && y < r.y + r.h + margin;
}

export function exitAt(zone: ZoneDef, x: number, y: number, margin = 0): ZoneExit | undefined {
  return zone.exits.find((e) => inRect(e.rect, x, y, margin));
}

/** Separación entre jugadores que llegan al mismo punto (no aparecen uno encima de otro). */
const SPREAD: readonly Point[] = [{ x: 0, y: 0 }, { x: -18, y: 0 }, { x: 18, y: 0 }, { x: 0, y: 18 }, { x: 0, y: -18 }, { x: -18, y: 18 }, { x: 18, y: 18 }];

/** Punto de llegada n-ésimo a una entrada: el primero libre de la lista de separaciones. */
export function entryPoint(zone: ZoneDef, entry: string, index = 0): ZoneEntry {
  const e = zone.entries[entry];
  if (!e) throw new Error(`Entrada desconocida: ${zone.id}.${entry}`);
  const free = SPREAD.map((o) => ({ x: e.x + o.x, y: e.y + o.y })).filter((p) => canStand(zone, p.x, p.y) && !exitAt(zone, p.x, p.y, 4));
  const p = free[index % Math.max(1, free.length)] ?? e;
  return { x: p.x, y: p.y, dir: e.dir };
}
