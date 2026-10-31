/**
 * Inteligencia artificial. Devuelve una Action normal: los enemigos usan
 * exactamente el mismo sistema de validación, movimiento y combate que los
 * jugadores.
 *
 * Percepción (aproximación a PMD): un Pokémon percibe a otro si están en la
 * misma habitación, o a distancia ≤ 2 cuando alguno está en un pasillo.
 * No hay conocimiento global de la posición de los jugadores.
 */
import { ALL_DIRS, type Dir, type Point, chebyshev, dirTowards, samePoint, step } from '../core/geometry';
import { chance, pick } from '../core/rng';
import { NO_EFFECT_MOVES, getMove } from '../data/moves';
import { getSpecies } from '../data/species';
import { roomIdAt, terrainAllowsStep, type DungeonMap } from '../dungeon/map';
import type { Action } from './actions';
import { validateAction } from './actions';
import { resolveTargets } from './targeting';
import { type Entity, type GameState, enemiesOf, entityAt, teamMembers } from './state';
import { randomInteriorPoint } from '../dungeon/generator';

export const CORRIDOR_SIGHT = 2;

export function canPerceive(map: DungeonMap, viewer: Entity, target: Entity): boolean {
  const r1 = roomIdAt(map, viewer.pos);
  if (r1 >= 0 && r1 === roomIdAt(map, target.pos)) return true;
  return chebyshev(viewer.pos, target.pos) <= CORRIDOR_SIGHT;
}

export function decideAction(state: GameState, e: Entity): Action {
  return e.team === 'enemy' ? decideEnemy(state, e) : decideAlly(state, e);
}

function nearest(from: Point, list: Entity[]): Entity | undefined {
  let best: Entity | undefined;
  let bd = Infinity;
  for (const o of list) {
    const d = chebyshev(from, o.pos);
    if (d < bd) [best, bd] = [o, d];
  }
  return best;
}

/** Intenta encontrar un movimiento (con PP) que alcance al objetivo. */
function chooseMove(state: GameState, e: Entity, target: Entity): Action | null {
  const options: Action[] = [];
  e.moves.forEach((slot, i) => {
    if (slot.pp <= 0 || NO_EFFECT_MOVES.has(slot.id)) return;
    const move = getMove(slot.id);
    if (move.targets === 'self') {
      if (chebyshev(e.pos, target.pos) > 1) options.push({ type: 'useMove', slot: i, dir: e.facing });
      return;
    }
    const dir = dirTowards(e.pos, target.pos);
    if (dir === null) return;
    if (resolveTargets(state, e, move, dir).some((t) => t.id === target.id)) options.push({ type: 'useMove', slot: i, dir });
  });
  return options.length ? pick(state.rng, options) : null;
}

function canMeleeHit(state: GameState, e: Entity, target: Entity): Dir | null {
  if (chebyshev(e.pos, target.pos) !== 1) return null;
  const dir = dirTowards(e.pos, target.pos)!;
  return terrainAllowsStep(state.map, e.pos, dir, state.rules.noCornerCutting) ? dir : null;
}

function engage(state: GameState, e: Entity, target: Entity): Action {
  const useChance = getSpecies(e.species).ai?.moveUseChance ?? 35;
  if (chance(state.rng, useChance)) {
    const m = chooseMove(state, e, target);
    if (m) return m;
  }
  const dir = canMeleeHit(state, e, target);
  if (dir !== null) return { type: 'attack', dir };
  const stepDir = pathStep(state, e, target.pos);
  return stepDir !== null ? { type: 'move', dir: stepDir } : { type: 'wait' };
}

function decideEnemy(state: GameState, e: Entity): Action {
  const visible = enemiesOf(state, e).filter((t) => canPerceive(state.map, e, t));
  const target = nearest(e.pos, visible);
  if (target) {
    e.ai.targetId = target.id;
    e.ai.lastSeen = { ...target.pos };
    e.ai.goal = undefined;
    return engage(state, e, target);
  }
  // Va a la última posición donde vio a su objetivo.
  if (e.ai.lastSeen) {
    if (samePoint(e.ai.lastSeen, e.pos)) e.ai.lastSeen = undefined;
    else {
      const d = pathStep(state, e, e.ai.lastSeen);
      if (d !== null) return { type: 'move', dir: d };
      e.ai.lastSeen = undefined;
    }
  }
  return wander(state, e);
}

/** Patrulla: elige una habitación al azar y camina hasta ella. */
function wander(state: GameState, e: Entity): Action {
  if (!e.ai.goal || samePoint(e.ai.goal, e.pos)) {
    e.ai.goal = randomInteriorPoint(state.rng, pick(state.rng, state.map.rooms));
  }
  const d = pathStep(state, e, e.ai.goal);
  if (d === null) {
    e.ai.goal = undefined;
    return { type: 'wait' };
  }
  return { type: 'move', dir: d };
}

/** Compañero controlado por la IA (p. ej. un jugador desconectado): pelea y sigue al equipo. */
function decideAlly(state: GameState, e: Entity): Action {
  const visible = enemiesOf(state, e).filter((t) => canPerceive(state.map, e, t));
  const adjacent = visible.filter((t) => canMeleeHit(state, e, t) !== null);
  if (adjacent.length) return engage(state, e, adjacent[0]);
  const leader = teamMembers(state).find((m) => m.controller === 'player' && m.id !== e.id);
  if (leader && chebyshev(e.pos, leader.pos) > 1) {
    const d = pathStep(state, e, leader.pos);
    if (d !== null) return { type: 'move', dir: d };
  }
  const target = nearest(e.pos, visible);
  if (target && chebyshev(e.pos, target.pos) <= 3) return engage(state, e, target);
  return { type: 'wait' };
}

/**
 * Primer paso de la ruta más corta (BFS en 8 direcciones con la regla de
 * esquinas). Las entidades bloquean salvo la casilla destino. Si no hay ruta
 * libre, prueba ignorando entidades y se queda quieto si el paso está ocupado.
 */
export function pathStep(state: GameState, e: Entity, goal: Point): Dir | null {
  const d = bfs(state, e, goal, true) ?? bfs(state, e, goal, false);
  if (d === null) return null;
  return validateAction(state, e, { type: 'move', dir: d }).ok ? d : null;
}

function bfs(state: GameState, e: Entity, goal: Point, avoidEntities: boolean): Dir | null {
  const { map } = state;
  const W = map.width;
  const startK = e.pos.y * W + e.pos.x;
  const goalK = goal.y * W + goal.x;
  if (startK === goalK) return null;
  const firstDir = new Map<number, Dir>();
  const queue: Point[] = [e.pos];
  firstDir.set(startK, -1 as Dir);
  // Recorrido en orden de direcciones fijo → determinista.
  while (queue.length) {
    const p = queue.shift()!;
    const pk = p.y * W + p.x;
    for (const d of ALL_DIRS) {
      if (!terrainAllowsStep(map, p, d, state.rules.noCornerCutting)) continue;
      const q = step(p, d);
      const qk = q.y * W + q.x;
      if (firstDir.has(qk)) continue;
      if (avoidEntities && qk !== goalK) {
        const occ = entityAt(state, q);
        if (occ && occ.id !== e.id) continue;
      }
      const fd = pk === startK ? d : firstDir.get(pk)!;
      if (qk === goalK) return fd;
      firstDir.set(qk, fd);
      queue.push(q);
    }
  }
  return null;
}
