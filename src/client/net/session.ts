/**
 * Abstracción de sesión: la escena del juego no sabe si la lógica corre en
 * local (solitario) o en el servidor (cooperativo). En ambos casos recibe
 * estado autoritativo + eventos para animar.
 */
import type { Action } from '../../shared/engine/actions';
import { TURN_COST, validateAction } from '../../shared/engine/actions';
import type { GameEvent } from '../../shared/engine/events';
import { type ExpeditionConfig, createExpedition } from '../../shared/engine/expedition';
import { type GameState, playerEntity } from '../../shared/engine/state';
import { applyFreeAction, resolveTurn } from '../../shared/engine/turn';
import { currentMode } from '../../shared/engine/mode';
import type { TurnInfo } from '../../shared/net/protocol';

export interface SessionUpdate {
  state: GameState;
  events: GameEvent[];
  turnInfo: TurnInfo;
}

export interface GameSession {
  readonly mode: 'solo' | 'online';
  readonly localPlayerId: string;
  readonly code?: string;
  state: GameState | null;
  turnInfo: TurnInfo;
  onUpdate?: (u: SessionUpdate) => void;
  onRejected?: (reason: string) => void;
  onStatus?: (text: string) => void;
  /** Envía una intención. Devuelve false si se rechaza localmente (sin red). */
  send(action: Action): boolean;
  /** ¿Puede el jugador local enviar ahora una acción que consume turno? */
  canAct(): boolean;
  close(): void;
}

export class LocalSession implements GameSession {
  readonly mode = 'solo' as const;
  readonly localPlayerId = 'local';
  state: GameState;
  turnInfo: TurnInfo = { turn: 0, mode: 'explore', waitingFor: ['local'], deadline: null };
  onUpdate?: (u: SessionUpdate) => void;
  onRejected?: (reason: string) => void;
  private initialEvents: GameEvent[];

  constructor(cfg: Omit<ExpeditionConfig, 'party'> & { name: string; species: string }) {
    const { state, events } = createExpedition({
      ...cfg,
      party: [{ playerId: 'local', name: cfg.name, species: cfg.species }],
    });
    this.state = state;
    this.initialEvents = events;
  }

  start() {
    this.turnInfo = { ...this.turnInfo, mode: currentMode(this.state) };
    this.emit(this.initialEvents);
  }

  canAct() {
    return !this.state.result;
  }

  send(action: Action): boolean {
    const me = playerEntity(this.state, this.localPlayerId);
    const v = validateAction(this.state, me, action);
    if (!v.ok) {
      this.onRejected?.(v.reason);
      return false;
    }
    const r = TURN_COST[action.type] ? resolveTurn(this.state, { [me!.id]: action }) : applyFreeAction(this.state, me!.id, action);
    if (r.rejected) {
      this.onRejected?.(r.rejected.reason);
      return false;
    }
    this.turnInfo = { turn: this.state.turn, mode: currentMode(this.state), waitingFor: this.state.result ? [] : ['local'], deadline: null };
    this.emit(r.events);
    return true;
  }

  private emit(events: GameEvent[]) {
    this.onUpdate?.({ state: this.state, events, turnInfo: this.turnInfo });
  }

  close() {}
}
