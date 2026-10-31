import { createRng } from '../src/shared/core/rng';
import { SKY_RULES } from '../src/shared/data/rules';
import { type DungeonMap, Tile } from '../src/shared/dungeon/map';
import { createPokemon } from '../src/shared/engine/factory';
import type { Entity, GameState, Team } from '../src/shared/engine/state';

/**
 * Construye un mapa a partir de un dibujo ASCII:
 *   '#' pared, '.' suelo de habitación (id 0), ',' pasillo, '>' escalera.
 */
export function mapFrom(rows: string[]): DungeonMap {
  const height = rows.length;
  const width = rows[0].length;
  const tiles: Tile[] = [];
  const roomAt: number[] = [];
  let stairs = { x: 0, y: 0 };
  rows.forEach((row, y) =>
    [...row].forEach((ch, x) => {
      tiles.push(ch === '#' ? Tile.Wall : Tile.Floor);
      roomAt.push(ch === '.' || ch === '>' ? 0 : -1);
      if (ch === '>') stairs = { x, y };
    }),
  );
  return { width, height, tiles, roomAt, rooms: [{ id: 0, x: 1, y: 1, w: width - 2, h: height - 2 }], stairs };
}

export function blankState(rows: string[], seed = 1): GameState {
  return {
    version: 1,
    rules: { ...SKY_RULES },
    dungeonId: 'expedition',
    seed,
    floor: 1,
    turn: 0,
    floorTurn: 0,
    rng: createRng(seed),
    map: mapFrom(rows),
    entities: [],
    items: [],
    traps: [],
    players: [],
    bag: [],
    money: 0,
    result: null,
    stats: { enemiesDefeated: 0, itemsCollected: 0, turns: 0, floorsCleared: 0 },
    nextId: 1,
    spawnCountdown: 9999,
  };
}

export function addMon(state: GameState, species: string, x: number, y: number, team: Team, level = 1, playerId?: string): Entity {
  const e = createPokemon(state, species, level, team, { x, y }, { playerId });
  state.entities.push(e);
  if (playerId) state.players.push({ playerId, name: playerId, entityId: e.id, connected: true });
  return e;
}

export const ROOM_7x5 = [
  '#########',
  '#.......#',
  '#.......#',
  '#.......#',
  '#.......#',
  '#.......#',
  '#########',
];
