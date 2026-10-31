/**
 * Cálculo de daño y precisión de Exploradores del Cielo.
 *
 * Fórmula base [VERIFICADO: guías de mecánicas de daño de T/D/S]:
 *   base = (A + P)·39168/65536 − D/2 + 50·ln(10·((A − D)/8 + L + 50)) − 311
 *   con el argumento de ln acotado a [1, 4095], y dividido por Y = 340/256
 *   si el atacante no es del equipo del jugador.
 *   Después se multiplica por (R + 57344)/65536 con R ∈ [0, 16383].
 *
 * Multiplicadores de efectividad [VERIFICADO: pmdsky-debug]: ver rules.ts.
 * [INCIERTO] Tratamiento exacto de daños base muy bajos, orden de algunos
 * multiplicadores, STAB y crítico.
 */
import { type RngState, int, next } from '../core/rng';
import type { MoveData } from '../data/moves';
import { getSpecies } from '../data/species';
import { type Matchup, combinedMatchup } from '../data/types';
import { abilityDamageMultiplier } from './abilities';
import { stageMultiplier } from './stats';
import { type Entity, type GameState, hasStatus } from './state';
import { STATUSES } from '../data/statuses';

export interface DamageResult {
  damage: number;
  matchup: Matchup;
  critical: boolean;
}

export function baseDamage(A: number, D: number, P: number, L: number): number {
  const lnArg = Math.min(4095, Math.max(1, ((A - D) / 8 + L + 50) * 10));
  return ((A + P) * 39168) / 65536 - D / 2 + 50 * Math.log(lnArg) - 311;
}

export function computeDamage(
  state: GameState,
  attacker: Entity,
  defender: Entity,
  move: MoveData,
  rng: RngState,
): DamageResult {
  const rules = state.rules;
  const physical = move.category === 'physical';
  const A = (physical ? attacker.stats.atk : attacker.stats.spAtk) * stageMultiplier(physical ? attacker.stages.atk : attacker.stages.spAtk);
  const D = (physical ? defender.stats.def : defender.stats.spDef) * stageMultiplier(physical ? defender.stages.def : defender.stages.spDef);

  let dmg = baseDamage(A, D, move.power, attacker.level);
  if (attacker.team !== 'team') dmg /= rules.nonTeamDamageDivisor;
  dmg = Math.max(1, dmg);

  const defTypes = getSpecies(defender.species).types;
  const matchup: Matchup = move.type ? combinedMatchup(move.type, defTypes) : 'neutral';
  dmg *= rules.matchupMultiplier[matchup];

  if (move.type && getSpecies(attacker.species).types.includes(move.type)) dmg *= rules.stabMultiplier;
  // Tornado: doble daño contra Volador (descripción del movimiento en el juego).
  if (move.doubleVsType && defTypes.includes(move.doubleVsType)) dmg *= 2;
  dmg *= abilityDamageMultiplier(attacker, move);
  if (physical && hasStatus(attacker, 'burn')) dmg *= rules.burnDamageMultiplier;

  const critical = next(rng) * 100 < (move.critChance ?? rules.baseCritChance);
  if (critical) dmg *= rules.criticalMultiplier;

  dmg *= (int(rng, 0, rules.damageRandomSpan - 1) + rules.damageRandomMin) / 65536;
  const damage = Math.min(rules.maxDamage, Math.max(1, Math.floor(dmg)));
  return { damage, matchup, critical };
}

/**
 * Tirada de precisión. Como MoveHitCheck de EoS (pmdsky-debug), se tira dos
 * veces por objetivo, con accuracy y con accuracy2, y solo acierta si pasan las
 * dos. Una precisión > 100 no falla. [INCIERTO] Que las fases de precisión y
 * evasión se apliquen igual en las dos tiradas.
 */
export function rollHit(attacker: Entity, defender: Entity, move: MoveData, rng: RngState): boolean {
  if (attacker.id === defender.id) return true;
  // Despiste (Pantalla de Humo): sus movimientos fallan. [INCIERTO] «casi todos»: aquí, todos.
  if (attacker.statuses.some((s) => STATUSES[s.id].missesMoves)) return false;
  const check = (accuracy: number) => {
    if (accuracy > 100) return true;
    const acc = (accuracy * stageMultiplier(attacker.stages.accuracy)) / stageMultiplier(defender.stages.evasion);
    return next(rng) * 100 < acc;
  };
  return check(move.accuracy) && (move.accuracy2 === undefined || check(move.accuracy2));
}

/** Probabilidad de acierto sin fases (para mostrarla): producto de las dos tiradas. */
export function hitChance(move: MoveData): number {
  const p = (a: number) => (a > 100 ? 1 : a / 100);
  return p(move.accuracy) * (move.accuracy2 === undefined ? 1 : p(move.accuracy2));
}
