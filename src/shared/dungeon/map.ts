import { type Point, Dir, DIR_DELTA, isDiagonal, step } from '../core/geometry';

export enum Tile {
  Wall = 0,
  Floor = 1,
}

export interface Room {
  id: number;
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Datos lógicos del mapa: independientes de cualquier tileset. Serializable. */
export interface DungeonMap {
  width: number;
  height: number;
  tiles: Tile[];
  /** id de habitación por casilla, -1 = pasillo o pared. */
  roomAt: number[];
  rooms: Room[];
  stairs: Point;
}

export function inBounds(map: DungeonMap, p: Point): boolean {
  return p.x >= 0 && p.y >= 0 && p.x < map.width && p.y < map.height;
}

export function tileAt(map: DungeonMap, p: Point): Tile {
  if (!inBounds(map, p)) return Tile.Wall;
  return map.tiles[p.y * map.width + p.x];
}

export function isWalkable(map: DungeonMap, p: Point): boolean {
  return tileAt(map, p) === Tile.Floor;
}

export function roomIdAt(map: DungeonMap, p: Point): number {
  if (!inBounds(map, p)) return -1;
  return map.roomAt[p.y * map.width + p.x];
}

/**
 * Regla de esquinas de Mundo Misterioso: un paso diagonal solo es posible si
 * las dos casillas ortogonales que "rodea" no son pared.
 */
export function canStepDiagonal(map: DungeonMap, from: Point, d: Dir): boolean {
  if (!isDiagonal(d)) return true;
  const dd = DIR_DELTA[d];
  return isWalkable(map, { x: from.x + dd.x, y: from.y }) && isWalkable(map, { x: from.x, y: from.y + dd.y });
}

/** ¿Se puede pasar (moverse/atacar) de `from` en dirección `d` según el terreno? */
export function terrainAllowsStep(map: DungeonMap, from: Point, d: Dir, cornerRule: boolean): boolean {
  const to = step(from, d);
  if (!isWalkable(map, to)) return false;
  return !cornerRule || canStepDiagonal(map, from, d);
}

export function floorTiles(map: DungeonMap): Point[] {
  const out: Point[] = [];
  for (let y = 0; y < map.height; y++)
    for (let x = 0; x < map.width; x++) if (map.tiles[y * map.width + x] === Tile.Floor) out.push({ x, y });
  return out;
}

export function roomTiles(map: DungeonMap, room: Room): Point[] {
  const out: Point[] = [];
  for (let y = room.y; y < room.y + room.h; y++) for (let x = room.x; x < room.x + room.w; x++) out.push({ x, y });
  return out;
}
