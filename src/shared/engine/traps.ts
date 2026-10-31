/**
 * Activación de trampas. Solo las activan miembros del equipo (en PMD los
 * enemigos son inmunes a las trampas).
 */
import { pick } from '../core/rng';
import { getTrap } from '../data/traps';
import { floorTiles } from '../dungeon/map';
import { dealDamage } from './effects';
import type { EventLog } from './events';
import { summonAround } from './floor';
import { applyStatus, changeStage } from './status';
import { NEUTRAL_STAGES } from './stats';

/** ¿Es una trampa (y no una casilla beneficiosa)? */
const eff_kind = (kind: string) => kind !== 'resetStages';
import { type Entity, type GameState, entityAt, trapAt } from './state';

export type TrapOutcome = 'none' | 'pitfall';

export function triggerTrapAt(state: GameState, e: Entity, log: EventLog): TrapOutcome {
  if (e.team !== 'team') return 'none';
  const trap = trapAt(state, e.pos);
  if (!trap) return 'none';
  const data = getTrap(trap.trap);
  trap.revealed = true;
  log.push({ t: 'trap', id: e.id, trap: trap.trap, pos: { ...trap.pos } });
  log.msg(eff_kind(data.effect.kind) ? `¡${e.name} ha pisado una ${data.name}!` : `¡${e.name} ha pisado la ${data.name}!`);
  const eff = data.effect;
  switch (eff.kind) {
    case 'warp': {
      const free = floorTiles(state.map).filter((p) => !entityAt(state, p));
      const to = pick(state.rng, free);
      e.pos = { ...to };
      log.push({ t: 'warp', id: e.id, to: { ...to } });
      log.msg(`¡${e.name} ha sido teletransportado!`);
      break;
    }
    case 'status':
      applyStatus(state, e, eff.status, log);
      break;
    case 'damage':
      log.msg(`${e.name} recibe ${eff.amount} de daño.`);
      dealDamage(state, e, eff.amount, log, undefined, { source: trap.trap });
      break;
    case 'stage':
      changeStage(e, eff.stat, eff.stages, log);
      break;
    case 'summon':
      summonAround(state, e.pos, eff.count, log);
      log.msg('¡Han aparecido Pokémon salvajes!');
      break;
    case 'pitfall':
      log.msg(`¡${e.name} cae al piso inferior!`);
      return 'pitfall';
    case 'resetStages':
      e.stages = { ...NEUTRAL_STAGES };
      log.msg(`¡Las estadísticas de ${e.name} vuelven a la normalidad!`);
      break;
  }
  return 'none';
}
