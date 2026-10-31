/**
 * Cliente WebSocket. Mantiene la conexión, la sala y el estado recibido del
 * servidor. Se reconecta automáticamente usando el token de sesión.
 */
import type { Action } from '../../shared/engine/actions';
import { TURN_COST, validateAction } from '../../shared/engine/actions';
import { type GameState, playerEntity } from '../../shared/engine/state';
import {
  type ClientMessage,
  type LobbyInfo,
  type TownInfo,
  PROTOCOL_VERSION,
  type ServerMessage,
  type TurnInfo,
} from '../../shared/net/protocol';
import type { GameSession, SessionUpdate } from './session';

const TOKEN_KEY = 'pokerift.session';

export function serverUrl(): string {
  const env = import.meta.env.VITE_SERVER_URL as string | undefined;
  if (env) return env;
  const proto = location.protocol === 'https:' ? 'wss' : 'ws';
  // En desarrollo (Vite en 5173) el servidor está en 8787; en producción el
  // propio servidor sirve el cliente, así que se usa el mismo origen.
  return location.port === '5173' ? `${proto}://${location.hostname}:8787` : `${proto}://${location.host}`;
}

export class OnlineSession implements GameSession {
  readonly mode = 'online' as const;
  localPlayerId = '';
  code?: string;
  state: GameState | null = null;
  lobby: LobbyInfo | null = null;
  /** Última instantánea de las zonas exteriores recibida del servidor. */
  town: TownInfo | null = null;
  /** Se llama con cada instantánea de las zonas exteriores; correction = el servidor corrigió nuestra posición. */
  onTown?: (t: TownInfo, correction: boolean) => void;
  turnInfo: TurnInfo = { turn: 0, mode: 'explore', waitingFor: [], deadline: null };
  onUpdate?: (u: SessionUpdate) => void;
  onRejected?: (reason: string) => void;
  onStatus?: (text: string) => void;
  onLobby?: (l: LobbyInfo) => void;
  onError?: (msg: string) => void;
  onWelcome?: () => void;

  private ws: WebSocket | null = null;
  private token = '';
  private closed = false;
  /** Secuencia monótona (sobrevive a recargas al partir de la hora actual). */
  private seq = Date.now();
  /** Acción que consume turno enviada y aún sin confirmar por el servidor. */
  private inFlight: number | null = null;
  private retry = 0;

  constructor(private url = serverUrl()) {}

  /** Conecta y ejecuta `first` (create/join/resume) al abrir. */
  connect(first: ClientMessage) {
    this.closed = false;
    const ws = new WebSocket(this.url);
    this.ws = ws;
    ws.onopen = () => {
      this.retry = 0;
      this.inFlight = null;
      this.raw({ type: 'hello', version: PROTOCOL_VERSION });
      this.raw(first);
    };
    ws.onmessage = (ev) => this.handle(JSON.parse(String(ev.data)) as ServerMessage);
    ws.onclose = () => {
      if (this.closed) return;
      this.onStatus?.('Conexión perdida. Reconectando...');
      const delay = Math.min(5000, 500 * 2 ** this.retry++);
      setTimeout(() => {
        if (this.closed) return;
        if (this.code && this.token) this.connect({ type: 'resume', code: this.code, token: this.token });
        else this.onError?.('No se pudo conectar con el servidor.');
      }, delay);
    };
    ws.onerror = () => this.onStatus?.('Error de conexión con el servidor.');
  }

  /** Intenta recuperar una sesión guardada (p. ej. tras recargar la página). */
  static savedSession(): { code: string; token: string } | null {
    try {
      const raw = sessionStorage.getItem(TOKEN_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  private handle(msg: ServerMessage) {
    switch (msg.type) {
      case 'welcome':
        this.localPlayerId = msg.playerId;
        this.token = msg.token;
        this.code = msg.code;
        try {
          sessionStorage.setItem(TOKEN_KEY, JSON.stringify({ code: msg.code, token: msg.token }));
        } catch {
          /* almacenamiento no disponible */
        }
        this.onWelcome?.();
        break;
      case 'town':
        this.town = msg.town;
        this.onTown?.(msg.town, !!msg.correction);
        break;
      case 'lobby':
        this.lobby = msg.lobby;
        this.onLobby?.(msg.lobby);
        break;
      case 'state':
        this.state = msg.state;
        this.turnInfo = msg.turnInfo;
        this.onStatus?.('');
        this.onUpdate?.({ state: msg.state, events: msg.events, turnInfo: msg.turnInfo });
        break;
      case 'turnInfo':
        this.turnInfo = msg.turnInfo;
        this.onStatus?.('');
        if (this.state) this.onUpdate?.({ state: this.state, events: [], turnInfo: msg.turnInfo });
        break;
      case 'ack':
        if (this.inFlight === msg.seq) this.inFlight = null;
        break;
      case 'rejected':
        if (msg.seq === undefined || this.inFlight === msg.seq) this.inFlight = null;
        this.onRejected?.(msg.reason);
        break;
      case 'error':
        this.onError?.(msg.message);
        if (/no existe|expirad/i.test(msg.message)) {
          try {
            sessionStorage.removeItem(TOKEN_KEY);
          } catch {
            /* nada */
          }
        }
        break;
    }
  }

  /**
   * Exploración: se puede actuar en cuanto el servidor confirma la acción
   * anterior (sin esperar al compañero). Combate: solo si el servidor espera
   * nuestra acción para el turno actual.
   */
  canAct(): boolean {
    if (!this.state || this.state.result || this.inFlight !== null) return false;
    return this.turnInfo.waitingFor.includes(this.localPlayerId);
  }

  send(action: Action): boolean {
    if (!this.state) return false;
    // Validación local solo para dar respuesta inmediata; el servidor decide.
    const v = validateAction(this.state, playerEntity(this.state, this.localPlayerId), action);
    if (!v.ok) {
      this.onRejected?.(v.reason);
      return false;
    }
    const seq = ++this.seq;
    if (TURN_COST[action.type]) {
      if (!this.canAct()) return false;
      this.inFlight = seq;
    }
    this.raw({ type: 'action', turn: this.turnInfo.turn, seq, action });
    return true;
  }

  sendTownMove(x: number, y: number, dir: number, moving: boolean) {
    this.raw({ type: 'townMove', x, y, dir, moving });
  }

  changeZone(exitId: string) {
    this.raw({ type: 'changeZone', exitId });
  }

  enterDungeon(exitId: string) {
    this.raw({ type: 'enterDungeon', exitId });
  }

  returnToTown() {
    this.raw({ type: 'returnToTown' });
  }

  pickSpecies(species: string) {
    this.raw({ type: 'pickSpecies', species });
  }

  start() {
    this.raw({ type: 'start' });
  }

  hasSubmitted(): boolean {
    return this.inFlight !== null || (this.turnInfo.mode === 'tactical' && !this.turnInfo.waitingFor.includes(this.localPlayerId));
  }

  raw(msg: ClientMessage) {
    if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(msg));
  }

  close() {
    this.closed = true;
    this.raw({ type: 'leave' });
    try {
      sessionStorage.removeItem(TOKEN_KEY);
    } catch {
      /* nada */
    }
    this.ws?.close();
  }
}
