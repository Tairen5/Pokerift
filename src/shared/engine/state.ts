/**
 * Estado lógico completo de una expedición. Es un objeto plano y serializable
 * (JSON): el servidor lo mantiene como autoridad y el modo solitario lo
 * ejecuta localmente con el mismo código.
 *
 * Separación de progreso:
 *   - Todo lo que hay en GameState es PROGRESO DE LA EXPEDICIÓN y se descarta
 *     al terminarla (nivel, exp, mochila, dinero, PP, estados...).
 *   - El progreso PERMANENTE (historial, estadísticas, opciones) vive fuera,
 *     en client/meta/profile.ts, y solo recibe un resumen al final.
 */
import type { Dir, Point } from '../core/geometry';
import type { RngState } from '../core/rng';
import type { DungeonMap } from '../dungeon/map';
import type { StatStageId } from '../data/moves';
import type { Stats } from '../data/species';
import type { StatusId } from '../data/statuses';
import type { Ruleset } from '../data/rules';

export type Team = 'team' | 'enemy';
export type Controller = 'player' | 'ai';

export interface MoveSlot {
  id: string;
  pp: number;
  maxPp: number;
}

export interface StatusInstance {
  id: StatusId;
  turnsLeft: number | null;
  /** Contador interno (p. ej. para daño periódico). */
  counter: number;
}

export interface AiMemory {
  targetId?: string;
  lastSeen?: Point;
  goal?: Point;
}

export interface Entity {
  id: string;
  team: Team;
  /** Jugador humano que controla la entidad (id de jugador), si lo hay. */
  playerId?: string;
  controller: Controller;
  species: string;
  name: string;
  level: number;
  exp: number;
  pos: Point;
  facing: Dir;
  hp: number;
  maxHp: number;
  stats: Stats;
  stages: Record<StatStageId, number>;
  moves: MoveSlot[];
  statuses: StatusInstance[];
  abilities: string[];
  belly: number;
  maxBelly: number;
  fainted: boolean;
  regenAcc: number;
  ai: AiMemory;
}

export interface FloorItem {
  id: string;
  item: string;
  pos: Point;
  amount: number;
}

export interface TrapInstance {
  id: string;
  trap: string;
  pos: Point;
  revealed: boolean;
}

export interface BagItem {
  uid: string;
  item: string;
}

export interface PlayerSlot {
  playerId: string;
  name: string;
  entityId: string;
  connected: boolean;
}

export type ExpeditionResult = 'cleared' | 'defeated' | null;

export interface ExpeditionStats {
  enemiesDefeated: number;
  itemsCollected: number;
  turns: number;
  floorsCleared: number;
}

export interface GameState {
  version: 1;
  rules: Ruleset;
  dungeonId: string;
  seed: number;
  floor: number;
  /** Turno global y turno dentro del piso actual. */
  turn: number;
  floorTurn: number;
  rng: RngState;
  map: DungeonMap;
  entities: Entity[];
  items: FloorItem[];
  traps: TrapInstance[];
  players: PlayerSlot[];
  bag: BagItem[];
  money: number;
  result: ExpeditionResult;
  defeatReason?: string;
  stats: ExpeditionStats;
  nextId: number;
  /** Reloj fraccionario del mundo en modo exploración (ver resolveExploreAction). */
  worldClock?: number;
  /** Turnos que faltan para el siguiente intento de aparición de enemigo. */
  spawnCountdown: number;
}

export function newId(state: GameState, prefix: string): string {
  return `${prefix}${state.nextId++}`;
}

export function getEntity(state: GameState, id: string): Entity | undefined {
  return state.entities.find((e) => e.id === id);
}

export function livingEntities(state: GameState): Entity[] {
  return state.entities.filter((e) => !e.fainted);
}

export function entityAt(state: GameState, p: Point): Entity | undefined {
  return state.entities.find((e) => !e.fainted && e.pos.x === p.x && e.pos.y === p.y);
}

export function teamMembers(state: GameState, includeFainted = false): Entity[] {
  return state.entities.filter((e) => e.team === 'team' && (includeFainted || !e.fainted));
}

export function enemiesOf(state: GameState, e: Entity): Entity[] {
  return state.entities.filter((o) => !o.fainted && o.team !== e.team);
}

export function itemAt(state: GameState, p: Point): FloorItem | undefined {
  return state.items.find((i) => i.pos.x === p.x && i.pos.y === p.y);
}

export function trapAt(state: GameState, p: Point): TrapInstance | undefined {
  return state.traps.find((t) => t.pos.x === p.x && t.pos.y === p.y);
}

export function playerEntity(state: GameState, playerId: string): Entity | undefined {
  const slot = state.players.find((p) => p.playerId === playerId);
  return slot ? getEntity(state, slot.entityId) : undefined;
}

export function hasStatus(e: Entity, id: StatusId): boolean {
  return e.statuses.some((s) => s.id === id);
}
