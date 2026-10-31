/**
 * Creación de una expedición nueva. Todo empieza desde cero:
 * nivel 1, mochila vacía, 0 Poké. Nada se transfiere de partidas anteriores.
 */
import { createRng, hashSeed } from '../core/rng';
import { makeMoveSlot } from './stats';
import { RULESETS } from '../data/rules';
import { getDungeon } from '../data/dungeons';
import { getSpecies } from '../data/species';
import { EventLog } from './events';
import { createPokemon } from './factory';
import { buildFloor } from './floor';
import type { GameState } from './state';

export interface PartyMemberConfig {
  playerId: string;
  name: string;
  species: string;
}

export interface ExpeditionConfig {
  dungeonId: string;
  seed: number | string;
  ruleset?: keyof typeof RULESETS;
  party: PartyMemberConfig[];
  /** Cooperativo: la expedición termina cuando caen TODOS los jugadores. */
  coop?: boolean;
  startLevel?: number;
}

/**
 * Nivel con el que empieza el equipo [VERIFICADO]: tras el test de personalidad, el juego
 * llama a ApplyLevelUpBoostsToGroundMonster(protagonista o compañero, 5, …)
 * (InitMainTeamAfterQuiz, arm9 0x20487C4 en la ROM USA; pmdsky-debug).
 */
export const START_LEVEL = 5;

export function createExpedition(cfg: ExpeditionConfig): { state: GameState; events: EventLog['events'] } {
  getDungeon(cfg.dungeonId);
  if (cfg.party.length < 1 || cfg.party.length > 4) throw new Error('El equipo debe tener entre 1 y 4 miembros');
  for (const m of cfg.party) if (!getSpecies(m.species).playable) throw new Error(`${m.species} no es jugable`);

  const seed = typeof cfg.seed === 'string' ? hashSeed(cfg.seed) : cfg.seed >>> 0;
  const base = RULESETS[cfg.ruleset ?? 'sky'];
  const rules = { ...base, defeatWhen: cfg.coop ? ('allPlayersFaint' as const) : base.defeatWhen };

  const state: GameState = {
    version: 1,
    rules,
    dungeonId: cfg.dungeonId,
    seed,
    floor: 1,
    turn: 0,
    floorTurn: 0,
    rng: createRng(seed),
    map: { width: 0, height: 0, tiles: [], roomAt: [], rooms: [], stairs: { x: 0, y: 0 } },
    entities: [],
    items: [],
    traps: [],
    players: [],
    bag: [],
    money: 0,
    result: null,
    stats: { enemiesDefeated: 0, itemsCollected: 0, turns: 0, floorsCleared: 0 },
    nextId: 1,
    spawnCountdown: 0,
    worldClock: 0,
  };

  for (const m of cfg.party) {
    const e = createPokemon(state, m.species, cfg.startLevel ?? START_LEVEL, 'team', { x: 0, y: 0 }, { playerId: m.playerId });
    // Movimiento de huevo del inicial (AddStarterEggMove): en el primer hueco libre, si cabe.
    const egg = getSpecies(m.species).starterEggMove;
    if (egg && e.moves.length < 4 && !e.moves.some((mv) => mv.id === egg)) e.moves.push(makeMoveSlot(egg));
    state.entities.push(e);
    state.players.push({ playerId: m.playerId, name: m.name, entityId: e.id, connected: true });
  }

  const log = new EventLog();
  buildFloor(state, log);
  return { state, events: log.events };
}
