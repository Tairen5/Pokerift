/**
 * Eventos que produce la resolución de un turno. El renderizador los reproduce
 * en orden para animar; NUNCA deciden el resultado (eso ya está en el estado).
 */
import type { Dir, Point } from '../core/geometry';
import type { Matchup } from '../data/types';
import type { StatStageId } from '../data/moves';
import type { StatusId } from '../data/statuses';
import type { ExpeditionResult } from './state';

export type GameEvent =
  | { t: 'move'; id: string; from: Point; to: Point; dir: Dir }
  | { t: 'face'; id: string; dir: Dir }
  | { t: 'useMove'; id: string; move: string; dir: Dir }
  | { t: 'damage'; id: string; amount: number; hp: number; matchup?: Matchup; critical?: boolean; source?: string }
  | { t: 'miss'; id: string; by: string }
  | { t: 'heal'; id: string; amount: number; hp: number }
  | { t: 'faint'; id: string }
  | { t: 'revive'; id: string; hp: number }
  | { t: 'exp'; id: string; amount: number }
  | { t: 'levelUp'; id: string; level: number }
  | { t: 'learn'; id: string; move: string }
  | { t: 'status'; id: string; status: StatusId; applied: boolean }
  | { t: 'stage'; id: string; stat: StatStageId; delta: number }
  | { t: 'pickup'; id: string; item: string; amount: number }
  | { t: 'useItem'; id: string; item: string }
  | { t: 'trap'; id: string; trap: string; pos: Point }
  | { t: 'warp'; id: string; to: Point }
  | { t: 'spawn'; id: string }
  | { t: 'floor'; floor: number }
  | { t: 'message'; text: string }
  | { t: 'end'; result: ExpeditionResult; reason?: string };

export class EventLog {
  readonly events: GameEvent[] = [];
  push(e: GameEvent) {
    this.events.push(e);
  }
  msg(text: string) {
    this.events.push({ t: 'message', text });
  }
}
