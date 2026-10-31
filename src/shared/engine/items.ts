/**
 * Recogida y uso de objetos. La mochila y el dinero son compartidos por el
 * equipo (como en PMD) y forman parte del progreso temporal de la expedición.
 */
import { step } from '../core/geometry';
import { getItem } from '../data/items';
import { isWalkable } from '../dungeon/map';
import { dealDamage, heal } from './effects';
import type { EventLog } from './events';
import { cureStatus } from './status';
import { type Entity, type FloorItem, type GameState, entityAt, newId } from './state';

/** Intenta recoger el objeto del suelo. Devuelve false si no cabe en la mochila. */
export function pickUp(state: GameState, e: Entity, fi: FloorItem, log: EventLog): boolean {
  const data = getItem(fi.item);
  if (data.effect.kind === 'money') {
    state.money += fi.amount;
    log.push({ t: 'pickup', id: e.id, item: fi.item, amount: fi.amount });
    log.msg(`¡${e.name} recoge ${fi.amount} Poké!`);
  } else {
    if (state.bag.length >= state.rules.bagCapacity) {
      log.msg(`La mochila está llena. ${e.name} pasa por encima de ${data.name}.`);
      return false;
    }
    state.bag.push({ uid: newId(state, 'b'), item: fi.item });
    log.push({ t: 'pickup', id: e.id, item: fi.item, amount: 1 });
    log.msg(`${e.name} recoge ${data.name}.`);
  }
  state.items = state.items.filter((i) => i.id !== fi.id);
  state.stats.itemsCollected++;
  return true;
}

/** Usa un objeto de la mochila sobre `user` (o el objetivo de enfrente). Ya validado. */
export function useItem(state: GameState, user: Entity, bagUid: string, log: EventLog): void {
  const idx = state.bag.findIndex((b) => b.uid === bagUid);
  const [entry] = state.bag.splice(idx, 1);
  const data = getItem(entry.item);
  log.push({ t: 'useItem', id: user.id, item: entry.item });
  log.msg(`${user.name} usa ${data.name}.`);
  const eff = data.effect;
  switch (eff.kind) {
    case 'heal': {
      const n = heal(user, eff.amount, log);
      log.msg(n ? `${user.name} recupera ${n} HP.` : 'No pasa nada.');
      break;
    }
    case 'belly': {
      if (user.belly >= user.maxBelly && eff.raiseMaxIfFull) {
        user.maxBelly += eff.raiseMaxIfFull;
        log.msg(`¡La Barriga máxima de ${user.name} aumenta!`);
      }
      user.belly = Math.min(user.maxBelly, user.belly + eff.amount);
      log.msg(`${user.name} tiene la barriga más llena.`);
      break;
    }
    case 'cureStatus':
      if (!cureStatus(user, eff.statuses, log)) log.msg('No pasa nada.');
      break;
    case 'restorePP':
      for (const m of user.moves) m.pp = eff.amount === 'full' ? m.maxPp : Math.min(m.maxPp, m.pp + eff.amount);
      log.msg(`Los PP de ${user.name} se han restaurado.`);
      break;
    case 'damageFront': {
      const to = step(user.pos, user.facing);
      const target = isWalkable(state.map, to) ? entityAt(state, to) : undefined;
      if (target && target.id !== user.id) {
        log.msg(`¡Explosión! ${target.name} recibe ${eff.amount} de daño.`);
        dealDamage(state, target, eff.amount, log, user, { source: data.id });
      } else {
        log.msg('La explosión no alcanza a nadie.');
      }
      break;
    }
    case 'revive':
      log.msg('Se activará sola si alguien del equipo se debilita.');
      state.bag.splice(idx, 0, entry); // No se consume al usarlo a mano.
      break;
    case 'money':
      break;
  }
  // Bayas y semillas llenan además un poco la Barriga.
  if (data.belly && eff.kind !== 'revive') user.belly = Math.min(user.maxBelly, user.belly + data.belly);
}

/** ¿Se puede usar el objeto desde el menú? (la Semilla Revivir es pasiva). */
export function isUsable(itemId: string): boolean {
  const k = getItem(itemId).effect.kind;
  return k !== 'revive' && k !== 'money';
}
