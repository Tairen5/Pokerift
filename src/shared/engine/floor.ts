/**
 * Población de pisos y transición entre pisos.
 */
import { type RngState, createRng, hashSeed, int, next, pick, weighted } from '../core/rng';
import { ALL_DIRS, type Point, chebyshev, samePoint, step } from '../core/geometry';
import { bandForFloor, floorName, getDungeon } from '../data/dungeons';
import { TRAPS } from '../data/traps';
import { generateFloor } from '../dungeon/generator';
import { isWalkable, roomIdAt, floorTiles } from '../dungeon/map';
import type { EventLog } from './events';
import { createPokemon } from './factory';
import { NEUTRAL_STAGES } from './stats';
import { type GameState, entityAt, itemAt, newId, teamMembers, trapAt } from './state';

/** Casilla libre de entidades, objetos, trampas y escalera. */
function isFree(state: GameState, p: Point): boolean {
  return (
    isWalkable(state.map, p) &&
    !entityAt(state, p) &&
    !itemAt(state, p) &&
    !trapAt(state, p) &&
    !samePoint(p, state.map.stairs)
  );
}

/**
 * Semilla de un piso: depende solo de la semilla de la expedición, la mazmorra y el número de piso.
 * Así el piso N de una semilla es siempre el mismo, hagan lo que hagan los jugadores antes.
 */
export function floorSeed(seed: number, dungeonId: string, floor: number): number {
  return hashSeed(`${seed >>> 0}:${dungeonId}:${floor}`);
}

/**
 * Genera el piso `state.floor` y coloca al equipo, enemigos, objetos y trampas en los puntos que
 * decide el generador (como SpawnNonEnemies/SpawnEnemies del juego). Usa un RNG propio del piso, no
 * el de la partida.
 */
export function buildFloor(state: GameState, log?: EventLog): void {
  const dungeon = getDungeon(state.dungeonId);
  const band = bandForFloor(dungeon, state.floor);
  const rng = createRng(floorSeed(state.seed, state.dungeonId, state.floor));
  const gen = generateFloor(rng, band.floor, state.rules.floorGen);
  state.map = gen.map;
  state.items = [];
  state.traps = [];
  state.floorTurn = 0;
  state.spawnCountdown = band.spawnInterval;
  // Los enemigos no persisten entre pisos.
  state.entities = state.entities.filter((e) => e.team === 'team');

  // Equipo: el líder en el punto de aparición y los demás alrededor.
  const anchor = gen.player;
  for (const member of teamMembers(state, true)) {
    if (member.fainted) {
      member.pos = { x: -1, y: -1 };
      continue;
    }
    member.pos = nearestFree(state, anchor) ?? anchor;
    // [INCIERTO] Al cambiar de piso se reinician etapas y estados.
    member.stages = { ...NEUTRAL_STAGES };
    member.statuses = [];
    member.ai = {};
  }

  for (const p of gen.enemies) if (!entityAt(state, p)) spawnEnemy(state, p, rng);

  for (const p of gen.items) {
    const item = weighted(rng, band.items.map((it) => ({ value: it.item, weight: it.weight })));
    // [INCIERTO] Cantidad de Poké por montón.
    state.items.push({ id: newId(state, 'i'), item, pos: p, amount: item === 'poke' ? int(rng, 5, 30) * state.floor : 1 });
  }

  // Trampas del tramo (las de la ROM); sin lista, todas las de TRAPS con su peso por defecto.
  const trapTable = (band.traps ?? Object.values(TRAPS).map((t) => ({ trap: t.id, weight: t.weight }))).map((t) => ({ value: t.trap, weight: t.weight }));
  for (const p of gen.traps) {
    if (!trapTable.some((t) => t.weight > 0)) break;
    const trap = weighted(rng, trapTable);
    state.traps.push({ id: newId(state, 't'), trap, pos: p, revealed: !!TRAPS[trap].visible });
  }

  log?.push({ t: 'floor', floor: state.floor });
  log?.msg(`${floorName(dungeon, state.floor)} — Piso ${state.floor}`);
}

export function spawnEnemy(state: GameState, p: Point, rng: RngState = state.rng) {
  const band = bandForFloor(getDungeon(state.dungeonId), state.floor);
  const entry = weighted(rng, band.enemies.map((e) => ({ value: e, weight: e.weight })));
  const enemy = createPokemon(state, entry.species, entry.level, 'enemy', p);
  enemy.facing = pick(rng, ALL_DIRS);
  state.entities.push(enemy);
  return enemy;
}

/** Casilla libre más cercana (BFS en anillos) a `p`. */
export function nearestFree(state: GameState, p: Point, allowItems = false): Point | null {
  for (let r = 0; r < 6; r++) {
    for (let dy = -r; dy <= r; dy++)
      for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        const q = { x: p.x + dx, y: p.y + dy };
        if (allowItems ? isWalkable(state.map, q) && !entityAt(state, q) : isFree(state, q)) return q;
      }
  }
  return null;
}

/**
 * Intento periódico de aparición de un enemigo, lejos de la vista del equipo
 * (fuera de sus habitaciones y a más de 4 casillas).
 */
export function trySpawnEnemy(state: GameState, log: EventLog): void {
  const band = bandForFloor(getDungeon(state.dungeonId), state.floor);
  if (band.spawnInterval <= 0) return;
  if (--state.spawnCountdown > 0) return;
  state.spawnCountdown = band.spawnInterval;
  const enemies = state.entities.filter((e) => e.team === 'enemy' && !e.fainted);
  if (enemies.length >= band.maxEnemies) return;
  const team = teamMembers(state);
  const teamRooms = new Set(team.map((m) => roomIdAt(state.map, m.pos)).filter((r) => r >= 0));
  const options = floorTiles(state.map).filter(
    (p) =>
      isFree(state, p) &&
      !teamRooms.has(roomIdAt(state.map, p)) &&
      team.every((m) => chebyshev(m.pos, p) > 4),
  );
  if (!options.length) return;
  const e = spawnEnemy(state, options[Math.floor(next(state.rng) * options.length)]);
  log.push({ t: 'spawn', id: e.id });
}

/** Coloca a un enemigo invocado alrededor de `p`. */
export function summonAround(state: GameState, p: Point, count: number, log: EventLog): void {
  let n = 0;
  for (const d of ALL_DIRS) {
    if (n >= count) break;
    const q = step(p, d);
    if (isWalkable(state.map, q) && !entityAt(state, q)) {
      const e = spawnEnemy(state, q);
      log.push({ t: 'spawn', id: e.id });
      n++;
    }
  }
}
