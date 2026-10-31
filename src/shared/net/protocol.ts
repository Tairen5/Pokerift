/**
 * Protocolo WebSocket (JSON). El cliente solo envía INTENCIONES; el servidor
 * valida, resuelve y difunde el estado resultante.
 *
 * Política de turnos cooperativos (ver docs/MECANICAS.md):
 *  - Modo EXPLORACIÓN (ningún enemigo implicado): cada acción se resuelve al
 *    instante; los jugadores no se esperan entre sí.
 *  - Modo TÁCTICO (hay enemigos implicados): turnos compartidos. Cada jugador
 *    vivo y conectado bloquea UNA acción con el número de turno que ve; cuando
 *    todos han elegido (o vence el tiempo límite → "esperar") se resuelve el
 *    turno completo.
 *  - Cada acción lleva una secuencia creciente por cliente: el servidor
 *    descarta duplicados y confirma con 'ack' (o 'rejected').
 *  - Las acciones gratuitas (girarse) se aplican al instante.
 */
import type { Action } from '../engine/actions';
import type { GameEvent } from '../engine/events';
import type { GameState } from '../engine/state';

export const PROTOCOL_VERSION = 4;
export const MAX_PLAYERS = 4;

export interface LobbyPlayer {
  playerId: string;
  name: string;
  species: string | null;
  connected: boolean;
  isHost: boolean;
}

export interface LobbyInfo {
  code: string;
  dungeonId: string;
  players: LobbyPlayer[];
  started: boolean;
  phase: 'lobby' | 'town' | 'expedition';
}

/** Jugador en una zona explorable. Cada uno puede estar en una zona distinta; posición en píxeles de su zona. */
export interface TownPlayer {
  playerId: string;
  name: string;
  species: string;
  zoneId: string;
  x: number;
  y: number;
  dir: number;
  moving: boolean;
  connected: boolean;
}

export interface TownInfo {
  players: TownPlayer[];
}

export interface TurnInfo {
  turn: number;
  /** 'explore' = cada jugador a su ritmo; 'tactical' = turnos compartidos (combate). */
  mode: 'explore' | 'tactical';
  /** Jugadores (playerId) de los que aún se espera acción. */
  waitingFor: string[];
  /** Segundos que quedan antes de que el servidor fuerce "esperar" (null = sin límite). */
  deadline: number | null;
}

export type ClientMessage =
  | { type: 'hello'; version: number }
  | { type: 'create'; name: string; dungeonId?: string }
  | { type: 'join'; code: string; name: string }
  | { type: 'resume'; code: string; token: string }
  | { type: 'pickSpecies'; species: string }
  | { type: 'start' } //                         anfitrión: del lobby a las zonas exteriores (casa)
  | { type: 'townMove'; x: number; y: number; dir: number; moving: boolean }
  | { type: 'changeZone'; exitId: string } //     pasar a otra zona por una salida (solo ese jugador)
  | { type: 'enterDungeon'; exitId: string } //   entrar por una salida hacia una mazmorra (todo el grupo)
  | { type: 'returnToTown' } //                   tras terminar la expedición
  | { type: 'action'; turn: number; seq: number; action: Action }
  | { type: 'leave' };

export type ServerMessage =
  | { type: 'welcome'; playerId: string; token: string; code: string }
  | { type: 'lobby'; lobby: LobbyInfo }
  | { type: 'state'; state: GameState; events: GameEvent[]; turnInfo: TurnInfo }
  | { type: 'turnInfo'; turnInfo: TurnInfo }
  | { type: 'town'; town: TownInfo; correction?: boolean }
  | { type: 'ack'; seq: number }
  | { type: 'rejected'; reason: string; seq?: number }
  | { type: 'error'; message: string };

/**
 * Vista del estado para los clientes: oculta información que el jugador no
 * debería conocer (trampas no descubiertas).
 */
export function viewForClients(state: GameState): GameState {
  return { ...state, traps: state.traps.filter((t) => t.revealed) };
}
