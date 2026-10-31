/**
 * Resolución de un turno completo de la mazmorra.
 *
 * Orden dentro de un turno (como en PMD, todos a velocidad normal):
 *   1. Miembros del equipo controlados por jugadores, en el orden del equipo
 *      (jugador 1, jugador 2, ...). Cada uno ejecuta la acción que envió.
 *   2. Miembros del equipo controlados por la IA (p. ej. desconectados).
 *   3. Enemigos, en orden de aparición.
 *   4. Fin de turno: estados, barriga, regeneración, apariciones, viento.
 *
 * Una acción que era válida al enviarla pero deja de serlo al resolverse
 * (p. ej. otro jugador ocupó la casilla) se convierte en "esperar".
 * [INCIERTO] Las diferencias de velocidad (Agilidad, etc.) no están
 * implementadas: todos actúan una vez por turno.
 */
import { EventLog, type GameEvent } from './events';
import { type Action, TURN_COST, performAction, validateAction } from './actions';
import { decideAction } from './ai';
import { dealDamage } from './effects';
import { buildFloor, trySpawnEnemy } from './floor';
import { actionGate, blocksRegen, tickStatuses } from './status';
import { getDungeon } from '../data/dungeons';
import { type Entity, type GameState, getEntity, teamMembers } from './state';

export interface TurnResult {
  events: GameEvent[];
  /** false si la acción del jugador era inválida y no se avanzó el turno. */
  advanced: boolean;
  rejected?: { entityId: string; reason: string };
}

/**
 * Aplica una acción gratuita (que no consume turno, como girarse).
 */
export function applyFreeAction(state: GameState, entityId: string, action: Action): TurnResult {
  const log = new EventLog();
  const e = getEntity(state, entityId);
  const v = validateAction(state, e, action);
  if (!v.ok) return { events: [], advanced: false, rejected: { entityId, reason: v.reason } };
  if (TURN_COST[action.type]) throw new Error('applyFreeAction con una acción que consume turno');
  performAction(state, e!, action, log);
  return { events: log.events, advanced: false };
}

/**
 * Resuelve un turno con las acciones de los jugadores (entityId → acción).
 * Los jugadores sin acción en el mapa esperan, salvo que su entidad esté en
 * modo IA.
 */
export function resolveTurn(state: GameState, intents: Record<string, Action>): TurnResult {
  const log = new EventLog();
  if (state.result) return { events: [], advanced: false };

  // Validación previa: si alguna acción es inválida, no se avanza nada.
  for (const [id, action] of Object.entries(intents)) {
    const v = validateAction(state, getEntity(state, id), action);
    if (!v.ok) return { events: [], advanced: false, rejected: { entityId: id, reason: v.reason } };
    if (!TURN_COST[action.type]) return { events: [], advanced: false, rejected: { entityId: id, reason: 'Acción gratuita.' } };
  }

  const team = teamMembers(state);
  const players = team.filter((m) => m.controller === 'player');
  const aiAllies = team.filter((m) => m.controller === 'ai');

  for (const p of players) {
    if (actFor(state, p, intents[p.id] ?? { type: 'wait' }, log) === 'nextFloor') return finishFloorChange(state, log);
    if (state.result) return { events: log.events, advanced: true };
  }
  for (const a of aiAllies) {
    if (actFor(state, a, decideAction(state, a), log) === 'nextFloor') return finishFloorChange(state, log);
    if (state.result) return { events: log.events, advanced: true };
  }
  for (const enemy of state.entities.filter((x) => x.team === 'enemy')) {
    if (enemy.fainted || !state.entities.includes(enemy)) continue;
    actFor(state, enemy, decideAction(state, enemy), log);
    if (state.result) return { events: log.events, advanced: true };
  }

  state.worldClock = 0;
  endOfTurn(state, log);
  return { events: log.events, advanced: true };
}

/**
 * MODO EXPLORACIÓN (cooperativo, sin enemigos implicados): la acción de un
 * jugador se resuelve al instante, sin esperar al resto.
 *
 * Para que el tiempo del mundo no corra más deprisa por haber varios
 * jugadores, cada acción individual avanza el reloj del mundo 1/N (N =
 * jugadores activos). El "fin de turno" personal (estados, barriga,
 * regeneración) se aplica a quien actúa; enemigos y compañeros IA actúan
 * cuando el reloj completa un turno entero. Con un solo jugador equivale
 * exactamente a un turno normal.
 */
