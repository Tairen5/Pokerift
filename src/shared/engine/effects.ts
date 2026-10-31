/**
 * Efectos con consecuencias sobre el estado: daño, curación, debilitamiento,
 * experiencia y ejecución completa de un movimiento.
 */
import { chance, int } from '../core/rng';
import type { Dir } from '../core/geometry';
import { type MoveData, getMove } from '../data/moves';
import { getSpecies } from '../data/species';
import { getItem } from '../data/items';
import type { Matchup } from '../data/types';
import { blocksSecondaryEffects, contactParalysis } from './abilities';
import { computeDamage, rollHit } from './combat';
import type { EventLog } from './events';
import { expYield, grantExp } from './stats';
import { applyStatus, changeStage } from './status';
import { resolveTargets } from './targeting';
import { type Entity, type GameState, teamMembers } from './state';

const MATCHUP_TEXT = {
  superEffective: '¡Es muy eficaz!',
  notVeryEffective: 'No es muy eficaz...',
  immune: 'Apenas le afecta...',
  neutral: '',
} as const;

export function heal(e: Entity, amount: number, log: EventLog): number {
  const real = Math.min(amount, e.maxHp - e.hp);
  if (real <= 0) return 0;
  e.hp += real;
  log.push({ t: 'heal', id: e.id, amount: real, hp: e.hp });
  return real;
}

/**
 * Aplica daño. `killer` recibe el crédito (experiencia) si la víctima cae.
 */
export function dealDamage(
  state: GameState,
  target: Entity,
  amount: number,
  log: EventLog,
  killer?: Entity,
  extra?: { matchup?: Matchup; critical?: boolean; source?: string },
): void {
  if (target.fainted) return;
  target.hp = Math.max(0, target.hp - amount);
  log.push({ t: 'damage', id: target.id, amount, hp: target.hp, ...extra });
  if (target.hp <= 0) faint(state, target, log, killer);
}

export function faint(state: GameState, e: Entity, log: EventLog, killer?: Entity): void {
  // Semilla Revivir en la mochila compartida del equipo: se consume sola.
  if (e.team === 'team') {
    const idx = state.bag.findIndex((b) => getItem(b.item).autoOnFaint);
    if (idx >= 0) {
      const [seed] = state.bag.splice(idx, 1);
      e.hp = e.maxHp;
      e.statuses = [];
      log.msg(`¡${e.name} se ha debilitado!`);
      log.msg(`¡La ${getItem(seed.item).name} ha revivido a ${e.name}!`);
      log.push({ t: 'revive', id: e.id, hp: e.hp });
      return;
    }
  }
  e.fainted = true;
  e.hp = 0;
  e.statuses = [];
  log.push({ t: 'faint', id: e.id });
  log.msg(`¡${e.name} se ha debilitado!`);

  if (e.team === 'enemy') {
    state.entities = state.entities.filter((x) => x.id !== e.id);
    if (killer && killer.team === 'team') {
      state.stats.enemiesDefeated++;
      const amount = expYield(getSpecies(e.species), e.level);
      const receivers = state.rules.expSharing === 'allMembersFull' ? teamMembers(state) : [killer];
      for (const r of receivers) if (!r.fainted) grantExp(r, amount, log);
    }
  }
}

/**
 * Ejecuta un movimiento (incluido el ataque normal) ya validado.
 * Consume PP si `slotIndex` se indica.
 */
export function executeMove(state: GameState, user: Entity, move: MoveData, dir: Dir, log: EventLog, slotIndex?: number): void {
  user.facing = dir;
  if (slotIndex !== undefined) user.moves[slotIndex].pp--;
  log.push({ t: 'useMove', id: user.id, move: move.id, dir });
  if (move.id !== 'regularAttack') log.msg(`¡${user.name} usa ${move.name}!`);

  const targets = resolveTargets(state, user, move, dir);
  if (targets.length === 0) {
    if (move.id !== 'regularAttack') log.msg('Pero no ha afectado a nadie.');
    return;
  }

  for (const target of targets) {
    if (target.fainted || user.fainted) continue;
    const hits = move.hitsRange ? int(state.rng, move.hitsRange[0], move.hitsRange[1]) : move.hits ?? 1;
    for (let h = 0; h < hits && !target.fainted; h++) {
      let dealt = 0;
      if (!rollHit(user, target, move, state.rng)) {
        log.push({ t: 'miss', id: target.id, by: user.id });
        log.msg(`¡El ataque de ${user.name} ha fallado!`);
        break;
      }
      if (move.category !== 'status') {
        const r = computeDamage(state, user, target, move, state.rng);
        if (r.critical) log.msg('¡Golpe crítico!');
        if (MATCHUP_TEXT[r.matchup]) log.msg(MATCHUP_TEXT[r.matchup]);
        log.msg(`${target.name} recibe ${r.damage} de daño.`);
        dealt = r.damage;
        dealDamage(state, target, r.damage, log, user, { matchup: r.matchup, critical: r.critical });
        if (!target.fainted && contactParalysis(target, move, state.rng)) applyStatus(state, user, 'paralysis', log);
      }
      applyMoveEffects(state, user, target, move, log, dealt);
    }
  }
}

function applyMoveEffects(state: GameState, user: Entity, target: Entity, move: MoveData, log: EventLog, dealt: number) {
  for (const eff of move.effects ?? []) {
    if (eff.kind === 'drain') {
      const healed = dealt > 0 && !user.fainted ? heal(user, Math.max(1, Math.floor((dealt * eff.percent) / 100)), log) : 0;
      if (healed) log.msg(`${user.name} absorbe ${healed} HP.`);
      continue;
    }
    const who = eff.on === 'user' ? user : target;
    if (who.fainted) continue;
    const secondary = move.category !== 'status' && eff.on === 'target';
    if (secondary && blocksSecondaryEffects(target)) continue;
    switch (eff.kind) {
      case 'status':
        if (chance(state.rng, eff.chance)) applyStatus(state, who, eff.status, log);
        break;
      case 'stage':
        if (chance(state.rng, eff.chance)) changeStage(who, eff.stat, eff.stages, log);
        break;
      case 'healPercent': {
        const healed = heal(who, Math.max(1, Math.floor((who.maxHp * eff.percent) / 100)), log);
        if (healed) log.msg(`${who.name} recupera ${healed} HP.`);
        break;
      }
    }
  }
}

export const REGULAR_ATTACK = getMove('regularAttack');
