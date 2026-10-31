/**
 * Aplicación, actualización y eliminación de estados alterados.
 */
import { int, chance } from '../core/rng';
import { STATUSES, type StatusId } from '../data/statuses';
import type { StatStageId } from '../data/moves';
import { blocksStageDrop } from './abilities';
import type { EventLog } from './events';
import { STAGE_MAX, STAGE_MIN } from './stats';
import { type Entity, type GameState, hasStatus } from './state';

const STAT_NAMES: Record<StatStageId, string> = {
  atk: 'Ataque', def: 'Defensa', spAtk: 'At. Esp.', spDef: 'Def. Esp.', accuracy: 'Precisión', evasion: 'Evasión',
};

export function applyStatus(state: GameState, e: Entity, id: StatusId, log: EventLog): boolean {
  const data = STATUSES[id];
  if (e.fainted) return false;
  if (hasStatus(e, id) || (data.group === 'major' && e.statuses.some((s) => STATUSES[s.id].group === 'major'))) {
    log.push({ t: 'status', id: e.id, status: id, applied: false });
    log.msg(`No afecta a ${e.name}.`);
    return false;
  }
  const turnsLeft = data.duration ? int(state.rng, data.duration[0], data.duration[1]) : null;
  e.statuses.push({ id, turnsLeft, counter: 0 });
  log.push({ t: 'status', id: e.id, status: id, applied: true });
  log.msg(`¡${e.name} está ${data.name.toLowerCase()}!`);
  return true;
}

export function cureStatus(e: Entity, ids: StatusId[] | 'all', log: EventLog): boolean {
  const before = e.statuses.length;
  e.statuses = e.statuses.filter((s) => ids !== 'all' && !ids.includes(s.id));
  const cured = e.statuses.length !== before;
  if (cured) log.msg(`${e.name} se ha recuperado.`);
  return cured;
}

export function changeStage(e: Entity, stat: StatStageId, delta: number, log: EventLog): void {
  if (delta < 0 && blocksStageDrop(e, stat)) {
    log.msg(`¡La ${STAT_NAMES[stat]} de ${e.name} no baja!`);
    return;
  }
  const before = e.stages[stat];
  e.stages[stat] = Math.max(STAGE_MIN, Math.min(STAGE_MAX, before + delta));
  const real = e.stages[stat] - before;
  if (real === 0) {
    log.msg(`La ${STAT_NAMES[stat]} de ${e.name} no puede ${delta > 0 ? 'subir' : 'bajar'} más.`);
    return;
  }
  log.push({ t: 'stage', id: e.id, stat, delta: real });
  log.msg(`¡${real > 0 ? 'Sube' : 'Baja'} la ${STAT_NAMES[stat]} de ${e.name}!`);
}

export type ActionGate = 'act' | 'skip' | 'confused';

/** Decide si la entidad puede actuar este turno según sus estados. */
export function actionGate(state: GameState, e: Entity, log: EventLog): ActionGate {
  for (const s of e.statuses) {
    const data = STATUSES[s.id];
    // Media velocidad: pierde uno de cada dos turnos (el contador del estado sube cada turno).
    if (data.halfSpeed && s.counter % 2 === 1) {
      log.msg(`${e.name} va lento y no llega a actuar.`);
      return 'skip';
    }
    if (data.preventsAction) {
      log.msg(`${e.name} está ${data.name.toLowerCase()}.`);
      return 'skip';
    }
    if (data.skipChance && chance(state.rng, data.skipChance)) {
      log.msg(`¡${e.name} está paralizado y no puede moverse!`);
      return 'skip';
    }
  }
  return e.statuses.some((s) => STATUSES[s.id].randomDirection) ? 'confused' : 'act';
}

/**
 * Fin de turno de una entidad: daño periódico y duración.
 * Devuelve el daño total para que el llamador gestione el debilitamiento.
 */
export function tickStatuses(e: Entity, log: EventLog): number {
  let damage = 0;
  for (const s of [...e.statuses]) {
    const data = STATUSES[s.id];
    s.counter++;
    if (data.damage && data.damageInterval && s.counter % data.damageInterval === 0) damage += data.damage;
    if (s.turnsLeft !== null) {
      s.turnsLeft--;
      if (s.turnsLeft <= 0) {
        e.statuses = e.statuses.filter((x) => x !== s);
        log.push({ t: 'status', id: e.id, status: s.id, applied: false });
        log.msg(s.id === 'sleep' ? `${e.name} se ha despertado.` : `${e.name} ya no está ${data.name.toLowerCase()}.`);
      }
    }
  }
  return damage;
}

export function blocksRegen(e: Entity): boolean {
  return e.statuses.some((s) => STATUSES[s.id].blocksRegen);
}