export function resolveExploreAction(state: GameState, entityId: string, action: Action): TurnResult {
  const log = new EventLog();
  if (state.result) return { events: [], advanced: false };
  const e = getEntity(state, entityId);
  const v = validateAction(state, e, action);
  if (!v.ok) return { events: [], advanced: false, rejected: { entityId, reason: v.reason } };
  if (!TURN_COST[action.type]) return { events: [], advanced: false, rejected: { entityId, reason: 'Acción gratuita.' } };

  if (actFor(state, e!, action, log) === 'nextFloor') return finishFloorChange(state, log);
  if (state.result) return { events: log.events, advanced: true };
  tickEntity(state, e!, log);
  checkDefeat(state, log);

  const active = Math.max(1, teamMembers(state).filter((m) => m.controller === 'player').length);
  state.worldClock = (state.worldClock ?? 0) + 1 / active;
  while (state.worldClock >= 1 - 1e-9 && !state.result) {
    state.worldClock = Math.max(0, state.worldClock - 1);
    for (const a of teamMembers(state).filter((m) => m.controller === 'ai')) {
      if (actFor(state, a, decideAction(state, a), log) === 'nextFloor') return finishFloorChange(state, log);
      if (state.result) return { events: log.events, advanced: true };
    }
    for (const enemy of state.entities.filter((x) => x.team === 'enemy')) {
      if (enemy.fainted || !state.entities.includes(enemy)) continue;
      actFor(state, enemy, decideAction(state, enemy), log);
      if (state.result) return { events: log.events, advanced: true };
    }
    // Los jugadores ya hicieron su fin de turno personal al actuar.
    endOfTurn(state, log, (x) => x.controller !== 'player');
  }
  return { events: log.events, advanced: true };
}

function actFor(state: GameState, e: Entity, action: Action, log: EventLog): 'done' | 'nextFloor' {
  if (e.fainted) return 'done';
  const gate = actionGate(state, e, log);
  if (gate === 'skip') return 'done';
  let a = action;
  if (!validateAction(state, e, a).ok) a = { type: 'wait' };
  const out = performAction(state, e, a, log, gate === 'confused');
  checkDefeat(state, log);
  return out;
}

function endOfTurn(state: GameState, log: EventLog, entityFilter: (e: Entity) => boolean = () => true) {
  const rules = state.rules;
  state.turn++;
  state.floorTurn++;
  state.stats.turns++;

  for (const e of [...state.entities]) if (entityFilter(e)) tickEntity(state, e, log);

  trySpawnEnemy(state, log);

  // Viento: límite de turnos por piso.
  const left = rules.floorTurnLimit - state.floorTurn;
  if (left === 250) log.msg('Se siente algo extraño en el aire...');
  if (left === 100) log.msg('Empieza a soplar el viento...');
  if (left === 50) log.msg('¡El viento sopla con fuerza! ¡Hay que darse prisa!');
  if (left <= 0) endExpedition(state, log, 'defeated', 'Un fuerte viento ha expulsado al equipo de la mazmorra.');

  checkDefeat(state, log);
}

/** Fin de turno de UNA entidad: estados, barriga y regeneración natural. */
function tickEntity(state: GameState, e: Entity, log: EventLog) {
  const rules = state.rules;
  if (e.fainted) return;
  const dmg = tickStatuses(e, log);
  if (dmg > 0) dealDamage(state, e, dmg, log);
  if (e.fainted) return;

  let starving = false;
  if (e.team === 'team') {
    const before = e.belly;
    e.belly = Math.max(0, e.belly - rules.bellyPerTurn);
    if (before > 20 && e.belly <= 20) log.msg(`${e.name} empieza a tener hambre.`);
    if (before > 0 && e.belly <= 0) log.msg(`¡${e.name} está hambriento!`);
    if (e.belly <= 0) {
      starving = true;
      dealDamage(state, e, rules.starvingHpLoss, log, undefined, { source: 'hunger' });
      if (e.fainted) return;
    }
  }

  // Regeneración natural.
  if (!starving && !blocksRegen(e) && e.hp < e.maxHp) {
    e.regenAcc += e.maxHp / rules.naturalRegenTurnsForFull;
    const whole = Math.floor(e.regenAcc);
    if (whole > 0) {
      e.regenAcc -= whole;
      e.hp = Math.min(e.maxHp, e.hp + whole);
    }
  }
}

export function checkDefeat(state: GameState, log: EventLog): void {
  if (state.result) return;
  const all = teamMembers(state, true);
  const humans = all.filter((m) => m.playerId);
  let defeated: boolean;
  if (state.rules.defeatWhen === 'leaderFaints') defeated = !!all[0]?.fainted;
  else defeated = humans.length > 0 && humans.every((m) => m.fainted);
  if (defeated) endExpedition(state, log, 'defeated', 'El equipo ha sido derrotado.');
}

function endExpedition(state: GameState, log: EventLog, result: 'cleared' | 'defeated', reason: string) {
  state.result = result;
  state.defeatReason = result === 'defeated' ? reason : undefined;
  log.msg(reason);
  log.push({ t: 'end', result, reason });
}

/** Avanza el equipo completo al siguiente piso (o termina la expedición). */
function finishFloorChange(state: GameState, log: EventLog): TurnResult {
  const dungeon = getDungeon(state.dungeonId);
  state.stats.floorsCleared++;
  if (state.floor >= dungeon.floors) {
    endExpedition(state, log, 'cleared', `¡El equipo ha completado ${dungeon.name}!`);
    return { events: log.events, advanced: true };
  }
  state.floor++;
  state.turn++;
  buildFloor(state, log);
  return { events: log.events, advanced: true };
}

/** Marca a un jugador como controlado por IA (desconexión) o humano (reconexión). */
export function setController(state: GameState, entityId: string, controller: 'player' | 'ai') {
  const e = getEntity(state, entityId);
  if (e) e.controller = controller;
}

