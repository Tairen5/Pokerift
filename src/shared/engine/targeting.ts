/**
 * Resolución de alcances (patrones de impacto) sobre la cuadrícula.
 */
import { ALL_DIRS, type Dir, chebyshev, step } from '../core/geometry';
import { roomIdAt, terrainAllowsStep, isWalkable } from '../dungeon/map';
import type { MoveData } from '../data/moves';
import { type Entity, type GameState, entityAt, livingEntities } from './state';

/** Radio que cubre un movimiento de "habitación" cuando el usuario está en un pasillo. */
export const CORRIDOR_ROOM_RADIUS = 2;

export function isValidTarget(user: Entity, target: Entity, move: MoveData): boolean {
  if (target.fainted) return false;
  switch (move.targets) {
    case 'enemies':
      return target.team !== user.team;
    case 'allies':
      return target.team === user.team && target.id !== user.id;
    case 'party':
      return target.team === user.team;
    case 'self':
      return target.id === user.id;
    case 'all':
      return target.id !== user.id;
  }
}

/** Devuelve las entidades afectadas por `move` usado por `user` mirando en `dir`. */
export function resolveTargets(state: GameState, user: Entity, move: MoveData, dir: Dir): Entity[] {
  const map = state.map;
  const corner = state.rules.noCornerCutting;
  const valid = (e: Entity | undefined): e is Entity => !!e && isValidTarget(user, e, move);

  switch (move.range.kind) {
    case 'self':
      return [user];
    case 'front':
    case 'frontCutsCorners': {
      const cuts = move.range.kind === 'frontCutsCorners';
      const to = step(user.pos, dir);
      if (!isWalkable(map, to)) return [];
      if (!cuts && !terrainAllowsStep(map, user.pos, dir, corner)) return [];
      const t = entityAt(state, to);
      return valid(t) ? [t] : [];
    }
    case 'line': {
      // Proyectil: avanza hasta topar con pared o con el primer objetivo válido.
      if (!terrainAllowsStep(map, user.pos, dir, corner)) return [];
      let p = user.pos;
      for (let i = 0; i < move.range.distance; i++) {
        p = step(p, dir);
        if (!isWalkable(map, p)) return [];
        const t = entityAt(state, p);
        if (valid(t)) return [t];
      }
      return [];
    }
    case 'adjacent': {
      const out: Entity[] = [];
      for (const d of ALL_DIRS) {
        if (!terrainAllowsStep(map, user.pos, d, corner)) continue;
        const t = entityAt(state, step(user.pos, d));
        if (valid(t)) out.push(t);
      }
      return out;
    }
    case 'room': {
      const room = roomIdAt(map, user.pos);
      return livingEntities(state).filter((e) => {
        if (!valid(e)) return false;
        if (room >= 0) return roomIdAt(map, e.pos) === room;
        return chebyshev(user.pos, e.pos) <= CORRIDOR_ROOM_RADIUS;
      });
    }
  }
}
