/**
 * Acciones de una entidad: definición, validación y ejecución.
 *
 * Coste de turno (centralizado en TURN_COST):
 *   move, attack, useMove, useItem, pickup, wait → consumen turno.
 *   face (girarse sin moverse)                    → NO consume turno.
 *   stairs                                        → termina el piso (no hay turno restante).
 * Una acción inválida se rechaza sin consumir turno (p. ej. caminar contra
 * una pared o un enemigo: en PMD solo te giras).
 */
import { type Dir, ALL_DIRS, step } from '../core/geometry';
import { pick } from '../core/rng';
import { getMove } from '../data/moves';
import { getItem } from '../data/items';
import { isWalkable, terrainAllowsStep } from '../dungeon/map';
import { REGULAR_ATTACK, executeMove } from './effects';
import type { EventLog } from './events';
import { isUsable, pickUp, useItem } from './items';
import { triggerTrapAt } from './traps';
import { type Entity, type GameState, entityAt, itemAt } from './state';

export type Action =
  | { type: 'move'; dir: Dir }
  | { type: 'attack'; dir?: Dir }
  | { type: 'useMove'; slot: number; dir?: Dir }
  | { type: 'useItem'; bagUid: string }
  | { type: 'pickup' }
  | { type: 'wait' }
  | { type: 'face'; dir: Dir }
  | { type: 'stairs' };

export const TURN_COST: Record<Action['type'], boolean> = {
  move: true,
  attack: true,
  useMove: true,
  useItem: true,
  pickup: true,
  wait: true,
  face: false,
  stairs: true,
};

export type Validation = { ok: true } | { ok: false; reason: string };

const isDir = (d: unknown): d is Dir => typeof d === 'number' && Number.isInteger(d) && d >= 0 && d < 8;

/** Validación estructural + reglas. Sirve tanto en cliente como en servidor (no se confía en el cliente). */
export function validateAction(state: GameState, e: Entity | undefined, a: Action | unknown): Validation {
  if (!e || e.fainted) return { ok: false, reason: 'El Pokémon no puede actuar.' };
  if (state.result) return { ok: false, reason: 'La expedición ha terminado.' };
  if (!a || typeof a !== 'object' || !('type' in a)) return { ok: false, reason: 'Acción mal formada.' };
  const act = a as Action;
  switch (act.type) {
    case 'move': {
      if (!isDir(act.dir)) return { ok: false, reason: 'Dirección inválida.' };
      if (!terrainAllowsStep(state.map, e.pos, act.dir, state.rules.noCornerCutting))
        return { ok: false, reason: 'No se puede pasar por ahí.' };
      const occ = entityAt(state, step(e.pos, act.dir));
      if (occ && !(occ.team === e.team && state.rules.swapWithTeammates))
        return { ok: false, reason: 'La casilla está ocupada.' };
      return { ok: true };
    }
    case 'face':
      return isDir(act.dir) ? { ok: true } : { ok: false, reason: 'Dirección inválida.' };
    case 'attack':
      return act.dir === undefined || isDir(act.dir) ? { ok: true } : { ok: false, reason: 'Dirección inválida.' };
    case 'useMove': {
      if (act.dir !== undefined && !isDir(act.dir)) return { ok: false, reason: 'Dirección inválida.' };
      const slot = e.moves[act.slot];
      if (!Number.isInteger(act.slot) || !slot) return { ok: false, reason: 'Movimiento inexistente.' };
      if (slot.pp <= 0) return { ok: false, reason: '¡No quedan PP para ese movimiento!' };
      return { ok: true };
    }
    case 'useItem': {
      const entry = state.bag.find((b) => b.uid === act.bagUid);
      if (!entry) return { ok: false, reason: 'Ese objeto no está en la mochila.' };
      if (!isUsable(entry.item)) return { ok: false, reason: `${getItem(entry.item).name} no se puede usar así.` };
      return { ok: true };
    }
    case 'pickup':
      if (!itemAt(state, e.pos)) return { ok: false, reason: 'No hay nada en el suelo.' };
      if (state.bag.length >= state.rules.bagCapacity && getItem(itemAt(state, e.pos)!.item).effect.kind !== 'money')
        return { ok: false, reason: 'La mochila está llena.' };
      return { ok: true };
    case 'stairs':
      if (e.pos.x !== state.map.stairs.x || e.pos.y !== state.map.stairs.y)
        return { ok: false, reason: 'No hay escaleras aquí.' };
      return { ok: true };
    case 'wait':
      return { ok: true };
    default:
      return { ok: false, reason: 'Acción desconocida.' };
  }
}

export type ActionOutcome = 'done' | 'nextFloor';

/**
 * Ejecuta una acción ya validada. `confused` hace que movimientos y ataques
 * salgan en una dirección aleatoria (como en PMD).
 */
export function performAction(state: GameState, e: Entity, act: Action, log: EventLog, confused = false): ActionOutcome {
  const randomDir = () => pick(state.rng, ALL_DIRS);
  switch (act.type) {
    case 'face':
      e.facing = act.dir;
      log.push({ t: 'face', id: e.id, dir: act.dir });
      return 'done';
    case 'wait':
      return 'done';
    case 'move': {
      let dir = act.dir;
      if (confused) {
        dir = randomDir();
        const v = validateAction(state, e, { type: 'move', dir });
        if (!v.ok) {
          e.facing = dir;
          log.push({ t: 'face', id: e.id, dir });
          log.msg(`${e.name} está confuso y se tambalea.`);
          return 'done';
        }
      }
      return moveEntity(state, e, dir, log);
    }
    case 'attack':
      executeMove(state, e, REGULAR_ATTACK, confused ? randomDir() : (act.dir ?? e.facing), log);
      return 'done';
    case 'useMove':
      executeMove(state, e, getMove(e.moves[act.slot].id), confused ? randomDir() : (act.dir ?? e.facing), log, act.slot);
      return 'done';
    case 'useItem':
      useItem(state, e, act.bagUid, log);
      return 'done';
    case 'pickup':
      pickUp(state, e, itemAt(state, e.pos)!, log);
      return 'done';
    case 'stairs':
      return 'nextFloor';
  }
}

function moveEntity(state: GameState, e: Entity, dir: Dir, log: EventLog): ActionOutcome {
  const from = { ...e.pos };
  const to = step(e.pos, dir);
  const occ = entityAt(state, to);
  e.facing = dir;
  if (occ) {
    // Intercambio con un compañero.
    occ.pos = { ...from };
    occ.facing = ((dir + 4) % 8) as Dir;
    log.push({ t: 'move', id: occ.id, from: to, to: from, dir: occ.facing });
  }
  e.pos = to;
  log.push({ t: 'move', id: e.id, from, to, dir });

  if (e.team === 'team') {
    const fi = itemAt(state, to);
    if (fi) pickUp(state, e, fi, log);
    if (triggerTrapAt(state, e, log) === 'pitfall') return 'nextFloor';
    if (isWalkable(state.map, to) && to.x === state.map.stairs.x && to.y === state.map.stairs.y && e.controller === 'player') {
      log.msg('Hay unas escaleras. Pulsa [Intro] para avanzar.');
    }
  }
  return 'done';
}
